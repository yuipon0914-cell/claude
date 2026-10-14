"use strict";
// テスト用の原稿（13見開き。見開きごとに本文が違う）
module.exports = function fixture(volume = 1) {
  const kana = "あいうえおかきくけこさしすせそ";
  return {
    volume,
    title: "ポッケと こうかんこ",
    guest: "mimi",
    learning: "お金は交換の道具",
    coverSceneEn: "Pokke and Mimi trading",
    spreads: Array.from({ length: 13 }, (_, i) => ({
      text: `ポッケは ${kana[i]}${kana[i]}を みつけました。`,
      scene: `場面${i + 1}の説明`,
      sceneEn: `scene ${i + 1}`,
      characters: ["pokke"],
      shot: "wide",
    })),
    parents: { heading: "お金は「とりかえっこ」の道具", body: ["説明の段落です。"], questions: ["しつもん一つ目？", "しつもん二つ目？", "しつもん三つ目？"] },
  };
};
