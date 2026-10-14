/* ピコラボ — こども向けの「しくみが みえる AI」（画面から独立した純粋な関数）。
 * どちらも本物の機械学習の いちばん小さな形で、答えの「わけ」を こどもの ことばで返す。
 *   Teach   … おしえてもらった れい の中から いちばん にている ものを さがす（さいきんぼう法 / 1-NN）
 *   Pattern … ならびを みて「この つぎに よく くる もの」を こたえる（バイグラムの かぞえあげ） */
(function (root) {
  "use strict";
  const PL = (root.PL = root.PL || {});

  // ---------------- Teach ----------------
  function distance(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
    return Math.sqrt(s);
  }

  /* examples: [{ item, label }] / item: { id, f: [特徴…] }
   * 返り値: { label, nearest, dist, shared } / れいが ないときは null
   * 同じ近さなら、先に おしえた れい を えらぶ（結果が毎回同じになるように）。 */
  function classify(examples, item, featureNames) {
    let best = null;
    for (const ex of examples) {
      const d = distance(ex.item.f, item.f);
      if (!best || d < best.dist - 1e-9) best = { label: ex.label, nearest: ex.item, dist: d };
    }
    if (!best) return null;
    // 「どこが にているか」= 両方とも その とくちょう を もっている（0.5 いじょう）
    best.shared = (featureNames || []).filter((_, i) => item.f[i] >= 0.5 && best.nearest.f[i] >= 0.5);
    return best;
  }

  // ---------------- Pattern ----------------
  /* seq の中で「last の つぎ」に きたものを かぞえて、いちばん おおいものを こたえる。
   * 同じ回数なら、先に でてきた ほうを えらぶ。 */
  function predictNext(seq) {
    const last = seq[seq.length - 1];
    const counts = new Map();
    for (let i = 0; i < seq.length - 1; i++) {
      if (seq[i] === last) counts.set(seq[i + 1], (counts.get(seq[i + 1]) || 0) + 1);
    }
    if (!counts.size) return { guess: null, last, counts: [] };
    let guess = null, max = 0;
    for (const [k, n] of counts) if (n > max) { guess = k; max = n; }
    return { guess, last, counts: [...counts].map(([item, n]) => ({ item, n })) };
  }

  PL.AI = { distance, classify, predictNext };
})(typeof window !== "undefined" ? window : globalThis);
