"use strict";
const assert = require("assert");
const characters = require("../../data/characters.json");
const style = require("../../data/style.json");
const { buildPrompt, buildChecklist, renderPromptsMarkdown } = require("../../lib/prompts");

const IDS = ["pokke", "momoba", "mimi", "kira", "dosshiri", "chuchi", "tsuchio", "bunta", "dan", "pichon", "jay", "kon"];
const byId = (id) => characters.find((c) => c.id === id);
const spread = { text: "ポッケは にんじんを みつけました。", scene: "ポッケがミミのにんじん畑をのぞく", characters: ["pokke", "mimi"], shot: "medium" };

module.exports = (test) => {
  test("キャラ：ID が12個ちょうど", () => assert.deepStrictEqual(characters.map((c) => c.id), IDS));
  test("キャラ：全員 look と marks を持つ", () => {
    for (const c of characters) {
      assert.ok(c.look && c.look.length > 20, c.id);
      assert.ok(Array.isArray(c.marks) && c.marks.length > 0, c.id);
    }
  });
  test("キャラ：ポッケの目印に緑のマフラー", () => assert.ok(byId("pokke").marks.some((m) => m.includes("緑のマフラー"))));
  test("プロンプト：出るキャラの look・画風・禁止事項を含む", () => {
    const p = buildPrompt(spread, characters, style);
    assert.ok(p.includes(byId("pokke").look));
    assert.ok(p.includes(byId("mimi").look));
    assert.ok(p.includes(style.style));
    assert.ok(p.includes("no text"));
    assert.ok(p.includes("keep the center vertical strip free of faces"));
  });
  test("プロンプト：出ないキャラの look は含まない", () => assert.ok(!buildPrompt(spread, characters, style).includes(byId("kon").look)));
  test("チェック表：出るキャラの目印がすべて入る", () => {
    const list = buildChecklist(spread, characters);
    for (const m of [...byId("pokke").marks, ...byId("mimi").marks]) assert.ok(list.includes(m), m);
  });
  test("プロンプト一覧：13見開き分の見出しがある", () => {
    const ms = { volume: 1, title: "ポッケと こうかんこ", spreads: Array(13).fill(spread) };
    const md = renderPromptsMarkdown(ms, characters, style);
    assert.strictEqual((md.match(/^## 見開き/gm) || []).length, 13);
    assert.ok(md.includes("表紙"));
  });
};
