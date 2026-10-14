"use strict";
// 2回目の修正（レビューで後回しにした指摘）を固定するテスト
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const fixture = require("./fixture");
const { renderInterior, renderCover } = require("../../lib/layout");
const { validateManuscript } = require("../../lib/manuscript");
const { checkBookFile, characterIds } = require("../../lib/books");
const { imageSize } = require("../../lib/images");

let hasPlaywright = true;
try {
  require.resolve("playwright");
} catch {
  hasPlaywright = false;
}
const book = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "../../books", f), "utf8"));
const pageHtml = (html, n) => html.split(`data-page="${n}"`)[1].split('data-page="')[0];

// EXIF の向き情報つきの、最小の JPEG（SOF0 の縦横だけ読めればよい）
function jpegWithOrientation(w, h, orientation) {
  const tiff = Buffer.alloc(26);
  tiff.write("II", 0);
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8); // 項目1つ
  tiff.writeUInt16LE(0x0112, 10); // Orientation
  tiff.writeUInt16LE(3, 12); // SHORT
  tiff.writeUInt32LE(1, 14);
  tiff.writeUInt16LE(orientation, 18);
  const exif = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const app1 = Buffer.alloc(4);
  app1.writeUInt16BE(0xffe1, 0);
  app1.writeUInt16BE(exif.length + 2, 2);
  const sof = Buffer.from([0xff, 0xc0, 0, 11, 8, h >> 8, h & 255, w >> 8, w & 255, 1, 1, 0x11, 0]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, exif, sof, Buffer.from([0xff, 0xd9])]);
}

module.exports = (test) => {
  // ---- 裁ち落としの左右 ----
  test("組版：左ページ（偶数）は左に裁ち落とし、文字は 0.5in から", () => {
    const html = renderInterior(fixture(), { imagesDir: os.tmpdir(), fontPath: "/f.ttf", kindle: false });
    assert.ok(/class="text" style="left:0\.5in;/.test(pageHtml(html, 2)), pageHtml(html, 2).slice(0, 400));
  });
  test("組版：右ページ（奇数）は右に裁ち落とし、文字は 0.375in から", () => {
    const html = renderInterior(fixture(), { imagesDir: os.tmpdir(), fontPath: "/f.ttf", kindle: false });
    assert.ok(/style="position:absolute;left:0\.375in;/.test(pageHtml(html, 29)));
  });
  test("組版：右ページには見開きの絵の右半分を置く", () => {
    const html = renderInterior(fixture(), { imagesDir: os.tmpdir(), fontPath: "/f.ttf", kindle: false });
    assert.ok(pageHtml(html, 3).includes("left:-8.625in;width:17.25in"));
    assert.ok(pageHtml(html, 2).includes("left:0in;width:17.25in"));
  });
  // ---- 小さな文字のふちどり ----
  test("表紙：シリーズ名のふちどりは本文より細い", () => {
    const html = renderCover(fixture(), { imagesDir: os.tmpdir(), fontPath: "/f.ttf", pages: 32 });
    assert.ok(/\.text \.series\s*\{[^}]*text-shadow/.test(html), "小さな文字用のふちどりがない");
    assert.ok(!html.includes("-webkit-text-stroke"), "Type 3 フォントの原因になる text-stroke が残っている");
  });
  // ---- 検証の穴 ----
  test("原稿：learning に「円」があるとエラー", () => {
    const ms = fixture();
    ms.learning = "100円の使い方";
    assert.ok(validateManuscript(ms, characterIds).some((e) => e.includes("円")));
  });
  test("原稿：巻番号とファイル名が違うとエラー", () => {
    assert.ok(checkBookFile("/x/vol02.json", fixture(1)).some((e) => e.includes("巻番号")));
  });
  test("原稿：タイトルが series.json と違うとエラー", () => {
    const ms = fixture(1);
    ms.title = "ちがう たいとる";
    assert.ok(checkBookFile("/x/vol01.json", ms).some((e) => e.includes("タイトル")));
  });
  test("原稿：巻番号とタイトルが合っていれば合格", () => assert.deepStrictEqual(checkBookFile("/x/vol01.json", fixture(1)), []));
  test("画像サイズ：JPEG の EXIF で90度回転なら縦横を入れかえる", () => {
    const f = path.join(os.tmpdir(), "ehon-exif.jpg");
    fs.writeFileSync(f, jpegWithOrientation(200, 100, 6));
    assert.deepStrictEqual(imageSize(f), { width: 100, height: 200 });
    fs.writeFileSync(f, jpegWithOrientation(200, 100, 1));
    assert.deepStrictEqual(imageSize(f), { width: 200, height: 100 });
  });
  // ---- 原稿の内容 ----
  test("第4巻：お礼の1個を、貸す前に約束している", () => {
    const ms = book("vol04.json");
    assert.ok(ms.spreads[3].text.includes("おれい"), ms.spreads[3].text);
  });
  test("第8巻：個別の会社は回復しないこともあると補足している", () => {
    assert.ok(book("vol08.json").parents.body.join("").includes("回復しないこと"));
  });
  if (!hasPlaywright) return;
  // ---- 書き出し ----
  const BUILD = path.join(__dirname, "../../bin/build.js");
  const build = (ms, extra = []) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ehon2-"));
    fs.writeFileSync(path.join(dir, "vol01.json"), JSON.stringify(ms));
    fs.mkdirSync(path.join(dir, "images"));
    const out = path.join(dir, "out");
    const r = spawnSync(process.execPath, [BUILD, "--book", path.join(dir, "vol01.json"), "--images", path.join(dir, "images"), "--out", out, ...extra], { encoding: "utf8" });
    return { code: r.status, log: r.stdout + r.stderr, out };
  };
  let ok;
  const get = () => (ok ||= build(fixture()));
  const box = (f) => fs.readFileSync(path.join(get().out, f), "latin1").match(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/).slice(1).map(Number);
  test("PDF：表紙の幅が計算どおり（±0.01pt）", () => {
    const [w, h] = box("cover.pdf");
    assert.ok(Math.abs(w - 17.3251 * 72) < 0.01 && Math.abs(h - 630) < 0.01, `${w}x${h}`);
  });
  test("PDF：本文のページが計算どおり（±0.01pt）", () => {
    const [w, h] = box("interior.pdf");
    assert.ok(Math.abs(w - 621) < 0.01 && Math.abs(h - 630) < 0.01, `${w}x${h}`);
  });
  test("PDF：Type 3 フォントを含まない", () => {
    for (const f of ["interior.pdf", "cover.pdf", "kindle.pdf"])
      assert.ok(!/\/Subtype\s*\/Type3/.test(fs.readFileSync(path.join(get().out, f), "latin1")), f);
  });
  test("PDF：はみ出しで失敗したら PDF を残さない", () => {
    const ms = fixture();
    ms.parents.body = ["とても長い説明の文章です。".repeat(150)];
    const r = build(ms);
    assert.notStrictEqual(r.code, 0);
    for (const f of ["interior.pdf", "cover.pdf", "kindle.pdf", "kindle-cover.jpg"]) assert.ok(!fs.existsSync(path.join(r.out, f)), f);
  });
  test("PDF：--final では絵が無いと失敗する", () => {
    const r = build(fixture(), ["--final", "1"]);
    assert.notStrictEqual(r.code, 0);
    assert.ok(r.log.includes("絵がありません") && r.log.includes("--final"), r.log);
    assert.ok(!fs.existsSync(path.join(r.out, "interior.pdf")));
  });
};
