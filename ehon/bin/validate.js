#!/usr/bin/env node
/*
 * books/vol*.json をすべて検証する。エラーがあれば exit 1。
 */
"use strict";
const path = require("path");
const { loadBooks } = require("../lib/books");

let failed = 0;
const books = loadBooks(process.argv[2]);
for (const { file, errors } of books) {
  const name = path.basename(file);
  if (errors.length) {
    failed++;
    console.error(`NG ${name}\n  ${errors.join("\n  ")}`);
  } else console.log(`OK ${name}`);
}
console.log(`${books.length - failed}/${books.length} 巻が合格`);
process.exit(failed ? 1 : 0);
