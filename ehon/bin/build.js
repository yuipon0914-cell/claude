#!/usr/bin/env node
/*
 * 1巻分の入稿ファイルを書き出す。
 *   node bin/build.js 1        → books/vol01.json と books/vol01/images/ から dist/vol01/ へ
 *   node bin/build.js --book <json> --images <dir> --out <dir>
 * 書き出すもの：interior.pdf（本文・裁ち落としあり）、cover.pdf（表紙）、kindle.pdf、kindle-cover.jpg
 * 文字が枠からはみ出したら失敗する。絵の解像度不足・比率違いは警告する。
 * Playwright は NODE_PATH=$(npm root -g) などで読めるようにしておく。
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const kdp = require("../lib/kdp");
const { ROOT, characterIds, bookFile } = require("../lib/books");
const { validateManuscript } = require("../lib/manuscript");
const { renderInterior, renderCover, renderKindleCover } = require("../lib/layout");
const { imageSize } = require("../lib/images");
const series = require("../data/series.json");

const FONT = path.join(ROOT, "fonts", "ZenMaruGothic-Medium.ttf");
const KINDLE_COVER_PX = 2560;

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) a[argv[i].slice(2)] = argv[++i];
    else a.volume = argv[i];
  }
  if (a.volume) {
    const book = bookFile(Number(a.volume));
    const name = path.basename(book, ".json");
    a.book ||= book;
    a.images ||= path.join(path.dirname(book), name, "images");
    a.out ||= path.join(ROOT, "dist", name);
  }
  if (!a.book || !a.images || !a.out) throw new Error("使い方: node bin/build.js <巻番号>  または  --book <json> --images <dir> --out <dir>");
  return a;
}

// 絵の解像度と比率を調べて、警告文を返す
function checkImages(imagesDir) {
  const warnings = [];
  const targets = [
    ...Array.from({ length: 13 }, (_, i) => ({ name: `s${String(i + 1).padStart(2, "0")}`, w: kdp.TRIM * 2 + kdp.BLEED * 2, h: kdp.TRIM + kdp.BLEED * 2 })),
    { name: "cover", w: kdp.TRIM + kdp.BLEED, h: kdp.TRIM + kdp.BLEED * 2 },
  ];
  for (const t of targets) {
    const file = [".png", ".jpg", ".jpeg"].map((e) => path.join(imagesDir, t.name + e)).find((f) => fs.existsSync(f));
    if (!file) {
      warnings.push(`${t.name}：絵がありません（仮の枠で組みます）`);
      continue;
    }
    const size = imageSize(file);
    if (!size) {
      warnings.push(`${t.name}：画像の大きさを読めません`);
      continue;
    }
    // 絵は枠いっぱいに切り抜いて置くので、短い辺の側で実効 dpi が決まる
    const eff = Math.min(kdp.dpi(size.width, t.w), kdp.dpi(size.height, t.h));
    const line = `${t.name}：${size.width}×${size.height}px、実効 ${eff}dpi`;
    warnings.push(eff < 300 ? `${line}（300dpi 未満。アップスケールしてください）` : line);
    const want = t.w / t.h;
    const ratio = size.width / size.height;
    if (Math.abs(ratio - want) / want > 0.08)
      warnings.push(`${t.name}：比率が ${ratio.toFixed(2)}:1 です（${want.toFixed(2)}:1 が必要。中央を切り抜きます）`);
  }
  return warnings;
}

async function render(browser, html, out, pdfSize) {
  const page = await browser.newPage();
  const tmp = out.replace(/\.[a-z]+$/, ".html");
  fs.writeFileSync(tmp, html);
  await page.goto("file://" + tmp);
  await page.evaluate(() => document.fonts.ready);
  const overflows = await page.evaluate(() =>
    [...document.querySelectorAll(".text, .small")]
      .filter((el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.closest("[data-page]")?.dataset.page || "表紙"),
  );
  if (pdfSize) await page.pdf({ path: out, width: `${pdfSize.width}in`, height: `${pdfSize.height}in`, printBackground: true, preferCSSPageSize: true });
  await page.close();
  fs.unlinkSync(tmp);
  return overflows;
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const ms = JSON.parse(fs.readFileSync(a.book, "utf8"));
  const errors = validateManuscript(ms, characterIds);
  if (errors.length) {
    console.error(`原稿にエラーがあります：\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
  fs.mkdirSync(a.out, { recursive: true });
  for (const w of checkImages(a.images)) console.log(w);
  if (!series.author) console.log("注意：data/series.json の author（著者名）が空です");

  const browser = await chromium.launch();
  const overflow = [];
  try {
    const common = { imagesDir: a.images, fontPath: FONT };
    const pageSize = kdp.interiorPageSizeIn();
    overflow.push(...(await render(browser, renderInterior(ms, { ...common, kindle: false }), path.join(a.out, "interior.pdf"), pageSize)));
    overflow.push(...(await render(browser, renderCover(ms, { ...common, pages: kdp.PAGES }), path.join(a.out, "cover.pdf"), kdp.coverSizeIn(kdp.PAGES))));
    overflow.push(...(await render(browser, renderInterior(ms, { ...common, kindle: true }), path.join(a.out, "kindle.pdf"), { width: kdp.TRIM, height: kdp.TRIM })));

    const cssPx = kdp.TRIM * 96;
    const page = await browser.newPage({ viewport: { width: cssPx, height: cssPx }, deviceScaleFactor: KINDLE_COVER_PX / cssPx });
    const tmp = path.join(a.out, "kindle-cover.html");
    fs.writeFileSync(tmp, renderKindleCover(ms, common));
    await page.goto("file://" + tmp);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(a.out, "kindle-cover.jpg"), type: "jpeg", quality: 92 });
    fs.unlinkSync(tmp);
  } finally {
    await browser.close();
  }
  const pages = [...new Set(overflow)];
  if (pages.length) {
    console.error(`文字が枠からはみ出しています：ページ ${pages.join(", ")}`);
    process.exit(1);
  }
  console.log(`書き出しました：${path.relative(process.cwd(), a.out) || a.out}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
