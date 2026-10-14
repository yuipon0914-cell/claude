#!/usr/bin/env node
/*
 * 原稿から books/volNN/prompts.md を書き出す。
 * 実行: node bin/prompts.js 1   （巻番号。省略すると全巻）
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { loadBooks, characters, style } = require("../lib/books");
const { renderPromptsMarkdown } = require("../lib/prompts");

let failed = false;
for (const { file, ms, errors } of loadBooks(process.argv[2])) {
  if (errors.length) {
    failed = true;
    console.error(`${file}:\n  ${errors.join("\n  ")}`);
    continue;
  }
  const dir = path.join(path.dirname(file), path.basename(file, ".json"));
  fs.mkdirSync(path.join(dir, "images"), { recursive: true });
  fs.writeFileSync(path.join(dir, "prompts.md"), renderPromptsMarkdown(ms, characters, style));
  console.log(`書き出しました：${path.relative(process.cwd(), path.join(dir, "prompts.md"))}`);
}
process.exit(failed ? 1 : 0);
