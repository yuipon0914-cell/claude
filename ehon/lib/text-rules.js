/*
 * 本文（1見開き）の文字の決まりごと。
 * ひらがな・カタカナ・わかち書きのスペース・一部の記号だけ。スペースを除いて40字まで。
 */
"use strict";

const ALLOWED = /^[ぁ-ゖァ-ヺー 、。！？〜…「」]+$/;
const MAX_CHARS = 40;
const WAKACHI_MIN = 10; // これより長い文はスペースで区切る

function checkSpreadText(text) {
  const errors = [];
  if (typeof text !== "string" || text.trim() === "") return ["本文が空です"];
  if (!ALLOWED.test(text)) {
    const bad = [...new Set([...text].filter((ch) => !ALLOWED.test(ch)))].join("");
    errors.push(`使えない文字があります：${bad}`);
  }
  const chars = [...text.replace(/ /g, "")].length;
  if (chars > MAX_CHARS) errors.push(`40字を超えています（${chars}字）`);
  if (chars > WAKACHI_MIN && !text.includes(" ")) errors.push("わかち書きのスペースがありません");
  return errors;
}

module.exports = { checkSpreadText, MAX_CHARS };
