/*
 * データ・判定ロジックの自動テスト（依存なし）。  実行: node tests/run-tests.js
 */
"use strict";
const path = require("path");
const fs = require("fs");
const ROOT = path.join(__dirname, "..");
const load = (p) => require(path.join(ROOT, p));

load("js/engine/minijs.js");
load("js/data/registry.js");
for (const f of fs.readdirSync(path.join(ROOT, "js/data/cases")).sort()) load(path.join("js/data/cases", f));
load("js/data/videos.js");
load("js/data/glossary.js");
load("js/data/basics.js");
load("js/engine/progress.js");
load("js/engine/nova.js");

const HL = globalThis.HL;
const { MiniJS, Progress: P, Nova } = HL;
const CASES = HL.CASES;

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; } catch (e) { failed++; failures.push(`✕ ${name}\n    ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || "assertion failed"); }
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || ""} expected ${JSON.stringify(b)} but got ${JSON.stringify(a)}`); }

// 正解の状態を組み立てる
function solvedStateFor(c) {
  const cs = P.emptyCase();
  cs.board = [...c.requiredEvidence];
  cs.viewed = c.evidence.map((e) => e.id);
  c.lecture.quiz.forEach((q, i) => { cs.quiz[i] = { selected: q.answer }; });
  cs.hypothesis = c.hypotheses.filter((h) => h.correct).map((h) => h.id);
  cs.supports = [...c.requiredEvidence];
  cs.causeResult = { ok: P.evaluateCause(c, cs.hypothesis, cs.supports).ok };
  cs.code = c.solutionCode;
  const t = MiniJS.runTests(cs.code, c.testCases);
  cs.codeResult = { ok: t.ok, code: cs.code, passed: t.results.filter((r) => r.pass).length, total: c.testCases.length };
  cs.actions = [...c.completionRules.requiredActions];
  if (c.bank) cs.defense = [...c.bank.defense.required];
  cs.report = { residual: c.report.residual.map((r, i) => (r.correct ? i : -1)).filter((i) => i >= 0), note: "", submitted: true };
  return cs;
}

// ================= 事件データの網羅性 =================
const REQUIRED_FIELDS = ["id", "level", "chapter", "title", "organization", "summary", "lecture", "evidence", "hypotheses", "requiredEvidence", "starterCode", "testCases", "responseActions", "completionRules"];

test("30事件・6章・各章5事件", () => {
  eq(CASES.length, 30, "事件数");
  for (let ch = 1; ch <= 6; ch++) eq(CASES.filter((c) => c.chapter === ch).length, 5, `第${ch}章の事件数`);
  CASES.forEach((c, i) => eq(c.level, i + 1, "レベルの連番"));
  eq(new Set(CASES.map((c) => c.id)).size, 30, "IDの重複");
});

const SPEC_TITLES = ["偽りの当選通知", "配送先のない荷物", "使い回された合鍵", "押していない承認", "助け舟の裏口", "隣の部屋の秘密", "管理者の名札", "ログアウトの残像", "勝手に変わった通知先", "公開された企画書", "1円の買い物かご", "届いていない入金通知", "二度届いたチケット", "返金された未払い注文", "最後の1個が二つ売れた", "公開リポジトリの鍵", "誰でも読める保管庫", "更新に紛れた異物", "画像のふりをしたファイル", "午前2時のブラックアウト", "記録のない10分間", "鳴りやまないログイン", "AIに届いた偽の命令", "検索に混ざった機密", "権限を持ちすぎた相棒", "すり替わった振込先", "本人なのに別の操作", "7口座の同じ影", "止めずに守る決済網", "消えた120万円"];
test("事件名が仕様どおり", () => SPEC_TITLES.forEach((t, i) => eq(CASES[i].title, t, `LEVEL ${i + 1}`)));
test("章名が仕様どおり", () => eq(HL.CHAPTERS.map((c) => c.title).join("/"), "身近な罠を見抜く/アクセスの境界を守る/取引の整合性を守る/組織の被害を止める/監視とAIを扱う/銀行を守りきる"));

for (const c of CASES) {
  const L = `LEVEL ${String(c.level).padStart(2, "0")} ${c.title}`;
  test(`${L}: 必須フィールド`, () => REQUIRED_FIELDS.forEach((f) => assert(c[f] !== undefined && c[f] !== null, `${f} がありません`)));
  test(`${L}: 講義の4部構成`, () => {
    assert(c.lecture.principle.length >= 2, "原理の段落が少ない");
    assert(c.lecture.mechanism.code && c.lecture.mechanism.vars.length >= 2 && c.lecture.mechanism.flow.length >= 2, "仕組みの説明が不足");
    assert(c.lecture.apply.look.length && c.lecture.apply.allow.length && c.lecture.apply.block.length, "事件への適用が不足");
    assert(c.lecture.quiz.length >= 2, "理解度チェックが2問未満");
    assert(c.lecture.minutes >= 3 && c.lecture.minutes <= 5, "目安時間");
    for (const q of c.lecture.quiz) {
      assert(q.answer >= 0 && q.answer < q.options.length, "正解番号が範囲外");
      eq(q.explain.length, q.options.length, "選択肢ごとの解説の数");
    }
    const chars = c.lecture.principle.join("").length + c.lecture.mechanism.flow.join("").length;
    assert(chars >= 300, `講義本文が短すぎる (${chars}文字)`);
  });
  test(`${L}: 資料・仮説`, () => {
    assert(c.evidence.length >= 4, "資料が4件未満");
    assert(c.requiredEvidence.length >= 2, "必要な証拠が2件未満");
    c.requiredEvidence.forEach((id) => assert(c.evidence.some((e) => e.id === id), `存在しない証拠 ${id}`));
    eq(new Set(c.evidence.map((e) => e.id)).size, c.evidence.length, "資料IDの重複");
    const correct = c.hypotheses.filter((h) => h.correct);
    if (c.hypothesisMode === "multi") assert(correct.length >= 2, "複合原因の数");
    else eq(correct.length, 1, "正しい仮説はちょうど1つ");
    c.hypotheses.filter((h) => !h.correct).forEach((h) => assert(h.why, `誤りの仮説 ${h.id} に理由がない`));
  });
  test(`${L}: コード演習（模範解答は合格・初期コードは不合格）`, () => {
    const sol = MiniJS.runTests(c.solutionCode, c.testCases);
    assert(sol.ok, "模範解答が不合格: " + (sol.compileError || sol.results.filter((r) => !r.pass).map((r) => r.name + " " + (r.error || "")).join(", ")));
    assert(!MiniJS.runTests(c.starterCode, c.testCases).ok, "初期コードが合格してしまう");
  });
  test(`${L}: 全部許可・全部拒否では合格しない`, () => {
    assert(c.testCases.some((t) => t.expected === true), "正常系（許可）のテストがない");
    assert(c.testCases.some((t) => t.expected === false), "拒否すべきテストがない");
    assert(!MiniJS.runTests("return true;", c.testCases).ok, "全部許可で合格してしまう");
    assert(!MiniJS.runTests("return false;", c.testCases).ok, "全部拒否で合格してしまう");
  });
  test(`${L}: 被害対応とレポート`, () => {
    assert(c.responseActions.length >= 4, "対応の選択肢が少ない");
    assert(c.completionRules.requiredActions.length >= 2, "必要な対応が少ない");
    assert(c.completionRules.forbiddenActions.length >= 1, "不適切な対応の選択肢がない");
    c.responseActions.forEach((a) => assert(a.feedback, `対応 ${a.id} に結果の説明がない`));
    assert(c.responseActions.some((a) => a.urgent), "緊急の対応がない");
    assert(c.report.residual.some((r) => r.correct) && c.report.residual.some((r) => !r.correct), "残った課題の選択肢");
    assert(c.nova && c.nova.code && c.nova.evidence, "NOVAのヒント");
  });
  test(`${L}: 正しい手順で解決条件がすべてそろう`, () => {
    const ev = P.evaluate(c, solvedStateFor(c));
    assert(ev.allOk, "未達: " + ev.items.filter((i) => !i.ok).map((i) => i.label).join(", "));
  });
}

test("講義・資料・コードが事件ごとに固有（使い回しなし）", () => {
  const keys = ["principle", "code", "starter", "evidence", "quiz"];
  const seen = Object.fromEntries(keys.map((k) => [k, new Set()]));
  for (const c of CASES) {
    const vals = { principle: c.lecture.principle.join(), code: c.lecture.mechanism.code, starter: c.starterCode + c.solutionCode, evidence: JSON.stringify(c.evidence.map((e) => e.lines)), quiz: c.lecture.quiz.map((q) => q.q).join() };
    for (const k of keys) { assert(!seen[k].has(vals[k]), `${c.title} の ${k} が他の事件と同一`); seen[k].add(vals[k]); }
  }
});

test("コード演習で必須の文法をすべて学べる", () => {
  const all = CASES.map((c) => c.solutionCode + c.lecture.mechanism.code).join("\n") + HL.BASICS.map((b) => b.solutionCode).join("\n");
  for (const kw of ["const", "true", "false", "if", "else", "===", "&&", "||", "!", "console.log"]) assert(all.includes(kw), `${kw} が登場しない`);
});

// ================= 判定の正誤 =================
test("証拠不足では解決認定できない", () => {
  const c = CASES[0]; const state = P.emptyState();
  state.cases[c.id] = solvedStateFor(c);
  state.cases[c.id].board = state.cases[c.id].board.slice(1);
  const r = P.certify(state, c, CASES);
  assert(!r.ok && r.reason === "incomplete", "証拠不足なのに認定された");
  assert(!state.cases[c.id].officialSolved);
});
test("講義チェック未完了では解決認定できない", () => {
  const c = CASES[1]; const state = P.emptyState();
  state.cases[CASES[0].id] = Object.assign(P.emptyCase(), { officialSolved: true });
  state.cases[c.id] = solvedStateFor(c);
  state.cases[c.id].quiz = {};
  assert(!P.certify(state, c, CASES).ok, "講義未完了で認定された");
  state.cases[c.id].quiz = { 0: { selected: c.lecture.quiz[0].answer }, 1: { selected: (c.lecture.quiz[1].answer + 1) % c.lecture.quiz[1].options.length } };
  assert(!P.certify(state, c, CASES).ok, "誤答のまま認定された");
});
test("原因だけ当てても解決にならない（コード・対応が必要）", () => {
  const c = CASES[2]; const cs = solvedStateFor(c);
  cs.codeResult = null;
  assert(!P.evaluate(c, cs).allOk, "コード未合格で解決");
  const cs2 = solvedStateFor(c); cs2.actions = [];
  assert(!P.evaluate(c, cs2).allOk, "対応なしで解決");
});
test("誤った仮説・無関係な証拠は不合格", () => {
  const c = CASES[0];
  assert(!P.evaluateCause(c, ["h2"], c.requiredEvidence).ok, "誤った仮説で合格");
  assert(!P.evaluateCause(c, ["h1"], c.requiredEvidence.slice(1)).ok, "証拠不足で合格");
  assert(!P.evaluateCause(c, ["h1"], c.evidence.map((e) => e.id)).ok, "無関係な証拠を含めて合格");
  assert(P.evaluateCause(c, ["h1"], c.requiredEvidence).ok, "正答が不合格");
});
test("複合原因（LEVEL 30）は一部だけでは不合格", () => {
  const c = CASES[29];
  assert(!P.evaluateCause(c, ["h1", "h2"], c.requiredEvidence).ok);
  assert(!P.evaluateCause(c, ["h1", "h2", "h3", "h4", "h5"], c.requiredEvidence).ok);
  assert(P.evaluateCause(c, ["h1", "h2", "h3", "h4"], c.requiredEvidence).ok);
});
test("不適切な対応が残っていると解決できない", () => {
  const c = CASES[3]; const cs = solvedStateFor(c);
  cs.actions.push(c.completionRules.forbiddenActions[0]);
  assert(!P.evaluate(c, cs).allOk);
});
test("合格後にコードを変えたら再テストが必要", () => {
  const c = CASES[4]; const cs = solvedStateFor(c);
  cs.code = cs.code + "\n// 変更";
  assert(!P.codeOk(c, cs) && !P.evaluate(c, cs).allOk);
});
test("緊急対応は原因特定前でも実行できる（対応は原因特定に依存しない）", () => {
  const c = CASES[19]; const cs = P.emptyCase();
  cs.actions = c.responseActions.filter((a) => a.urgent && a.effect === "good").map((a) => a.id);
  const ev = P.evaluate(c, cs);
  assert(!ev.items.find((i) => i.key === "cause").ok, "前提");
  eq(P.actionsEval(c, cs).harmful.length, 0);
});

// ================= MiniJS（安全な演習環境） =================
test("MiniJS: 基本文法", () => {
  const r = MiniJS.run('const a = 1;\nlet b = a + 2;\nb = b * 2;\nif (b === 6 && !false || false) { console.log("ok", b); return true; } else { return false; }', {});
  eq(r.value, true); eq(r.logs[0], "ok 6");
});
test("MiniJS: 危険な語と == を拒否", () => {
  for (const src of ["eval('1')", "fetch('x')", "window.location", "return a == 1;", "return x.constructor;", "return x.__proto__;", "while (true) {}", "return `t`;", "new Function()", "require('fs')"]) {
    let threw = false; try { MiniJS.run(src, { a: 1, x: {} }); } catch (e) { threw = true; }
    assert(threw, `拒否されない: ${src}`);
  }
});
test("MiniJS: 入力の書き換えと const 再代入を拒否", () => {
  let t = false; try { MiniJS.run("x = 2; return true;", { x: 1 }); } catch (e) { t = true; } assert(t);
  t = false; try { MiniJS.run("const y = 1; y = 2; return true;", {}); } catch (e) { t = true; } assert(t);
});
test("MiniJS: プロトタイプのプロパティに届かない", () => {
  let t = false; try { MiniJS.run("return o.toString;", { o: {} }); } catch (e) { t = true; } assert(t);
  t = false; try { MiniJS.run('return "a".concat("b");', {}); } catch (e) { t = true; } assert(t);
});
test("MiniJS: 構文エラーはテスト結果として返る", () => {
  const r = MiniJS.runTests("if (x { return true; }", [{ name: "a", input: { x: true }, expected: true }]);
  assert(!r.ok && r.compileError);
});
test("MiniJS: 実装に eval / Function を使っていない", () => {
  const src = fs.readFileSync(path.join(ROOT, "js/engine/minijs.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const code = src.replace(/"[^"\n]*"/g, '""');
  assert(!/\beval\s*\(/.test(code) && !/new\s+Function\b/.test(code), "eval / Function を使っている");
});

// ================= 基礎実践 =================
for (const b of HL.BASICS) {
  test(`基礎 ${b.id}: 解答は合格・初期は不合格・両方向のテスト`, () => {
    assert(MiniJS.runTests(b.solutionCode, b.tests).ok, "解答が不合格");
    assert(!MiniJS.runTests(b.starterCode, b.tests).ok, "初期が合格");
    assert(b.tests.some((t) => t.expected) && b.tests.some((t) => !t.expected), "両方向のテスト");
  });
}
test("基礎実践が必須トピックを含む", () => {
  const topics = new Set(HL.BASICS.map((b) => b.topic));
  for (const t of ["通信", "変数", "条件分岐", "認証", "認可"]) assert(topics.has(t), t);
});

// ================= 銀行事件 =================
test("銀行：必要な対応で 停止30万・返還40万（仮定）・未解決50万、合計一致", () => {
  const c = HL.getCase("case30");
  const o = P.bankOutcome(c, c.completionRules.requiredActions);
  eq(o.stopped, 300000, "停止"); eq(o.recovered, 400000, "返還"); eq(o.unresolved, 500000, "未解決"); eq(o.frozen, 0, "凍結中");
  eq(o.stopped + o.recovered + o.unresolved, 1200000, "合計"); assert(o.balanced);
});
test("銀行：凍結だけでは返金完了にならない", () => {
  const c = HL.getCase("case30");
  const o = P.bankOutcome(c, ["stop701", "freeze702"]);
  eq(o.recovered, 0); eq(o.frozen, 400000); eq(o.unresolved, 900000); assert(o.balanced);
});
test("銀行：凍結なしの返還手続きは計上されない", () => {
  const c = HL.getCase("case30");
  const o = P.bankOutcome(c, ["return702"]);
  eq(o.recovered, 0); eq(o.unresolved, 1200000);
});
test("銀行：何もしなければ全額未解決", () => {
  const o = P.bankOutcome(HL.getCase("case30"), []);
  eq(o.unresolved, 1200000); assert(o.balanced);
});
test("銀行：台帳の設定が仕様どおり", () => {
  const L = HL.getCase("case30").bank.ledger;
  eq(L.map((t) => `${t.id}:${t.amount}:${t.remaining}`).join(","), "TX-701:300000:300000,TX-702:600000:400000,TX-703:300000:0");
});
test("銀行：防御は『新端末を全部拒否』だけでは不合格", () => {
  const c = HL.getCase("case30");
  assert(!P.defenseEval(c, ["blockNewDevices"]).ok);
  assert(!P.defenseEval(c, [...c.bank.defense.required, "blockNewDevices"]).ok, "正当な利用を止めても合格");
  assert(!P.defenseEval(c, c.bank.defense.required.filter((x) => x !== "falsePositiveCheck")).ok, "誤停止の検証なしで合格");
  assert(P.defenseEval(c, c.bank.defense.required).ok);
});
test("銀行：コードで新端末を全部拒否すると不合格", () => {
  const c = HL.getCase("case30");
  assert(!MiniJS.runTests("if (session.newDevice) { return false; } else { return true; }", c.testCases).ok);
  assert(!MiniJS.runTests("return !session.newDevice && !session.revoked;", c.testCases).ok);
});
test("銀行：『全額必ず戻る』は不適切な対応", () => {
  const c = HL.getCase("case30");
  assert(c.completionRules.forbiddenActions.includes("promiseAll"));
  assert(c.report.residual.some((r) => !r.correct && r.text.includes("全額回収")));
});

// ================= 進捗・解放・保存 =================
test("レベル解放：最初はLEVEL 01だけ挑戦可能、他は体験モード", () => {
  const s = P.emptyState();
  eq(P.status(s, CASES[0], CASES), "available"); eq(P.status(s, CASES[1], CASES), "trial"); eq(P.status(s, CASES[29], CASES), "trial");
});
test("解決すると次のレベルが解放される", () => {
  const s = P.emptyState();
  s.cases.case01 = solvedStateFor(CASES[0]);
  assert(P.certify(s, CASES[0], CASES).ok);
  eq(P.status(s, CASES[0], CASES), "solved"); eq(P.status(s, CASES[1], CASES), "available"); eq(P.status(s, CASES[2], CASES), "trial");
});
test("体験モードは最後まで試せるが、正式認定は順番", () => {
  const s = P.emptyState(); const c = CASES[29];
  s.cases[c.id] = solvedStateFor(c);
  assert(P.evaluate(c, s.cases[c.id]).allOk, "体験でも条件はそろえられる");
  const r = P.certify(s, c, CASES);
  assert(!r.ok && r.reason === "locked"); assert(s.cases[c.id].trialCleared && !s.cases[c.id].officialSolved);
  for (const x of CASES.slice(0, 29)) s.cases[x.id] = Object.assign(s.cases[x.id] || P.emptyCase(), { officialSolved: true });
  assert(P.certify(s, c, CASES).ok, "解放後は体験の記録から認定できる");
});
test("保存と再開（往復で同じ内容）", () => {
  const mem = {}; const storage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  const s = P.emptyState();
  s.cases.case05 = solvedStateFor(CASES[4]); s.cases.case05.lecturePos = 2; s.cases.case05.step = "code"; s.videos.watched = ["ZXFYT-BG2So"];
  P.save(storage, s);
  const back = P.load(storage);
  eq(JSON.stringify(back.cases.case05), JSON.stringify(s.cases.case05)); eq(back.videos.watched[0], "ZXFYT-BG2So");
});
test("壊れた保存データでも起動する", () => {
  const storage = { getItem: () => "{broken", setItem: () => {} };
  eq(P.load(storage).version, P.VERSION);
  const throwing = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
  eq(P.load(throwing).version, P.VERSION); eq(P.save(throwing, P.emptyState()), false);
});
test("更新（旧形式からの移行）で解決記録を失わない", () => {
  const mem = { "hackerlab.v1": JSON.stringify({ version: 1, solved: ["case01", "case02"], code: { case03: "return true;" } }) };
  const s = P.load({ getItem: (k) => mem[k] ?? null });
  assert(s.cases.case01.officialSolved && s.cases.case02.officialSolved); eq(s.cases.case03.code, "return true;");
  eq(P.status(s, CASES[2], CASES), "available");
  const s2 = P.migrate({ version: 2, cases: { case01: { officialSolved: true, unknownFutureField: 1 } } });
  assert(s2.cases.case01.officialSolved); assert(Array.isArray(s2.cases.case01.board));
});
test("事件のやり直し：作業は消え、解決記録は残る", () => {
  const s = P.emptyState(); s.cases.case01 = solvedStateFor(CASES[0]); P.certify(s, CASES[0], CASES);
  P.resetCase(s, "case01");
  eq(s.cases.case01.board.length, 0); eq(s.cases.case01.code, null); assert(s.cases.case01.officialSolved);
  eq(P.status(s, CASES[1], CASES), "available");
  s.cases.case02 = solvedStateFor(CASES[1]); P.resetCase(s, "case02"); assert(!s.cases.case02.officialSolved);
});
test("検索・絞り込み", () => {
  const s = P.emptyState(); s.cases.case01 = Object.assign(P.emptyCase(), { officialSolved: true });
  eq(P.searchCases(CASES, s, { query: "MFA" })[0].id, "case04");
  assert(P.searchCases(CASES, s, { query: "Webhook" }).some((c) => c.id === "case12"));
  eq(P.searchCases(CASES, s, { query: "ログアウト" })[0].id, "case08");
  eq(P.searchCases(CASES, s, { chapter: 6 }).length, 5);
  eq(P.searchCases(CASES, s, { filter: "solved" }).length, 1);
  eq(P.searchCases(CASES, s, { filter: "available" })[0].id, "case02");
  eq(P.searchCases(CASES, s, { filter: "trial" }).length, 28);
  eq(P.searchCases(CASES, s, { query: "存在しない語xyz" }).length, 0);
});

// ================= NOVA・動画・辞典・安全性 =================
test("NOVA は模擬AIであることを必ず明示する", () => {
  const c = CASES[0]; const cs = P.emptyCase();
  for (const k of ["next", "organize", "code"]) { const out = Nova.respond(k, c, cs, P.evaluate(c, cs), null); assert(out.some((l) => l.includes("模擬AI")), k); }
});
test("動画：IDの形式・重複なし・検証日あり・関連事件が存在", () => {
  assert(HL.VIDEOS.length >= 10);
  eq(new Set(HL.VIDEOS.map((v) => v.id)).size, HL.VIDEOS.length);
  for (const v of HL.VIDEOS) {
    assert(/^[A-Za-z0-9_-]{11}$/.test(v.id), `IDの形式 ${v.id}`);
    assert(HL.VIDEO_CATEGORIES.some((c) => c.id === v.category), `分類 ${v.id}`);
    v.cases.forEach((id) => assert(HL.getCase(id), `関連事件 ${id}`));
  }
  assert(HL.VIDEOS_VERIFIED_ON);
});
test("辞典：日英の用語・関連事件が存在", () => {
  assert(HL.GLOSSARY.length >= 50);
  for (const g of HL.GLOSSARY) { assert(g.ja && g.en && g.desc); g.cases.forEach((id) => assert(HL.getCase(id), `${g.ja} → ${id}`)); }
});
test("実在の接続先を含まない（URLは .example のみ）", () => {
  const text = JSON.stringify(CASES);
  const urls = text.match(/https?:\/\/[^\s"'\\]+/g) || [];
  for (const u of urls) assert(/^https?:\/\/[^/]*\.example(\/|$)/.test(u), `実在しうるURL: ${u}`);
  const mails = text.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) || [];
  for (const m of mails) assert(/\.example$/.test(m), `実在しうるメール: ${m}`);
});
test("アプリ本体に外部通信のコードがない", () => {
  const app = ["js/app.js", "js/engine/progress.js", "js/engine/nova.js", "js/engine/minijs.js"].map((p) => fs.readFileSync(path.join(ROOT, p), "utf8")).join("\n");
  assert(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(app.replace(/"[^"\n]*"/g, "")), "外部通信のコード");
});

// ---------- 結果 ----------
console.log(failures.join("\n"));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
