/* ピコラボ — すすみぐあい（ほし・シール）の保存と計算。画面から独立した純粋な関数。 */
(function (root) {
  "use strict";
  const PL = (root.PL = root.PL || {});
  const KEY = "picolab.progress";
  const AI_ACTIVITIES = ["teach", "pattern", "promise"];

  const empty = () => ({ v: 1, levels: {}, ai: {} });

  // 壊れたデータや知らない形でも、こわれずに「はじめから」にもどす
  function load(storage) {
    try {
      const raw = storage && storage.getItem(KEY);
      if (!raw) return empty();
      const d = JSON.parse(raw);
      if (!d || typeof d !== "object" || d.v !== 1) return empty();
      const s = empty();
      for (const [id, n] of Object.entries(d.levels || {})) if (Number.isInteger(n) && n >= 0 && n <= 3) s.levels[id] = n;
      for (const id of AI_ACTIVITIES) if (d.ai && d.ai[id] === true) s.ai[id] = true;
      return s;
    } catch (e) {
      return empty();
    }
  }
  function save(storage, state) {
    try { storage && storage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
  }

  // ほし は いちばん よかった かいすう を のこす
  function recordLevel(state, id, stars) {
    state.levels[id] = Math.max(state.levels[id] || 0, stars);
    return state;
  }
  function recordAI(state, id) {
    if (AI_ACTIVITIES.includes(id)) state.ai[id] = true;
    return state;
  }

  // ステージは じゅんばんに ひらく：まえの ステージを クリアすると つぎに すすめる
  function isUnlocked(state, levels, id) {
    const i = levels.findIndex((l) => l.id === id);
    if (i <= 0) return i === 0;
    return (state.levels[levels[i - 1].id] || 0) > 0;
  }

  // シール：プログラミングは クリアした ステージ 1つで 1まい、ほし3つで もう1まい、AIは 1かつどう 1まい
  function stickers(state, levels) {
    let n = 0;
    for (const l of levels) { const s = state.levels[l.id] || 0; if (s > 0) n++; if (s === 3) n++; }
    return n + AI_ACTIVITIES.filter((id) => state.ai[id]).length;
  }
  const maxStickers = (levels) => levels.length * 2 + AI_ACTIVITIES.length;

  PL.Progress = { KEY, AI_ACTIVITIES, empty, load, save, recordLevel, recordAI, isUnlocked, stickers, maxStickers };
})(typeof window !== "undefined" ? window : globalThis);
