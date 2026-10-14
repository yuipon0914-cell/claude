/*
 * 1巻分の HTML を作る（本文32ページ・印刷用表紙・Kindle 用表紙）。
 * 印刷用の本文は1ページ 8.625in×8.75in（外側と上下に裁ち落とし）。Kindle 用は裁ち落としなしの 8.5in 角。
 * 左開きなので、奇数ページが右、偶数ページが左。見開きの絵は p2–3, p4–5 … p26–27 の13組。
 */
"use strict";
const { pathToFileURL } = require("url");
const kdp = require("./kdp");
const { findImage } = require("./images");
const series = require("../data/series.json");

const DISCLAIMER = "この本は、お金の考え方を親子で話すきっかけとして作ったものです。特定の金融商品をすすめるものではありません。";
const AI_NOTE = "イラストは画像生成AIで作成しています。";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pad2 = (n) => String(n).padStart(2, "0");

// 文字のまわりの白いふちどり。-webkit-text-stroke は PDF で Type 3 フォントになるので、影を16方向に重ねて作る
function halo(r, color = "#fffaf0") {
  return Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return `${(Math.cos(a) * r).toFixed(2)}px ${(Math.sin(a) * r).toFixed(2)}px 0 ${color}`;
  }).join(", ");
}

function css({ fontPath, pageW, pageH }) {
  return `
@font-face { font-family: "Pokke"; src: url("${pathToFileURL(fontPath).href}"); }
@page { size: ${pageW}in ${pageH}in; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #fff; }
body { font-family: "Pokke", sans-serif; color: #3b2a1a; }
.page { position: relative; width: ${pageW}in; height: ${pageH}in; overflow: hidden; break-after: page; background: #fffaf0; }
.art { position: absolute; top: 0; height: 100%; object-fit: cover; }
.placeholder { position: absolute; top: 0; height: 100%; background: #d9d4cc; border: 2px dashed #8a8175; color: #5a5249;
  font-size: 14pt; display: flex; align-items: flex-end; padding: 0.6in; }
.text { position: absolute; overflow: hidden; font-size: 26pt; line-height: 1.6; letter-spacing: 0.04em;
  word-break: keep-all; line-break: strict; text-shadow: ${halo(3)}; }
.text .series { text-shadow: ${halo(1.2)}; }
.center { position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.small { font-size: 11pt; line-height: 1.8; }
h1 { font-size: 34pt; font-weight: normal; line-height: 1.4; }
h2 { font-size: 16pt; font-weight: normal; margin-bottom: 0.15in; }
.series { font-size: 13pt; letter-spacing: 0.1em; }
ol, ul { padding-left: 1.4em; }
li { margin-bottom: 0.08in; }
.current { color: #b5532a; }
`;
}

// 1ページの中の「仕上がり枠」（裁ち落としを除いた部分）の位置
function trimBox(n, kindle) {
  if (kindle) return { x: 0, y: 0 };
  // 偶数ページ（左）は左側に、奇数ページ（右）は右側に裁ち落としがある
  return { x: n % 2 === 0 ? kdp.BLEED : 0, y: kdp.BLEED };
}

function boxStyle({ x, y, w, h }) {
  return `left:${x}in;top:${y}in;width:${w}in;height:${h}in;`;
}

// 安全域の内側に置く枠（仕上がり枠からの相対位置）
function safeBox(n, kindle, { top = 0, height }) {
  const t = trimBox(n, kindle);
  return { x: t.x + kdp.SAFE, y: t.y + kdp.SAFE + top, w: kdp.TRIM - kdp.SAFE * 2, h: height ?? kdp.TRIM - kdp.SAFE * 2 - top };
}

function spreadPages(ms, i, ctx) {
  const left = 2 + i * 2;
  const s = ms.spreads[i];
  const img = findImage(ctx.imagesDir, `s${pad2(i + 1)}`);
  const pageW = ctx.pageW;
  const artW = pageW * 2;
  const art = (n) => {
    const x = n === left ? 0 : -pageW;
    if (img) return `<img class="art" src="${pathToFileURL(img).href}" style="left:${x}in;width:${artW}in" alt="">`;
    return `<div class="placeholder" style="left:${x}in;width:${artW}in">見開き${i + 1}：${esc(s.scene)}</div>`;
  };
  const text = `<div class="text" style="${boxStyle(safeBox(left, ctx.kindle, { height: 2.6 }))}">${esc(s.text)}</div>`;
  return [
    page(left, art(left) + text),
    page(left + 1, art(left + 1)),
  ];
}

function page(n, inner) {
  return `<section class="page" data-page="${n}">${inner}</section>`;
}

function titlePage(ms, ctx) {
  const b = safeBox(1, ctx.kindle, {});
  return page(1, `<div class="center" style="${boxStyle(b)}">
    <p class="series">${esc(series.seriesTitle)} ${ms.volume}</p>
    <h1 style="margin:0.3in 0">${esc(ms.title)}</h1>
    ${series.author ? `<p class="series">${esc(series.author)}</p>` : ""}
  </div>`);
}

function parentsPages(ms, ctx) {
  const p = ms.parents;
  const l = safeBox(28, ctx.kindle, {});
  const r = safeBox(29, ctx.kindle, {});
  return [
    page(28, `<div class="small" style="position:absolute;${boxStyle(l)}">
      <p class="series" style="margin-bottom:0.2in">おうちの方へ</p>
      <h2>${esc(p.heading)}</h2>
      ${p.body.map((t) => `<p style="margin-bottom:0.12in">${esc(t)}</p>`).join("")}
    </div>`),
    page(29, `<div class="small" style="position:absolute;${boxStyle(r)}">
      <h2>読んだあとに、聞いてみましょう</h2>
      <ol>${p.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>
      <p style="margin-top:0.3in">${esc(DISCLAIMER)}</p>
    </div>`),
  ];
}

function seriesPage(ms, ctx) {
  const next = series.books.find((b) => b.volume === ms.volume + 1);
  const b = safeBox(30, ctx.kindle, {});
  return page(30, `<div class="small" style="position:absolute;${boxStyle(b)}">
    <h2>${esc(series.seriesTitle)}</h2>
    <ul style="list-style:none;padding:0">${series.books
      .map((x) => `<li class="${x.volume === ms.volume ? "current" : ""}">${x.volume}　${esc(x.title)}</li>`)
      .join("")}</ul>
    <p style="margin-top:0.25in;font-size:14pt">${
      next ? `つぎは だい${next.volume}かん「${esc(next.title)}」` : "シリーズは これで おしまい。さいごまで よんでくれて ありがとう。"
    }</p>
  </div>`);
}

function colophonPage(ms, ctx) {
  const b = safeBox(31, ctx.kindle, { top: 4.5 });
  return page(31, `<div class="small" style="position:absolute;${boxStyle(b)}">
    <p>${esc(series.seriesTitle)} ${ms.volume}</p>
    <p style="font-size:14pt">${esc(ms.title)}</p>
    ${series.author ? `<p>作　${esc(series.author)}</p>` : ""}
    <p style="margin-top:0.15in">${esc(AI_NOTE)}</p>
    <p>${esc(DISCLAIMER)}</p>
  </div>`);
}

function doc(title, style, body) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${style}</style></head><body>${body}</body></html>`;
}

function renderInterior(ms, opts) {
  const kindle = !!opts.kindle;
  const size = kindle ? { width: kdp.TRIM, height: kdp.TRIM } : kdp.interiorPageSizeIn();
  const ctx = { imagesDir: opts.imagesDir, kindle, pageW: size.width };
  const pages = [
    titlePage(ms, ctx),
    ...ms.spreads.flatMap((_, i) => spreadPages(ms, i, ctx)),
    ...parentsPages(ms, ctx),
    seriesPage(ms, ctx),
    colophonPage(ms, ctx),
    page(32, ""),
  ];
  return doc(ms.title, css({ fontPath: opts.fontPath, pageW: size.width, pageH: size.height }), pages.join("\n"));
}

// 表紙の前面（タイトルと絵）。w×h の枠に、仕上がり枠の内側の安全域を考えて置く
function frontCover(ms, imagesDir, { x, w, h, inset }) {
  const img = findImage(imagesDir, "cover");
  const art = img
    ? `<img class="art" src="${pathToFileURL(img).href}" style="left:${x}in;width:${w}in" alt="">`
    : `<div class="placeholder" style="left:${x}in;width:${w}in">表紙の絵（images/cover.png）</div>`;
  return `${art}<div class="center text" style="left:${x + inset}in;top:${inset}in;width:${w - inset * 2}in;height:3in;">
    <p class="series">${esc(series.seriesTitle)} ${ms.volume}</p><h1>${esc(ms.title)}</h1></div>`;
}

function renderCover(ms, opts) {
  const { width, height } = kdp.coverSizeIn(opts.pages);
  const panel = kdp.TRIM + kdp.BLEED; // 裏表紙・表表紙それぞれの幅（外側の裁ち落としを含む）
  const frontX = width - panel;
  const inset = kdp.BLEED + kdp.SAFE;
  // 背は32ページだと 0.075in しかなく、製本で ±0.0625in ずれるので、裏表紙と同じ色にして別の色の帯は置かない
  // 裏表紙の右下 2in×1.2in は KDP がバーコードを置くので空けておく
  const back = `<div class="small" style="position:absolute;left:${inset}in;top:${inset}in;width:${kdp.TRIM - kdp.SAFE * 2}in;height:5in;">
    <p class="series">${esc(series.seriesTitle)}</p>
    <p style="font-size:16pt;margin:0.2in 0">${esc(ms.title)}</p>
    <p>この本で学ぶこと：${esc(ms.learning)}</p>
  </div>`;
  const body = `<section class="page" style="width:${width}in;height:${height}in" data-cover="1">
    <div style="position:absolute;left:0;top:0;width:${width - panel}in;height:100%;background:#f3e6cc"></div>
    ${back}
    ${frontCover(ms, opts.imagesDir, { x: frontX, w: panel, h: height, inset })}
  </section>`;
  return doc(ms.title, css({ fontPath: opts.fontPath, pageW: width, pageH: height }), body);
}

function renderKindleCover(ms, opts) {
  const body = `<section class="page" data-cover="1">${frontCover(ms, opts.imagesDir, { x: 0, w: kdp.TRIM, h: kdp.TRIM, inset: kdp.SAFE })}</section>`;
  return doc(ms.title, css({ fontPath: opts.fontPath, pageW: kdp.TRIM, pageH: kdp.TRIM }), body);
}

module.exports = { renderInterior, renderCover, renderKindleCover, DISCLAIMER, AI_NOTE };
