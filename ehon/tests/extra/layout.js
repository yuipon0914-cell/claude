"use strict";
const assert = require("assert");
const os = require("os");
const fixture = require("./fixture");
const series = require("../../data/series.json");
const { renderInterior, renderCover, renderKindleCover } = require("../../lib/layout");

const opts = (kindle) => ({ imagesDir: os.tmpdir() + "/no-such-dir", fontPath: "/fonts/x.ttf", kindle });
const pageHtml = (html, n) => html.split(`data-page="${n}"`)[1].split('data-page="')[0];

module.exports = (test) => {
  test("組版：ページがちょうど32", () => assert.strictEqual(renderInterior(fixture(), opts(false)).match(/data-page="/g).length, 32));
  test("組版：本文13見開きの文字がすべて入る", () => {
    const html = renderInterior(fixture(), opts(false));
    for (const s of fixture().spreads) assert.ok(html.includes(s.text), s.text);
  });
  test("組版：p28–29 におうちの方へ（質問3つと注意書き）", () => {
    const html = renderInterior(fixture(), opts(false));
    const p = pageHtml(html, 28) + pageHtml(html, 29);
    for (const q of fixture().parents.questions) assert.ok(p.includes(q), q);
    assert.ok(p.includes("特定の金融商品をすすめるものではありません"));
  });
  test("組版：p30 に全10巻のタイトルと次の巻", () => {
    const p = pageHtml(renderInterior(fixture(1), opts(false)), 30);
    for (const b of series.books) assert.ok(p.includes(b.title), b.title);
    assert.ok(p.includes("つぎは"));
  });
  test("組版：第10巻の p30 はおしまいの案内", () => {
    const p = pageHtml(renderInterior(fixture(10), opts(false)), 30);
    assert.ok(p.includes("おしまい"));
    assert.ok(!p.includes("つぎは"));
  });
  test("組版：p31 に画像生成AIの明記", () => assert.ok(pageHtml(renderInterior(fixture(), opts(false)), 31).includes("画像生成AI")));
  test("組版：画像なしなら仮の枠が13見開き×2ページ", () =>
    assert.strictEqual(renderInterior(fixture(), opts(false)).match(/class="placeholder"/g).length, 26));
  test("組版：印刷用は 8.625in × 8.75in", () => {
    const html = renderInterior(fixture(), opts(false));
    assert.ok(html.includes("width: 8.625in") && html.includes("height: 8.75in"));
  });
  test("組版：Kindle 用は 8.5in × 8.5in", () => {
    const html = renderInterior(fixture(), opts(true));
    assert.ok(html.includes("width: 8.5in") && html.includes("height: 8.5in"));
    assert.ok(!html.includes("8.625in"));
  });
  test("表紙：幅 17.3251in・高さ 8.75in でタイトル入り", () => {
    const html = renderCover(fixture(), { imagesDir: os.tmpdir(), fontPath: "/f.ttf", pages: 32 });
    assert.ok(html.includes("width: 17.3251in") && html.includes("height: 8.75in"));
    assert.ok(html.includes(fixture().title));
  });
  test("Kindle 表紙：8.5in 角でタイトル入り", () => {
    const html = renderKindleCover(fixture(), { imagesDir: os.tmpdir(), fontPath: "/f.ttf" });
    assert.ok(html.includes("width: 8.5in") && html.includes(fixture().title));
  });
  test("組版：本文の文字は HTML として安全に入る", () => {
    const ms = fixture();
    ms.parents.body = ["<script>x</script>"];
    assert.ok(!renderInterior(ms, opts(false)).includes("<script>x"));
  });
};
