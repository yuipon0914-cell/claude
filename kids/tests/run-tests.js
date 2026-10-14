/*
 * ピコラボ — データ・判定ロジックの自動テスト（依存なし）。  実行: node kids/tests/run-tests.js
 */
"use strict";
const path = require("path");
const fs = require("fs");
const ROOT = path.join(__dirname, "..");
for (const f of ["js/engine/robot.js", "js/engine/ai.js", "js/engine/progress.js", "js/data/levels.js", "js/data/ai.js"]) require(path.join(ROOT, f));
const PL = globalThis.PL;
const { Robot, AI, Progress: P } = PL;

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) { try { fn(); passed++; } catch (e) { failed++; failures.push(`✕ ${name}\n    ${e.message}`); } }
function assert(c, m) { if (!c) throw new Error(m || "assertion failed"); }
function eq(a, b, m) { if (a !== b) throw new Error(`${m || ""} expected ${JSON.stringify(b)} but got ${JSON.stringify(a)}`); }
const M = (t) => ({ t });
const R = (n, ...body) => ({ t: "repeat", n, body });

// ほうせきも ふくめた さいたん手数（幅優先探索）
function shortestMoves(level) {
  const map = Robot.parseMap(level.map);
  const all = (1 << map.gems.length) - 1;
  const key = (x, y, g) => `${x},${y},${g}`;
  const q = [[map.start[0], map.start[1], 0, 0]];
  const seen = new Set([key(map.start[0], map.start[1], 0)]);
  while (q.length) {
    const [x, y, g, d] = q.shift();
    for (const [dx, dy] of Object.values(Robot.MOVES)) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h || map.walls.has(nx + "," + ny)) continue;
      let ng = g;
      map.gems.forEach(([gx, gy], i) => { if (gx === nx && gy === ny) ng |= 1 << i; });
      if (nx === map.goal[0] && ny === map.goal[1] && ng === all) return d + 1;
      const k = key(nx, ny, ng);
      if (!seen.has(k)) { seen.add(k); q.push([nx, ny, ng, d + 1]); }
    }
  }
  return Infinity;
}
const usedTypes = (prog, out = new Set()) => { prog.forEach((b) => { out.add(b.t); if (b.body) usedTypes(b.body, out); }); return out; };

// ---------------- ステージ ----------------
test("ステージは13こ、IDは重複しない、ステージ区分は定義済み", () => {
  eq(PL.LEVELS.length, 13);
  eq(new Set(PL.LEVELS.map((l) => l.id)).size, 13);
  for (const l of PL.LEVELS) assert(PL.STAGES.some((s) => s.id === l.stage), l.id);
  for (const s of PL.STAGES) assert(PL.LEVELS.some((l) => l.stage === s.id), s.id + " にステージがない");
});

for (const l of PL.LEVELS) {
  test(`${l.id}: 地図が読める・こたえで ゴールできる`, () => {
    Robot.parseMap(l.map);
    const res = Robot.run(l, l.solution);
    eq(res.result, "goal", l.id);
    eq(Robot.stars(l, res), 3, l.id + " こたえは ほし3つ");
  });
  test(`${l.id}: best・max・つかえるブロックが こたえと合う`, () => {
    eq(Robot.countBlocks(l.solution), l.best, "best");
    assert(l.best <= l.max, "best <= max");
    for (const t of usedTypes(l.solution)) assert(l.allow.includes(t), `${t} が allow にない`);
    for (const t of l.allow) assert(["up", "down", "left", "right", "repeat"].includes(t), t);
  });
  if (l.stage === "order") {
    test(`${l.id}: じゅんばん は くりかえし なしで、best が さいたん手数`, () => {
      assert(!l.allow.includes("repeat"));
      eq(l.best, shortestMoves(l));
    });
  }
  if (l.stage === "loop") {
    test(`${l.id}: くりかえし を つかわないと ブロックが たりない`, () => {
      assert(shortestMoves(l) > l.max, `さいたん ${shortestMoves(l)} 手 <= max ${l.max}`);
    });
  }
  if (l.stage === "bug") {
    test(`${l.id}: むしとり は まちがった プログラムから はじまる`, () => {
      assert(Array.isArray(l.starter) && l.starter.length, "starter がない");
      assert(!Robot.run(l, l.starter).ok, "starter で クリアできてしまう");
      assert(Robot.countBlocks(l.starter) <= l.max, "starter が max を こえる");
    });
  } else {
    test(`${l.id}: むしとり いがいは からっぽから はじまる`, () => assert(!l.starter));
  }
}

// ---------------- ロボットの うごき ----------------
const L = { map: ["S.#", "..G"], best: 3 };
test("うごき: ゴール・き・そと・たりない・からっぽ", () => {
  eq(Robot.run(L, [M("down"), M("right"), M("right")]).result, "goal");
  const w = Robot.run(L, [M("right"), M("right")]);
  eq(w.result, "wall"); eq(w.bump.path.join("."), "1");
  eq(Robot.run(L, [M("up")]).result, "out");
  eq(Robot.run(L, [M("down")]).result, "short");
  eq(Robot.run(L, []).result, "empty");
});
test("うごき: ほうせきを のこして ゴールすると gems", () => {
  const G = { map: ["S*", ".G"], best: 3 };
  eq(Robot.run(G, [M("down"), M("right")]).result, "gems");
  eq(Robot.run(G, [M("right"), M("down")]).result, "goal");
});
test("うごき: くりかえし の 展開と、光らせる ブロックの ばしょ", () => {
  const steps = Robot.expand([M("up"), R(2, M("left"), R(2, M("down")))]);
  eq(steps.map((s) => s.dir).join(","), "up,left,down,down,left,down,down");
  eq(steps[2].path.join("."), "1.1.0");
  eq(Robot.countBlocks([M("up"), R(2, M("left"), R(2, M("down")))]), 5);
});
test("うごき: からっぽの くりかえし は なにも しない、ながすぎは とめる", () => {
  eq(Robot.run(L, [R(3)]).result, "empty");
  eq(Robot.run({ map: ["S.G"] }, [R(9, R(9, R(9, M("right"))))]).result, "toolong");
});
test("ほし: クリアで2つ、best いかで3つ、しっぱい 0", () => {
  const lv = { map: ["S..G"], best: 3 };
  eq(Robot.stars(lv, Robot.run(lv, [M("right"), M("right"), M("right")])), 3);
  eq(Robot.stars(lv, Robot.run(lv, [M("right"), M("left"), M("right"), M("right"), M("right")])), 2);
  eq(Robot.stars(lv, Robot.run(lv, [M("right")])), 0);
});
test("地図の まちがいを みつける", () => {
  let threw = 0;
  for (const bad of [["S.", "G"], ["S.X"], ["..."]]) { try { Robot.parseMap(bad); } catch (e) { threw++; } }
  eq(threw, 3);
  try { Robot.expand([{ t: "jump" }]); throw new Error("no"); } catch (e) { assert(/知らないブロック/.test(e.message)); }
});

// ---------------- AI: おしえる ----------------
const FOOD = Object.fromEntries(PL.FOODS.map((f) => [f.id, f]));
const ex = (ids, labeler = (f) => f.truth) => ids.map((id) => ({ item: FOOD[id], label: labeler(FOOD[id]) }));
const accuracy = (examples, ids) => ids.filter((id) => AI.classify(examples, FOOD[id], PL.FEATURES).label === FOOD[id].truth).length;

test("たべもの: ID重複なし、とくちょうの数が そろう、くだもの・やさい 両方ある", () => {
  eq(new Set(PL.FOODS.map((f) => f.id)).size, PL.FOODS.length);
  for (const f of PL.FOODS) { eq(f.f.length, PL.FEATURES.length, f.id); assert(PL.LABELS[f.truth], f.id); }
  const all = [...PL.TEACH.train, ...PL.TEACH.test1, ...PL.TEACH.test2];
  eq(new Set(all).size, all.length, "おなじ たべものを 2かい つかわない");
  for (const id of all) assert(FOOD[id], id);
  for (const k of ["train", "test1", "test2"]) {
    const ts = new Set(PL.TEACH[k].map((id) => FOOD[id].truth));
    assert(ts.has("fruit") && ts.has("veg"), k);
  }
});
test("ただしく おしえると 1かいめは トマトだけ まちがえる（AIも まちがえる れい）", () => {
  const e = ex(PL.TEACH.train);
  eq(accuracy(e, PL.TEACH.test1), PL.TEACH.test1.length - 1);
  const tomato = AI.classify(e, FOOD.tomato, PL.FEATURES);
  eq(tomato.label, "fruit"); eq(tomato.nearest.id, "apple");
  assert(tomato.shared.includes("あかい") && tomato.shared.includes("まるい"), "わけ に あかい・まるい");
});
test("まちがいを おしえなおすと 2かいめは ぜんぶ あたる", () => {
  const e = ex([...PL.TEACH.train, ...PL.TEACH.test1]);
  eq(accuracy(e, PL.TEACH.test2), PL.TEACH.test2.length);
});
test("ぎゃくに おしえると AIも ぎゃくに こたえる", () => {
  const e = ex(PL.TEACH.train, (f) => (f.truth === "fruit" ? "veg" : "fruit"));
  eq(accuracy(e, PL.TEACH.test1), 1); // トマトだけ「たまたま」あたる
});
test("おなじ近さなら 先に おしえた れい、れいが ないと null", () => {
  const a = { id: "a", f: [1, 0] }, b = { id: "b", f: [0, 1] }, x = { id: "x", f: [0.5, 0.5] };
  eq(AI.classify([{ item: a, label: "p" }, { item: b, label: "q" }], x).label, "p");
  eq(AI.classify([{ item: b, label: "q" }, { item: a, label: "p" }], x).label, "q");
  eq(AI.classify([], x), null);
});

// ---------------- AI: よそう ----------------
test("よそう: さいごの もんだい いがいは AIが あたる、さいごは まちがえる", () => {
  PL.PATTERNS.forEach((p, i) => {
    const g = AI.predictNext(p.seq).guess;
    assert(p.choices.includes(p.answer), `${i}: こたえが せんたくしに ない`);
    eq(new Set(p.choices).size, p.choices.length, `${i}: せんたくしが かさなる`);
    if (i < PL.PATTERNS.length - 1) eq(g, p.answer, `${i}`);
    else { assert(g !== p.answer, "さいごは AIが まちがえる はず"); assert(p.lesson, "lesson がない"); assert(p.choices.includes(g), "AIの こたえも せんたくしに"); }
  });
});
test("よそう: かぞえかた と、はじめての ものは null", () => {
  const r = AI.predictNext(["a", "b", "a", "c", "a", "b", "a"]);
  eq(r.guess, "b"); eq(JSON.stringify(r.counts), JSON.stringify([{ item: "b", n: 2 }, { item: "c", n: 1 }]));
  eq(AI.predictNext(["a", "b", "c"]).guess, null);
});

// ---------------- やくそく ----------------
test("やくそく: ⭕も❌も ある、ぜんぶに わけ がある", () => {
  assert(PL.PROMISES.length >= 5);
  assert(PL.PROMISES.some((q) => q.answer) && PL.PROMISES.some((q) => !q.answer));
  for (const q of PL.PROMISES) { assert(typeof q.answer === "boolean"); assert(q.q && q.why && q.icon); }
});

// ---------------- すすみぐあい ----------------
const mem = () => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, d }; };
test("保存と よみこみ、ほしは いちばん よい かず を のこす", () => {
  const s = mem();
  let st = P.load(s);
  P.recordLevel(st, "L1", 3); P.recordLevel(st, "L1", 2); P.recordAI(st, "teach"); P.recordAI(st, "hack");
  P.save(s, st);
  st = P.load(s);
  eq(st.levels.L1, 3); eq(st.ai.teach, true); eq(st.ai.hack, undefined);
});
test("こわれた データ は はじめから", () => {
  for (const raw of ["{", "null", "[]", '{"v":2}', '{"v":1,"levels":{"L1":9,"L2":"3","L3":2},"ai":{"teach":"yes"}}']) {
    const s = mem(); s.setItem(P.KEY, raw);
    const st = P.load(s);
    assert(st.v === 1 && typeof st.levels === "object", raw);
    assert(st.levels.L1 === undefined && st.levels.L2 === undefined && st.ai.teach === undefined, raw);
  }
  eq(P.load(null).v, 1);
  const thrower = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  eq(P.load(thrower).v, 1); eq(P.save(thrower, P.empty()), false);
});
test("ステージは じゅんばんに ひらく", () => {
  const st = P.empty();
  assert(P.isUnlocked(st, PL.LEVELS, "L1")); assert(!P.isUnlocked(st, PL.LEVELS, "L2")); assert(!P.isUnlocked(st, PL.LEVELS, "nope"));
  P.recordLevel(st, "L1", 2);
  assert(P.isUnlocked(st, PL.LEVELS, "L2")); assert(!P.isUnlocked(st, PL.LEVELS, "L3"));
});
test("シールの かず", () => {
  const st = P.empty();
  eq(P.stickers(st, PL.LEVELS), 0);
  P.recordLevel(st, "L1", 2); P.recordLevel(st, "L2", 3); P.recordAI(st, "promise");
  eq(P.stickers(st, PL.LEVELS), 1 + 2 + 1);
  eq(P.maxStickers(PL.LEVELS), 13 * 2 + 3);
});

// ---------------- そのほか ----------------
test("外部への URL・通信を ふくまない", () => {
  const files = ["index.html", "js/app.js", "js/engine/robot.js", "js/engine/ai.js", "js/engine/progress.js", "js/data/levels.js", "js/data/ai.js", "css/kids.css"];
  for (const f of files) {
    const s = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert(!/https?:\/\//.test(s.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, "")), f + " に URL");
    assert(!/\bfetch\(|XMLHttpRequest|WebSocket|eval\(|new Function/.test(s), f + " に 通信／eval");
  }
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert(/connect-src 'none'/.test(html), "CSP");
  for (const m of html.matchAll(/<script src="([^"]+)"/g)) assert(fs.existsSync(path.join(ROOT, m[1])), m[1]);
});

console.log(failures.join("\n"));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
