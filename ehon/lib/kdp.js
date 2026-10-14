/*
 * KDP ペーパーバックの寸法（単位はインチ）。
 * 背幅の係数はプレミアムカラーのもの。出版前に KDP の表紙計算ツールで照合すること。
 */
"use strict";

const PAGES = 32;
const TRIM = 8.5;
const BLEED = 0.125;
const SAFE = 0.375;
const SPINE_PER_PAGE = 0.002347;

const round4 = (n) => Math.round(n * 1e4) / 1e4;

function spineWidthIn(pages) {
  return round4(pages * SPINE_PER_PAGE);
}

function coverSizeIn(pages) {
  return { width: round4(BLEED * 2 + TRIM * 2 + spineWidthIn(pages)), height: TRIM + BLEED * 2 };
}

function interiorPageSizeIn() {
  return { width: TRIM + BLEED, height: TRIM + BLEED * 2 };
}

function dpi(px, inches) {
  return Math.round(px / inches);
}

module.exports = { PAGES, TRIM, BLEED, SAFE, SPINE_PER_PAGE, spineWidthIn, coverSizeIn, interiorPageSizeIn, dpi };
