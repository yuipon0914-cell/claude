/*
 * 原稿（1巻分の JSON）の検証。エラー文の配列を返し、空なら合格。
 */
"use strict";
const { checkSpreadText } = require("./text-rules");

const SPREADS = 13;
const QUESTIONS = 3;
const SHOTS = ["wide", "medium", "close"];

function validateManuscript(ms, characterIds) {
  const errors = [];
  const known = new Set(characterIds);
  if (!Number.isInteger(ms.volume) || ms.volume < 1) errors.push("volume が正しくありません");
  for (const key of ["title", "learning"]) if (!ms[key]) errors.push(`${key} がありません`);
  if (!known.has(ms.guest)) errors.push(`ゲスト ${ms.guest} はキャラクター一覧にいません`);

  const spreads = Array.isArray(ms.spreads) ? ms.spreads : [];
  if (spreads.length !== SPREADS) errors.push(`見開きは${SPREADS}個必要です（いま${spreads.length}個）`);
  spreads.forEach((s, i) => {
    const at = `見開き${i + 1}`;
    for (const e of checkSpreadText(s.text)) errors.push(`${at}：${e}`);
    if (!s.scene) errors.push(`${at}：scene がありません`);
    if (!Array.isArray(s.characters)) errors.push(`${at}：characters がありません`);
    else for (const c of s.characters) if (!known.has(c)) errors.push(`${at}：キャラクター ${c} は一覧にいません`);
    if (!SHOTS.includes(s.shot)) errors.push(`${at}：shot は ${SHOTS.join(" / ")} のどれかです`);
  });

  const p = ms.parents || {};
  if (!p.heading) errors.push("おうちの方へ：heading がありません");
  if (!Array.isArray(p.body) || p.body.length === 0) errors.push("おうちの方へ：body がありません");
  if (!Array.isArray(p.questions) || p.questions.length !== QUESTIONS)
    errors.push(`おうちの方へ：質問は${QUESTIONS}つ必要です`);

  // 物語にもおうちの方へにも、実在の通貨単位は出さない
  const all = [ms.title, ...spreads.flatMap((s) => [s.text, s.scene]), p.heading, ...(p.body || []), ...(p.questions || [])];
  if (all.some((t) => typeof t === "string" && t.includes("円"))) errors.push("「円」が使われています");
  return errors;
}

module.exports = { validateManuscript, SPREADS };
