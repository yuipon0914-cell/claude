/*
 * NOVA — 調査支援の「模擬AI」。
 * 実際のAI APIには接続していない。事件データの定型ヒントと、
 * 今の進捗状態から組み立てたルールベースの応答だけを返す。
 * 画面には必ず「模擬AI（定型応答）」と表示すること。
 */
(function (root) {
  "use strict";
  const HL = (root.HL = root.HL || {});

  const VERIFY = "※NOVAは模擬AIです。ここに書いたことも、資料とテスト結果で必ず確かめてね。";

  const STEP_TIPS = {
    evidence: "『資料調査』で資料を開き、事件に関係する資料を『証拠ボードに追加』しよう。関係のない資料も混ざっているよ。",
    lecture: "『今回の講義』の理解度チェックに答えよう。間違えても理由が表示されるし、何度でも挑戦できる。",
    cause: "『原因特定』で仮説を選び、それを支える証拠をボードから選んで提出しよう。",
    code: "『コード検証』で条件式を直してテストを実行しよう。正常なケースを止めていないかも大事。",
    response: "『被害対応』で必要な対応を実行しよう。緊急の対応は、原因を特定する前でも実行できるよ。",
    defense: "『被害対応』の下にある『銀行全体の防御』で、攻撃シナリオと正常利用シナリオを両方確かめよう。",
    report: "『調査レポート』で残った課題を選んで提出しよう。",
  };

  function respond(kind, caseData, cs, evaluation, lastTest) {
    const lines = [];
    if (kind === "next") {
      const next = evaluation.items.find((i) => !i.ok);
      if (!next) {
        lines.push("すべての解決条件がそろったみたい。『調査レポート』の下から解決認定を申請できるよ。");
      } else {
        lines.push(`次の一手: ${next.label}`);
        lines.push(STEP_TIPS[next.key] || "");
        if (next.detail) lines.push(`状況: ${next.detail}`);
        const urgent = caseData.responseActions.filter((a) => a.urgent && !cs.actions.includes(a.id));
        if (urgent.length && next.key !== "response") lines.push(`緊急の対応がまだ ${urgent.length} 件あるよ。被害を広げないために先に実行してもいい。`);
      }
    } else if (kind === "organize") {
      const board = caseData.evidence.filter((e) => cs.board.includes(e.id));
      const unviewed = caseData.evidence.filter((e) => !cs.viewed.includes(e.id));
      lines.push(`証拠ボード: ${board.length}件 ／ 資料全体: ${caseData.evidence.length}件（未読 ${unviewed.length}件）`);
      for (const e of board) lines.push(`・${e.title} — この資料は『何が・いつ・誰によって』起きたことを示している？`);
      if (cs.hypothesis.length) {
        const h = caseData.hypotheses.filter((x) => cs.hypothesis.includes(x.id));
        lines.push("選んでいる仮説:");
        for (const x of h) lines.push(`・${x.text}`);
        lines.push("仮説と矛盾する資料がないか、1件ずつ照らし合わせてみよう。");
      } else {
        lines.push("まだ仮説は選んでいないね。ボードの資料から『何が原因なら全部説明がつくか』を考えてみよう。");
      }
      lines.push(caseData.nova.evidence);
    } else if (kind === "code") {
      lines.push(caseData.nova.code);
      if (lastTest && lastTest.compileError) {
        lines.push(`前回の実行はエラーで止まったよ: ${lastTest.compileError}`);
      } else if (lastTest && lastTest.results) {
        const failed = lastTest.results.filter((r) => !r.pass);
        if (failed.length === 0) lines.push("前回のテストは全部合格。正常なケースと止めるべきケースの両方が通っているね。");
        else {
          lines.push("前回失敗したテスト:");
          for (const f of failed) lines.push(`・${f.name}（期待 ${f.expected} / 実際 ${f.error ? "エラー" : f.actual}）`);
          const allowMiss = failed.filter((f) => f.expected === true).length;
          const blockMiss = failed.filter((f) => f.expected === false).length;
          if (allowMiss && !blockMiss) lines.push("止めすぎているみたい。正しい利用まで拒否していない？");
          if (blockMiss && !allowMiss) lines.push("通しすぎているみたい。止めるべきケースの特徴は何だろう？");
        }
      } else {
        lines.push("まずは今のコードのままテストを実行して、どのケースが失敗するか見てみよう。");
      }
    }
    lines.push(VERIFY);
    return lines.filter(Boolean);
  }

  HL.Nova = { respond, VERIFY };
  if (typeof module !== "undefined" && module.exports) module.exports = HL.Nova;
})(typeof globalThis !== "undefined" ? globalThis : this);
