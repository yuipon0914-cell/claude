"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const fixture = require("./fixture");
const png = require("./png");
const { imageSize } = require("../../lib/images");

const BUILD = path.join(__dirname, "../../bin/build.js");
let hasPlaywright = true;
try {
  require.resolve("playwright");
} catch {
  hasPlaywright = false;
}

function run(ms, images = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ehon-"));
  const book = path.join(dir, "vol01.json");
  fs.writeFileSync(book, JSON.stringify(ms));
  fs.mkdirSync(path.join(dir, "images"));
  for (const [name, buf] of Object.entries(images)) fs.writeFileSync(path.join(dir, "images", name), buf);
  const out = path.join(dir, "out");
  const r = spawnSync(process.execPath, [BUILD, "--book", book, "--images", path.join(dir, "images"), "--out", out], { encoding: "utf8", env: process.env });
  return { code: r.status, log: r.stdout + r.stderr, out };
}
const pdf = (f) => fs.readFileSync(f, "latin1");
const pageCount = (s) => (s.match(/\/Type\s*\/Page[^s]/g) || []).length;
const mediaBoxes = (s) => [...s.matchAll(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g)].map((m) => [Number(m[1]), Number(m[2])]);

module.exports = (test) => {
  test("画像サイズ：PNG のヘッダから読む", () => {
    const f = path.join(os.tmpdir(), "ehon-size.png");
    fs.writeFileSync(f, png(120, 60));
    assert.deepStrictEqual(imageSize(f), { width: 120, height: 60 });
  });
  if (!hasPlaywright) {
    test("PDF 書き出し（Playwright が無いので省略）", () => {});
    return;
  }
  let ok;
  const get = () => (ok ||= run(fixture()));
  test("PDF：build が成功する", () => assert.strictEqual(get().code, 0, get().log));
  test("PDF：本文は32ページ・621×630pt", () => {
    const s = pdf(path.join(get().out, "interior.pdf"));
    assert.strictEqual(pageCount(s), 32);
    for (const [w, h] of mediaBoxes(s)) assert.ok(Math.abs(w - 621) < 1 && Math.abs(h - 630) < 1, `${w}x${h}`);
  });
  test("PDF：表紙は 17.3251in×72 幅・630pt 高さ", () => {
    const [[w, h]] = mediaBoxes(pdf(path.join(get().out, "cover.pdf")));
    assert.ok(Math.abs(w - 17.3251 * 72) < 1 && Math.abs(h - 630) < 1, `${w}x${h}`);
  });
  test("PDF：Kindle 用は 612×612pt で32ページ", () => {
    const s = pdf(path.join(get().out, "kindle.pdf"));
    assert.strictEqual(pageCount(s), 32);
    for (const [w, h] of mediaBoxes(s)) assert.ok(Math.abs(w - 612) < 1 && Math.abs(h - 612) < 1, `${w}x${h}`);
  });
  test("PDF：Zen Maru Gothic が埋め込まれている", () => {
    for (const f of ["interior.pdf", "cover.pdf", "kindle.pdf"]) {
      const s = pdf(path.join(get().out, f));
      assert.ok(/\/BaseFont\s*\/[A-Z]{6}\+ZenMaruGothic/.test(s), f);
      assert.ok(/\/FontFile2|\/FontFile3/.test(s), f);
    }
  });
  test("Kindle 表紙：2560×2560px の JPEG", () => assert.deepStrictEqual(imageSize(path.join(get().out, "kindle-cover.jpg")), { width: 2560, height: 2560 }));
  test("PDF：文字があふれたら失敗し、ページ番号を出す", () => {
    const ms = fixture();
    ms.parents.body = ["とても長い説明の文章です。".repeat(150)];
    const r = run(ms);
    assert.notStrictEqual(r.code, 0);
    assert.ok(/ページ 28(,|$)/m.test(r.log) && r.log.includes("はみ出"), r.log);
  });
  test("PDF：解像度不足と比率違いを警告する", () => {
    const r = run(fixture(), { "s01.png": png(1000, 500), "s02.png": png(1000, 1000) });
    assert.strictEqual(r.code, 0, r.log);
    const s01 = r.log.split("\n").filter((l) => l.includes("s01"));
    const s02 = r.log.split("\n").filter((l) => l.includes("s02"));
    assert.ok(s01.some((l) => l.includes("300dpi 未満")), r.log);
    assert.ok(!s01.some((l) => l.includes("比率")), r.log);
    assert.ok(s02.some((l) => l.includes("比率")), r.log);
  });
};
