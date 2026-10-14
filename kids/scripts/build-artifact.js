/* kids/index.html から公開用ページ（dist/picolab.html）を作る。
 * 公開先が <html>/<head>/<body> を付け、独自の CSP を持つため、本文と読み込みだけを取り出す。 */
"use strict";
const fs = require("fs");
const path = require("path");
const KIDS = path.join(__dirname, "..");
const ROOT = path.join(KIDS, "..");
const src = fs.readFileSync(path.join(KIDS, "index.html"), "utf8");
const body = src.match(/<body>([\s\S]*)<\/body>/)[1];
const out = `<title>ピコラボ</title>\n<link rel="stylesheet" href="css/kids.css">\n${body.trim()}\n`;
fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "dist/picolab.html"), out);
const files = ["css/kids.css", ...[...src.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1])];
console.log(JSON.stringify(Object.fromEntries(files.map((f) => [f, "kids/" + f]))));
