/*
 * MiniJS — 演習用の「制限付き」JavaScriptインタプリタ
 *
 * ユーザーのコードを eval / Function / Worker で実行せず、
 * ここで字句解析 → 構文解析 → 評価を自前で行う。
 * 使える文法は初心者向けの小さな部分集合だけで、
 * 外部通信・DOM・OSコマンドなどへ到達する手段はそもそも存在しない。
 *
 * 対応: const / let / 再代入(let のみ) / if / else if / else / return
 *       true false null 数値 文字列 配列リテラル
 *       === !== < > <= >= && || ! + - * / % ( )
 *       入力オブジェクトのプロパティ参照 (a.b)、配列の添字 (a[0])
 *       文字列・配列の安全なメソッド: includes startsWith endsWith toLowerCase length
 *       console.log(...)
 */
(function (root) {
  "use strict";

  class MiniJSError extends Error {
    constructor(message, line) {
      super(line ? `${line}行目: ${message}` : message);
      this.line = line || null;
    }
  }

  const KEYWORDS = new Set(["const", "let", "if", "else", "return", "true", "false", "null", "undefined"]);
  const FORBIDDEN_WORDS = new Set([
    "eval", "Function", "window", "document", "globalThis", "self", "fetch", "XMLHttpRequest",
    "require", "import", "process", "constructor", "prototype", "__proto__", "while", "for",
    "function", "new", "class", "this", "var", "do", "async", "await", "setTimeout", "setInterval",
    "localStorage", "location", "navigator", "WebSocket", "Worker",
  ]);
  const PUNCT = ["===", "!==", "==", "!=", "<=", ">=", "&&", "||", "(", ")", "{", "}", "[", "]", ";", ",", ".", "=", "<", ">", "!", "+", "-", "*", "/", "%"];
  const MAX_STEPS = 20000;
  const MAX_SOURCE = 6000;

  // ---------- 字句解析 ----------
  function tokenize(src) {
    if (typeof src !== "string") throw new MiniJSError("コードが文字列ではありません");
    if (src.length > MAX_SOURCE) throw new MiniJSError(`コードが長すぎます（${MAX_SOURCE}文字まで）`);
    const tokens = [];
    let i = 0, line = 1;
    while (i < src.length) {
      const c = src[i];
      if (c === "\n") { line++; i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
      if (c === "/" && src[i + 1] === "*") {
        const end = src.indexOf("*/", i + 2);
        if (end < 0) throw new MiniJSError("コメント /* が閉じられていません", line);
        for (let k = i; k < end; k++) if (src[k] === "\n") line++;
        i = end + 2; continue;
      }
      if (/[0-9]/.test(c)) {
        let j = i; while (j < src.length && /[0-9_.]/.test(src[j])) j++;
        const raw = src.slice(i, j).replace(/_/g, "");
        const n = Number(raw);
        if (!Number.isFinite(n)) throw new MiniJSError(`数値として読めません: ${raw}`, line);
        tokens.push({ t: "num", v: n, line }); i = j; continue;
      }
      if (c === '"' || c === "'") {
        let j = i + 1, out = "";
        while (j < src.length && src[j] !== c) {
          if (src[j] === "\n") throw new MiniJSError("文字列が行の途中で終わっています（閉じる " + c + " が必要）", line);
          if (src[j] === "\\") { const n = src[j + 1]; out += n === "n" ? "\n" : n; j += 2; continue; }
          out += src[j]; j++;
        }
        if (j >= src.length) throw new MiniJSError("文字列が閉じられていません", line);
        tokens.push({ t: "str", v: out, line }); i = j + 1; continue;
      }
      if (c === "`") throw new MiniJSError("この演習ではテンプレート文字列（`）は使えません。\"...\" を使ってください", line);
      if (/[A-Za-z_$぀-ヿ一-鿿]/.test(c)) {
        let j = i; while (j < src.length && /[A-Za-z0-9_$぀-ヿ一-鿿]/.test(src[j])) j++;
        const w = src.slice(i, j);
        if (FORBIDDEN_WORDS.has(w)) throw new MiniJSError(`「${w}」はこの演習環境では使えません（安全のため制限しています）`, line);
        tokens.push({ t: KEYWORDS.has(w) ? "kw" : "id", v: w, line }); i = j; continue;
      }
      const p = PUNCT.find((p) => src.startsWith(p, i));
      if (p) {
        if (p === "==" || p === "!=") throw new MiniJSError(`「${p}」ではなく「${p}=」（厳密な比較）を使いましょう`, line);
        tokens.push({ t: "p", v: p, line }); i += p.length; continue;
      }
      throw new MiniJSError(`使えない文字があります: ${c}`, line);
    }
    tokens.push({ t: "eof", v: null, line });
    return tokens;
  }

  // ---------- 構文解析 ----------
  function parse(src) {
    const toks = tokenize(src);
    let pos = 0;
    const peek = () => toks[pos];
    const next = () => toks[pos++];
    const is = (t, v) => toks[pos].t === t && (v === undefined || toks[pos].v === v);
    const isP = (v) => is("p", v);
    const expectP = (v, hint) => {
      if (!isP(v)) throw new MiniJSError(hint || `「${v}」が必要です（見つかったもの: ${show(peek())}）`, peek().line);
      return next();
    };
    const show = (tk) => (tk.t === "eof" ? "コードの終わり" : String(tk.v));

    function program() {
      const body = [];
      while (!is("eof")) body.push(statement());
      return { type: "Program", body };
    }
    function block() {
      const line = expectP("{", "「{」でブロックを始めてください").line;
      const body = [];
      while (!isP("}")) {
        if (is("eof")) throw new MiniJSError("「}」が足りません（ブロックが閉じられていません）", line);
        body.push(statement());
      }
      next();
      return { type: "Block", body, line };
    }
    function semi() { if (isP(";")) next(); }
    function statement() {
      const tk = peek();
      if (tk.t === "kw" && (tk.v === "const" || tk.v === "let")) {
        next();
        const id = next();
        if (id.t !== "id") throw new MiniJSError(`${tk.v} の後には変数名が必要です`, tk.line);
        expectP("=", `${tk.v} ${id.v} の後に「=」と値が必要です`);
        const init = expression();
        semi();
        return { type: "Decl", kind: tk.v, name: id.v, init, line: tk.line };
      }
      if (tk.t === "kw" && tk.v === "if") {
        next();
        expectP("(", "if の後には ( 条件 ) が必要です");
        const test = expression();
        expectP(")", "条件の後に「)」が必要です");
        const cons = block();
        let alt = null;
        if (is("kw", "else")) {
          next();
          alt = is("kw", "if") ? statement() : block();
        }
        return { type: "If", test, cons, alt, line: tk.line };
      }
      if (tk.t === "kw" && tk.v === "return") {
        next();
        if (isP(";") || isP("}") || is("eof")) { semi(); return { type: "Return", arg: null, line: tk.line }; }
        const arg = expression();
        semi();
        return { type: "Return", arg, line: tk.line };
      }
      if (tk.t === "p" && tk.v === "{") return block();
      if (tk.t === "id" && toks[pos + 1].t === "p" && toks[pos + 1].v === "=") {
        next(); next();
        const value = expression();
        semi();
        return { type: "Assign", name: tk.v, value, line: tk.line };
      }
      const expr = expression();
      semi();
      if (expr.type !== "Call") throw new MiniJSError("この行は何もしていません（値の計算だけで終わっています）", tk.line);
      return { type: "ExprStmt", expr, line: tk.line };
    }

    function expression() { return orExpr(); }
    function binLoop(sub, ops) {
      let left = sub();
      while (is("p") && ops.includes(peek().v)) {
        const op = next();
        const right = sub();
        left = { type: "Bin", op: op.v, left, right, line: op.line };
      }
      return left;
    }
    function orExpr() { return binLoop(andExpr, ["||"]); }
    function andExpr() { return binLoop(eqExpr, ["&&"]); }
    function eqExpr() { return binLoop(relExpr, ["===", "!=="]); }
    function relExpr() { return binLoop(addExpr, ["<", ">", "<=", ">="]); }
    function addExpr() { return binLoop(mulExpr, ["+", "-"]); }
    function mulExpr() { return binLoop(unary, ["*", "/", "%"]); }
    function unary() {
      if (isP("!") || isP("-")) { const op = next(); return { type: "Unary", op: op.v, arg: unary(), line: op.line }; }
      return postfix();
    }
    function postfix() {
      let e = primary();
      for (;;) {
        if (isP(".")) {
          const dot = next();
          const name = next();
          if (name.t !== "id" && name.t !== "kw") throw new MiniJSError("「.」の後にはプロパティ名が必要です", dot.line);
          e = { type: "Member", obj: e, prop: name.v, line: dot.line };
        } else if (isP("[")) {
          const br = next();
          const idx = expression();
          expectP("]", "「]」が必要です");
          e = { type: "Index", obj: e, idx, line: br.line };
        } else if (isP("(")) {
          const pr = next();
          const args = [];
          if (!isP(")")) {
            args.push(expression());
            while (isP(",")) { next(); args.push(expression()); }
          }
          expectP(")", "関数呼び出しの「)」が必要です");
          e = { type: "Call", callee: e, args, line: pr.line };
        } else break;
      }
      return e;
    }
    function primary() {
      const tk = next();
      if (tk.t === "num" || tk.t === "str") return { type: "Lit", value: tk.v, line: tk.line };
      if (tk.t === "kw") {
        if (tk.v === "true") return { type: "Lit", value: true, line: tk.line };
        if (tk.v === "false") return { type: "Lit", value: false, line: tk.line };
        if (tk.v === "null") return { type: "Lit", value: null, line: tk.line };
        if (tk.v === "undefined") return { type: "Lit", value: undefined, line: tk.line };
        throw new MiniJSError(`「${tk.v}」はここには書けません`, tk.line);
      }
      if (tk.t === "id") return { type: "Id", name: tk.v, line: tk.line };
      if (tk.t === "p" && tk.v === "(") { const e = expression(); expectP(")", "「)」が足りません"); return e; }
      if (tk.t === "p" && tk.v === "[") {
        const items = [];
        if (!isP("]")) { items.push(expression()); while (isP(",")) { next(); items.push(expression()); } }
        expectP("]", "配列の「]」が足りません");
        return { type: "Arr", items, line: tk.line };
      }
      throw new MiniJSError(`ここに「${show(tk)}」は書けません`, tk.line);
    }
    return program();
  }

  // ---------- 評価 ----------
  const RETURN = Symbol("return");
  const STRING_METHODS = {
    includes: (s, a) => s.includes(String(a)),
    startsWith: (s, a) => s.startsWith(String(a)),
    endsWith: (s, a) => s.endsWith(String(a)),
    toLowerCase: (s) => s.toLowerCase(),
  };
  const ARRAY_METHODS = { includes: (arr, a) => arr.includes(a) };

  function fmt(v) {
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return "[" + v.map((x) => (typeof x === "string" ? JSON.stringify(x) : fmt(x))).join(", ") + "]";
    if (v && typeof v === "object") return JSON.stringify(v);
    return String(v);
  }

  function run(src, inputs) {
    const ast = parse(src);
    const logs = [];
    let steps = 0;
    const scopes = [new Map()];
    for (const [k, v] of Object.entries(inputs || {})) scopes[0].set(k, { value: deepFreeze(clone(v)), constant: true, input: true });
    const tick = (line) => { if (++steps > MAX_STEPS) throw new MiniJSError("処理が多すぎるため停止しました", line); };

    function lookup(name, line) {
      for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i].has(name)) return scopes[i].get(name);
      throw new MiniJSError(`「${name}」という変数はありません（入力の名前や綴りを確認してください）`, line);
    }
    function execBlock(body) {
      scopes.push(new Map());
      try { for (const s of body) { const r = exec(s); if (r === RETURN) return RETURN; } } finally { scopes.pop(); }
    }
    let returned;
    function exec(s) {
      tick(s.line);
      switch (s.type) {
        case "Decl": {
          const scope = scopes[scopes.length - 1];
          if (scope.has(s.name)) throw new MiniJSError(`「${s.name}」はすでに宣言されています`, s.line);
          for (const sc of scopes) if (sc.has(s.name) && sc.get(s.name).input) throw new MiniJSError(`「${s.name}」は入力データの名前なので、別の名前にしてください`, s.line);
          scope.set(s.name, { value: evaluate(s.init), constant: s.kind === "const" });
          return;
        }
        case "Assign": {
          const b = lookup(s.name, s.line);
          if (b.input) throw new MiniJSError(`入力データ「${s.name}」は書き換えられません`, s.line);
          if (b.constant) throw new MiniJSError(`const で宣言した「${s.name}」には再代入できません（変えたいなら let を使います）`, s.line);
          b.value = evaluate(s.value);
          return;
        }
        case "If": {
          const t = evaluate(s.test);
          if (typeof t !== "boolean") throw new MiniJSError("if の条件は true か false になる式にしてください", s.line);
          if (t) return execBlock(s.cons.body);
          if (s.alt) return s.alt.type === "If" ? exec(s.alt) : execBlock(s.alt.body);
          return;
        }
        case "Return": returned = s.arg ? evaluate(s.arg) : undefined; return RETURN;
        case "Block": return execBlock(s.body);
        case "ExprStmt": evaluate(s.expr); return;
      }
      throw new MiniJSError("この文は使えません", s.line);
    }
    function evaluate(e) {
      tick(e.line);
      switch (e.type) {
        case "Lit": return e.value;
        case "Id": return lookup(e.name, e.line).value;
        case "Arr": return e.items.map(evaluate);
        case "Unary": {
          const v = evaluate(e.arg);
          if (e.op === "!") {
            if (typeof v !== "boolean") throw new MiniJSError("「!」は true / false の値に使ってください", e.line);
            return !v;
          }
          if (typeof v !== "number") throw new MiniJSError("「-」は数値に使ってください", e.line);
          return -v;
        }
        case "Bin": {
          if (e.op === "&&" || e.op === "||") {
            const l = evaluate(e.left);
            if (typeof l !== "boolean") throw new MiniJSError(`「${e.op}」の左側は true / false になる式にしてください`, e.line);
            if (e.op === "&&" && !l) return false;
            if (e.op === "||" && l) return true;
            const r = evaluate(e.right);
            if (typeof r !== "boolean") throw new MiniJSError(`「${e.op}」の右側は true / false になる式にしてください`, e.line);
            return r;
          }
          const l = evaluate(e.left), r = evaluate(e.right);
          switch (e.op) {
            case "===": return l === r;
            case "!==": return l !== r;
            case "<": case ">": case "<=": case ">=":
              if (typeof l !== "number" || typeof r !== "number") throw new MiniJSError(`「${e.op}」は数値どうしで比べてください`, e.line);
              return e.op === "<" ? l < r : e.op === ">" ? l > r : e.op === "<=" ? l <= r : l >= r;
            case "+":
              if (typeof l === "number" && typeof r === "number") return l + r;
              if (typeof l === "string" || typeof r === "string") return fmt(l) + fmt(r);
              throw new MiniJSError("「+」は数値どうし、または文字列に使ってください", e.line);
            case "-": case "*": case "/": case "%":
              if (typeof l !== "number" || typeof r !== "number") throw new MiniJSError(`「${e.op}」は数値どうしで計算してください`, e.line);
              return e.op === "-" ? l - r : e.op === "*" ? l * r : e.op === "/" ? l / r : l % r;
          }
          break;
        }
        case "Member": {
          const o = evaluate(e.obj);
          if (e.prop === "length" && (typeof o === "string" || Array.isArray(o))) return o.length;
          if (o && typeof o === "object" && !Array.isArray(o)) {
            if (!Object.prototype.hasOwnProperty.call(o, e.prop)) throw new MiniJSError(`「${e.prop}」という項目はありません`, e.line);
            return o[e.prop];
          }
          throw new MiniJSError(`「.${e.prop}」はこの値には使えません`, e.line);
        }
        case "Index": {
          const o = evaluate(e.obj), i = evaluate(e.idx);
          if (Array.isArray(o) && Number.isInteger(i)) return o[i];
          throw new MiniJSError("[ ] は配列と整数の番号で使ってください", e.line);
        }
        case "Call": {
          const c = e.callee;
          if (c.type === "Member" && c.obj.type === "Id" && c.obj.name === "console" && c.prop === "log") {
            logs.push(e.args.map((a) => fmt(evaluate(a))).join(" "));
            return undefined;
          }
          if (c.type === "Member") {
            const o = evaluate(c.obj);
            const args = e.args.map(evaluate);
            if (typeof o === "string" && Object.prototype.hasOwnProperty.call(STRING_METHODS, c.prop)) return STRING_METHODS[c.prop](o, ...args);
            if (Array.isArray(o) && Object.prototype.hasOwnProperty.call(ARRAY_METHODS, c.prop)) return ARRAY_METHODS[c.prop](o, ...args);
            throw new MiniJSError(`「${c.prop}()」はこの演習では使えません`, e.line);
          }
          throw new MiniJSError("この演習で呼び出せるのは console.log と一部の文字列メソッドだけです", e.line);
        }
      }
      throw new MiniJSError("この式は使えません", e.line);
    }

    let hasReturn = false;
    for (const s of ast.body) { if (exec(s) === RETURN) { hasReturn = true; break; } }
    return { value: returned, returned: hasReturn, logs };
  }

  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function deepFreeze(v) { if (v && typeof v === "object") { Object.values(v).forEach(deepFreeze); Object.freeze(v); } return v; }

  /** テストケース群を実行し、期待結果と実際の結果を返す */
  function runTests(src, tests) {
    try { parse(src); } catch (err) { return { ok: false, compileError: err.message, results: [] }; }
    const results = tests.map((tc) => {
      try {
        const r = run(src, tc.input);
        let error = null;
        if (!r.returned) error = "return で true / false を返していません";
        else if (typeof r.value !== "boolean") error = `true / false 以外（${fmt(r.value)}）が返されました`;
        return { name: tc.name, expected: tc.expected, actual: r.returned ? r.value : undefined, pass: !error && r.value === tc.expected, error, logs: r.logs, note: tc.note, why: tc.why, input: tc.input };
      } catch (err) {
        return { name: tc.name, expected: tc.expected, actual: undefined, pass: false, error: err.message, logs: [], note: tc.note, why: tc.why, input: tc.input };
      }
    });
    return { ok: results.every((r) => r.pass), compileError: null, results };
  }

  const MiniJS = { tokenize, parse, run, runTests, MiniJSError };
  root.HL = root.HL || {};
  root.HL.MiniJS = MiniJS;
  if (typeof module !== "undefined" && module.exports) module.exports = MiniJS;
})(typeof globalThis !== "undefined" ? globalThis : this);
