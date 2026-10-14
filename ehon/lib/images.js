/*
 * PNG / JPEG のピクセル数をファイルの先頭から読む（依存なし）。
 */
"use strict";
const fs = require("fs");
const path = require("path");
const kdp = require("./kdp");

// 1巻で使う絵の名前（見開き13枚と表紙）
const IMAGE_NAMES = [...Array.from({ length: 13 }, (_, i) => `s${String(i + 1).padStart(2, "0")}`), "cover"];

function findImage(dir, name) {
  return [".png", ".jpg", ".jpeg"].map((e) => path.join(dir, name + e)).find((f) => fs.existsSync(f)) || null;
}

// EXIF（TIFF 形式）の最初の IFD から向き（0x0112）を読む
function exifOrientation(b, start) {
  const le = b.toString("latin1", start, start + 2) === "II";
  const u16 = (o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
  const u32 = (o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
  const ifd = start + u32(start + 4);
  if (ifd + 2 > b.length) return null;
  for (let n = 0, count = u16(ifd); n < count; n++) {
    const e = ifd + 2 + n * 12;
    if (e + 12 > b.length) return null;
    if (u16(e) === 0x0112) return u16(e + 8);
  }
  return null;
}

function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    let orientation = 1;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker === 0xe1 && b.toString("latin1", i + 4, i + 10) === "Exif\0\0") orientation = exifOrientation(b, i + 10) || 1;
      // SOF0〜SOF15（DHT・JPG・DAC を除く）に縦横が入っている
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        const w = b.readUInt16BE(i + 7);
        const h = b.readUInt16BE(i + 5);
        // 向き 5〜8 は90度回転。ブラウザは回転して表示するので、縦横を入れかえる
        return orientation >= 5 && orientation <= 8 ? { width: h, height: w } : { width: w, height: h };
      }
      i += 2 + len;
    }
  }
  return null;
}

// 絵の解像度と比率を調べて、警告文を返す
function checkImages(imagesDir) {
  const warnings = [];
  const targets = [
    ...IMAGE_NAMES.slice(0, 13).map((name) => ({ name, w: kdp.TRIM * 2 + kdp.BLEED * 2, h: kdp.TRIM + kdp.BLEED * 2 })),
    { name: "cover", w: kdp.TRIM + kdp.BLEED, h: kdp.TRIM + kdp.BLEED * 2 },
  ];
  for (const t of targets) {
    const file = findImage(imagesDir, t.name);
    if (!file) {
      warnings.push(`${t.name}：絵がありません（仮の枠で組みます）`);
      continue;
    }
    const size = imageSize(file);
    if (!size) {
      warnings.push(`${t.name}：画像の大きさを読めません`);
      continue;
    }
    // 絵は枠いっぱいに切り抜いて置くので、短い辺の側で実効 dpi が決まる
    const eff = Math.min(kdp.dpi(size.width, t.w), kdp.dpi(size.height, t.h));
    const line = `${t.name}：${size.width}×${size.height}px、実効 ${eff}dpi`;
    warnings.push(eff < 300 ? `${line}（300dpi 未満。アップスケールしてください）` : line);
    const want = t.w / t.h;
    const ratio = size.width / size.height;
    if (Math.abs(ratio - want) / want > 0.08)
      warnings.push(`${t.name}：比率が ${ratio.toFixed(2)}:1 です（${want.toFixed(2)}:1 が必要。中央を切り抜きます）`);
  }
  return warnings;
}

// 警告のうち、入稿してはいけない問題（--final で止めるもの）
function isProblem(line) {
  return /絵がありません|300dpi 未満|比率が|読めません/.test(line);
}

module.exports = { imageSize, checkImages, findImage, isProblem, IMAGE_NAMES };
