/* ピコラボ — 「プログラミングの しま」の ステージ。
 * map: S=スタート G=ゴール *=ほうせき #=き .=みち
 * allow: つかえるブロック / max: おけるブロックの数 / best: いちばん少ないブロック数（ほし3つの条件）
 * starter: さいしょから おいてあるプログラム（むしとり用。まちがいが ある）
 * solution: こたえの れい（テストで、ほんとうに クリアできるか たしかめる） */
(function (root) {
  "use strict";
  const PL = (root.PL = root.PL || {});
  const M = (t) => ({ t });
  const R = (n, ...body) => ({ t: "repeat", n, body });
  const ARROWS = ["up", "down", "left", "right"];

  PL.STAGES = [
    { id: "order", name: "じゅんばん", icon: "👣", goal: "めいれいは うえから じゅんばんに うごくよ" },
    { id: "loop", name: "くりかえし", icon: "🔁", goal: "おなじ ことは 「くりかえし」で みじかく かけるよ" },
    { id: "bug", name: "むしとり", icon: "🐛", goal: "まちがい（バグ）を みつけて なおそう" },
  ];

  PL.LEVELS = [
    // ---- じゅんばん ----
    { id: "L1", stage: "order", title: "まっすぐ すすもう", hint: "➡️ を 3かい ならべてみよう",
      map: ["S..G"],
      allow: ["right"], max: 5, best: 3, solution: [M("right"), M("right"), M("right")] },
    { id: "L2", stage: "order", title: "うえに のぼろう", hint: "⬆️ で うえに いけるよ",
      map: ["G", ".", ".", "S"], allow: ["up", "right"], max: 5, best: 3, solution: [M("up"), M("up"), M("up")] },
    { id: "L3", stage: "order", title: "かどを まがろう", hint: "まず ➡️、つぎに ⬆️",
      map: ["...G", "....", "S..."], allow: ARROWS, max: 7, best: 5,
      solution: [M("right"), M("right"), M("right"), M("up"), M("up")] },
    { id: "L4", stage: "order", title: "き を よけよう", hint: "🌳 には ぶつかっちゃう。まわりみち しよう",
      map: ["....", "S.#G", "...."], allow: ARROWS, max: 7, best: 5,
      solution: [M("right"), M("up"), M("right"), M("right"), M("down")] },
    { id: "L5", stage: "order", title: "ほうせきを ひろおう", hint: "💎 を ひろってから 🏁 へ",
      map: ["..*.", "....", "S..G"], allow: ARROWS, max: 9, best: 7,
      solution: [M("up"), M("up"), M("right"), M("right"), M("right"), M("down"), M("down")] },
    { id: "L6", stage: "order", title: "くねくね みち", hint: "ゆびで みちを なぞってから ならべよう",
      map: ["S#...", ".#.#.", "...#G"], allow: ARROWS, max: 12, best: 10,
      solution: [M("down"), M("down"), M("right"), M("right"), M("up"), M("up"), M("right"), M("right"), M("down"), M("down")] },

    // ---- くりかえし ----
    { id: "L7", stage: "loop", title: "ながーい みち", hint: "🔁 の なかに ➡️ を いれて、かずを かえてみよう",
      map: ["S......G"], allow: ["right", "repeat"], max: 3, best: 2, solution: [R(7, M("right"))] },
    { id: "L8", stage: "loop", title: "かいだん", hint: "➡️⬆️ の セットを くりかえそう",
      map: ["...#G", "..#..", ".#...", "#....", "S...."], allow: ["up", "right", "repeat"], max: 4, best: 3,
      solution: [R(4, M("right"), M("up"))] },
    { id: "L9", stage: "loop", title: "したへ、みぎへ", hint: "くりかえしは 2つ つかっても いいよ",
      map: ["S.....", "......", "......", "......", ".....G"], allow: ARROWS.concat("repeat"), max: 5, best: 4,
      solution: [R(4, M("down")), R(5, M("right"))] },
    { id: "L10", stage: "loop", title: "ほうせき かいだん", hint: "💎 が ならんでいる きまりを みつけよう",
      map: ["G....", "*.#..", ".*.#.", "..*.#", "...*S"], allow: ARROWS.concat("repeat"), max: 4, best: 3,
      solution: [R(4, M("left"), M("up"))] },

    // ---- むしとり（バグなおし） ----
    { id: "L11", stage: "bug", title: "どこが ちがう？", hint: "ブロックを タッチすると けせるよ。うごかして たしかめよう",
      map: ["S..", ".#.", "..G"], allow: ARROWS, max: 6, best: 4,
      starter: [M("right"), M("right"), M("up"), M("down"), M("down")],
      solution: [M("right"), M("right"), M("down"), M("down")] },
    { id: "L12", stage: "bug", title: "かずが ちがう？", hint: "🔁 の かずを タッチすると かわるよ",
      map: ["S.....G"], allow: ["right", "repeat"], max: 3, best: 2,
      starter: [R(4, M("right"))], solution: [R(6, M("right"))] },
    { id: "L13", stage: "bug", title: "むきが ちがう？", hint: "どの むきが ちがうかな？ けして つくりなおしても いいよ",
      map: ["S#G", ".#.", "..."], allow: ARROWS.concat("repeat"), max: 7, best: 6,
      starter: [R(2, M("down")), R(2, M("left")), R(2, M("up"))],
      solution: [R(2, M("down")), R(2, M("right")), R(2, M("up"))] },
  ];
})(typeof window !== "undefined" ? window : globalThis);
