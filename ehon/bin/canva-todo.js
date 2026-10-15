#!/usr/bin/env node
/*
 * まだ Canva で作っていない絵の一覧（指示文・参考画像・ファイル名）を docs/canva-todo.md に書き出す。
 * 実行: node bin/canva-todo.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { ROOT, loadBooks } = require("../lib/books");
const characters = require("../data/characters.json");

const done = new Set(
  fs.readFileSync(path.join(ROOT, "data/canva-media.tsv"), "utf8").trim().split("\n").slice(1)
    .map((l) => l.split("\t")).map((r) => `${Number(r[0])}/${r[1]}`),
);
const SHORT = {
  pokke: "Pokke the young squirrel with warm-brown fur, a knitted green scarf and a big fluffy tail",
  momoba: "Momoba the grandmother squirrel with grey-brown fur, round glasses and a red apron",
  mimi: "Mimi the white rabbit with a yellow ribbon on one ear",
  kira: "Kira the friendly black crow",
  dosshiri: "Dosshiri the big brown bear with a blue knitted cap",
  chuchi: "Chuchi the tiny grey mouse with a yellow backpack",
  tsuchio: "Tsuchio the pink earthworm with a tiny straw hat",
  bunta: "Bunta the round honeybee with tiny blue glasses",
  dan: "Dan the badger with a white apron and orange bandana",
  pichon: "Pichon the green tree frog with a yellow leaf umbrella",
  jay: "Jay the pinkish-brown jay bird with blue wing patches",
  kon: "Kon the red fox with a purple vest, cartoonish and not scary",
};
const SHOT = { wide: "Wide shot, characters small in a broad landscape", medium: "Medium shot, full bodies", close: "Close-up on the faces and expressions" };
const STYLE = "Soft watercolor children's picture book illustration in the exact style and character designs of the reference images, gentle pencil outlines, warm palette, soft light, paper texture.";
const TAIL = "Characters placed away from the exact center. Top third calm with empty space. No text, no letters, no logos, no humans.";
const byId = Object.fromEntries(characters.map((c) => [c.id, c]));
const ref = (id) => `[${byId[id].name}](https://www.canva.com/M/${byId[id].canvaRef})`;

const out = [
  "# Canva でまだ作っていない絵",
  "",
  "1枚ずつ、次の手順で作ります。",
  "",
  "1. Canva の画像生成（Magic Media や Dream Lab など）を開く",
  "2. 「指示文」をそのまま貼る。比率は見開きなら **2:1（横長）**、表紙なら **1:1（正方形）**",
  "3. 「参考画像」に書いたキャラクターの基準の絵を、参考（スタイル参照・キャラクター参照）として付ける。リンクを開くと、あなたの Canva に入っている基準の絵が見られます",
  "4. 気に入った1枚を、いちばん大きなサイズでダウンロードし、「保存先」の名前で置く",
  "5. 顔が絵のちょうど真ん中（本の綴じ目）にかかっていたら作り直す",
  "",
  "全部置けたら `NODE_PATH=$(npm root -g) npm run build -- 巻番号 --final 1` で書き出します。",
  "",
];
let count = 0;
for (const { ms } of loadBooks()) {
  const items = [];
  ms.spreads.forEach((s, i) => {
    const name = `s${String(i + 1).padStart(2, "0")}`;
    if (done.has(`${ms.volume}/${name}`)) return;
    const looks = s.characters.map((c) => SHORT[c]).join(". ");
    items.push({ name, label: `見開き${i + 1}`, text: s.text, chars: s.characters,
      prompt: `${STYLE} ${s.sceneEn}. ${looks ? looks + ". " : ""}${SHOT[s.shot]}. ${TAIL}`, ratio: "2:1" });
  });
  if (!done.has(`${ms.volume}/cover`)) {
    const cc = ["pokke", ms.guest];
    items.push({ name: "cover", label: "表紙", text: ms.title, chars: cc, ratio: "1:1",
      prompt: `${STYLE.replace("picture book illustration", "picture book cover illustration")} ${ms.coverSceneEn}. ${cc.map((c) => SHORT[c]).join(". ")}. Characters in the lower two thirds; top third calm sky with empty space for a title. No text, no letters, no logos, no humans.` });
  }
  if (!items.length) continue;
  const vv = String(ms.volume).padStart(2, "0");
  out.push(`## 第${ms.volume}巻「${ms.title}」（残り${items.length}枚）`, "");
  for (const it of items) {
    count++;
    out.push(`### ${it.label}（比率 ${it.ratio}）`, "",
      `- 保存先：\`ehon/books/vol${vv}/images/${it.name}.png\``,
      `- 本文：${it.text}`,
      `- 参考画像：${it.chars.map(ref).join("、") || "なし"}`, "",
      "```", it.prompt, "```", "");
  }
}
out.splice(2, 0, `残り **${count}枚** です。`, "");
fs.writeFileSync(path.join(ROOT, "docs/canva-todo.md"), out.join("\n"));
console.log(`docs/canva-todo.md: ${count} 枚`);
