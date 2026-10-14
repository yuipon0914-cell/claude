/*
 * 画像生成AIに渡すプロンプトと、絵を確認するチェック表を作る。
 */
"use strict";

const SHOT = {
  wide: "wide shot, characters small in a broad forest landscape",
  medium: "medium shot, characters shown from head to toe",
  close: "close-up on the characters' faces and expressions",
};
const LAYOUT = "wide 2:1 landscape composition, keep the center vertical strip free of faces, the top third is calm sky or foliage with empty space for text";
const COMMON_CHECKS = ["文字やロゴが描かれていない", "中央（のど）に顔がかかっていない", "上の1/3に文字を置ける静かな余白がある"];

const pick = (ids, characters) => ids.map((id) => characters.find((c) => c.id === id)).filter(Boolean);

function buildPrompt(spread, characters, style) {
  const cast = pick(spread.characters, characters).map((c) => c.look);
  return [style.style, spread.sceneEn || spread.scene, ...cast, SHOT[spread.shot] || SHOT.medium, LAYOUT, style.avoid].join(". ") + ".";
}

function buildChecklist(spread, characters) {
  return [...pick(spread.characters, characters).flatMap((c) => c.marks), ...COMMON_CHECKS];
}

function buildCoverPrompt(ms, characters, style) {
  const cast = pick(["pokke", ms.guest], characters).map((c) => c.look);
  return [style.style, `Book cover: ${ms.coverSceneEn || "the two characters together in the autumn forest, looking happy"}`, ...cast,
    "square 1:1 composition, characters in the lower two thirds, the top third is calm sky with empty space for the title", style.avoid].join(". ") + ".";
}

function renderPromptsMarkdown(ms, characters, style) {
  const out = [`# 第${ms.volume}巻「${ms.title}」 画像プロンプト`, "",
    "各見開きの絵は 2:1 の横長で作り、`images/s01.png` 〜 `s13.png` に保存します。表紙は 1:1 で `images/cover.png` です。",
    "印刷には 5250×2625px（表紙は 2625×2625px）以上が目安です。足りなければツールのアップスケール機能を使ってください。", ""];
  const checks = (list) => list.map((m) => `- [ ] ${m}`).join("\n");
  ms.spreads.forEach((s, i) => {
    out.push(`## 見開き${i + 1}（images/s${String(i + 1).padStart(2, "0")}.png）`, "",
      `本文：${s.text}`, "", `場面：${s.scene}`, "", "```", buildPrompt(s, characters, style), "```", "", checks(buildChecklist(s, characters)), "");
  });
  const cover = { characters: ["pokke", ms.guest] };
  out.push("## 表紙（images/cover.png）", "", "```", buildCoverPrompt(ms, characters, style), "```", "", checks(buildChecklist(cover, characters).slice(0, -2)), "");
  return out.join("\n");
}

module.exports = { buildPrompt, buildChecklist, buildCoverPrompt, renderPromptsMarkdown };
