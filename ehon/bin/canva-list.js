#!/usr/bin/env node
/*
 * data/canva-media.tsv から、各巻の books/volNN/canva-images.md（Canva の絵の保存方法の一覧）を書き出す。
 * 実行: node bin/canva-list.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { ROOT } = require("../lib/books");
const characters = require("../data/characters.json");
const series = require("../data/series.json");

const rows = fs.readFileSync(path.join(ROOT, "data/canva-media.tsv"), "utf8").trim().split("\n").slice(1).map((l) => l.split("\t"));
const link = (id) => `[${id}](https://www.canva.com/M/${id})`;
const NAMES = [...Array.from({ length: 13 }, (_, i) => `s${String(i + 1).padStart(2, "0")}`), "cover"];

for (const b of series.books) {
  const mine = new Map(rows.filter((r) => Number(r[0]) === b.volume).map((r) => [r[1], r[2]]));
  if (mine.size === 0) continue;
  const vv = String(b.volume).padStart(2, "0");
  const lines = NAMES.map((n) => {
    const label = n === "cover" ? "表紙" : `見開き${Number(n.slice(1))}`;
    const id = mine.get(n);
    return `| \`${n}.png\` | ${label} | ${id ? link(id) : "（まだ作っていません。prompts.md のプロンプトで作ってください）"} |`;
  });
  const md = `# 第${b.volume}巻「${b.title}」 Canva で作った絵

キャラクターの基準の絵を参考画像として渡して、見た目をそろえています。

## 保存のしかた

1. 下のリンクを開く（あなたの Canva アカウントにログインした状態で）
2. いちばん大きなサイズでダウンロードする
3. 「保存するファイル名」に名前を変えて、\`ehon/books/vol${vv}/images/\` に置く
4. 印刷用に 5250×2625px（表紙は 2625×2625px）に足りなければ、アップスケールしてから置く
5. \`NODE_PATH=$(npm root -g) npm run build -- ${b.volume} --final 1\` で入稿用ファイルを書き出す

| 保存するファイル名 | 場面 | Canva の画像 |
|---|---|---|
${lines.join("\n")}

## キャラクターの基準の絵（作り直すときに参考画像として使う）

| キャラクター | Canva の画像 |
|---|---|
${characters.map((c) => `| ${c.name} | ${link(c.canvaRef)} |`).join("\n")}
`;
  fs.mkdirSync(path.join(ROOT, "books", `vol${vv}`), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "books", `vol${vv}`, "canva-images.md"), md);
  console.log(`vol${vv}: ${mine.size}/14`);
}
