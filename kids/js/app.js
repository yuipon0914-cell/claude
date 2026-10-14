/* ピコラボ — 画面と操作。データ（js/data）と判定（js/engine）は ここから よびだすだけ。 */
(function () {
  "use strict";
  const PL = window.PL;
  const { Robot, AI, Progress: P } = PL;
  const LEVELS = PL.LEVELS;
  const FOOD = Object.fromEntries(PL.FOODS.map((f) => [f.id, f]));

  // ---------- 保存 ----------
  const storage = (() => {
    try { const s = window.localStorage; const k = "__pl_probe"; s.setItem(k, "1"); s.removeItem(k); return s; }
    catch (e) { return null; }
  })();
  let state = P.load(storage);
  const persist = () => P.save(storage, state);

  // 画面だけの一時的な状態（保存しない）
  const ui = { prog: null, run: null, teach: null, pattern: null, promise: null };

  // ---------- 小道具 ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const $ = (sel) => document.querySelector(sel);
  const BLOCK = {
    up: { icon: "⬆️", name: "うえ" }, down: { icon: "⬇️", name: "した" },
    left: { icon: "⬅️", name: "ひだり" }, right: { icon: "➡️", name: "みぎ" },
    repeat: { icon: "🔁", name: "くりかえし" },
  };
  const starStr = (n, of = 3) => "⭐".repeat(n) + '<span class="star-off">' + "☆".repeat(of - n) + "</span>";

  // よみあげ（ブラウザに 日本語の こえ が あるときだけ）
  const canSpeak = "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";
  function say(text) {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s、。！？ー・]/gu, ""));
    u.lang = "ja-JP"; u.rate = 0.9; u.pitch = 1.1;
    window.speechSynthesis.speak(u);
  }
  const sayBtn = (text) => canSpeak ? `<button class="say" data-action="say" data-text="${esc(text)}" aria-label="よみあげる">🔊</button>` : "";
  const bubble = (text, who = "🤖") => `<div class="bubble"><span class="who" aria-hidden="true">${who}</span><p>${esc(text)}</p>${sayBtn(text)}</div>`;

  // ---------- ルーティング ----------
  function parseHash() {
    const parts = (location.hash.replace(/^#\/?/, "") || "").split("/").filter(Boolean);
    return { page: parts[0] || "home", a: parts[1] };
  }

  function render() {
    stopRun();
    const r = parseHash();
    let html;
    switch (r.page) {
      case "code": html = r.a ? renderLevel(r.a) : renderCodeIsland(); break;
      case "ai": html = r.a === "teach" ? renderTeach() : r.a === "pattern" ? renderPattern() : r.a === "promise" ? renderPromise() : renderAIIsland(); break;
      case "parents": html = renderParents(); break;
      default: html = renderHome();
    }
    $("#app").innerHTML = html;
    $("#stickers").innerHTML = `🏅 ${P.stickers(state, LEVELS)}`;
  }

  // ---------- ホーム ----------
  function renderHome() {
    const total = P.maxStickers(LEVELS), have = P.stickers(state, LEVELS);
    return `
      <section class="hero">
        <h1><span aria-hidden="true">🤖</span> ピコラボ</h1>
        ${bubble("こんにちは！ ぼくは ロボットの ピコ。いっしょに プログラミング と AI を まなぼう！")}
      </section>
      <div class="islands">
        <a class="island isl-code" href="#/code">
          <span class="isl-icon" aria-hidden="true">🏝️🤖</span>
          <strong>プログラミングの しま</strong>
          <span>ピコに めいれいを だして ゴールまで うごかそう</span>
        </a>
        <a class="island isl-ai" href="#/ai">
          <span class="isl-icon" aria-hidden="true">🏝️🧠</span>
          <strong>AIの しま</strong>
          <span>ピコに おしえて、AIの しくみを しろう</span>
        </a>
      </div>
      <p class="sticker-line">あつめた シール：<b>${have}</b> / ${total} まい</p>
      <p class="center"><a class="small-link" href="#/parents">おうちの かた・せんせい へ</a></p>`;
  }

  // ---------- プログラミングの しま ----------
  function renderCodeIsland() {
    const stages = PL.STAGES.map((st) => {
      const cards = LEVELS.filter((l) => l.stage === st.id).map((l) => {
        const n = LEVELS.indexOf(l) + 1;
        const open = P.isUnlocked(state, LEVELS, l.id);
        const s = state.levels[l.id] || 0;
        return open
          ? `<a class="lv ${s ? "lv-done" : "lv-open"}" href="#/code/${l.id}"><span class="lv-no">${n}</span><span class="lv-title">${esc(l.title)}</span><span class="lv-stars">${starStr(s)}</span></a>`
          : `<span class="lv lv-locked" aria-disabled="true"><span class="lv-no">${n}</span><span class="lv-title">🔒</span></span>`;
      }).join("");
      return `<section class="stage"><h2><span aria-hidden="true">${st.icon}</span> ${esc(st.name)}</h2><p class="stage-goal">${esc(st.goal)} ${sayBtn(st.goal)}</p><div class="lv-grid">${cards}</div></section>`;
    }).join("");
    return `<nav class="crumb"><a href="#/">← ホーム</a></nav><h1>🏝️ プログラミングの しま</h1>${stages}`;
  }

  function levelState(id) {
    const lv = LEVELS.find((l) => l.id === id);
    if (!ui.prog || ui.prog.id !== id) ui.prog = { id, program: clone(lv.starter || []), open: null, result: null };
    return ui.prog;
  }
  const clone = (x) => JSON.parse(JSON.stringify(x));

  function renderLevel(id) {
    const lv = LEVELS.find((l) => l.id === id);
    if (!lv) return `<p>みつかりません。</p><p><a href="#/code">もどる</a></p>`;
    if (!P.isUnlocked(state, LEVELS, id)) return `<nav class="crumb"><a href="#/code">← しま</a></nav>${bubble("この ステージは まだ ひらいていないよ。まえの ステージを クリアしてね。")}`;
    const ps = levelState(id);
    const n = LEVELS.indexOf(lv) + 1;
    const stage = PL.STAGES.find((s) => s.id === lv.stage);
    const used = Robot.countBlocks(ps.program);
    const full = used >= lv.max;
    const palette = lv.allow.map((t) => {
      const disabled = full || (t === "repeat" && ps.open !== null);
      return `<button class="blk blk-${t}" data-action="add" data-t="${t}" ${disabled ? "disabled" : ""}><span aria-hidden="true">${BLOCK[t].icon}</span><small>${BLOCK[t].name}</small></button>`;
    }).join("");
    return `
      <nav class="crumb"><a href="#/code">← しま</a> <span>${stage.icon} ${esc(stage.name)}</span></nav>
      <h1 class="lv-head"><span class="lv-no big">${n}</span> ${esc(lv.title)}</h1>
      ${bubble(lv.hint)}
      <div class="play">
        <div class="board-wrap">
          <div id="board" class="board" style="--w:${lv.map[0].length}" role="img" aria-label="ちず">${boardCells(lv)}</div>
          <p class="legend">🤖 ピコ　🏁 ゴール　💎 ほうせき　🌳 き</p>
        </div>
        <div class="code-side">
          <h2 class="sub">つかえる ブロック</h2>
          <div class="palette">${palette}</div>
          <h2 class="sub">ピコの プログラム <span class="count ${full ? "count-full" : ""}">${used} / ${lv.max}</span></h2>
          <ol class="program" id="program">${ps.program.length ? programHTML(ps.program, [], ps.open) : '<li class="empty">うえの ブロックを タッチして ならべよう</li>'}</ol>
          ${ps.open !== null ? `<button class="btn btn-soft" data-action="close">🔁 くりかえし を とじる</button>` : ""}
          <div class="controls">
            <button class="btn btn-go" data-action="run">▶️ うごかす</button>
            <button class="btn" data-action="undo" ${ps.program.length ? "" : "disabled"}>↩️ ひとつ けす</button>
            <button class="btn" data-action="clear" ${ps.program.length ? "" : "disabled"}>🗑️ ぜんぶ けす</button>
            ${lv.starter ? `<button class="btn" data-action="reset">🔄 さいしょに もどす</button>` : ""}
          </div>
          <div id="result" aria-live="polite">${ps.result ? resultHTML(lv, ps.result) : ""}</div>
        </div>
      </div>`;
  }

  function boardCells(lv, frame) {
    const map = Robot.parseMap(lv.map);
    const pos = frame ? [frame.x, frame.y] : map.start;
    const got = new Set(frame ? frame.got : []);
    let html = "";
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const gi = map.gems.findIndex(([gx, gy]) => gx === x && gy === y);
      let c = "";
      if (map.walls.has(x + "," + y)) c = "🌳";
      else if (gi >= 0 && !got.has(gi)) c = "💎";
      else if (map.goal[0] === x && map.goal[1] === y) c = "🏁";
      const robot = pos[0] === x && pos[1] === y;
      html += `<div class="cell${map.walls.has(x + "," + y) ? " tree" : ""}${robot ? " here" : ""}">${robot ? '<span class="robot">🤖</span>' : c}</div>`;
    }
    return html;
  }

  function programHTML(list, prefix, open) {
    return list.map((b, i) => {
      const path = prefix.concat(i).join(".");
      if (b.t === "repeat") {
        const isOpen = open === path;
        return `<li class="pb pb-repeat${isOpen ? " is-open" : ""}" data-path="${path}">
          <div class="rep-head">
            <button class="rep-pick" data-action="open" data-path="${path}" aria-label="この くりかえし に ブロックを いれる">🔁 くりかえし</button>
            <button class="rep-n" data-action="count" data-path="${path}" aria-label="かいすうを かえる">× ${b.n}</button>
            <button class="rep-del" data-action="del" data-path="${path}" aria-label="けす">✖</button>
          </div>
          <ol class="rep-body">${b.body.length ? programHTML(b.body, prefix.concat(i), open) : `<li class="empty">${isOpen ? "ここに はいるよ" : "からっぽ"}</li>`}</ol>
        </li>`;
      }
      return `<li class="pb"><button class="pb-move blk-${b.t}" data-action="del" data-path="${path}" data-path-hl="${path}" aria-label="${BLOCK[b.t].name}（タッチで けす）">${BLOCK[b.t].icon}</button></li>`;
    }).join("");
  }

  // path（"1.0" のような もじ）で ブロックの いれものと ばしょ を さがす
  function locate(program, path) {
    const idx = path.split(".").map(Number);
    let list = program;
    for (let k = 0; k < idx.length - 1; k++) list = list[idx[k]].body;
    return { list, i: idx[idx.length - 1] };
  }

  const RESULT_TEXT = {
    goal: "やったね！ ゴール！",
    gems: "ゴールに ついたけど、💎が のこっているよ。",
    wall: "🌳に ぶつかっちゃった。ひかった ブロックを みてみよう。",
    out: "ちずの そとに でちゃうよ。ひかった ブロックを みてみよう。",
    short: "とちゅうで とまっちゃった。ブロックが たりないかな？",
    empty: "まずは ブロックを ならべてね。",
    toolong: "うごきが おおすぎるよ。くりかえしの かずを へらそう。",
  };
  function resultHTML(lv, res) {
    if (res.ok) {
      const s = Robot.stars(lv, res);
      const next = LEVELS[LEVELS.indexOf(lv) + 1];
      const extra = s === 3 ? "いちばん みじかい プログラムだ！" : `ブロック ${lv.best}こ でも できるよ。ちょうせん してみる？`;
      return `<div class="result ok"><p class="big-stars">${starStr(s)}</p><p><b>${RESULT_TEXT.goal}</b> ${extra}</p>
        <div class="controls">${next ? `<a class="btn btn-go" href="#/code/${next.id}">つぎへ ▶</a>` : `<a class="btn btn-go" href="#/code">しまへ もどる</a>`}<button class="btn" data-action="again">もういちど</button></div></div>`;
    }
    return `<div class="result ng"><p>${esc(RESULT_TEXT[res.result])}</p><button class="btn" data-action="again">ピコを スタートに もどす</button></div>`;
  }

  function stopRun() { if (ui.run) { clearTimeout(ui.run.timer); ui.run = null; } }

  function runProgram() {
    const ps = ui.prog, lv = LEVELS.find((l) => l.id === ps.id);
    stopRun();
    const res = Robot.run(lv, ps.program);
    ps.result = null;
    document.querySelectorAll(".play button, .play a").forEach((b) => { b.disabled = true; });
    let k = 0;
    const board = $("#board");
    // スマートフォンでは ちず が うえに あるので、みえる ところまで もどす
    const top = board.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.5) board.scrollIntoView({ block: "start", behavior: "smooth" });
    const tick = () => {
      const f = res.frames[k];
      board.innerHTML = boardCells(lv, f);
      document.querySelectorAll(".hl").forEach((e) => e.classList.remove("hl"));
      if (f.path) highlight(f.path.join("."));
      k++;
      if (k < res.frames.length) { ui.run.timer = setTimeout(tick, 420); return; }
      ui.run.timer = setTimeout(() => finish(lv, res), 350);
    };
    ui.run = { timer: null };
    tick();
  }
  function highlight(path) {
    const el = document.querySelector(`[data-path-hl="${path}"]`) || document.querySelector(`.pb-repeat[data-path="${path}"]`);
    if (el) el.classList.add("hl");
  }
  function finish(lv, res) {
    ui.run = null;
    ui.prog.result = res;
    if (res.ok) { P.recordLevel(state, lv.id, Robot.stars(lv, res)); persist(); }
    const last = res.frames[res.frames.length - 1];
    render();
    $("#board").innerHTML = boardCells(lv, last);
    if (res.bump) document.querySelector(`[data-path-hl="${res.bump.path.join(".")}"]`)?.classList.add("bad");
    say(res.ok ? RESULT_TEXT.goal : RESULT_TEXT[res.result]);
  }

  function editProgram(action, el) {
    const ps = ui.prog, lv = LEVELS.find((l) => l.id === ps.id);
    const target = () => (ps.open === null ? ps.program : locate(ps.program, ps.open).list[locate(ps.program, ps.open).i].body);
    ps.result = null;
    switch (action) {
      case "add": {
        if (Robot.countBlocks(ps.program) >= lv.max) return;
        const t = el.dataset.t;
        if (t === "repeat") {
          if (ps.open !== null) return;
          ps.program.push({ t: "repeat", n: 2, body: [] });
          ps.open = String(ps.program.length - 1);
        } else target().push({ t });
        break;
      }
      case "close": ps.open = null; break;
      case "open": ps.open = ps.open === el.dataset.path ? null : el.dataset.path; break;
      case "count": { const { list, i } = locate(ps.program, el.dataset.path); list[i].n = list[i].n >= 9 ? 2 : list[i].n + 1; break; }
      case "del": {
        const { list, i } = locate(ps.program, el.dataset.path);
        const p = el.dataset.path;
        list.splice(i, 1);
        // とじた／けした くりかえし を ゆびさしていたら はずす。うしろの ばんごうが ずれるので つねに はずす
        if (ps.open !== null && (ps.open === p || ps.open.startsWith(p + ".") || !p.includes("."))) ps.open = null;
        break;
      }
      case "undo": {
        const t = target();
        if (t.length) t.pop();
        else if (ps.open !== null) { const { list, i } = locate(ps.program, ps.open); list.splice(i, 1); ps.open = null; }
        break;
      }
      case "clear": ps.program = []; ps.open = null; break;
      case "reset": ps.program = clone(lv.starter || []); ps.open = null; break;
      case "again": break;
    }
    render();
  }

  // ---------- AIの しま ----------
  function renderAIIsland() {
    const card = (id, icon, title, text) => `<a class="act ${state.ai[id] ? "act-done" : ""}" href="#/ai/${id}"><span class="act-icon" aria-hidden="true">${icon}</span><strong>${title}</strong><span>${text}</span>${state.ai[id] ? '<span class="act-badge">🏅 できた！</span>' : ""}</a>`;
    return `<nav class="crumb"><a href="#/">← ホーム</a></nav><h1>🏝️ AIの しま</h1>
      ${bubble("AI（エーアイ）は、たくさんの れい から ならって、こたえを かんがえる コンピューターの しくみ だよ。")}
      <div class="acts">
        ${card("teach", "🧺", "AIに おしえよう", "くだもの と やさい の わけかた を ピコに おしえてみよう")}
        ${card("pattern", "🔮", "つぎは なに？", "ならびの きまりを みつけて、ピコと よそうしよう")}
        ${card("promise", "🤝", "AIとの やくそく", "AIを じょうずに つかう やくそくを ⭕❌ で おぼえよう")}
      </div>`;
  }

  // --- AIに おしえよう ---
  function teachState() {
    if (!ui.teach) ui.teach = { phase: "intro", i: 0, notes: [], judged: [] };
    return ui.teach;
  }
  const examples = (t) => t.notes.map((n) => ({ item: FOOD[n.id], label: n.label }));
  function notebook(t) {
    const col = (label) => t.notes.filter((n) => n.label === label).map((n) => `<span class="note-item" title="${esc(FOOD[n.id].name)}">${FOOD[n.id].emoji}</span>`).join("") || '<span class="muted">まだ ない</span>';
    return `<div class="notebook"><h2 class="sub">📒 ピコの ノート（おしえて もらった れい）</h2>
      <div class="note-cols"><div><b>${PL.LABELS.fruit.icon} ${PL.LABELS.fruit.name}</b><div class="note-row">${col("fruit")}</div></div>
      <div><b>${PL.LABELS.veg.icon} ${PL.LABELS.veg.name}</b><div class="note-row">${col("veg")}</div></div></div></div>`;
  }
  function renderTeach() {
    const t = teachState();
    const head = `<nav class="crumb"><a href="#/ai">← AIの しま</a></nav><h1>🧺 AIに おしえよう</h1>`;
    if (t.phase === "intro") {
      return head + bubble("ぼくは まだ くだもの と やさい の ちがいを しらないんだ。みせる たべものが どっちか、おしえてくれる？") +
        `<div class="controls center"><button class="btn btn-go" data-action="teach-start">はじめる ▶</button></div>`;
    }
    if (t.phase === "train") {
      const item = FOOD[PL.TEACH.train[t.i]];
      return head + `<p class="phase">① おしえる（${t.i + 1} / ${PL.TEACH.train.length}）</p>` +
        bubble(`これは ${item.name}。くだもの かな？ やさい かな？`) +
        `<div class="food" aria-label="${esc(item.name)}">${item.emoji}<span>${esc(item.name)}</span></div>
        <div class="choice2">
          <button class="btn btn-big" data-action="teach-label" data-label="fruit">${PL.LABELS.fruit.icon} ${PL.LABELS.fruit.name}</button>
          <button class="btn btn-big" data-action="teach-label" data-label="veg">${PL.LABELS.veg.icon} ${PL.LABELS.veg.name}</button>
        </div>` + notebook(t);
    }
    if (t.phase === "test1" || t.phase === "test2") {
      const list = PL.TEACH[t.phase];
      const item = FOOD[list[t.i]];
      const judged = t.judged[t.i];
      // こたえた あとは ノートに かきくわえているので、その まえの よそう を つかう
      const g = judged ? judged.guess : AI.classify(examples(t), item, PL.FEATURES);
      const why = g.shared.length ? `${g.shared.join("・")} ところが ${g.nearest.emoji}${g.nearest.name} に にているから` : `${g.nearest.emoji}${g.nearest.name} に いちばん にているから`;
      const body = judged
        ? bubble(judged.agree ? "やった！ ノートにも かいておくね。" : `おしえてくれて ありがとう！ ${item.name}は ${PL.LABELS[judged.label].name} なんだね。ノートに かいておくね。`) +
          `<div class="controls center"><button class="btn btn-go" data-action="teach-next">つぎへ ▶</button></div>`
        : `<div class="choice2">
            <button class="btn btn-big" data-action="teach-judge" data-ok="1">⭕ あってる</button>
            <button class="btn btn-big" data-action="teach-judge" data-ok="0">❌ ちがうよ</button>
          </div>`;
      return head + `<p class="phase">${t.phase === "test1" ? "② ためす" : "④ もういちど ためす"}（${t.i + 1} / ${list.length}）</p>` +
        `<div class="food" aria-label="${esc(item.name)}">${item.emoji}<span>${esc(item.name)}</span></div>` +
        bubble(`${item.name}は… 「${PL.LABELS[g.label].name}」だと おもう！ ${why}。 あってる？`) + body + notebook(t);
    }
    if (t.phase === "check1") {
      const ok = t.round1.filter((r) => r.agree).length;
      return head + `<p class="phase">③ ふりかえり</p>` +
        bubble(`${PL.TEACH.test1.length}こ ちゅう ${ok}こ あたったよ。${ok < PL.TEACH.test1.length ? "まちがえた ものも ノートに かいたから、こんどは もっと わかるかも！" : "すごい！ ぜんぶ あたった！"}`) +
        `<div class="controls center"><button class="btn btn-go" data-action="teach-round2">あたらしい たべもので ためす ▶</button></div>` + notebook(t);
    }
    // done
    const ok2 = t.judged.filter((r) => r.agree).length;
    const r1 = t.round1.filter((r) => r.agree).length;
    const taughtWrong = t.notes.filter((n) => FOOD[n.id].truth !== n.label).map((n) => FOOD[n.id].emoji + FOOD[n.id].name);
    return head + `<p class="phase">🎉 できた！</p>` +
      `<div class="score-row"><div><small>1かいめ</small><b>${r1} / ${PL.TEACH.test1.length}</b></div><div><small>2かいめ</small><b>${ok2} / ${PL.TEACH.test2.length}</b></div></div>` +
      bubble("AIは、おしえて もらった れい の なかから いちばん にている ものを さがして こたえるんだ。れいが ふえると かしこく なるよ。") +
      (taughtWrong.length ? bubble(`おみせでは ${taughtWrong.join("、")} は ちがう ほうに わけられて いるよ。まちがえて おしえると、AIも おなじように まちがえるんだ。`, "💡") : "") +
      bubble("ためしに、わざと まちがえて おしえたら どうなるかな？", "💡") +
      `<div class="controls center"><button class="btn" data-action="teach-restart">🔄 もういちど あそぶ</button><a class="btn btn-go" href="#/ai">AIの しまへ</a></div>` + notebook(t);
  }
  function teachAction(action, el) {
    const t = teachState();
    switch (action) {
      case "teach-start": t.phase = "train"; t.i = 0; break;
      case "teach-label":
        t.notes.push({ id: PL.TEACH.train[t.i], label: el.dataset.label });
        if (++t.i >= PL.TEACH.train.length) { t.phase = "test1"; t.i = 0; t.judged = []; }
        break;
      case "teach-judge": {
        const list = PL.TEACH[t.phase], item = FOOD[list[t.i]];
        const g = AI.classify(examples(t), item, PL.FEATURES);
        const agree = el.dataset.ok === "1";
        const label = agree ? g.label : g.label === "fruit" ? "veg" : "fruit";
        t.judged[t.i] = { agree, label, guess: g };
        t.notes.push({ id: item.id, label });
        break;
      }
      case "teach-next":
        if (++t.i >= PL.TEACH[t.phase].length) {
          if (t.phase === "test1") { t.round1 = t.judged; t.judged = []; t.phase = "check1"; }
          else { t.phase = "done"; P.recordAI(state, "teach"); persist(); }
          t.i = 0;
        }
        break;
      case "teach-round2": t.phase = "test2"; t.i = 0; t.judged = []; break;
      case "teach-restart": ui.teach = null; teachState().phase = "train"; break;
    }
    render();
  }

  // --- つぎは なに？ ---
  function renderPattern() {
    const p = (ui.pattern = ui.pattern || { i: 0, picked: null, score: 0 });
    const head = `<nav class="crumb"><a href="#/ai">← AIの しま</a></nav><h1>🔮 つぎは なに？</h1>`;
    if (p.i >= PL.PATTERNS.length) {
      return head + `<p class="phase">🎉 できた！ きみは ${p.score} / ${PL.PATTERNS.length} もん せいかい</p>` +
        bubble("AIは、まえに あった ことを かぞえて「つぎ」を よそうするよ。てんきよほう や おすすめ も、こんな ふうに よそうしているんだ。") +
        bubble("でも、きまりが むずかしいと AIも まちがえる。だから AIの こたえは うのみに しないでね。", "💡") +
        `<div class="controls center"><button class="btn" data-action="pat-restart">🔄 もういちど</button><a class="btn btn-go" href="#/ai">AIの しまへ</a></div>`;
    }
    const q = PL.PATTERNS[p.i];
    const seq = q.seq.map((s) => `<span class="seq-item">${s}</span>`).join("") + `<span class="seq-item q">${p.picked ? esc(p.picked) : "❓"}</span>`;
    let body;
    if (!p.picked) {
      body = bubble("❓ に はいるのは どれかな？", "🧒") +
        `<div class="choice3">${q.choices.map((c) => `<button class="btn btn-emoji" data-action="pat-pick" data-c="${esc(c)}">${c}</button>`).join("")}</div>`;
    } else {
      const ai = AI.predictNext(q.seq);
      const why = ai.counts.map((c) => `${c.item}が ${c.n}かい`).join("、");
      const youOk = p.picked === q.answer, aiOk = ai.guess === q.answer;
      body = `<div class="vs"><div class="${youOk ? "ok" : "ng"}"><small>きみ</small><span>${esc(p.picked)}</span><b>${youOk ? "⭕" : "❌"}</b></div>
          <div class="${aiOk ? "ok" : "ng"}"><small>ピコ（AI）</small><span>${esc(ai.guess)}</span><b>${aiOk ? "⭕" : "❌"}</b></div></div>` +
        bubble(`ぼくは ${ai.last}の つぎを かぞえたよ。${why}。だから ${ai.guess} に したんだ。`) +
        (q.lesson ? bubble(q.lesson, "💡") : "") +
        (!youOk ? bubble(`こたえは ${q.answer} だよ。`, "💡") : "") +
        `<div class="controls center"><button class="btn btn-go" data-action="pat-next">つぎへ ▶</button></div>`;
    }
    return head + `<p class="phase">${p.i + 1} / ${PL.PATTERNS.length}</p><div class="seq" aria-label="ならび">${seq}</div>` + body;
  }
  function patternAction(action, el) {
    const p = ui.pattern;
    if (action === "pat-pick" && !p.picked) { p.picked = el.dataset.c; if (p.picked === PL.PATTERNS[p.i].answer) p.score++; }
    if (action === "pat-next") { p.i++; p.picked = null; if (p.i >= PL.PATTERNS.length) { P.recordAI(state, "pattern"); persist(); } }
    if (action === "pat-restart") ui.pattern = null;
    render();
  }

  // --- AIとの やくそく ---
  function renderPromise() {
    const p = (ui.promise = ui.promise || { i: 0, picked: null, score: 0 });
    const head = `<nav class="crumb"><a href="#/ai">← AIの しま</a></nav><h1>🤝 AIとの やくそく</h1>`;
    if (p.i >= PL.PROMISES.length) {
      const card = PL.PROMISES.map((q) => `<li><span aria-hidden="true">${q.icon}</span> ${esc(q.why)}</li>`).join("");
      return head + `<p class="phase">🎉 ${p.score} / ${PL.PROMISES.length} もん せいかい</p>
        <div class="promise-card"><h2>📜 ピコと きみの やくそく</h2><ul>${card}</ul></div>
        <div class="controls center"><button class="btn" data-action="pro-restart">🔄 もういちど</button><a class="btn btn-go" href="#/ai">AIの しまへ</a></div>`;
    }
    const q = PL.PROMISES[p.i];
    let body;
    if (p.picked === null) {
      body = `<div class="choice2"><button class="btn btn-big" data-action="pro-pick" data-v="1">⭕</button><button class="btn btn-big" data-action="pro-pick" data-v="0">❌</button></div>`;
    } else {
      const ok = p.picked === q.answer;
      body = `<div class="result ${ok ? "ok" : "ng"}"><p><b>${ok ? "せいかい！" : "ざんねん！"}</b> こたえは ${q.answer ? "⭕" : "❌"}</p></div>` + bubble(q.why, "💡") +
        `<div class="controls center"><button class="btn btn-go" data-action="pro-next">つぎへ ▶</button></div>`;
    }
    return head + `<p class="phase">${p.i + 1} / ${PL.PROMISES.length}</p><div class="food">${q.icon}</div>` + bubble(q.q, "❓") + body;
  }
  function promiseAction(action, el) {
    const p = ui.promise;
    if (action === "pro-pick" && p.picked === null) { p.picked = el.dataset.v === "1"; if (p.picked === PL.PROMISES[p.i].answer) p.score++; }
    if (action === "pro-next") { p.i++; p.picked = null; if (p.i >= PL.PROMISES.length) { P.recordAI(state, "promise"); persist(); } }
    if (action === "pro-restart") ui.promise = null;
    render();
  }

  // ---------- おうちの かた・せんせい へ ----------
  function renderParents() {
    const done = LEVELS.filter((l) => state.levels[l.id]).length;
    return `<nav class="crumb"><a href="#/">← ホーム</a></nav><h1>おうちの方・先生へ</h1>
      <div class="parents">
        <p>ピコラボは、5〜8歳ごろのお子さまが <b>プログラミングの基本的な考え方</b> と <b>AIのしくみ・付き合い方</b> を、遊びながら体験するための教材です。文字はひらがな中心で、🔊ボタンで読み上げもできます（端末に日本語音声がある場合）。</p>
        <h2>学べること</h2>
        <table>
          <thead><tr><th>コーナー</th><th>ねらい</th></tr></thead>
          <tbody>
            <tr><td>👣 じゅんばん（1〜6）</td><td>命令は上から順に実行される（順次処理）。ゴールまでの手順を分解して考える。</td></tr>
            <tr><td>🔁 くりかえし（7〜10）</td><td>同じ命令のまとまりを見つけて短く書く（反復）。ブロック数の上限が工夫を促します。</td></tr>
            <tr><td>🐛 むしとり（11〜13）</td><td>間違ったプログラムを実行して確かめ、原因を見つけて直す（デバッグ）。実行中は今動いているブロックが光ります。</td></tr>
            <tr><td>🧺 AIに おしえよう</td><td>AIは「例（データ）」から学ぶ。例が増えると賢くなり、間違って教えると間違える。AIが答えの理由（どの例に似ているか）を説明します。</td></tr>
            <tr><td>🔮 つぎは なに？</td><td>AIは過去のデータから次を予測する。最後の問題でAIはわざと間違え、「AIはいつも正しいわけではない」ことを体験します。</td></tr>
            <tr><td>🤝 AIとの やくそく</td><td>個人情報を入力しない・大人と確かめる・自分で考える など、AIを使うときの約束。</td></tr>
          </tbody>
        </table>
        <h2>使い方のヒント</h2>
        <ul>
          <li>1回10〜15分が目安です。最初は大人が隣で一緒に声に出して読むと進めやすくなります。</li>
          <li>うまくいかなかったときは「ピコはどこで止まった？」「どのブロックが光った？」と問いかけてみてください。正解を教えるより、試して直すことが学びになります。</li>
          <li>「AIに おしえよう」は、あえて間違えて教えてみるのもおすすめです。AIが同じように間違えることを確かめられます。</li>
        </ul>
        <h2>しくみと安全</h2>
        <ul>
          <li>アプリ内の「AI」は、学習の考え方を見せるための <b>小さな仕組み（最近傍法・回数の数え上げ）</b> で、外部のAIサービスには接続していません。入力した内容がどこかへ送られることはありません。</li>
          <li>進み具合はこの端末のブラウザ（localStorage）にだけ保存されます。名前などの個人情報は扱いません。</li>
          <li>くだもの・やさいの分け方は、お店や学校で一般的な呼び方に合わせています（トマトは「やさい」）。</li>
        </ul>
        <h2>いまの すすみぐあい</h2>
        <p>プログラミング：${done} / ${LEVELS.length} ステージ ／ AI：${P.AI_ACTIVITIES.filter((id) => state.ai[id]).length} / ${P.AI_ACTIVITIES.length} かつどう ／ シール ${P.stickers(state, LEVELS)} / ${P.maxStickers(LEVELS)} まい</p>
        <button class="btn" data-action="wipe">すすみぐあいを けす</button> <span id="wipe-msg" aria-live="polite"></span>
      </div>`;
  }

  // ---------- 操作 ----------
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const a = el.dataset.action;
    if (a === "say") return say(el.dataset.text);
    if (a === "run") return runProgram();
    if (["add", "close", "open", "count", "del", "undo", "clear", "reset", "again"].includes(a)) return editProgram(a, el);
    if (a.startsWith("teach-")) return teachAction(a, el);
    if (a.startsWith("pat-")) return patternAction(a, el);
    if (a.startsWith("pro-")) return promiseAction(a, el);
    if (a === "wipe") {
      if (el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.textContent = "ほんとうに けす（もういちど おす）"; return; }
      state = P.empty(); persist(); ui.prog = ui.teach = ui.pattern = ui.promise = null; render();
      $("#wipe-msg").textContent = "けしました。";
    }
  });
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
  render();
})();
