#!/usr/bin/env node
/*
 * 1巻分の入稿ファイルを書き出す。
 *   node bin/build.js 1        → books/vol01.json と books/vol01/images/ から dist/vol01/ へ
 *   node bin/build.js --book <json> --images <dir> --out <dir>
 * 書き出すもの：interior.pdf（本文・裁ち落としあり）、cover.pdf（表紙）、kindle.pdf、kindle-cover.jpg
 * 文字が枠からはみ出したら失敗する（PDF は残さない）。絵の解像度不足・比率違いは警告する。
 *   --final 1 を付けると、警告（絵が無い・300dpi 未満・比率違い・著者名が空）も失敗にする。入稿用はこちらで書き出す。
 * Playwright は NODE_PATH=$(npm root -g) などで読めるようにしておく。
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");
const kdp = require("../lib/kdp");
const { ROOT, characterIds, bookFile, checkBookFile } = require("../lib/books");
const { validateManuscript } = require("../lib/manuscript");
const { renderInterior, renderCover, renderKindleCover } = require("../lib/layout");
const { checkImages, findImage, isProblem, IMAGE_NAMES } = require("../lib/images");
const series = require("../data/series.json");

const FONT = path.join(ROOT, "fonts", "ZenMaruGothic-Medium.ttf");
const KINDLE_COVER_PX = 2560;
const KINDLE_MAX_PX = 2560; // Kindle 用の絵の高さの上限（配信料が容量で決まるので、印刷用の大きな絵は縮小する）

// Kindle 用に、絵を縮小した JPEG のコピーを作り、そのフォルダを返す
async function kindleImages(browser, imagesDir, outDir) {
  const dir = path.join(outDir, ".kindle-images");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage();
  for (const name of IMAGE_NAMES) {
    const file = findImage(imagesDir, name);
    if (!file) continue;
    const mime = /\.png$/i.test(file) ? "image/png" : "image/jpeg";
    // file:// の画像は canvas から書き出せないので、data URL で渡す
    const src = `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
    const jpeg = await page.evaluate(
      async ({ src, max }) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const scale = Math.min(1, max / img.naturalHeight);
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL("image/jpeg", 0.85).split(",")[1];
      },
      { src, max: KINDLE_MAX_PX },
    );
    fs.writeFileSync(path.join(dir, name + ".jpg"), Buffer.from(jpeg, "base64"));
  }
  await page.close();
  return dir;
}

// Chromium は PDF のページ寸法を少し丸めるので、MediaBox を計算どおりの値に書きかえる。
// 数字の桁数を変えるとファイル内の位置がずれて PDF が壊れるので、同じ文字数で書く。
function fixMediaBox(file, size) {
  const want = [size.width * 72, size.height * 72];
  const fit = (value, original) => {
    if (!original.includes(".")) return Math.abs(Math.round(value) - value) < 0.01 && String(Math.round(value)).length === original.length ? String(Math.round(value)) : null;
    const decimals = original.length - String(Math.trunc(value)).length - 1;
    if (decimals < 1) return null;
    const out = value.toFixed(decimals);
    return out.length === original.length ? out : null;
  };
  let s = fs.readFileSync(file, "latin1");
  let failed = false;
  s = s.replace(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g, (all, w, h) => {
    const nw = fit(want[0], w);
    const nh = fit(want[1], h);
    if (!nw || !nh) {
      failed = true;
      return all;
    }
    return all.replace(`0 0 ${w} ${h}`, `0 0 ${nw} ${nh}`);
  });
  if (failed) console.log(`注意：${path.basename(file)} のページ寸法を補正できませんでした`);
  fs.writeFileSync(file, s, "latin1");
}

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

async function render(browser, html, out, pdfSize) {
  const page = await browser.newPage();
  const tmp = out.replace(/\.[a-z]+$/, ".html");
  fs.writeFileSync(tmp, html);
  await page.goto(pathToFileURL(tmp).href);
  await page.evaluate(() => document.fonts.ready);
  const overflows = await page.evaluate(() =>
    [...document.querySelectorAll(".text, .small")]
      .filter((el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.closest("[data-page]")?.dataset.page || "表紙"),
  );
  if (pdfSize) {
    await page.pdf({ path: out, width: `${pdfSize.width}in`, height: `${pdfSize.height}in`, printBackground: true, preferCSSPageSize: true });
    fixMediaBox(out, pdfSize);
  }
  await page.close();
  fs.unlinkSync(tmp);
  return overflows;
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const final = Boolean(a.final);
  const ms = JSON.parse(fs.readFileSync(a.book, "utf8"));
  const errors = [...validateManuscript(ms, characterIds), ...checkBookFile(a.book, ms)];
  if (errors.length) {
    console.error(`原稿にエラーがあります：\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
  const warnings = checkImages(a.images);
  for (const w of warnings) console.log(w);
  if (!series.author) console.log("注意：data/series.json の author（著者名）が空です");
  if (final) {
    const problems = [...warnings.filter(isProblem), ...(series.author ? [] : ["著者名が空です"])];
    if (problems.length) {
      console.error(`--final では、次の問題があると書き出せません：\n  ${problems.join("\n  ")}`);
      process.exit(1);
    }
  }

  // いったん一時フォルダに書き出し、はみ出しが無いときだけ out に移す
  fs.mkdirSync(a.out, { recursive: true });
  const work = fs.mkdtempSync(path.join(a.out, ".build-"));
  const browser = await chromium.launch();
  const overflow = [];
  try {
    const common = { imagesDir: a.images, fontPath: FONT };
    const pageSize = kdp.interiorPageSizeIn();
    overflow.push(...(await render(browser, renderInterior(ms, { ...common, kindle: false }), path.join(work, "interior.pdf"), pageSize)));
    overflow.push(...(await render(browser, renderCover(ms, { ...common, pages: kdp.PAGES }), path.join(work, "cover.pdf"), kdp.coverSizeIn(kdp.PAGES))));
    const kindle = { ...common, imagesDir: await kindleImages(browser, a.images, work) };
    overflow.push(...(await render(browser, renderInterior(ms, { ...kindle, kindle: true }), path.join(work, "kindle.pdf"), { width: kdp.TRIM, height: kdp.TRIM })));

    const cssPx = kdp.TRIM * 96;
    const page = await browser.newPage({ viewport: { width: cssPx, height: cssPx }, deviceScaleFactor: KINDLE_COVER_PX / cssPx });
    const tmp = path.join(work, "kindle-cover.html");
    fs.writeFileSync(tmp, renderKindleCover(ms, kindle));
    await page.goto(pathToFileURL(tmp).href);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(work, "kindle-cover.jpg"), type: "jpeg", quality: 92 });
  } finally {
    await browser.close();
  }
  const outputs = ["interior.pdf", "cover.pdf", "kindle.pdf", "kindle-cover.jpg"];
  const pages = [...new Set(overflow)];
  if (pages.length) {
    fs.rmSync(work, { recursive: true, force: true });
    // 前回うまく書き出せたファイルが残っていると、まちがえて入稿しかねないので消す
    for (const f of outputs) fs.rmSync(path.join(a.out, f), { force: true });
    console.error(`文字が枠からはみ出しています：ページ ${pages.join(", ")}`);
    process.exit(1);
  }
  for (const f of outputs) fs.renameSync(path.join(work, f), path.join(a.out, f));
  fs.rmSync(work, { recursive: true, force: true });
  console.log(`書き出しました${final ? "（入稿用）" : "（確認用。入稿用は --final 1 を付けて書き出す）"}：${path.relative(process.cwd(), a.out) || a.out}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
