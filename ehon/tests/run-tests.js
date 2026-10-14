/*
 * 絵本シリーズのテスト（依存なし）。
 * 実行: node ehon/tests/run-tests.js
 *   PDF 書き出しのテストは Playwright が見つかるときだけ実行する（NODE_PATH=$(npm root -g)）。
 */
"use strict";
const assert = require("assert");
const path = require("path");

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const near = (a, b, eps = 1e-4) => assert.ok(Math.abs(a - b) < eps, `${a} は ${b} に近くない`);

const kdp = require("../lib/kdp");
const { checkSpreadText } = require("../lib/text-rules");
const { validateManuscript } = require("../lib/manuscript");

// ---- 寸法 ----
test("背幅：32ページで 0.0751in", () => near(kdp.spineWidthIn(32), 0.0751));
test("表紙：32ページで 17.3251in × 8.75in", () => {
  const c = kdp.coverSizeIn(32);
  near(c.width, 17.3251);
  near(c.height, 8.75);
});
test("本文ページ：8.625in × 8.75in", () => assert.deepStrictEqual(kdp.interiorPageSizeIn(), { width: 8.625, height: 8.75 }));
test("dpi：3000px を 10in で 300", () => assert.strictEqual(kdp.dpi(3000, 10), 300));

// ---- 本文の文字 ----
test("本文：正しい文は合格", () => assert.deepStrictEqual(checkSpreadText("ポッケは どんぐりを みつけました。"), []));
test("本文：漢字はエラー", () => assert.ok(checkSpreadText("ポッケは 森へ").some((e) => e.includes("使えない文字"))));
test("本文：わかち書きなしはエラー", () =>
  assert.ok(checkSpreadText("ぽっけはどんぐりをみつけましたよかったね").some((e) => e.includes("わかち書き"))));
test("本文：41字はエラー", () => assert.ok(checkSpreadText("あ".repeat(20) + " " + "い".repeat(21)).some((e) => e.includes("40字"))));
test("本文：40字は合格", () => assert.deepStrictEqual(checkSpreadText("あ".repeat(20) + " " + "い".repeat(20)), []));
test("本文：空はエラー", () => assert.ok(checkSpreadText("").length > 0));

// ---- 原稿 ----
const IDS = ["pokke", "momoba", "mimi"];
function sample() {
  return {
    volume: 1,
    title: "ポッケと こうかんこ",
    guest: "mimi",
    learning: "お金は交換の道具",
    spreads: Array.from({ length: 13 }, (_, i) => ({
      text: "ポッケは どんぐりを みつけました。",
      scene: `場面${i + 1}`,
      characters: ["pokke"],
      shot: "wide",
    })),
    parents: { heading: "見出し", body: ["説明です。"], questions: ["一つ目？", "二つ目？", "三つ目？"] },
  };
}
test("原稿：正常な見本は合格", () => assert.deepStrictEqual(validateManuscript(sample(), IDS), []));
test("原稿：見開き12個はエラー", () => {
  const ms = sample();
  ms.spreads.pop();
  assert.ok(validateManuscript(ms, IDS).some((e) => e.includes("13")));
});
test("原稿：質問2つはエラー", () => {
  const ms = sample();
  ms.parents.questions.pop();
  assert.ok(validateManuscript(ms, IDS).some((e) => e.includes("質問")));
});
test("原稿：未知のキャラはエラー", () => {
  const ms = sample();
  ms.spreads[3].characters = ["tanuki"];
  assert.ok(validateManuscript(ms, IDS).some((e) => e.includes("tanuki")));
});
test("原稿：未知のゲストはエラー", () => {
  const ms = sample();
  ms.guest = "tanuki";
  assert.ok(validateManuscript(ms, IDS).some((e) => e.includes("tanuki")));
});
test("原稿：本文に漢字があると見開き番号つきでエラー", () => {
  const ms = sample();
  ms.spreads[4].text = "ポッケは 森へ";
  assert.ok(validateManuscript(ms, IDS).some((e) => e.includes("見開き5")));
});
for (const where of ["scene", "parents"]) {
  test(`原稿：${where} に「円」があるとエラー`, () => {
    const ms = sample();
    if (where === "scene") ms.spreads[0].scene = "100円をはらう";
    else ms.parents.body.push("1000円を貯金しましょう。");
    assert.ok(validateManuscript(ms, IDS).some((e) => e.includes("円")));
  });
}
test("原稿：shot が不正ならエラー", () => {
  const ms = sample();
  ms.spreads[0].shot = "zoom";
  assert.ok(validateManuscript(ms, IDS).some((e) => e.includes("shot")));
});

// ---- 追加のテストはここから下（後の作業で増やす） ----
const extra = path.join(__dirname, "extra");
for (const f of ["prompts.js", "layout.js", "build.js"]) {
  try {
    require(path.join(extra, f))(test);
  } catch (e) {
    if (e.code !== "MODULE_NOT_FOUND" || !String(e.message).includes(path.join(extra, f))) throw e;
  }
}

(async () => {
  let fail = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`ok   ${t.name}`);
    } catch (e) {
      fail++;
      console.log(`FAIL ${t.name}\n     ${e.message}`);
    }
  }
  console.log(`\n${tests.length - fail}/${tests.length} passed`);
  process.exit(fail ? 1 : 0);
})();
