/*
 * 進捗・解決判定のロジック（画面から独立した純粋な関数群）。
 * 状態は1つのオブジェクトで持ち、保存・読み込みは storage 経由で行う。
 */
(function (root) {
  "use strict";
  const HL = (root.HL = root.HL || {});

  const STORAGE_KEY = "hackerlab.progress";
  const LEGACY_KEYS = ["hackerlab.v1"];
  const VERSION = 2;

  function emptyState() {
    return { version: VERSION, cases: {}, basics: {}, videos: { watched: [] }, ui: {} };
  }

  function emptyCase() {
    return {
      step: "brief",
      lecturePos: 0,
      quiz: {},
      viewed: [],
      board: [],
      hypothesis: [],
      supports: [],
      causeResult: null,
      code: null,
      codeResult: null,
      actions: [],
      defense: [],
      report: { residual: [], note: "", submitted: false },
      officialSolved: false,
      solvedAt: null,
      trialCleared: false,
    };
  }

  /**
   * 古い形式や欠けた項目を補う。既存の解決記録（officialSolved）は絶対に消さない。
   */
  function migrate(raw) {
    const state = emptyState();
    if (!raw || typeof raw !== "object") return state;
    // v1: { solved: ["case01", ...], code: { case01: "..." } }
    if (raw.version === 1 || (!raw.version && Array.isArray(raw.solved))) {
      for (const id of raw.solved || []) {
        state.cases[id] = Object.assign(emptyCase(), { officialSolved: true, solvedAt: raw.solvedAt?.[id] || null });
      }
      for (const [id, code] of Object.entries(raw.code || {})) {
        state.cases[id] = state.cases[id] || emptyCase();
        state.cases[id].code = code;
      }
      return state;
    }
    state.cases = {};
    for (const [id, cs] of Object.entries(raw.cases || {})) {
      const base = emptyCase();
      const merged = Object.assign(base, cs);
      merged.report = Object.assign(emptyCase().report, cs.report || {});
      for (const k of ["quiz"]) merged[k] = merged[k] && typeof merged[k] === "object" ? merged[k] : {};
      for (const k of ["viewed", "board", "hypothesis", "supports", "actions", "defense"]) merged[k] = Array.isArray(merged[k]) ? merged[k] : [];
      merged.officialSolved = cs.officialSolved === true;
      state.cases[id] = merged;
    }
    state.basics = raw.basics && typeof raw.basics === "object" ? raw.basics : {};
    state.videos = { watched: Array.isArray(raw.videos?.watched) ? raw.videos.watched : [] };
    state.ui = raw.ui && typeof raw.ui === "object" ? raw.ui : {};
    return state;
  }

  function load(storage) {
    try {
      const s = storage.getItem(STORAGE_KEY);
      if (s) return migrate(JSON.parse(s));
      for (const k of LEGACY_KEYS) {
        const old = storage.getItem(k);
        if (old) return migrate(JSON.parse(old));
      }
    } catch (e) { /* 壊れたデータやストレージ不可の環境でも起動する */ }
    return emptyState();
  }

  function save(storage, state) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
  }

  function caseState(state, id) {
    if (!state.cases[id]) state.cases[id] = emptyCase();
    return state.cases[id];
  }

  // ---------- 解放 ----------
  function isUnlocked(state, caseData, cases) {
    if (caseData.level === 1) return true;
    const prev = cases.find((c) => c.level === caseData.level - 1);
    return !prev || state.cases[prev.id]?.officialSolved === true;
  }

  function status(state, caseData, cases) {
    if (state.cases[caseData.id]?.officialSolved) return "solved";
    return isUnlocked(state, caseData, cases) ? "available" : "trial";
  }

  // ---------- 各工程の判定 ----------
  function evaluateCause(caseData, hypothesis, supports) {
    const hyps = caseData.hypotheses;
    const multi = caseData.hypothesisMode === "multi";
    const correctIds = hyps.filter((h) => h.correct).map((h) => h.id);
    const chosen = hypothesis || [];
    let hypOk;
    if (multi) hypOk = correctIds.length === chosen.length && correctIds.every((id) => chosen.includes(id));
    else hypOk = chosen.length === 1 && correctIds.includes(chosen[0]);
    const wrongPicked = hyps.filter((h) => chosen.includes(h.id) && !h.correct);
    const missingHyp = multi ? hyps.filter((h) => h.correct && !chosen.includes(h.id)) : [];

    const req = caseData.requiredEvidence;
    const sup = supports || [];
    const missingEvidence = req.filter((id) => !sup.includes(id));
    const irrelevant = sup.filter((id) => !req.includes(id));
    const evidenceOk = missingEvidence.length === 0 && irrelevant.length === 0;
    return { ok: hypOk && evidenceOk, hypOk, evidenceOk, wrongPicked, missingHyp, missingEvidence, irrelevant };
  }

  function quizOk(caseData, cs) {
    return caseData.lecture.quiz.every((q, i) => cs.quiz[i] && cs.quiz[i].selected === q.answer);
  }

  function actionsEval(caseData, cs) {
    const r = caseData.completionRules;
    const missing = r.requiredActions.filter((id) => !cs.actions.includes(id));
    const harmful = r.forbiddenActions.filter((id) => cs.actions.includes(id));
    return { ok: missing.length === 0 && harmful.length === 0, missing, harmful };
  }

  function reportEval(caseData, cs) {
    const opts = caseData.report.residual;
    const chosen = cs.report.residual || [];
    const missing = opts.map((o, i) => (o.correct && !chosen.includes(i) ? i : -1)).filter((i) => i >= 0);
    const wrong = chosen.filter((i) => opts[i] && !opts[i].correct);
    return { ok: cs.report.submitted && missing.length === 0 && wrong.length === 0, submitted: cs.report.submitted, missing, wrong };
  }

  // ---------- 銀行事件 ----------
  /** 送金台帳と実行済みの対応から、演習上の結果を計算する（金額は円）。 */
  function bankOutcome(caseData, actions) {
    const b = caseData.bank;
    const has = (id) => actions.includes(id);
    const tx = Object.fromEntries(b.ledger.map((t) => [t.id, t]));
    const rows = [];
    let stopped = 0, frozen = 0, recovered = 0;
    // TX-701: 実行前の停止
    if (has("stop701")) { stopped += tx["TX-701"].amount; rows.push({ id: "TX-701", label: "実行前に停止", amount: tx["TX-701"].amount, kind: "stopped" }); }
    else rows.push({ id: "TX-701", label: "未対応（予定日に実行されてしまう）", amount: tx["TX-701"].amount, kind: "open" });
    // TX-702: 凍結 → 返還
    const r702 = tx["TX-702"].remaining;
    if (has("freeze702") && has("return702")) { recovered += r702; rows.push({ id: "TX-702", label: "残存分の返還手続き完了（演習上の仮定）", amount: r702, kind: "recovered" }); }
    else if (has("freeze702")) { frozen += r702; rows.push({ id: "TX-702", label: "凍結済み・返金未完了", amount: r702, kind: "frozen" }); }
    else rows.push({ id: "TX-702", label: "未対応（残存資金が動かされるおそれ）", amount: r702, kind: "open" });
    const moved702 = tx["TX-702"].amount - r702;
    rows.push({ id: "TX-702", label: "着金後に移動済み（残存なし）", amount: moved702, kind: "open" });
    rows.push({ id: "TX-703", label: has("trace703") ? "追跡調査中（残存なし）" : "未対応（残存なし・追跡未開始）", amount: tx["TX-703"].amount, kind: "open" });
    const unresolved = b.total - stopped - recovered;
    return { total: b.total, stopped, frozen, recovered, unresolved, rows, balanced: stopped + recovered + unresolved === b.total };
  }

  function defenseEval(caseData, selected) {
    const d = caseData.bank.defense;
    const sel = selected || [];
    const results = d.scenarios.map((s) => {
      if (s.kind === "attack") {
        const ok = s.stoppedBy.some((id) => sel.includes(id));
        return { id: s.id, kind: s.kind, label: s.label, ok, text: ok ? "阻止できた" : "すり抜けた" };
      }
      const broken = (s.brokenBy || []).filter((id) => sel.includes(id));
      const needs = (s.needs || []).filter((id) => !sel.includes(id));
      const ok = broken.length === 0 && needs.length === 0;
      return { id: s.id, kind: s.kind, label: s.label, ok, text: broken.length ? "正当な利用を止めてしまった" : needs.length ? "未検証（" + s.needsNote + "）" : "正常に通った" };
    });
    const missingRequired = d.required.filter((id) => !sel.includes(id));
    return { ok: results.every((r) => r.ok) && missingRequired.length === 0, results, missingRequired };
  }

  /** 合格したテスト結果が、今のコードに対するものか */
  function codeOk(caseData, cs) {
    const current = cs.code ?? caseData.starterCode;
    return cs.codeResult?.ok === true && cs.codeResult.code === current;
  }

  // ---------- 総合 ----------
  function evaluate(caseData, cs) {
    const r = caseData.completionRules;
    const items = [];
    const boardMissing = caseData.requiredEvidence.filter((id) => !cs.board.includes(id));
    items.push({ key: "evidence", step: "evidence", label: "必要な証拠を証拠ボードに保存", ok: !r.requireAllEvidence || boardMissing.length === 0, detail: boardMissing.length ? `あと${boardMissing.length}件の重要な資料が保存されていません` : "" });
    items.push({ key: "lecture", step: "lecture", label: "講義の理解度チェックに正解", ok: !r.requireQuiz || quizOk(caseData, cs), detail: "" });
    const cause = evaluateCause(caseData, cs.hypothesis, cs.supports);
    items.push({ key: "cause", step: "cause", label: "原因の仮説と根拠となる証拠を特定", ok: cause.ok && cs.causeResult?.ok === true, detail: "" });
    items.push({ key: "code", step: "code", label: "コード検証のテストにすべて合格", ok: !r.requireCodeTests || codeOk(caseData, cs), detail: cs.codeResult?.ok && !codeOk(caseData, cs) ? "合格後にコードが変更されました。もう一度テストを実行してください" : "" });
    const act = actionsEval(caseData, cs);
    items.push({ key: "response", step: "response", label: "必要な被害対応を実施（不適切な対応なし）", ok: act.ok, detail: act.harmful.length ? "不適切な対応が実行されたままです" : act.missing.length ? `必要な対応があと${act.missing.length}件` : "" });
    if (r.extra.includes("bankDefense")) {
      const d = defenseEval(caseData, cs.defense);
      items.push({ key: "defense", step: "response", label: "銀行全体の防御シナリオをすべて検証", ok: d.ok, detail: "" });
    }
    const rep = reportEval(caseData, cs);
    items.push({ key: "report", step: "report", label: "調査レポートを提出", ok: !r.requireReport || rep.ok, detail: rep.submitted && !rep.ok ? "残った課題の選択を見直してください" : "" });
    const done = items.filter((i) => i.ok).length;
    return { items, done, total: items.length, allOk: done === items.length };
  }

  /** 解決認定を試みる。順番に解放されていなければ体験クリアとして記録する。 */
  function certify(state, caseData, cases) {
    const cs = caseState(state, caseData.id);
    const ev = evaluate(caseData, cs);
    if (!ev.allOk) return { ok: false, reason: "incomplete", evaluation: ev };
    if (!isUnlocked(state, caseData, cases)) {
      cs.trialCleared = true;
      return { ok: false, reason: "locked", evaluation: ev };
    }
    if (!cs.officialSolved) { cs.officialSolved = true; cs.solvedAt = new Date().toISOString(); }
    return { ok: true, evaluation: ev };
  }

  /** 事件のやり直し。作業内容は消すが、正式な解決記録は残す（後続レベルの解放を保つ）。 */
  function resetCase(state, caseId) {
    const prev = state.cases[caseId];
    const fresh = emptyCase();
    if (prev?.officialSolved) { fresh.officialSolved = true; fresh.solvedAt = prev.solvedAt; }
    state.cases[caseId] = fresh;
    return fresh;
  }

  function lectureProgress(caseData, cs) {
    const sections = 4;
    const answered = caseData.lecture.quiz.filter((q, i) => cs.quiz[i]?.selected === q.answer).length;
    const pos = Math.min(cs.lecturePos || 0, sections - 1);
    if (answered === caseData.lecture.quiz.length) return 100;
    return Math.round(((pos) / sections) * 100 * 0.75 + (answered / caseData.lecture.quiz.length) * 25);
  }

  function searchCases(cases, state, { query = "", chapter = "all", filter = "all" } = {}) {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      if (chapter !== "all" && String(c.chapter) !== String(chapter)) return false;
      const st = status(state, c, cases);
      if (filter === "available" && st !== "available") return false;
      if (filter === "solved" && st !== "solved") return false;
      if (filter === "trial" && st !== "trial") return false;
      if (!q) return true;
      const hay = [c.title, c.organization, c.summary, ...c.concepts, `level ${c.level}`, String(c.level).padStart(2, "0")].join(" ").toLowerCase();
      return q.split(/\s+/).every((w) => hay.includes(w));
    });
  }

  HL.Progress = {
    STORAGE_KEY, VERSION, emptyState, emptyCase, migrate, load, save, caseState,
    isUnlocked, status, evaluateCause, quizOk, codeOk, actionsEval, reportEval, bankOutcome, defenseEval,
    evaluate, certify, resetCase, lectureProgress, searchCases,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = HL.Progress;
})(typeof globalThis !== "undefined" ? globalThis : this);
