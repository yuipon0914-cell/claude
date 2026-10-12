/* index.html から公開用ページ（dist/hackerlab.html）を作る。
 * 公開先が <html>/<head>/<body> を付け、独自の CSP を持つため、本文と読み込みだけを取り出す。 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const body = src.match(/<body>([\s\S]*)<\/body>/)[1]
  .replace('<script src="js/engine/minijs.js"></script>', '<script src="js/artifact-env.js"></script>\n  <script src="js/engine/minijs.js"></script>');
const out = `<title>HACKER LAB</title>\n<link rel="stylesheet" href="css/style.css">\n${body.trim()}\n`;
fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "dist/hackerlab.html"), out);
const files = ["css/style.css", "js/artifact-env.js", ...[...src.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1])];
console.log(JSON.stringify(Object.fromEntries(files.map((f) => [f, f]))));
