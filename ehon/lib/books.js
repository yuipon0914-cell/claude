/*
 * books/volNN.json を読み込み、検証結果と一緒に返す。
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { validateManuscript } = require("./manuscript");

const ROOT = path.join(__dirname, "..");
const BOOKS = path.join(ROOT, "books");
const characters = require("../data/characters.json");
const style = require("../data/style.json");
const characterIds = characters.map((c) => c.id);

function bookFile(volume) {
  return path.join(BOOKS, `vol${String(volume).padStart(2, "0")}.json`);
}

// volume を省略すると全巻
function loadBooks(volume) {
  const files = volume
    ? [bookFile(Number(volume))]
    : fs.readdirSync(BOOKS).filter((f) => /^vol\d{2}\.json$/.test(f)).sort().map((f) => path.join(BOOKS, f));
  return files.map((file) => {
    if (!fs.existsSync(file)) return { file, ms: null, errors: ["ファイルがありません"] };
    let ms;
    try {
      ms = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      return { file, ms: null, errors: [`JSON として読めません：${e.message}`] };
    }
    return { file, ms, errors: validateManuscript(ms, characterIds) };
  });
}

module.exports = { ROOT, BOOKS, characters, style, characterIds, bookFile, loadBooks };
