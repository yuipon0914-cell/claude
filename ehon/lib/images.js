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

function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      // SOF0〜SOF15（DHT・JPG・DAC を除く）に縦横が入っている
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
        return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
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

module.exports = { imageSize, checkImages, findImage, IMAGE_NAMES };
