/* HACKER LAB — 画面と操作。データ（js/data）と判定ロジック（js/engine）はここから呼び出すだけ。 */
(function () {
  "use strict";
  const HL = window.HL;
  const P = HL.Progress;
  const CASES = HL.CASES;

  // ---------- 保存 ----------
  const storage = (() => {
    try { const s = window.localStorage; const k = "__hl_probe"; s.setItem(k, "1"); s.removeItem(k); return s; }
    catch (e) { const mem = {}; return { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }, memoryOnly: true }; }
  })();
  let state = P.load(storage);
  const persist = () => P.save(storage, state);

  // 画面だけの一時的な状態（保存しない）
  const ui = { lastTest: {}, nova: {}, causeMsg: {}, actionMsg: {}, certifyMsg: {}, openEvidence: {}, playing: null, basicsResult: {}, videoFilter: { q: "", cat: "all", lang: "ja" }, glossaryQ: "", novaOpen: false };

  // ---------- 小道具 ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const pad2 = (n) => String(n).padStart(2, "0");
  const yen = (n) => n.toLocaleString("ja-JP") + "円";
  const chapterOf = (no) => HL.CHAPTERS.find((c) => c.no === no);
  const $ = (sel) => document.querySelector(sel);

  function highlight(code) {
    const re = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(const|let|if|else|return)\b|\b(true|false|null|undefined)\b|(===|!==|&&|\|\||!|>=|<=)|\b(console\.log)\b|(\b\d+(?:\.\d+)?\b)/g;
    let out = "", last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      const cls = m[1] ? "c-com" : m[2] ? "c-str" : m[3] ? "c-kw" : m[4] ? "c-bool" : m[5] ? "c-op" : m[6] ? "c-fn" : "c-num";
      out += `<span class="${cls}">${esc(m[0])}</span>`;
      last = re.lastIndex;
    }
    return out + esc(code.slice(last));
  }

  const fmtVal = (v) => (typeof v === "string" ? `"${v}"` : Array.isArray(v) ? "[" + v.map(fmtVal).join(", ") + "]" : v && typeof v === "object" ? "{ " + Object.entries(v).map(([k, x]) => `${k}: ${fmtVal(x)}`).join(", ") + " }" : String(v));

  const STEPS = [
    { key: "brief", label: "依頼・概要", en: "BRIEF" },
    { key: "lecture", label: "今回の講義", en: "LECTURE" },
    { key: "evidence", label: "資料調査", en: "INVESTIGATE" },
    { key: "board", label: "証拠保存", en: "EVIDENCE BOARD" },
    { key: "cause", label: "原因特定", en: "ROOT CAUSE" },
    { key: "code", label: "コード検証", en: "CODE LAB" },
    { key: "response", label: "被害対応", en: "RESPONSE" },
    { key: "report", label: "調査レポート", en: "REPORT" },
  ];
  const EVIDENCE_TYPES = { mail: "メール", chat: "メッセージ", log: "ログ", config: "設定", screen: "画面の保存資料", code: "コード", ledger: "台帳" };
  const STATUS_LABEL = { solved: "解決済み", available: "挑戦可能", trial: "体験モード" };

  // ---------- ルーティング ----------
  function parseHash() {
    const parts = (location.hash.replace(/^#\/?/, "") || "").split("/").filter(Boolean);
    return { page: parts[0] || "home", a: parts[1], b: parts[2] };
  }

  function render() {
    const r = parseHash();
    let html;
    switch (r.page) {
      case "cases": html = renderCases(); break;
      case "case": html = renderCase(r.a, r.b); break;
      case "basics": html = renderBasics(r.a); break;
      case "videos": html = renderVideos(); break;
      case "glossary": html = renderGlossary(); break;
      default: html = renderHome();
    }
    $("#app").innerHTML = html;
    document.querySelectorAll(".topnav a").forEach((a) => a.classList.toggle("active", a.dataset.page === (r.page === "case" ? "cases" : r.page)));
    if (r.page === "cases") updateCaseList();
    if (r.page === "videos") updateVideoList();
    if (r.page === "glossary") updateGlossaryList();
    // スマートフォンの横並び工程タブで、今の工程が見えるようにする
    const cur = $(".desk-steps a.current"), ol = cur && cur.closest("ol");
    if (ol && ol.scrollWidth > ol.clientWidth) ol.scrollLeft = cur.offsetLeft - (ol.clientWidth - cur.offsetWidth) / 2;
  }

  function rerenderKeepScroll() {
    const y = window.scrollY;
    const center = $(".desk-center");
    const cy = center ? center.scrollTop : 0;
    render();
    window.scrollTo(0, y);
    const c2 = $(".desk-center"); if (c2) c2.scrollTop = cy;
  }

  // ---------- ホーム ----------
  function renderHome() {
    const solved = CASES.filter((c) => state.cases[c.id]?.officialSolved).length;
    const next = CASES.find((c) => P.status(state, c, CASES) === "available");
    const last = state.ui.lastCase && HL.getCase(state.ui.lastCase);
    return `
      <section class="hero">
        <p class="eyebrow">INVESTIGATOR TERMINAL // 架空のサイバー事件を解決して、守る力を身につける</p>
        <h1>HACKER LAB</h1>
        <p class="lead">あなたは調査担当者。メール、通信記録、設定、コードから証拠を集め、原因を推理し、対策を実行して結果を検証します。プログラミングやセキュリティが初めてでも大丈夫。事件ごとに専用の講義があります。</p>
        <div class="hero-actions">
          ${last ? `<a class="btn primary" href="#/case/${last.id}/${esc(state.cases[last.id]?.step || "brief")}">続きから：LEVEL ${pad2(last.level)} ${esc(last.title)}</a>` : ""}
          ${next ? `<a class="btn ${last ? "" : "primary"}" href="#/case/${next.id}/brief">次の事件：LEVEL ${pad2(next.level)} ${esc(next.title)}</a>` : `<a class="btn primary" href="#/cases">事件ファイルを開く</a>`}
        </div>
        <div class="meter" aria-label="解決数"><div class="meter-bar" style="width:${(solved / CASES.length) * 100}%"></div></div>
        <p class="muted small">正式に解決した事件 ${solved} / ${CASES.length}</p>
      </section>
      <section class="grid4">
        ${homeCard("#/cases", "CASE FILES", "事件ファイル", "全6章・30事件のキャンペーン。証拠・講義・コード・対応がそろって解決。")}
        ${homeCard("#/basics", "BASIC DRILLS", "基礎実践", "変数・条件分岐・通信・認証・認可を小さな演習で。どれからでも始められます。")}
        ${homeCard("#/videos", "VIDEO LECTURES", "動画で学ぶ", "実在を確認したYouTubeの講義を分類して視聴。事件とは独立して見られます。")}
        ${homeCard("#/glossary", "GLOSSARY", "単語検索", "日本語・英語・読みから用語を調べる辞典。")}
      </section>
      <section class="panel note">
        <h2>このアプリについて</h2>
        <ul>
          <li>登場する組織・人物・URL・口座・金額はすべて架空です。実在の銀行・サービス・攻撃対象には一切接続しません。URLには予約済みの <code>.example</code> を使っています。</li>
          <li>コード演習は、ブラウザ内で動く制限付きの演習環境（自作の小さなインタプリタ）で判定します。<code>eval</code> は使わず、外部通信やOSの操作もできません。</li>
          <li>演習のコードは考え方を学ぶための簡略化した判定です。実際の認証・決済の仕組みは、数行の条件式だけでは完成しません。</li>
          <li>調査支援の NOVA は、実際のAIに接続していない<strong>模擬AI（定型応答）</strong>です。</li>
          <li>進捗はこのブラウザに保存されます${storage.memoryOnly ? "（現在この環境では保存できないため、ページを閉じると消えます）" : ""}。</li>
        </ul>
      </section>`;
  }
  const homeCard = (href, en, ja, text) => `<a class="panel card-link" href="${href}"><span class="eyebrow">${en}</span><h2>${ja}</h2><p>${text}</p></a>`;

  // ---------- 事件一覧 ----------
  function renderCases() {
    const f = state.ui.filters || { query: "", chapter: "all", filter: "all" };
    return `
      <section class="page-head">
        <p class="eyebrow">CASE FILES</p>
        <h1>事件ファイル</h1>
        <p class="muted">事件を解決すると次のレベルが解放されます。まだ解放されていない事件も、体験モードで最後まで試せます（正式な解決認定は順番に行います）。</p>
      </section>
      <div class="filters panel">
        <label class="field grow"><span>検索（事件名・学ぶ知識）</span><input type="search" id="case-q" value="${esc(f.query)}" placeholder="例：MFA、認可、Webhook" autocomplete="off"></label>
        <label class="field"><span>章</span><select id="case-ch"><option value="all">すべての章</option>${HL.CHAPTERS.map((c) => `<option value="${c.no}" ${String(f.chapter) === String(c.no) ? "selected" : ""}>第${c.no}章 ${esc(c.title)}</option>`).join("")}</select></label>
        <label class="field"><span>状態</span><select id="case-st">${[["all", "すべて"], ["available", "挑戦可能"], ["solved", "解決済み"], ["trial", "体験モード"]].map(([v, l]) => `<option value="${v}" ${f.filter === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      </div>
      <div id="case-list"></div>`;
  }

  function updateCaseList() {
    const f = state.ui.filters || { query: "", chapter: "all", filter: "all" };
    const list = P.searchCases(CASES, state, f);
    const el = $("#case-list"); if (!el) return;
    if (!list.length) { el.innerHTML = `<p class="empty">条件に合う事件はありません。</p>`; return; }
    let html = "", ch = null;
    for (const c of list) {
      if (c.chapter !== ch) {
        if (ch !== null) html += `</div>`;
        ch = c.chapter; const info = chapterOf(ch);
        html += `<h2 class="chapter-head"><span class="eyebrow">CHAPTER ${ch} // ${esc(info.en)}</span>第${ch}章 ${esc(info.title)}</h2><div class="case-grid">`;
      }
      html += caseCard(c);
    }
    el.innerHTML = html + `</div>`;
  }

  function caseCard(c) {
    const cs = state.cases[c.id] || P.emptyCase();
    const st = P.status(state, c, CASES);
    const ev = P.evaluate(c, cs);
    const lp = P.lectureProgress(c, cs);
    return `
      <article class="case-card st-${st}">
        <div class="case-card-top"><span class="lvl">LEVEL ${pad2(c.level)}</span><span class="badge b-${st}">${STATUS_LABEL[st]}${cs.trialCleared && st === "trial" ? "・体験クリア" : ""}</span></div>
        <p class="org">${esc(c.organization)}</p>
        <h3>${esc(c.title)}</h3>
        <p class="summary">${esc(c.summary)}</p>
        <div class="tags">${c.concepts.map((k) => `<span class="tag">${esc(k)}</span>`).join("")}</div>
        <div class="mini-progress">
          <div><span>講義</span><div class="meter sm"><div class="meter-bar" style="width:${lp}%"></div></div><span class="num">${lp}%</span></div>
          <div><span>事件</span><div class="meter sm"><div class="meter-bar" style="width:${(ev.done / ev.total) * 100}%"></div></div><span class="num">${ev.done}/${ev.total}</span></div>
        </div>
        <div class="case-card-actions">
          <a class="btn sm" href="#/case/${c.id}/lecture">講義</a>
          <a class="btn sm primary" href="#/case/${c.id}/${esc(cs.step || "brief")}">${st === "solved" ? "記録を見る" : cs.board.length || cs.quiz[0] ? "調査を続ける" : st === "trial" ? "体験する" : "調査開始"}</a>
        </div>
      </article>`;
  }

  // ---------- 事件（調査机） ----------
  function renderCase(id, step) {
    const c = HL.getCase(id);
    if (!c) return `<p class="empty">事件が見つかりません。<a href="#/cases">事件ファイルへ</a></p>`;
    const cs = P.caseState(state, c.id);
    if (!STEPS.some((s) => s.key === step)) step = cs.step || "brief";
    if (cs.step !== step || state.ui.lastCase !== c.id) { cs.step = step; state.ui.lastCase = c.id; persist(); }
    const st = P.status(state, c, CASES);
    const ev = P.evaluate(c, cs);
    const stepDone = {
      brief: true,
      lecture: P.quizOk(c, cs),
      evidence: c.evidence.every((e) => cs.viewed.includes(e.id)),
      board: ev.items.find((i) => i.key === "evidence").ok,
      cause: ev.items.find((i) => i.key === "cause").ok,
      code: ev.items.find((i) => i.key === "code").ok,
      response: ev.items.filter((i) => i.step === "response").every((i) => i.ok),
      report: ev.items.find((i) => i.key === "report").ok,
    };
    const body = {
      brief: stepBrief, lecture: stepLecture, evidence: stepEvidence, board: stepBoard,
      cause: stepCause, code: stepCode, response: stepResponse, report: stepReport,
    }[step](c, cs, ev);
    const idx = STEPS.findIndex((s) => s.key === step);
    return `
      <div class="case-head">
        <a class="back" href="#/cases">← 事件ファイル</a>
        <p class="eyebrow">LEVEL ${pad2(c.level)} // CHAPTER ${c.chapter} ${esc(chapterOf(c.chapter).title)}</p>
        <h1>${esc(c.title)} <span class="badge b-${st}">${STATUS_LABEL[st]}</span></h1>
        <p class="muted">${esc(c.organization)}</p>
        ${st === "trial" ? `<p class="banner warn">体験モード：前のレベル（LEVEL ${pad2(c.level - 1)}）を正式に解決すると、この事件の解決認定ができます。体験中の記録は保存され、あとで引き継げます。</p>` : ""}
      </div>
      <div class="desk">
        <nav class="desk-steps" aria-label="調査の工程">
          <ol>
            ${STEPS.map((s, i) => `<li><a href="#/case/${c.id}/${s.key}" class="${s.key === step ? "current" : ""} ${stepDone[s.key] ? "done" : ""}" ${s.key === step ? 'aria-current="step"' : ""}><span class="n">${stepDone[s.key] ? "✓" : i + 1}</span><span class="l">${s.label}</span></a></li>`).join("")}
          </ol>
          <div class="checklist-mini"><span>解決条件</span><div class="meter sm"><div class="meter-bar" style="width:${(ev.done / ev.total) * 100}%"></div></div><span class="num">${ev.done}/${ev.total}</span></div>
        </nav>
        <main class="desk-center" id="desk-center">
          <p class="eyebrow">${STEPS[idx].en}</p>
          <h2 class="step-title">${STEPS[idx].label}</h2>
          ${body}
          <div class="step-nav">
            ${idx > 0 ? `<a class="btn" href="#/case/${c.id}/${STEPS[idx - 1].key}">← ${STEPS[idx - 1].label}</a>` : "<span></span>"}
            ${idx < STEPS.length - 1 ? `<a class="btn primary" href="#/case/${c.id}/${STEPS[idx + 1].key}">${STEPS[idx + 1].label} →</a>` : ""}
          </div>
        </main>
        ${novaPanel(c, cs)}
      </div>`;
  }

  function novaPanel(c, cs) {
    const msg = ui.nova[c.id];
    return `
      <aside class="desk-nova ${ui.novaOpen ? "open" : ""}" aria-label="調査支援 NOVA">
        <button class="nova-toggle" data-action="nova-toggle" aria-expanded="${ui.novaOpen}">NOVA に相談 <span class="mock">模擬AI</span></button>
        <div class="nova-body">
          <div class="nova-id"><div class="nova-avatar" aria-hidden="true">N</div><div><strong>NOVA</strong><p class="small muted">調査支援 · <span class="mock">模擬AI（定型応答）</span></p></div></div>
          <p class="small muted">NOVAは実際のAIには接続していません。事件データの定型ヒントと、今の進捗から組み立てた応答を返します。</p>
          <div class="nova-buttons">
            <button class="btn sm" data-action="nova" data-kind="next">次の一手のヒント</button>
            <button class="btn sm" data-action="nova" data-kind="organize">証拠と仮説を整理</button>
            <button class="btn sm" data-action="nova" data-kind="code">コードの考え方</button>
          </div>
          <div class="nova-out" aria-live="polite">${msg ? msg.map((l) => `<p>${esc(l)}</p>`).join("") : `<p class="muted">ボタンを押すと、NOVAが今の状況に合わせた定型のヒントを出します。</p>`}</div>
        </div>
      </aside>`;
  }

  // --- 依頼・概要
  function stepBrief(c, cs, ev) {
    return `
      <div class="panel brief">
        <p class="eyebrow">INCOMING REQUEST</p>
        <p class="from">依頼人：${esc(c.client.name)}（${esc(c.client.role)}）</p>
        <blockquote>${esc(c.request)}</blockquote>
        <h3>被害の概要</h3><p>${esc(c.summary)}</p>
        <h3>今回あらたに学ぶ知識</h3><div class="tags">${c.concepts.map((k) => `<span class="tag">${esc(k)}</span>`).join("")}</div>
      </div>
      ${checklist(c, cs, ev)}`;
  }

  function checklist(c, cs, ev) {
    return `
      <div class="panel">
        <h3>解決の条件</h3>
        <p class="small muted">原因を当てただけでは解決になりません。次のすべてがそろうと解決認定を申請できます。緊急の被害対応は、原因特定の前でも実行できます。</p>
        <ul class="checks">${ev.items.map((i) => `<li class="${i.ok ? "ok" : ""}"><span class="ck">${i.ok ? "✓" : "・"}</span><a href="#/case/${c.id}/${i.step === "evidence" ? "board" : i.step}">${esc(i.label)}</a>${i.detail ? `<span class="small muted"> — ${esc(i.detail)}</span>` : ""}</li>`).join("")}</ul>
      </div>`;
  }

  // --- 講義
  function stepLecture(c, cs) {
    const L = c.lecture;
    const pos = Math.max(0, Math.min(3, cs.lecturePos || 0));
    const prev = CASES.find((x) => x.level === c.level - 1);
    const tabs = ["原理をつかむ", "仕組み・コードを読む", "事件に使う", "理解度チェック"];
    let sec;
    if (pos === 0) sec = L.principle.map((p) => `<p>${esc(p)}</p>`).join("");
    else if (pos === 1) sec = `
        <p>${esc(L.mechanism.intro)}</p>
        <pre class="code" aria-label="講義のコード例"><code>${highlight(L.mechanism.code)}</code></pre>
        <h4>変数の意味</h4>
        <table class="vars"><thead><tr><th>変数</th><th>日本語の説明</th></tr></thead><tbody>${L.mechanism.vars.map(([n, d]) => `<tr><td><code>${esc(n)}</code></td><td>${esc(d)}</td></tr>`).join("")}</tbody></table>
        <h4>処理の流れ</h4><ol class="flow">${L.mechanism.flow.map((f) => `<li>${esc(f)}</li>`).join("")}</ol>
        <p class="small muted">※ 考え方を学ぶための簡略化したコードです。</p>`;
    else if (pos === 2) sec = `
        <h4>今回の資料で見るところ</h4><ul>${L.apply.look.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <div class="compare">
          <div class="allow"><h4>許可する状況</h4><ul>${L.apply.allow.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
          <div class="block"><h4>止める状況</h4><ul>${L.apply.block.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        </div>`;
    else sec = L.quiz.map((q, qi) => {
      const ans = cs.quiz[qi];
      return `
        <fieldset class="quiz">
          <legend>Q${qi + 1}. ${esc(q.q)}</legend>
          ${q.options.map((o, oi) => `<button class="opt ${ans && ans.selected === oi ? (oi === q.answer ? "right" : "wrong") : ""}" data-action="quiz" data-q="${qi}" data-o="${oi}">${esc(o)}</button>`).join("")}
          ${ans ? `<p class="feedback ${ans.selected === q.answer ? "ok" : "ng"}">${ans.selected === q.answer ? "正解！ " : "もう一度考えてみよう。 "}${esc(q.explain[ans.selected])}</p>` : ""}
        </fieldset>`;
    }).join("") + `<p class="small muted">何度でも回答できます。結果は保存されます。</p>`;
    return `
      <div class="panel lecture">
        <div class="lecture-meta"><span>目安 ${L.minutes}分</span><span>${pos + 1} / 4</span></div>
        <div class="seg" role="tablist">${tabs.map((t, i) => `<button role="tab" aria-selected="${i === pos}" class="${i === pos ? "on" : ""}" data-action="lecture-pos" data-pos="${i}">${i + 1}. ${t}</button>`).join("")}</div>
        <h3>${pos + 1}. ${tabs[pos]}</h3>
        <div class="lecture-body">${sec}</div>
        <div class="row between">
          ${pos > 0 ? `<button class="btn" data-action="lecture-pos" data-pos="${pos - 1}">← 前へ</button>` : "<span></span>"}
          ${pos < 3 ? `<button class="btn primary" data-action="lecture-pos" data-pos="${pos + 1}">次へ →</button>` : ""}
        </div>
      </div>
      <div class="panel links">
        ${prev ? `<a href="#/case/${prev.id}/lecture">↺ 復習：LEVEL ${pad2(prev.level)}「${esc(prev.title)}」の講義</a>` : ""}
        <a href="#/case/${c.id}/evidence">→ 事件資料を調べる</a>
        <a href="#/case/${c.id}/code">→ コード演習へ進む</a>
        ${relatedVideos(c)}
      </div>`;
  }

  function relatedVideos(c) {
    const vs = HL.VIDEOS.filter((v) => v.cases.includes(c.id));
    if (!vs.length) return "";
    return `<p class="small muted">関連する動画（任意）：${vs.map((v) => `<a href="${esc(HL.videoUrl(v))}" target="_blank" rel="noopener">${esc(v.title)}</a>`).join(" / ")}</p>`;
  }

  // --- 資料調査
  function stepEvidence(c, cs) {
    return `<p class="muted">資料を開いて読み、事件に関係するものを証拠ボードに追加しましょう。関係のない資料も混ざっています。</p>
      ${c.evidence.map((e) => {
        const open = ui.openEvidence[c.id + e.id] || false;
        const onBoard = cs.board.includes(e.id);
        const viewed = cs.viewed.includes(e.id);
        return `
        <article class="evidence ${open ? "open" : ""} ${onBoard ? "saved" : ""}">
          <header>
            <button class="ev-title" data-action="ev-open" data-ev="${e.id}" aria-expanded="${open}">
              <span class="ev-type t-${e.type}">${EVIDENCE_TYPES[e.type] || e.type}</span>
              <span>${esc(e.title)}</span>
              ${viewed ? `<span class="small muted">既読</span>` : `<span class="dot" aria-label="未読"></span>`}
            </button>
            <button class="btn sm ${onBoard ? "" : "primary"}" data-action="board-toggle" data-ev="${e.id}">${onBoard ? "ボードから外す" : "証拠ボードに追加"}</button>
          </header>
          ${open ? `<div class="ev-body"><p class="small muted">${esc(e.meta)}</p><pre class="doc">${e.lines.map(esc).join("\n")}</pre></div>` : ""}
        </article>`;
      }).join("")}`;
  }

  // --- 証拠ボード
  function stepBoard(c, cs) {
    const board = c.evidence.filter((e) => cs.board.includes(e.id));
    return `
      <p class="muted">保存した証拠は、原因特定で仮説の根拠として使います。不要な資料を混ぜると、推理の筋が通らなくなります。</p>
      ${board.length ? `<div class="board">${board.map((e) => `
        <div class="pin">
          <span class="ev-type t-${e.type}">${EVIDENCE_TYPES[e.type] || e.type}</span>
          <h4>${esc(e.title)}</h4>
          <pre class="doc small">${e.lines.map(esc).join("\n")}</pre>
          <button class="btn sm" data-action="board-toggle" data-ev="${e.id}">外す</button>
        </div>`).join("")}</div>` : `<p class="empty">まだ証拠がありません。<a href="#/case/${c.id}/evidence">資料調査</a>で追加しましょう。</p>`}`;
  }

  // --- 原因特定
  function stepCause(c, cs) {
    const multi = c.hypothesisMode === "multi";
    const board = c.evidence.filter((e) => cs.board.includes(e.id));
    const res = ui.causeMsg[c.id];
    return `
      <div class="panel">
        <h3>1. 原因の仮説を選ぶ ${multi ? `<span class="small muted">（当てはまるものをすべて選ぶ）</span>` : ""}</h3>
        ${c.hypotheses.map((h) => `
          <label class="choice"><input type="${multi ? "checkbox" : "radio"}" name="hyp" data-action="hyp" value="${h.id}" ${cs.hypothesis.includes(h.id) ? "checked" : ""}><span>${esc(h.text)}</span></label>`).join("")}
      </div>
      <div class="panel">
        <h3>2. 仮説を支える証拠を選ぶ</h3>
        ${board.length ? board.map((e) => `<label class="choice"><input type="checkbox" data-action="sup" value="${e.id}" ${cs.supports.includes(e.id) ? "checked" : ""}><span><span class="ev-type t-${e.type}">${EVIDENCE_TYPES[e.type]}</span> ${esc(e.title)}</span></label>`).join("") : `<p class="empty">証拠ボードが空です。先に<a href="#/case/${c.id}/evidence">資料調査</a>で証拠を保存してください。</p>`}
      </div>
      <button class="btn primary" data-action="cause-submit" ${cs.hypothesis.length ? "" : "disabled"}>推理を提出する</button>
      ${res ? `<div class="panel result ${res.ok ? "ok" : "ng"}" aria-live="polite">${res.html}</div>` : cs.causeResult?.ok ? `<div class="panel result ok"><p>原因特定は完了しています。</p></div>` : ""}`;
  }

  function causeFeedback(c, r) {
    const out = [];
    if (r.ok) out.push("<p><strong>推理が成立しました。</strong>仮説と、それを支える証拠がそろっています。</p>");
    else {
      if (!r.hypOk) {
        out.push("<p><strong>仮説を見直してください。</strong></p>");
        for (const h of r.wrongPicked) out.push(`<p>✕「${esc(h.text)}」— ${esc(h.why)}</p>`);
        if (r.missingHyp.length) out.push(`<p>まだ選ばれていない原因が ${r.missingHyp.length} つあります。証拠を別の角度から見てみましょう。</p>`);
      }
      if (r.missingEvidence.length) out.push(`<p>仮説を支えるのに必要な証拠が ${r.missingEvidence.length} 件足りません（ボードに無ければ資料調査から追加）。</p>`);
      for (const id of r.irrelevant) { const e = c.evidence.find((x) => x.id === id); out.push(`<p>△「${esc(e.title)}」は直接の根拠になりません。${esc(e.note || "")}</p>`); }
      if (r.hypOk && r.evidenceOk === false && !r.missingEvidence.length && !r.irrelevant.length) out.push("<p>証拠を選んでください。</p>");
    }
    return out.join("");
  }

  // --- コード検証
  function stepCode(c, cs) {
    const code = cs.code ?? c.starterCode;
    const t = ui.lastTest[c.id];
    const passed = P.codeOk(c, cs);
    return `
      <div class="panel">
        <p>${esc(c.codeTask)}</p>
        <p class="small muted">コードの最後で <code>return true;</code>（許可）か <code>return false;</code>（止める）を返します。入力の値はテストごとに変わります。</p>
        <h4>入力として使える名前</h4>
        <table class="vars"><tbody>${c.inputs.map(([n, d]) => `<tr><td><code>${esc(n)}</code></td><td>${esc(d)}</td></tr>`).join("")}</tbody></table>
      </div>
      <div class="editor-wrap">
        <div class="editor-bar"><span>judge.js</span><span class="small ${passed ? "ok-text" : "muted"}">${passed ? "✓ 合格済み" : cs.codeResult?.ok ? "変更あり・再テストが必要" : "未合格"}</span></div>
        <textarea id="code-editor" class="editor" data-case="${c.id}" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="判定コードの編集">${esc(code)}</textarea>
      </div>
      <div class="row">
        <button class="btn primary" data-action="run-tests">▶ テストを実行</button>
        ${ui.confirm === "reset-code:" + c.id
          ? `<span class="small">コードを最初の状態に戻しますか？</span><button class="btn danger" data-action="reset-code" data-confirmed="1">戻す</button><button class="btn" data-action="cancel-confirm">やめる</button>`
          : `<button class="btn" data-action="reset-code">最初のコードに戻す</button>`}
      </div>
      <p class="small muted">演習環境：使えるのは const / let / if / else / return / === / !== / && / || / ! / 比較 / console.log などの限られた文法です。コードはブラウザ内の制限付きインタプリタで判定し、外部と通信しません。これは考え方を学ぶための簡略化した判定で、実際の仕組みはこの数行だけでは完成しません。</p>
      <div id="test-out" aria-live="polite">${t ? testTable(t) : ""}</div>
      ${state.cases[c.id].officialSolved || state.cases[c.id].trialCleared ? `<details class="panel"><summary>模範解答の一例を見る</summary><pre class="code"><code>${highlight(c.solutionCode)}</code></pre></details>` : ""}`;
  }

  function testTable(t) {
    if (t.compileError) return `<div class="panel result ng"><p><strong>コードを読み取れませんでした。</strong></p><p>${esc(t.compileError)}</p></div>`;
    const passN = t.results.filter((r) => r.pass).length;
    return `
      <div class="panel result ${t.ok ? "ok" : "ng"}">
        <p><strong>${t.ok ? "すべてのテストに合格しました。" : `合格 ${passN} / ${t.results.length}`}</strong> ${t.ok ? "正常なケースは通り、止めるべきケースは止まっています。" : "期待結果と実際の結果が違うテストがあります。"}</p>
        <div class="table-scroll"><table class="tests">
          <thead><tr><th>テスト</th><th>入力</th><th>期待</th><th>実際</th><th>判定</th></tr></thead>
          <tbody>${t.results.map((r) => `
            <tr class="${r.pass ? "pass" : "fail"}">
              <td>${esc(r.name)}${r.note ? `<div class="small muted">${esc(r.note)}</div>` : ""}${r.why ? `<div class="small why ${r.pass ? "muted" : ""}"><strong>なぜ？</strong> ${esc(r.why)}</div>` : ""}</td>
              <td class="mono small">${Object.entries(r.input).map(([k, v]) => `${esc(k)} = ${esc(fmtVal(v))}`).join("<br>")}</td>
              <td>${r.expected ? "許可 (true)" : "停止 (false)"}</td>
              <td>${r.error ? `<span class="ng-text">エラー</span><div class="small">${esc(r.error)}</div>` : r.actual ? "許可 (true)" : "停止 (false)"}${r.logs.length ? `<div class="log small mono">${r.logs.map((l) => "&gt; " + esc(l)).join("<br>")}</div>` : ""}</td>
              <td>${r.pass ? "✓" : "✕"}</td>
            </tr>`).join("")}</tbody>
        </table></div>
      </div>`;
  }

  // --- 被害対応
  function stepResponse(c, cs) {
    const msg = ui.actionMsg[c.id];
    let html = `<p class="muted">対応を実行すると結果が表示されます。不適切な対応は取り消せますが、記録には残ります。<strong>緊急</strong>の対応は、原因特定が終わる前でも実行できます。</p>`;
    html += `<div class="actions">${c.responseActions.map((a) => {
      const done = cs.actions.includes(a.id);
      const blocked = a.requires && !cs.actions.includes(a.requires);
      return `
      <div class="action ${done ? "done" : ""} ${done && a.effect === "bad" ? "bad" : ""}">
        <div>
          ${a.urgent ? `<span class="badge b-urgent">緊急</span>` : ""}${a.ledger ? `<span class="badge">${esc(a.ledger)}</span>` : ""}
          <p>${esc(a.label)}</p>
          ${done ? `<p class="small fb ${a.effect}">${a.effect === "good" ? "✓ " : a.effect === "bad" ? "⚠ " : "・"}${esc(a.feedback)}</p>` : blocked ? `<p class="small muted">先に凍結の依頼が必要です。</p>` : ""}
        </div>
        <button class="btn sm ${done ? "" : "primary"}" data-action="act" data-id="${a.id}" ${blocked && !done ? "disabled" : ""}>${done ? "取り消す" : "実行する"}</button>
      </div>`;
    }).join("")}</div>`;
    if (msg) html += `<p class="banner ${msg.kind}" aria-live="polite">${esc(msg.text)}</p>`;
    if (c.bank) html += bankPanel(c, cs);
    return html;
  }

  function bankPanel(c, cs) {
    const o = P.bankOutcome(c, cs.actions);
    const d = P.defenseEval(c, cs.defense);
    const defense = c.bank.defense;
    return `
      <div class="panel">
        <h3>送金台帳</h3>
        <div class="table-scroll"><table class="tests">
          <thead><tr><th>送金ID</th><th>金額</th><th>状態</th></tr></thead>
          <tbody>${c.bank.ledger.map((t) => `<tr><td class="mono">${t.id}</td><td class="num">${yen(t.amount)}</td><td>${esc(t.state)}</td></tr>`).join("")}</tbody>
        </table></div>
        <h3>演習上の回収状況</h3>
        <div class="money">
          <div class="m stopped"><span>実行前に停止</span><strong>${yen(o.stopped)}</strong></div>
          <div class="m recovered"><span>返還手続き完了（仮定）</span><strong>${yen(o.recovered)}</strong></div>
          <div class="m frozen"><span>凍結済み・返金未完了</span><strong>${yen(o.frozen)}</strong></div>
          <div class="m open"><span>未解決（継続調査）</span><strong>${yen(o.unresolved)}</strong></div>
        </div>
        <ul class="small">${o.rows.map((r) => `<li><span class="mono">${r.id}</span> ${yen(r.amount)} — ${esc(r.label)}</li>`).join("")}</ul>
        <p class="small ${o.balanced ? "muted" : "ng-text"}">合計の確認：停止 ${yen(o.stopped)} ＋ 返還（仮定） ${yen(o.recovered)} ＋ 未解決 ${yen(o.unresolved)} ＝ ${yen(o.stopped + o.recovered + o.unresolved)}（被害指示の総額 ${yen(o.total)}）${o.frozen ? `。凍結中の ${yen(o.frozen)} は未解決に含まれます（凍結は返金完了ではありません）` : ""}</p>
        <p class="small muted">※ 返還は「受取行の確認と返還手続きが完了した」という演習上の仮定です。現実には相手の銀行の確認や法的な手続きが必要で、正しい対応をしても必ず全額戻るわけではありません。</p>
      </div>
      <div class="panel">
        <h3>銀行全体の防御を組み立てる</h3>
        <p class="small muted">採用する守りを選び、攻撃シナリオと正常利用シナリオで検証します。攻撃を止めるだけでなく、本人確認と審査を満たした正当な利用は通す必要があります。</p>
        ${defense.options.map((op) => `<label class="choice"><input type="checkbox" data-action="defense" value="${op.id}" ${cs.defense.includes(op.id) ? "checked" : ""}><span>${esc(op.label)}</span></label>`).join("")}
        <h4>シナリオ検証</h4>
        <ul class="scenarios">${d.results.map((r) => `<li class="${r.ok ? "ok" : "ng"}"><span class="badge ${r.kind === "attack" ? "b-urgent" : "b-available"}">${r.kind === "attack" ? "攻撃" : "正常利用"}</span> ${esc(r.label)} → <strong>${esc(r.text)}</strong></li>`).join("")}</ul>
        <p class="${d.ok ? "ok-text" : "muted"}">${d.ok ? "✓ すべてのシナリオで、攻撃を止めつつ正常な利用を通せました。" : d.missingRequired.length && d.results.every((r) => r.ok) ? "シナリオは通りましたが、まだ採用していない重要な守りがあります。" : "まだ検証に失敗しているシナリオがあります。"}</p>
      </div>`;
  }

  // --- 調査レポート
  function stepReport(c, cs, ev) {
    const st = P.status(state, c, CASES);
    const hyps = c.hypotheses.filter((h) => cs.hypothesis.includes(h.id));
    const board = c.evidence.filter((e) => cs.board.includes(e.id));
    const acts = c.responseActions.filter((a) => cs.actions.includes(a.id));
    const t = cs.codeResult;
    const cm = ui.certifyMsg[c.id];
    const rep = P.reportEval(c, cs);
    let bankLine = "";
    if (c.bank) { const o = P.bankOutcome(c, cs.actions); bankLine = `<h4>資金の状況（演習上）</h4><p>停止 ${yen(o.stopped)} ／ 返還手続き完了（仮定） ${yen(o.recovered)} ／ 凍結中 ${yen(o.frozen)} ／ 未解決 ${yen(o.unresolved)}</p>`; }
    return `
      <div class="panel report">
        <p class="eyebrow">INCIDENT REPORT // LEVEL ${pad2(c.level)}</p>
        <h3>${esc(c.title)} — ${esc(c.organization)}</h3>
        <h4>原因</h4>${hyps.length ? `<ul>${hyps.map((h) => `<li>${esc(h.text)}</li>`).join("")}</ul>` : `<p class="muted">未選択</p>`}
        <p class="small ${cs.causeResult?.ok ? "ok-text" : "muted"}">${cs.causeResult?.ok ? "✓ 推理は成立済み" : "推理は未完了"}</p>
        <h4>根拠となる証拠</h4>${board.length ? `<ul>${board.map((e) => `<li>${esc(e.title)}</li>`).join("")}</ul>` : `<p class="muted">なし</p>`}
        <h4>対策と検証結果</h4>
        <p>${t ? (P.codeOk(c, cs) ? `✓ 判定コードを修正し、テスト ${t.total} 件すべてに合格` : `テスト結果：合格 ${t.passed} / ${t.total}${t.ok ? "（その後コードを変更）" : ""}`) : "コード検証は未実施"}</p>
        <h4>実施した対応</h4>${acts.length ? `<ul>${acts.map((a) => `<li class="${a.effect === "bad" ? "ng-text" : ""}">${esc(a.label)}${a.effect === "bad" ? "（不適切）" : ""}</li>`).join("")}</ul>` : `<p class="muted">なし</p>`}
        ${bankLine}
        <h4>残った課題（当てはまるものをすべて選ぶ）</h4>
        ${c.report.residual.map((r, i) => `<label class="choice"><input type="checkbox" data-action="residual" value="${i}" ${cs.report.residual.includes(i) ? "checked" : ""}><span>${esc(r.text)}</span></label>`).join("")}
        <label class="field"><span>調査メモ（任意・自由記述）</span><textarea id="report-note" rows="3" data-case="${c.id}">${esc(cs.report.note)}</textarea></label>
        <button class="btn" data-action="report-submit">レポートを提出</button>
        ${cs.report.submitted ? `<p class="small ${rep.ok ? "ok-text" : "ng-text"}">${rep.ok ? "✓ レポートを受理しました。" : rep.wrong.length ? "選んだ課題の中に、事実と合わないものがあります。" : "まだ見落としている課題があります。"}</p>` : ""}
      </div>
      ${checklist(c, cs, ev)}
      <div class="panel certify">
        ${cs.officialSolved ? `<p class="ok-text"><strong>✓ この事件は正式に解決済みです。</strong>${cs.solvedAt ? `（${esc(new Date(cs.solvedAt).toLocaleString("ja-JP"))}）` : ""}</p>` : ""}
        <button class="btn primary" data-action="certify" ${ev.allOk ? "" : "disabled"}>${st === "trial" ? "体験クリアとして記録する" : cs.officialSolved ? "解決済み" : "解決認定を申請する"}</button>
        ${!ev.allOk ? `<p class="small muted">すべての解決条件がそろうと申請できます。</p>` : ""}
        ${cm ? `<p class="banner ${cm.kind}" aria-live="polite">${cm.html}</p>` : ""}
        <hr>
        ${ui.confirm === "reset-case:" + c.id
          ? `<p class="small">作業内容を消して最初から調査し直しますか？（正式な解決記録は残ります）</p><div class="row"><button class="btn danger sm" data-action="reset-case" data-confirmed="1">消してやり直す</button><button class="btn sm" data-action="cancel-confirm">やめる</button></div>`
          : `<button class="btn danger sm" data-action="reset-case">この事件をやり直す</button>`}
        <p class="small muted">作業内容（証拠・講義の回答・コード・対応・レポート）を消して最初から調査します。正式な解決記録とレベルの解放は残ります。</p>
      </div>`;
  }

  // ---------- 基礎実践 ----------
  function renderBasics(id) {
    const cur = HL.BASICS.find((b) => b.id === id) || HL.BASICS[0];
    const bs = state.basics[cur.id] || {};
    const code = bs.code ?? cur.starterCode;
    const t = ui.basicsResult[cur.id];
    const hintsOpen = bs.hints || 0;
    const showAnswer = ui.basicsAnswer === cur.id || bs.passed;
    const idx = HL.BASICS.indexOf(cur);
    const next = HL.BASICS[idx + 1];
    const G = HL.BASICS_GUIDE;
    const lines = (codeText, notes) => `<div class="annotated">${codeText.split("\n").map((ln, i) => `<div class="ann-row"><pre class="ann-code"><code>${highlight(ln) || " "}</code></pre><p class="ann-note">${notes[i] ? esc(notes[i]) : ""}</p></div>`).join("")}</div>`;
    return `
      <section class="page-head"><p class="eyebrow">BASIC DRILLS</p><h1>基礎実践</h1><p class="muted">通信・変数・条件分岐・認証・認可を、解説つきの小さな演習で身につけます。上から順に進めるのがおすすめですが、どれからでも始められます。</p></section>
      <details class="panel guide" id="basics-guide" ${state.ui.guideClosed ? "" : "open"}>
        <summary><strong>${esc(G.title)}</strong></summary>
        <div class="guide-grid">${G.points.map((p) => `<div><h4>${esc(p.head)}</h4><p class="small">${esc(p.text)}</p></div>`).join("")}</div>
        <h4>よく出てくる言葉</h4>
        <table class="vars"><tbody>${G.glossary.map(([k, d]) => `<tr><td><code>${esc(k)}</code></td><td>${esc(d)}</td></tr>`).join("")}</tbody></table>
      </details>
      <div class="basics">
        <nav class="panel basics-list" aria-label="演習の一覧">${HL.BASICS.map((b, i) => `<a href="#/basics/${b.id}" class="${b.id === cur.id ? "current" : ""}"><span class="num">${i + 1}</span><span><span class="tag">${esc(b.topic)}</span><br>${esc(b.title)}</span>${state.basics[b.id]?.passed ? '<span class="ok-text" aria-label="合格">✓</span>' : ""}</a>`).join("")}</nav>
        <div class="basics-main">
          <div class="panel">
            <p class="eyebrow">STEP 1 // 解説を読む ・ ${esc(cur.topic)}</p>
            <h2>${esc(cur.title)}</h2>
            <p class="goal"><strong>できるようになること：</strong>${esc(cur.goal)}</p>
            ${cur.lesson.map((p) => `<p>${esc(p)}</p>`).join("")}
            <p class="analogy"><strong>たとえるなら</strong> ${esc(cur.analogy)}</p>
            <h4>書き方</h4>
            <div class="table-scroll"><table class="vars"><tbody>${cur.syntax.map((x) => `<tr><td><code>${esc(x.code)}</code></td><td>${esc(x.explain)}</td></tr>`).join("")}</tbody></table></div>
            <h4>例：1行ずつ読んでみよう</h4>
            ${lines(cur.example.code, cur.example.notes)}
          </div>
          <div class="panel">
            <p class="eyebrow">STEP 2 // やること</p>
            <p><strong>${esc(cur.explain)}</strong></p>
            <ol class="steps">${cur.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
            <h4>入力として使える名前</h4>
            <table class="vars"><tbody>${cur.inputs.map(([n, d]) => `<tr><td><code>${esc(n)}</code></td><td>${esc(d)}</td></tr>`).join("")}</tbody></table>
          </div>
          <p class="eyebrow">STEP 3 // コードを書いて試す</p>
          <div class="editor-wrap"><div class="editor-bar"><span>drill.js</span><span class="small ${bs.passed ? "ok-text" : "muted"}">${bs.passed ? "✓ 合格済み" : "下のコードを書きかえてください"}</span></div>
            <textarea id="basics-editor" class="editor small-editor" data-basic="${cur.id}" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="演習コード">${esc(code)}</textarea></div>
          <div class="row"><button class="btn primary" data-action="basics-run" data-id="${cur.id}">▶ テストを実行</button><button class="btn" data-action="basics-reset" data-id="${cur.id}">最初に戻す</button></div>
          <div aria-live="polite">${t ? testTable(t) + basicsAdvice(t) : ""}</div>
          ${t?.ok && next ? `<p class="banner ok">合格！ <a href="#/basics/${next.id}">次の演習「${esc(next.title)}」へ →</a></p>` : t?.ok ? `<p class="banner ok">すべての基礎演習が終わりました。<a href="#/cases">事件ファイル</a>に挑戦してみましょう。</p>` : ""}
          <div class="panel">
            <p class="eyebrow">わからないときは</p>
            <h3>ヒント（1つずつ開けます）</h3>
            ${cur.hints.slice(0, hintsOpen).map((h, i) => `<p class="hint"><strong>ヒント${i + 1}</strong> ${esc(h)}</p>`).join("")}
            ${hintsOpen < cur.hints.length ? `<button class="btn sm" data-action="basics-hint" data-id="${cur.id}">ヒント${hintsOpen + 1}を見る</button>` : ""}
            <hr>
            ${showAnswer ? `<h3>解答例と1行ずつの解説</h3>${lines(cur.solutionCode, cur.solutionNotes)}<p class="small muted">解答例は1つの書き方です。テストに合格すれば、別の書き方でも正解です。見たあとは、自分で打ち直してテストを実行してみましょう。</p>`
              : `<button class="btn sm" data-action="basics-answer" data-id="${cur.id}">解答例と解説を見る</button><p class="small muted">まずはヒントを試してみましょう。合格すると解答例も自動で表示されます。</p>`}
          </div>
        </div>
      </div>`;
  }

  function basicsAdvice(t) {
    if (t.compileError) return `<p class="banner warn">コードの書き方にまちがいがあります。エラーの行番号を見て、カッコ（ ）や { }、" " の閉じ忘れがないか確かめましょう。わからなければ「最初に戻す」でやり直せます。</p>`;
    if (t.ok) return "";
    const failed = t.results.filter((r) => !r.pass);
    const allowMiss = failed.filter((r) => r.expected === true).length;
    const blockMiss = failed.filter((r) => r.expected === false).length;
    let msg = "✕ の行の『なぜ？』を読んで、どの条件が足りないか考えてみましょう。";
    if (failed.some((r) => r.error)) msg = "エラーが出ている行があります。入力の名前の綴りや、return の書き忘れがないか確かめましょう。";
    else if (blockMiss && !allowMiss) msg = "止めるべきケースを通してしまっています（条件がゆるすぎます）。";
    else if (allowMiss && !blockMiss) msg = "通すべきケースを止めてしまっています（条件がきびしすぎます）。";
    return `<p class="banner warn">${msg} まだわからなければ、下のヒントを開いてみましょう。</p>`;
  }

  // ---------- 動画 ----------
  function renderVideos() {
    const f = ui.videoFilter;
    return `
      <section class="page-head"><p class="eyebrow">VIDEO LECTURES</p><h1>動画で学ぶ</h1>
        <p class="muted">YouTubeで公開されているプログラミング・セキュリティの講義です。事件ファイルとは独立していて、見なくても事件は進められます。</p>
        <p class="small muted">掲載基準：${esc(HL.VIDEOS_VERIFIED_ON)} にURL（動画ID）とタイトルの組を検索インデックスで確認できた動画だけを載せています。日本語の動画は、初心者にわかりやすいという評判（紹介記事・公的機関・著名な専門家）を確認できたものに絞り、根拠を各動画に表示しています。投稿者名は確認できたものだけ表示しています。最初は日本語の動画を表示しています（「言語」で英語の定番講座も選べます）。${HL.EMBED_DISABLED ? "この公開版ではページ内に動画を埋め込めないため、「YouTubeで開く」から視聴してください。" : "埋め込みが再生できない場合は「YouTubeで開く」を使ってください。"}</p></section>
      <div class="filters panel">
        <label class="field grow"><span>検索</span><input type="search" id="video-q" value="${esc(f.q)}" placeholder="例：2FA、CSRF、JavaScript" autocomplete="off"></label>
        <label class="field"><span>分類</span><select id="video-cat"><option value="all">すべて</option>${HL.VIDEO_CATEGORIES.map((c) => `<option value="${c.id}" ${f.cat === c.id ? "selected" : ""}>${esc(c.label)}</option>`).join("")}</select></label>
        <label class="field"><span>言語</span><select id="video-lang">${[["all", "すべて"], ["ja", "日本語"], ["en", "英語"]].map(([v, l]) => `<option value="${v}" ${f.lang === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      </div>
      <div id="video-list" class="video-grid"></div>`;
  }

  /** サムネイル。YouTube の画像が読み込めない環境（公開版など）では、デザインした代わりの表紙を出す */
  function videoThumb(v) {
    if (ui.playing === v.id && !HL.EMBED_DISABLED && v.kind !== "channel") {
      return `<div class="player"><iframe src="${esc(HL.videoEmbedUrl(v.id))}" title="${esc(v.title)}" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    }
    const ep = (v.title.match(/#\s?(\d+)/) || [])[1];
    const lec = (v.title.match(/Lecture (\d+)/) || [])[1];
    const label = v.kind === "channel" ? "CHANNEL" : ep ? `#${ep}` : lec ? `L${lec}` : (v.channel || "VIDEO").replace(/（.*）/, "");
    const sub = v.channel ? v.channel.replace(/（.*）/, "") : "YouTube";
    const cover = `<div class="thumb-fallback cat-${esc(v.category)}" aria-hidden="true"><span class="tf-label">${esc(label)}</span><span class="tf-sub">${esc(sub)}</span></div>`;
    const img = v.kind === "channel" ? "" : `<img class="thumb-img" src="${esc(HL.videoThumbUrl(v.id))}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
    const inner = `${cover}${img}<span class="thumb-play" aria-hidden="true">${v.kind === "channel" ? "↗" : "▶"}</span>`;
    if (HL.EMBED_DISABLED || v.kind === "channel") return `<a class="player thumb" href="${esc(HL.videoUrl(v))}" target="_blank" rel="noopener" aria-label="${esc(v.title)} をYouTubeで開く">${inner}</a>`;
    return `<button class="player thumb" data-action="play" data-id="${esc(v.id)}" aria-label="${esc(v.title)} をここで再生">${inner}</button>`;
  }

  function updateVideoList() {
    const f = ui.videoFilter; const q = f.q.trim().toLowerCase();
    const list = HL.VIDEOS.filter((v) => (f.cat === "all" || v.category === f.cat) && (f.lang === "all" || v.lang === f.lang) && (!q || [v.title, v.description, v.channel || "", HL.VIDEO_CATEGORIES.find((c) => c.id === v.category).label].join(" ").toLowerCase().includes(q)));
    const el = $("#video-list"); if (!el) return;
    el.innerHTML = list.length ? list.map((v) => {
      const watched = state.videos.watched.includes(v.id);
      const cat = HL.VIDEO_CATEGORIES.find((c) => c.id === v.category);
      return `
      <article class="panel video">
        ${videoThumb(v)}
        <div class="tags"><span class="tag">${esc(cat.label)}</span><span class="tag">${v.lang === "ja" ? "日本語" : "英語"}</span><span class="tag">${esc(v.level)}</span>${watched ? `<span class="tag ok">視聴済み</span>` : ""}</div>
        <h3>${esc(v.title)}</h3>
        <p class="small muted">${v.kind === "channel" ? "YouTubeチャンネル" : v.channel ? "投稿元：" + esc(v.channel) : "投稿元：YouTubeのページで確認してください"}</p>
        ${v.reputation ? `<p class="small reputation"><span class="ok-text">評判</span> ${esc(v.reputation)}</p>` : ""}
        <p class="small">${esc(v.description)}</p>
        ${v.cases.length ? `<p class="small">関連する事件：${v.cases.map((id) => { const c = HL.getCase(id); return `<a href="#/case/${id}/lecture">LEVEL ${pad2(c.level)} ${esc(c.title)}</a>`; }).join("、")}</p>` : ""}
        <div class="row"><a class="btn sm" href="${esc(HL.videoUrl(v))}" target="_blank" rel="noopener">${v.kind === "channel" ? "チャンネルを開く ↗" : "YouTubeで開く ↗"}</a><button class="btn sm" data-action="watched" data-id="${esc(v.id)}">${watched ? "視聴済みを外す" : "視聴済みにする"}</button></div>
      </article>`;
    }).join("") : `<p class="empty">条件に合う動画はありません。</p>`;
  }

  // ---------- 単語検索 ----------
  function renderGlossary() {
    return `
      <section class="page-head"><p class="eyebrow">GLOSSARY</p><h1>単語検索</h1><p class="muted">日本語・英語・読みがなで調べられます。</p></section>
      <div class="filters panel"><label class="field grow"><span>用語を検索</span><input type="search" id="glossary-q" value="${esc(ui.glossaryQ)}" placeholder="例：認可、session、べきとう" autocomplete="off"></label></div>
      <div id="glossary-list" class="glossary"></div>`;
  }

  function updateGlossaryList() {
    const q = ui.glossaryQ.trim().toLowerCase();
    const list = HL.GLOSSARY.filter((g) => !q || [g.ja, g.en, g.reading, g.desc].join(" ").toLowerCase().includes(q));
    const el = $("#glossary-list"); if (!el) return;
    el.innerHTML = `<p class="small muted">${list.length} 件</p>` + (list.length ? list.map((g) => `
      <article class="panel term"><h3>${esc(g.ja)} <span class="en">${esc(g.en)}</span></h3><p class="small muted">${esc(g.reading)}</p><p>${esc(g.desc)}</p>
      ${g.cases.length ? `<p class="small">登場する事件：${g.cases.map((id) => { const c = HL.getCase(id); return c ? `<a href="#/case/${id}/lecture">LEVEL ${pad2(c.level)}</a>` : ""; }).join(" ")}</p>` : ""}</article>`).join("") : `<p class="empty">見つかりませんでした。別の言い方でも試してみてください。</p>`);
  }

  // ---------- 操作 ----------
  function currentCase() { const r = parseHash(); return r.page === "case" ? HL.getCase(r.a) : null; }

  function runCaseTests(c) {
    const cs = P.caseState(state, c.id);
    const code = cs.code ?? c.starterCode;
    const t = HL.MiniJS.runTests(code, c.testCases);
    ui.lastTest[c.id] = t;
    const passed = t.results.filter((r) => r.pass).length;
    cs.codeResult = { ok: t.ok, code, passed, total: c.testCases.length, at: Date.now() };
    persist();
  }

  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-action]");
    if (!el) return;
    const act = el.dataset.action;
    const c = currentCase();
    const cs = c ? P.caseState(state, c.id) : null;
    switch (act) {
      case "skip": $("#app").focus(); return;
      case "cancel-confirm": ui.confirm = null; rerenderKeepScroll(); return;
      case "nova-toggle": ui.novaOpen = !ui.novaOpen; rerenderKeepScroll(); return;
      case "nova": {
        ui.nova[c.id] = HL.Nova.respond(el.dataset.kind, c, cs, P.evaluate(c, cs), ui.lastTest[c.id]);
        ui.novaOpen = true; rerenderKeepScroll(); return;
      }
      case "lecture-pos": cs.lecturePos = Number(el.dataset.pos); persist(); rerenderKeepScroll(); return;
      case "quiz": cs.quiz[el.dataset.q] = { selected: Number(el.dataset.o), at: Date.now() }; persist(); rerenderKeepScroll(); return;
      case "ev-open": {
        const k = c.id + el.dataset.ev; ui.openEvidence[k] = !ui.openEvidence[k];
        if (!cs.viewed.includes(el.dataset.ev)) cs.viewed.push(el.dataset.ev);
        persist(); rerenderKeepScroll(); return;
      }
      case "board-toggle": {
        const id = el.dataset.ev;
        if (cs.board.includes(id)) { cs.board = cs.board.filter((x) => x !== id); cs.supports = cs.supports.filter((x) => x !== id); }
        else { cs.board.push(id); if (!cs.viewed.includes(id)) cs.viewed.push(id); }
        cs.causeResult = cs.causeResult && P.evaluateCause(c, cs.hypothesis, cs.supports).ok ? cs.causeResult : null;
        persist(); rerenderKeepScroll(); return;
      }
      case "cause-submit": {
        const r = P.evaluateCause(c, cs.hypothesis, cs.supports);
        cs.causeResult = { ok: r.ok, at: Date.now() };
        ui.causeMsg[c.id] = { ok: r.ok, html: causeFeedback(c, r) };
        persist(); rerenderKeepScroll(); return;
      }
      case "run-tests": runCaseTests(c); rerenderKeepScroll(); return;
      case "reset-code":
        if (!el.dataset.confirmed) { ui.confirm = "reset-code:" + c.id; rerenderKeepScroll(); return; }
        ui.confirm = null;
        cs.code = null; cs.codeResult = null; delete ui.lastTest[c.id]; persist(); rerenderKeepScroll(); return;
      case "act": {
        const a = c.responseActions.find((x) => x.id === el.dataset.id);
        if (cs.actions.includes(a.id)) {
          cs.actions = cs.actions.filter((x) => x !== a.id && !c.responseActions.some((y) => y.id === x && y.requires === a.id));
          ui.actionMsg[c.id] = { kind: "", text: `「${a.label}」を取り消しました。` };
        } else {
          if (a.requires && !cs.actions.includes(a.requires)) return;
          cs.actions.push(a.id);
          ui.actionMsg[c.id] = { kind: a.effect === "bad" ? "warn" : a.effect === "good" ? "ok" : "", text: a.feedback };
        }
        persist(); rerenderKeepScroll(); return;
      }
      case "report-submit": cs.report.submitted = true; persist(); rerenderKeepScroll(); return;
      case "certify": {
        const r = P.certify(state, c, CASES);
        if (r.ok) {
          const next = CASES.find((x) => x.level === c.level + 1);
          ui.certifyMsg[c.id] = { kind: "ok", html: `<strong>事件解決！</strong> 正式な解決記録を保存しました。${next ? `LEVEL ${pad2(next.level)}「${esc(next.title)}」が解放されました。 <a href="#/case/${next.id}/brief">次の事件へ →</a>` : "全30事件を解決しました。おつかれさまでした、調査担当者。"}` };
        } else if (r.reason === "locked") {
          ui.certifyMsg[c.id] = { kind: "warn", html: "体験クリアとして記録しました。前のレベルを正式に解決したあと、ここでもう一度申請すると正式な解決記録になります。" };
        } else ui.certifyMsg[c.id] = { kind: "warn", html: "まだそろっていない条件があります。" };
        persist(); rerenderKeepScroll(); return;
      }
      case "reset-case":
        if (!el.dataset.confirmed) { ui.confirm = "reset-case:" + c.id; rerenderKeepScroll(); return; }
        ui.confirm = null;
        P.resetCase(state, c.id);
        for (const k of ["lastTest", "nova", "causeMsg", "actionMsg", "certifyMsg"]) delete ui[k][c.id];
        persist(); location.hash = `#/case/${c.id}/brief`; rerenderKeepScroll(); return;
      case "basics-run": {
        const b = HL.BASICS.find((x) => x.id === el.dataset.id);
        const bs = state.basics[b.id] = state.basics[b.id] || {};
        const t = HL.MiniJS.runTests(bs.code ?? b.starterCode, b.tests);
        ui.basicsResult[b.id] = t;
        if (t.ok) bs.passed = true;
        persist(); rerenderKeepScroll(); return;
      }
      case "basics-hint": {
        const bs = state.basics[el.dataset.id] = state.basics[el.dataset.id] || {};
        bs.hints = (bs.hints || 0) + 1; persist(); rerenderKeepScroll(); return;
      }
      case "basics-answer": ui.basicsAnswer = el.dataset.id; rerenderKeepScroll(); return;
      case "basics-reset": {
        const b = HL.BASICS.find((x) => x.id === el.dataset.id);
        if (state.basics[b.id]) state.basics[b.id].code = null;
        delete ui.basicsResult[b.id]; persist(); rerenderKeepScroll(); return;
      }
      case "play": ui.playing = el.dataset.id; updateVideoList(); return;
      case "watched": {
        const id = el.dataset.id; const w = state.videos.watched;
        state.videos.watched = w.includes(id) ? w.filter((x) => x !== id) : w.concat(id);
        persist(); updateVideoList(); return;
      }
    }
  });

  document.addEventListener("change", (ev) => {
    const el = ev.target;
    const c = currentCase();
    const cs = c ? P.caseState(state, c.id) : null;
    const act = el.dataset.action;
    if (act === "hyp") {
      if (c.hypothesisMode === "multi") cs.hypothesis = el.checked ? [...new Set(cs.hypothesis.concat(el.value))] : cs.hypothesis.filter((x) => x !== el.value);
      else cs.hypothesis = [el.value];
      cs.causeResult = null; delete ui.causeMsg[c.id]; persist(); rerenderKeepScroll();
    } else if (act === "sup") {
      cs.supports = el.checked ? [...new Set(cs.supports.concat(el.value))] : cs.supports.filter((x) => x !== el.value);
      cs.causeResult = null; delete ui.causeMsg[c.id]; persist(); rerenderKeepScroll();
    } else if (act === "residual") {
      const i = Number(el.value);
      cs.report.residual = el.checked ? [...new Set(cs.report.residual.concat(i))] : cs.report.residual.filter((x) => x !== i);
      cs.report.submitted = false; persist(); rerenderKeepScroll();
    } else if (act === "defense") {
      cs.defense = el.checked ? [...new Set(cs.defense.concat(el.value))] : cs.defense.filter((x) => x !== el.value);
      persist(); rerenderKeepScroll();
    } else if (el.id === "case-ch" || el.id === "case-st") {
      state.ui.filters = Object.assign({ query: "", chapter: "all", filter: "all" }, state.ui.filters, el.id === "case-ch" ? { chapter: el.value } : { filter: el.value });
      persist(); updateCaseList();
    } else if (el.id === "video-cat" || el.id === "video-lang") {
      ui.videoFilter[el.id === "video-cat" ? "cat" : "lang"] = el.value; updateVideoList();
    }
  });

  document.addEventListener("input", (ev) => {
    const el = ev.target;
    if (el.id === "code-editor") {
      const cs = P.caseState(state, el.dataset.case);
      cs.code = el.value; persist();
      const bar = $(".editor-bar .small");
      const c = HL.getCase(el.dataset.case);
      if (bar) { const ok = P.codeOk(c, cs); bar.textContent = ok ? "✓ 合格済み" : cs.codeResult?.ok ? "変更あり・再テストが必要" : "未合格"; bar.className = "small " + (ok ? "ok-text" : "muted"); }
    } else if (el.id === "basics-editor") {
      const bs = state.basics[el.dataset.basic] = state.basics[el.dataset.basic] || {};
      bs.code = el.value; persist();
    } else if (el.id === "report-note") {
      P.caseState(state, el.dataset.case).report.note = el.value; persist();
    } else if (el.id === "case-q") {
      state.ui.filters = Object.assign({ query: "", chapter: "all", filter: "all" }, state.ui.filters, { query: el.value }); persist(); updateCaseList();
    } else if (el.id === "video-q") { ui.videoFilter.q = el.value; updateVideoList(); }
    else if (el.id === "glossary-q") { ui.glossaryQ = el.value; updateGlossaryList(); }
  });

  // エディタで Tab キーを押したら字下げを入れる（Shift+Tab / Esc でフォーカス移動できるように）
  // サムネイル画像が読み込めなかったら隠して、代わりの表紙を見せる
  document.addEventListener("error", (ev) => { if (ev.target.classList && ev.target.classList.contains("thumb-img")) ev.target.hidden = true; }, true);
  document.addEventListener("toggle", (ev) => { if (ev.target.id === "basics-guide") { state.ui.guideClosed = !ev.target.open; persist(); } }, true);

  document.addEventListener("keydown", (ev) => {
    const el = ev.target;
    if (!el.classList || !el.classList.contains("editor")) return;
    if (ev.key === "Escape") { el.blur(); return; }
    if (ev.key === "Tab" && !ev.shiftKey) {
      ev.preventDefault();
      const s = el.selectionStart, e = el.selectionEnd;
      el.setRangeText("  ", s, e, "end");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  // 固定ヘッダーの高さを CSS 変数にして、工程タブなどの吸着位置を合わせる
  const setHeaderHeight = () => document.documentElement.style.setProperty("--hdr", $(".topbar").offsetHeight + "px");
  window.addEventListener("resize", setHeaderHeight);
  setHeaderHeight();

  window.addEventListener("hashchange", () => { ui.confirm = null; render(); window.scrollTo(0, 0); });
  render();
})();
