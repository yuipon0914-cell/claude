"use strict";
// 最終レビューの指摘を固定するテスト
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const fixture = require("./fixture");
const png = require("./png");
const { renderCover } = require("../../lib/layout");
const { renderPromptsMarkdown } = require("../../lib/prompts");
const { checkImages } = require("../../lib/images");
const characters = require("../../data/characters.json");
const style = require("../../data/style.json");

// ヘッダだけの PNG（大きさの判定用。表示はできない）
function pngHeader(w, h) {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12);
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
}
let hasPlaywright = true;
try {
  require.resolve("playwright");
} catch {
  hasPlaywright = false;
}
const books = fs.readdirSync(path.join(__dirname, "../../books")).filter((f) => /^vol\d+\.json$/.test(f));
const load = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "../../books", f), "utf8"));

module.exports = (test) => {
  test("表紙：背に別の色の帯を置かない（ずれると細い線が出る）", () => {
    const html = renderCover(fixture(), { imagesDir: os.tmpdir(), fontPath: "/f.ttf", pages: 32 });
    assert.ok(!html.includes("#b5532a\"></div>") && !/background:#b5532a/.test(html), "背の色帯がある");
  });
  test("プロンプト一覧：目標の大きさは 5250×2625px と 2625×2625px", () => {
    const md = renderPromptsMarkdown({ volume: 1, title: "t", guest: "mimi", spreads: [] }, characters, style);
    assert.ok(md.includes("5250×2625px") && md.includes("2625×2625px"), md.slice(0, 300));
  });
  test("画像チェック：案内どおりの大きさなら 300dpi の警告が出ない", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ehon-img-"));
    for (let i = 1; i <= 13; i++) fs.writeFileSync(path.join(dir, `s${String(i).padStart(2, "0")}.png`), pngHeader(5250, 2625));
    fs.writeFileSync(path.join(dir, "cover.png"), pngHeader(2625, 2625));
    const w = checkImages(dir);
    assert.ok(!w.some((l) => l.includes("300dpi 未満") || l.includes("比率")), w.join("\n"));
  });
  test("原稿：場面の英訳に、文字を描かせる言葉を入れない", () => {
    const bad = /\b(sign|signs|words|letters|text|poster|written|writing)\b/i;
    for (const f of books) {
      const ms = load(f);
      ms.spreads.forEach((s, i) => assert.ok(!bad.test(s.sceneEn), `${f} 見開き${i + 1}: ${s.sceneEn}`));
      assert.ok(!bad.test(ms.coverSceneEn), `${f} 表紙`);
    }
  });
  test("第10巻：最後の場面に、これまでのゲストが3匹以上いる", () => {
    const ms = load("vol10.json");
    const guests = ["mimi", "kira", "dosshiri", "chuchi", "tsuchio", "bunta", "dan", "pichon", "jay"];
    for (const i of [11, 12]) assert.ok(ms.spreads[i].characters.filter((c) => guests.includes(c)).length >= 3, `見開き${i + 1}`);
  });
  if (!hasPlaywright) return;
  const BUILD = path.join(__dirname, "../../bin/build.js");
  const build = (dirName, images = {}) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), dirName));
    fs.writeFileSync(path.join(dir, "vol01.json"), JSON.stringify(fixture()));
    fs.mkdirSync(path.join(dir, "images"));
    for (const [n, buf] of Object.entries(images)) fs.writeFileSync(path.join(dir, "images", n), buf);
    const out = path.join(dir, "out");
    const r = spawnSync(process.execPath, [BUILD, "--book", path.join(dir, "vol01.json"), "--images", path.join(dir, "images"), "--out", out], { encoding: "utf8" });
    return { code: r.status, log: r.stdout + r.stderr, out };
  };
  test("PDF：フォルダ名に # があっても書き出せる", () => {
    const r = build("ehon#x-");
    assert.strictEqual(r.code, 0, r.log);
  });
  test("PDF：Kindle 用の絵は縮小した JPEG で埋め込む", () => {
    const r = build("ehon-k-", { "s01.png": png(6000, 3000) });
    assert.strictEqual(r.code, 0, r.log);
    const heights = (f) => [...fs.readFileSync(path.join(r.out, f), "latin1").matchAll(/\/Subtype\s*\/Image[\s\S]{0,300}?\/Height\s+(\d+)/g)].map((m) => Number(m[1]));
    assert.ok(heights("interior.pdf").includes(3000), "本文は元の解像度のまま");
    const k = heights("kindle.pdf");
    assert.ok(k.length > 0 && k.every((h) => h <= 2560), `Kindle の画像の高さ: ${k}`);
    assert.ok(/\/DCTDecode/.test(fs.readFileSync(path.join(r.out, "kindle.pdf"), "latin1")), "JPEG ではない");
  });
};
