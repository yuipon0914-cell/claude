/*
 * ブラウザでの通し確認（Playwright）。
 * 実行: node tests/e2e.js [--shots ディレクトリ]
 *   Playwright が見つからない場合は NODE_PATH に playwright のある node_modules を指定する。
 * ローカルの静的サーバーを内蔵しており、外部には接続しない（YouTube の iframe 読み込みは遮断）。
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
    await ctx.route(/youtube/, (r) => r.abort());
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && !/youtube|ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
    page.on("dialog", (d) => d.accept());
    return { ctx, page };
  }
  const shot = async (page, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name + ".png"), fullPage: false }); } };
  const go = async (page, hash) => { await page.goto(base + hash); await page.waitForSelector("#app > *"); };

  // ---------------- デスクトップ：LEVEL 01 を画面操作だけで解決 ----------------
  const { ctx, page } = await newPage({ width: 1366, height: 900 });
  await step("ホームが表示される", async () => {
    await go(page, "#/");
    assert((await page.textContent("h1")).includes("HACKER LAB"));
    await shot(page, "01-home");
  });
  await step("事件一覧に30件、LEVEL 01 だけ挑戦可能", async () => {
    await go(page, "#/cases");
    eq(await page.locator(".case-card").count(), 30);
    eq(await page.locator(".case-card .badge.b-available").count(), 1);
    eq(await page.locator(".case-card .badge.b-trial").count(), 29);
    await shot(page, "02-cases");
  });
  await step("検索と絞り込み", async () => {
    await page.fill("#case-q", "Webhook");
    assert((await page.locator(".case-card h3").allTextContents()).includes("届いていない入金通知"));
    await page.fill("#case-q", "");
    await page.selectOption("#case-ch", "6");
    eq(await page.locator(".case-card").count(), 5);
    await page.selectOption("#case-ch", "all");
  });

  await step("LEVEL 01：講義の位置とチェック結果が保存される", async () => {
    await go(page, "#/case/case01/lecture");
    await page.click('button[data-action="lecture-pos"][data-pos="1"]');
    assert(await page.locator("pre.code").count() > 0, "コード例");
    await shot(page, "03-lecture-code");
    await page.click('button[data-action="lecture-pos"][data-pos="3"]');
    await page.click('button[data-action="quiz"][data-q="0"][data-o="0"]');
    assert(await page.locator(".feedback.ng").count() === 1, "誤答の解説");
    await page.click('button[data-action="quiz"][data-q="0"][data-o="1"]');
    await page.click('button[data-action="quiz"][data-q="1"][data-o="1"]');
    eq(await page.locator(".feedback.ok").count(), 2);
    await page.reload(); await page.waitForSelector(".lecture");
    eq(await page.locator(".seg button.on").innerText(), "4. 理解度チェック");
    eq(await page.locator(".feedback.ok").count(), 2);
  });
  await step("証拠不足では解決認定ボタンが押せない", async () => {
    await go(page, "#/case/case01/report");
    assert(await page.locator('button[data-action="certify"]').isDisabled());
  });
  await step("資料を調べて証拠ボードに保存", async () => {
    await go(page, "#/case/case01/evidence");
    for (const id of ["e1", "e2", "e3", "e4"]) await page.click(`button[data-action="ev-open"][data-ev="${id}"]`);
    for (const id of ["e1", "e2", "e3"]) await page.click(`button[data-action="board-toggle"][data-ev="${id}"]`);
    await shot(page, "04-evidence");
    await go(page, "#/case/case01/board");
    eq(await page.locator(".pin").count(), 3);
  });
  await step("原因特定：誤答は理由付きで不合格、正答で成立", async () => {
    await go(page, "#/case/case01/cause");
    await page.check('input[data-action="hyp"][value="h2"]');
    for (const id of ["e1", "e2", "e3"]) await page.check(`input[data-action="sup"][value="${id}"]`);
    await page.click('button[data-action="cause-submit"]');
    assert(await page.locator(".result.ng").count() === 1, "誤答が不合格");
    await page.check('input[data-action="hyp"][value="h1"]');
    await page.click('button[data-action="cause-submit"]');
    assert(await page.locator(".result.ok").count() === 1, "正答で成立");
  });
  await step("コード検証：初期コードは不合格、修正で全合格", async () => {
    await go(page, "#/case/case01/code");
    await page.click('button[data-action="run-tests"]');
    assert(await page.locator("table.tests tr.fail").count() > 0, "初期は失敗");
    await page.fill("#code-editor", 'const isOfficialHost = linkHost === officialHost;\nif (isOfficialHost && !asksPayment) {\n  console.log("許可:", linkHost);\n  return true;\n} else {\n  return false;\n}');
    await page.click('button[data-action="run-tests"]');
    eq(await page.locator("table.tests tr.fail").count(), 0);
    assert((await page.locator(".result.ok").innerText()).includes("すべてのテストに合格"));
    assert((await page.locator(".log").first().innerText()).includes("許可: app.minato-shop.example"), "console.log の表示");
    await shot(page, "05-code");
  });
  await step("被害対応：不適切な対応は警告、取り消し可能", async () => {
    await go(page, "#/case/case01/response");
    await page.click('button[data-action="act"][data-id="a3"]');
    assert(await page.locator(".action.bad").count() === 1);
    await page.click('button[data-action="act"][data-id="a3"]');
    await page.click('button[data-action="act"][data-id="a1"]');
    await page.click('button[data-action="act"][data-id="a2"]');
    eq(await page.locator(".action.done").count(), 2);
  });
  await step("レポート提出 → 解決認定 → LEVEL 02 解放", async () => {
    await go(page, "#/case/case01/report");
    await page.check('input[data-action="residual"][value="0"]');
    await page.check('input[data-action="residual"][value="1"]');
    await page.click('button[data-action="report-submit"]');
    const btn = page.locator('button[data-action="certify"]');
    assert(!(await btn.isDisabled()), "条件がそろったのに押せない");
    await btn.click();
    assert((await page.locator(".certify .banner").innerText()).includes("事件解決"));
    await shot(page, "06-report");
    await go(page, "#/cases");
    eq(await page.locator(".case-card .badge.b-solved").count(), 1);
    eq(await page.locator(".case-card .badge.b-available").count(), 1);
  });
  await step("NOVA は模擬AIと明示して応答する", async () => {
    await go(page, "#/case/case02/brief");
    await page.click('button[data-action="nova"][data-kind="next"]');
    const t = await page.locator(".nova-out").innerText();
    assert(t.includes("次の一手") && t.includes("模擬AI"));
  });
  await step("やり直し：作業は消え、解決記録は残る", async () => {
    await go(page, "#/case/case01/report");
    await page.click('button[data-action="reset-case"]');
    await page.click('button[data-action="reset-case"][data-confirmed="1"]');
    await page.waitForFunction(() => location.hash.includes("brief"));
    await go(page, "#/case/case01/board");
    eq(await page.locator(".pin").count(), 0);
    await go(page, "#/cases");
    eq(await page.locator(".case-card .badge.b-solved").count(), 1);
  });
  await step("LEVEL 30（体験モード）：銀行の回収額と防御シナリオ", async () => {
    await go(page, "#/case/case30/response");
    assert((await page.locator(".banner.warn").first().innerText()).includes("体験モード"));
    for (const id of ["stop701", "freeze702"]) await page.click(`button[data-action="act"][data-id="${id}"]`);
    assert((await page.locator(".money .frozen strong").innerText()).includes("400,000"), "凍結中40万");
    eq((await page.locator(".money .recovered strong").innerText()).trim(), "0円");
    await page.click('button[data-action="act"][data-id="return702"]');
    await page.click('button[data-action="act"][data-id="trace703"]');
    eq((await page.locator(".money .stopped strong").innerText()).trim(), "300,000円");
    eq((await page.locator(".money .recovered strong").innerText()).trim(), "400,000円");
    eq((await page.locator(".money .open strong").innerText()).trim(), "500,000円");
    await page.check('input[data-action="defense"][value="blockNewDevices"]');
    assert((await page.locator(".scenarios li.ng").allInnerTexts()).some((t) => t.includes("正当な利用を止めてしまった")));
    await page.uncheck('input[data-action="defense"][value="blockNewDevices"]');
    for (const id of ["bindTxAuth", "holdHighRisk", "instantRevoke", "aggregateAlerts", "falsePositiveCheck"]) await page.check(`input[data-action="defense"][value="${id}"]`);
    eq(await page.locator(".scenarios li.ng").count(), 0);
    await shot(page, "07-bank");
  });
  await step("動画・基礎実践・単語検索", async () => {
    await go(page, "#/videos");
    assert(await page.locator(".video").count() >= 8, "日本語の動画が初期表示");
    assert(await page.locator(".video .reputation").count() === await page.locator(".video").count(), "評判の根拠");
    await page.selectOption("#video-lang", "all");
    assert(await page.locator('.video a[href^="https://www.youtube.com/watch?v="]').count() >= 15, "YouTubeで開くリンク");
    await page.click(".video .play");
    eq(await page.locator(".player iframe").count(), 1);
    await shot(page, "08-videos");
    await go(page, "#/basics/b03");
    await page.fill("#basics-editor", "if (age >= 18) {\n  return true;\n} else {\n  return false;\n}");
    await page.click('button[data-action="basics-run"]');
    assert((await page.locator(".result.ok").count()) === 1);
    await go(page, "#/glossary");
    await page.fill("#glossary-q", "べきとう");
    assert((await page.locator(".term h3").first().innerText()).includes("冪等性"));
    await page.fill("#glossary-q", "authorization");
    assert((await page.locator(".term h3").first().innerText()).includes("認可"));
  });
  await step("全30事件の全工程が表示できる（講義4部・資料・コード実行）", async () => {
    const ids = await page.evaluate(() => window.HL.CASES.map((c) => c.id));
    for (const id of ids) {
      for (const s of ["brief", "lecture", "evidence", "board", "cause", "code", "response", "report"]) {
        await go(page, `#/case/${id}/${s}`);
        assert(await page.locator(".step-title").count() === 1, `${id}/${s}`);
      }
      await go(page, `#/case/${id}/lecture`);
      for (const pos of [1, 2, 3]) await page.click(`.seg button[data-pos="${pos}"]`);
      await go(page, `#/case/${id}/code`);
      await page.click('button[data-action="run-tests"]');
      assert(await page.locator("table.tests tr.fail").count() > 0, `${id}: 初期コードが失敗として表示される`);
    }
  });
  await ctx.close();

  // ---------------- スマートフォン：横にはみ出さない ----------------
  const mobile = await newPage({ width: 375, height: 760 });
  const mp = mobile.page;
  const pages = ["#/", "#/cases", "#/basics", "#/videos", "#/glossary",
    ...["brief", "lecture", "evidence", "board", "cause", "code", "response", "report"].map((s) => `#/case/case30/${s}`),
    "#/case/case09/evidence", "#/case/case19/evidence"];
  await step("スマートフォン幅で横スクロールが発生しない", async () => {
    const bad = [];
    for (const h of pages) {
      await go(mp, h);
      if (h.includes("evidence")) for (const b of await mp.locator('button[data-action="ev-open"]').all()) await b.click();
      if (h.endsWith("/lecture")) await mp.click('button[data-action="lecture-pos"][data-pos="1"]');
      if (h.endsWith("/code")) await mp.click('button[data-action="run-tests"]');
      const w = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      if (w.sw > w.cw + 1) bad.push(`${h} (${w.sw} > ${w.cw})`);
    }
    assert(!bad.length, "はみ出し: " + bad.join(", "));
  });
  await step("スマートフォン：工程タブと NOVA の開閉", async () => {
    await go(mp, "#/case/case02/brief");
    assert(await mp.locator(".desk-steps a").count() === 8);
    assert(!(await mp.locator(".nova-body").isVisible()));
    await mp.click(".nova-toggle");
    assert(await mp.locator(".nova-body").isVisible());
    await shot(mp, "09-mobile-case");
    await go(mp, "#/case/case30/response");
    await shot(mp, "10-mobile-bank");
  });
  await mobile.ctx.close();

  await step("JavaScript のエラーが発生していない", async () => assert(!errors.length, errors.join(" | ")));

  await browser.close();
  server.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

function eq(a, b) { if (a !== b) throw new Error(`expected ${JSON.stringify(b)} but got ${JSON.stringify(a)}`); }
