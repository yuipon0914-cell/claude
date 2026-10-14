/*
 * ピコラボ — ブラウザでの通し確認（Playwright）。
 * 実行: node kids/tests/e2e.js [--shots ディレクトリ]
 *   Playwright が見つからない場合は NODE_PATH に playwright のある node_modules を指定する。
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const shotsIdx = process.argv.indexOf("--shots");
const SHOTS = shotsIdx > 0 ? process.argv[shotsIdx + 1] : null;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = path.join(ROOT, p === "/" ? "index.html" : p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

let passed = 0, failed = 0;
async function step(name, fn) {
  try { await fn(); passed++; console.log("✓", name); } catch (e) { failed++; console.log("✕", name, "\n   ", e.message.split("\n")[0]); }
}
const assert = (c, m) => { if (!c) throw new Error(m || "assertion failed"); };

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const errors = [];
  async function newPage(viewport) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    return { ctx, page };
  }
  const shot = async (page, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name + ".png"), fullPage: true }); } };
  const go = async (page, hash) => { await page.goto(base + hash); await page.waitForSelector("#app > *"); };
  const add = (page, t) => page.click(`.palette [data-t="${t}"]`);
  const runAndWait = async (page) => { await page.click('[data-action="run"]'); await page.waitForSelector("#result .result", { timeout: 15000 }); };

  const { page } = await newPage({ width: 1280, height: 860 });

  await step("ホームに 2つの しま と シール", async () => {
    await go(page, "#/");
    assert((await page.textContent("h1")).includes("ピコラボ"));
    assert(await page.locator(".island").count() === 2);
    assert((await page.textContent("#stickers")).includes("0"));
    await shot(page, "01-home");
  });
  await step("プログラミングの しま：13ステージ、1だけ ひらいている", async () => {
    await go(page, "#/code");
    assert(await page.locator(".lv").count() === 13);
    assert(await page.locator("a.lv").count() === 1);
    await shot(page, "02-code-island");
  });
  await step("ステージ1：まちがえると とまり、ただしく ならべると ほし3つ", async () => {
    await go(page, "#/code/L1");
    await add(page, "right");
    await runAndWait(page);
    assert((await page.textContent("#result")).includes("とちゅうで"), "short");
    await page.click('[data-action="again"]');
    await add(page, "right"); await add(page, "right");
    assert((await page.textContent(".count")).includes("3 / 5"));
    await runAndWait(page);
    assert((await page.textContent("#result")).includes("ゴール"));
    assert((await page.textContent(".big-stars")).startsWith("⭐⭐⭐"));
    await shot(page, "03-level1-clear");
  });
  await step("ステージ2が ひらき、シールが ふえる", async () => {
    await page.click("text=つぎへ");
    await page.waitForSelector(".lv-head");
    assert((await page.textContent("h1")).includes("うえに"));
    assert((await page.textContent("#stickers")).includes("2"));
  });
  await step("ブロックは 上限まで しか おけない", async () => {
    for (let i = 0; i < 5; i++) await add(page, "up");
    assert(await page.locator('.palette [data-t="up"]').isDisabled());
    assert(await page.locator("#program .pb-move").count() === 5);
    await page.click('[data-action="undo"]');
    assert(await page.locator("#program .pb-move").count() === 4);
    await page.click('[data-action="clear"]');
    assert(await page.locator("#program .pb-move").count() === 0);
  });

  // 体験のため、保存データで ステージ6まで クリアした ことにする
  await page.evaluate(() => localStorage.setItem("picolab.progress", JSON.stringify({ v: 1, levels: { L1: 3, L2: 3, L3: 3, L4: 3, L5: 3, L6: 3, L7: 3, L8: 3, L9: 3, L10: 3 }, ai: {} })));
  await page.reload();
  await step("くりかえし：かずを かえて ステージ7を クリア", async () => {
    await go(page, "#/code/L7");
    await add(page, "repeat");
    assert(await page.locator(".pb-repeat.is-open").count() === 1, "ひらいた くりかえし");
    await add(page, "right");
    for (let i = 0; i < 5; i++) await page.click(".rep-n");
    assert((await page.textContent(".rep-n")).includes("7"));
    await page.click('[data-action="close"]');
    await runAndWait(page);
    assert((await page.textContent("#result")).includes("ゴール"));
    await shot(page, "04-loop");
  });
  await step("むしとり：き に ぶつかる ブロックが 赤く ひかり、けして なおすと クリア", async () => {
    await go(page, "#/code/L11");
    assert(await page.locator("#program .pb-move").count() === 5);
    await runAndWait(page);
    assert((await page.textContent("#result")).includes("そと"));
    assert(await page.locator(".pb-move.bad").count() === 1);
    await shot(page, "05-bug");
    await page.click('[data-action="again"]');
    await page.click('#program [data-path="2"]'); // ⬆️ を けす
    await runAndWait(page);
    assert((await page.textContent("#result")).includes("ゴール"));
    await page.click('[data-action="reset"]');
    assert(await page.locator("#program .pb-move").count() === 5, "さいしょに もどす");
  });

  await step("AIに おしえよう：おしえる → ためす → ふりかえり → もういちど → できた", async () => {
    await go(page, "#/ai/teach");
    await page.click('[data-action="teach-start"]');
    const truth = { "りんご": "fruit", "にんじん": "veg", "バナナ": "fruit", "ブロッコリー": "veg", "みかん": "fruit", "じゃがいも": "veg" };
    for (let i = 0; i < 6; i++) {
      const name = (await page.textContent(".food span")).trim();
      await page.click(`[data-action="teach-label"][data-label="${truth[name]}"]`);
    }
    assert(await page.locator(".note-item").count() === 6);
    // ためす：トマト いがいは ⭕、トマトは ❌
    for (let i = 0; i < 6; i++) {
      const name = (await page.textContent(".food span")).trim();
      if (i === 0) await shot(page, "06-teach-test");
      await page.click(`[data-action="teach-judge"][data-ok="${name === "トマト" ? 0 : 1}"]`);
      if (name === "トマト") assert((await page.textContent("#app")).includes("トマトは やさい"));
      await page.click('[data-action="teach-next"]');
    }
    assert((await page.textContent("#app")).includes("6こ ちゅう 5こ"));
    await page.click('[data-action="teach-round2"]');
    for (let i = 0; i < 6; i++) { await page.click('[data-action="teach-judge"][data-ok="1"]'); await page.click('[data-action="teach-next"]'); }
    assert((await page.textContent(".score-row")).includes("6 / 6"));
    await shot(page, "07-teach-done");
  });
  await step("つぎは なに？：さいごの もんだいで AIが まちがえる", async () => {
    await go(page, "#/ai/pattern");
    const answers = ["🍌", "🐱", "🟡", "⛄", "🐔"];
    for (let i = 0; i < 5; i++) {
      await page.click(`[data-action="pat-pick"][data-c="${answers[i]}"]`);
      const vs = await page.locator(".vs > div").evaluateAll((els) => els.map((e) => e.className));
      assert(vs[0] === "ok", "きみ ⭕");
      assert(vs[1] === (i === 4 ? "ng" : "ok"), `ピコ ${i}`);
      if (i === 4) await shot(page, "08-pattern-ai-wrong");
      await page.click('[data-action="pat-next"]');
    }
    assert((await page.textContent("#app")).includes("5 / 5"));
  });
  await step("AIとの やくそく：⭕❌ と やくそくカード", async () => {
    await go(page, "#/ai/promise");
    const ans = [0, 0, 1, 1, 0, 1];
    for (const a of ans) { await page.click(`[data-action="pro-pick"][data-v="${a}"]`); assert((await page.textContent(".result")).includes("せいかい")); await page.click('[data-action="pro-next"]'); }
    assert(await page.locator(".promise-card li").count() === 6);
    await shot(page, "09-promise");
  });
  await step("AIの しま：3つ とも できた、シールに はんえい", async () => {
    await go(page, "#/ai");
    assert(await page.locator(".act-done").count() === 3);
    // L1〜L10（ほし3つ×10=20）＋ L11（ほし3つ=2）＋ AI 3 = 25
    assert((await page.textContent("#stickers")).includes("25"), await page.textContent("#stickers"));
  });
  await step("おうちの かた：説明と、2かい おして けす", async () => {
    await go(page, "#/parents");
    assert((await page.textContent("#app")).includes("外部のAIサービスには接続していません"));
    await page.click('[data-action="wipe"]');
    assert((await page.textContent("#stickers")).includes("25"), "1かい では けさない");
    await page.click('[data-action="wipe"]');
    assert((await page.textContent("#stickers")).includes("0"));
    await shot(page, "10-parents");
  });
  await step("ひらいていない ステージに URL で きても あそべない", async () => {
    await go(page, "#/code/L5");
    assert((await page.textContent("#app")).includes("まだ ひらいていない"));
  });

  // ---------------- スマートフォン ----------------
  const m = await newPage({ width: 375, height: 740 });
  await m.page.addInitScript(() => localStorage.setItem("picolab.progress", JSON.stringify({ v: 1, levels: { L1: 3, L2: 3, L3: 3, L4: 3, L5: 3, L6: 3, L7: 3, L8: 3, L9: 3, L10: 3, L11: 3, L12: 3 }, ai: {} })));
  for (const h of ["#/", "#/code", "#/code/L1", "#/code/L10", "#/code/L13", "#/ai", "#/ai/teach", "#/ai/pattern", "#/ai/promise", "#/parents"]) {
    await step(`スマホ幅で 横に はみださない ${h}`, async () => {
      await go(m.page, h);
      const over = await m.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(over <= 0, `はみだし ${over}px`);
    });
  }
  await step("スマホ：くりかえしの なかに いれて ステージ13を なおす", async () => {
    await go(m.page, "#/code/L13");
    await m.page.click('#program .rep-del[data-path="1"]');
    await m.page.click('#program .rep-del[data-path="1"]');
    await add(m.page, "repeat"); await add(m.page, "right"); await m.page.click('[data-action="close"]');
    await add(m.page, "repeat"); await add(m.page, "up");
    await runAndWait(m.page);
    assert((await m.page.textContent("#result")).includes("ゴール"), await m.page.textContent("#result"));
    await shot(m.page, "11-mobile-l13");
  });

  await step("JavaScript の エラーが ない", async () => assert(!errors.length, errors.join(" / ")));
  await browser.close();
  server.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
