/*
 * 事件データの登録口。事件ファイル（cases/chN.js）はここに追加していくだけで、
 * 画面や判定ロジックを変えずに新しい事件・講義を増やせる。
 */
(function (root) {
  "use strict";
  const HL = (root.HL = root.HL || {});

  HL.CHAPTERS = [
    { no: 1, title: "身近な罠を見抜く", en: "SPOT THE TRAP" },
    { no: 2, title: "アクセスの境界を守る", en: "GUARD THE BOUNDARY" },
    { no: 3, title: "取引の整合性を守る", en: "KEEP TRANSACTIONS TRUE" },
    { no: 4, title: "組織の被害を止める", en: "STOP THE BLEEDING" },
    { no: 5, title: "監視とAIを扱う", en: "WATCH & WIELD AI" },
    { no: 6, title: "銀行を守りきる", en: "DEFEND THE BANK" },
  ];

  HL.CASES = HL.CASES || [];

  /**
   * 事件を登録する。completionRules を省略した場合は responseActions の
   * effect から「必須（good）」「禁止（bad）」を組み立てる。
   */
  HL.addCases = function (list) {
    for (const c of list) {
      const rules = c.completionRules || {};
      c.completionRules = {
        requireAllEvidence: rules.requireAllEvidence !== false,
        requireQuiz: rules.requireQuiz !== false,
        requireCodeTests: rules.requireCodeTests !== false,
        requireReport: rules.requireReport !== false,
        requiredActions: rules.requiredActions || c.responseActions.filter((a) => a.effect === "good").map((a) => a.id),
        forbiddenActions: rules.forbiddenActions || c.responseActions.filter((a) => a.effect === "bad").map((a) => a.id),
        extra: rules.extra || [],
      };
      if (!c.requiredEvidence) c.requiredEvidence = c.evidence.filter((e) => e.key).map((e) => e.id);
      HL.CASES.push(c);
    }
    HL.CASES.sort((a, b) => a.level - b.level);
  };

  HL.getCase = (id) => HL.CASES.find((c) => c.id === id);

  if (typeof module !== "undefined" && module.exports) module.exports = HL;
})(typeof globalThis !== "undefined" ? globalThis : this);
