/* ピコラボ — ロボットを動かすプログラムの実行（画面から独立した純粋な関数）。
 * プログラムはブロックの配列。
 *   { t: "up" | "down" | "left" | "right" }      1マス うごく
 *   { t: "repeat", n: 2〜9, body: [ブロック…] }   なかみを n かい くりかえす
 */
(function (root) {
  "use strict";
  const PL = (root.PL = root.PL || {});

  const MOVES = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const MAX_STEPS = 200; // 念のための上限（くりかえしの入れ子で無限に長くならないように）

  // 地図（文字列の配列）を読み取る。 S=スタート G=ゴール *=ほうせき #=き .=みち
  function parseMap(rows) {
    const map = { w: rows[0].length, h: rows.length, walls: new Set(), gems: [], start: null, goal: null };
    rows.forEach((row, y) => {
      if (row.length !== map.w) throw new Error("地図の行の長さがそろっていません");
      [...row].forEach((ch, x) => {
        if (ch === "#") map.walls.add(x + "," + y);
        else if (ch === "*") map.gems.push([x, y]);
        else if (ch === "S") map.start = [x, y];
        else if (ch === "G") map.goal = [x, y];
        else if (ch !== ".") throw new Error("地図に知らない文字があります: " + ch);
      });
    });
    if (!map.start || !map.goal) throw new Error("地図にスタートとゴールが必要です");
    return map;
  }

  // ブロックの数（くりかえしも1つと数える）
  function countBlocks(program) {
    return program.reduce((n, b) => n + 1 + (b.t === "repeat" ? countBlocks(b.body) : 0), 0);
  }

  // くりかえしを展開して、1歩ずつの動きにする。path はどのブロックから来たか（画面で光らせる用）
  function expand(program, prefix = [], out = []) {
    program.forEach((b, i) => {
      const path = prefix.concat(i);
      if (b.t === "repeat") {
        for (let k = 0; k < b.n && out.length <= MAX_STEPS; k++) expand(b.body, path, out);
      } else if (MOVES[b.t]) {
        out.push({ dir: b.t, path });
      } else {
        throw new Error("知らないブロック: " + b.t);
      }
    });
    return out;
  }

  /* プログラムを実行する。
   * 結果 result:
   *   "goal"    ゴールについて、ほうせきも ぜんぶ ひろった
   *   "gems"    ゴールについたが、ほうせきが のこっている
   *   "wall"    き に ぶつかった
   *   "out"     ちずの そとに でようとした
   *   "short"   とちゅうで ブロックが おわった
   *   "empty"   ブロックが ない
   *   "toolong" うごきが おおすぎる
   * frames は 1歩ごとの位置（画面のアニメーション用）。 */
  function run(level, program) {
    const map = parseMap(level.map);
    const steps = expand(program);
    let [x, y] = map.start;
    const got = new Set();
    const frames = [{ x, y, path: null, got: [] }];
    const done = (result, extra) => ({ result, ok: result === "goal", frames, gemsTotal: map.gems.length, gemsGot: got.size, blocks: countBlocks(program), ...extra });
    if (!steps.length) return done("empty");
    if (steps.length > MAX_STEPS) return done("toolong");
    for (const s of steps) {
      const [dx, dy] = MOVES[s.dir];
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) return done("out", { bump: { x: nx, y: ny, path: s.path } });
      if (map.walls.has(nx + "," + ny)) return done("wall", { bump: { x: nx, y: ny, path: s.path } });
      x = nx; y = ny;
      map.gems.forEach(([gx, gy], i) => { if (gx === x && gy === y) got.add(i); });
      frames.push({ x, y, path: s.path, got: [...got] });
      // ゴールに着いたら、ほうせきを全部ひろっていれば そこでおしまい
      if (x === map.goal[0] && y === map.goal[1] && got.size === map.gems.length) return done("goal");
    }
    if (x === map.goal[0] && y === map.goal[1]) return done("gems");
    return done("short");
  }

  // ほし の数： クリアで2つ、いちばん少ないブロック数（level.best）以下なら3つ
  function stars(level, res) {
    if (!res.ok) return 0;
    return res.blocks <= level.best ? 3 : 2;
  }

  PL.Robot = { MOVES, MAX_STEPS, parseMap, countBlocks, expand, run, stars };
})(typeof window !== "undefined" ? window : globalThis);
