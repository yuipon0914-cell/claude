/* 基礎実践 — 動画コースとは独立した、小さなコード演習。どれからでも始められる。 */
(function (root) {
  "use strict";
  const HL = (root.HL = root.HL || {});

  HL.BASICS = [
    {
      id: "b01", topic: "変数", title: "名札を作る（const と ===）",
      explain: "const で値に名前を付け、=== で比べます。codename が \"NOVA\" と完全に同じときだけ true を返してください。",
      inputs: [["codename", "コードネーム（文字列）"]],
      starterCode: 'const expected = "NOVA";\nconsole.log("受け取った名前:", codename);\n\n// ここで比べた結果を return してください\nreturn false;',
      solutionCode: 'const expected = "NOVA";\nreturn codename === expected;',
      tests: [
        { name: "NOVA", input: { codename: "NOVA" }, expected: true },
        { name: "nova（小文字）", input: { codename: "nova" }, expected: false, note: "=== は大文字と小文字も区別する" },
        { name: "NOVA2", input: { codename: "NOVA2" }, expected: false },
      ],
      hint: "return codename === expected; のように、比べた結果（true / false）をそのまま返せます。",
    },
    {
      id: "b02", topic: "変数", title: "ひっくり返す（true / false と !）",
      explain: "isLocked はドアに鍵がかかっていれば true です。『ドアが開いているか』を返してください。",
      inputs: [["isLocked", "鍵がかかっているか（true/false）"]],
      starterCode: 'return isLocked;',
      solutionCode: 'const isOpen = !isLocked;\nreturn isOpen;',
      tests: [
        { name: "鍵あり", input: { isLocked: true }, expected: false },
        { name: "鍵なし", input: { isLocked: false }, expected: true },
      ],
      hint: "! は true と false を入れ替えます。",
    },
    {
      id: "b03", topic: "条件分岐", title: "年齢で分ける（if / else）",
      explain: "age が 18 以上なら true、そうでなければ false を、if と else を使って返してください。",
      inputs: [["age", "年齢（数値）"]],
      starterCode: 'if (age > 18) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'if (age >= 18) {\n  return true;\n} else {\n  return false;\n}',
      tests: [
        { name: "20歳", input: { age: 20 }, expected: true },
        { name: "18歳ちょうど", input: { age: 18 }, expected: true, note: "境界の値は特に間違えやすい" },
        { name: "17歳", input: { age: 17 }, expected: false },
      ],
      hint: "> は『より大きい』、>= は『以上』です。",
    },
    {
      id: "b04", topic: "条件分岐", title: "両方そろったら（&&）",
      explain: "会員（isMember）で、かつクーポンが期限内（couponValid）のときだけ割引できます。",
      inputs: [["isMember", "会員か"], ["couponValid", "クーポンが有効か"]],
      starterCode: 'if (isMember || couponValid) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'if (isMember && couponValid) {\n  return true;\n} else {\n  return false;\n}',
      tests: [
        { name: "会員・有効", input: { isMember: true, couponValid: true }, expected: true },
        { name: "会員・期限切れ", input: { isMember: true, couponValid: false }, expected: false },
        { name: "非会員・有効", input: { isMember: false, couponValid: true }, expected: false },
      ],
      hint: "|| は『どちらか』、&& は『両方』です。",
    },
    {
      id: "b05", topic: "通信", title: "どこへ送る？（URLのホスト名）",
      explain: "データを送ってよいのは、https で、ホスト名が \"api.hackerlab.example\" と完全に一致するときだけです。",
      inputs: [["protocol", "\"https:\" など"], ["host", "送り先のホスト名"]],
      starterCode: 'if (host.includes("hackerlab")) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const isHttps = protocol === "https:";\nconst isOurApi = host === "api.hackerlab.example";\nreturn isHttps && isOurApi;',
      tests: [
        { name: "正しいAPI", input: { protocol: "https:", host: "api.hackerlab.example" }, expected: true },
        { name: "似たホスト", input: { protocol: "https:", host: "api.hackerlab.example.evil.example" }, expected: false },
        { name: "暗号化なし", input: { protocol: "http:", host: "api.hackerlab.example" }, expected: false },
      ],
      hint: "includes は一部が含まれるか、=== は全体が同じか。",
    },
    {
      id: "b06", topic: "認証", title: "本人か？（パスワード + 2つ目の要素）",
      explain: "passwordOk と codeOk の両方が true のときだけログインを許可します。さらに、ロックされたアカウント（locked）は通しません。",
      inputs: [["passwordOk", "パスワード一致"], ["codeOk", "確認コード一致"], ["locked", "アカウントがロック中か"]],
      starterCode: 'return passwordOk;',
      solutionCode: 'return passwordOk && codeOk && !locked;',
      tests: [
        { name: "両方OK", input: { passwordOk: true, codeOk: true, locked: false }, expected: true },
        { name: "コード違い", input: { passwordOk: true, codeOk: false, locked: false }, expected: false },
        { name: "ロック中", input: { passwordOk: true, codeOk: true, locked: true }, expected: false },
      ],
      hint: "3つの条件を && でつなぎ、locked には ! を付けます。",
    },
    {
      id: "b07", topic: "認可", title: "してよいか？（持ち主 または 管理者）",
      explain: "メモを削除できるのは、メモの持ち主（note.ownerId === user.id）か、管理者（user.role === \"admin\"）だけです。",
      inputs: [["user", "{ id, role }"], ["note", "{ ownerId }"]],
      starterCode: 'return user.id !== "";',
      solutionCode: 'const isOwner = note.ownerId === user.id;\nconst isAdmin = user.role === "admin";\nreturn isOwner || isAdmin;',
      tests: [
        { name: "持ち主", input: { user: { id: "u1", role: "member" }, note: { ownerId: "u1" } }, expected: true },
        { name: "管理者", input: { user: { id: "u9", role: "admin" }, note: { ownerId: "u1" } }, expected: true },
        { name: "他人", input: { user: { id: "u2", role: "member" }, note: { ownerId: "u1" } }, expected: false },
      ],
      hint: "ログインしているか（認証）と、してよいか（認可）は別の質問です。",
    },
    {
      id: "b08", topic: "認可", title: "期限つきの鍵（数値の比較）",
      explain: "招待コードは、今の時刻 now が期限 expiresAt より前で、まだ使われていない（used が false）ときだけ有効です。",
      inputs: [["now", "今の時刻"], ["expiresAt", "期限"], ["used", "使用済みか"]],
      starterCode: 'return now <= expiresAt;',
      solutionCode: 'return now < expiresAt && !used;',
      tests: [
        { name: "期限内・未使用", input: { now: 100, expiresAt: 200, used: false }, expected: true },
        { name: "期限ちょうど", input: { now: 200, expiresAt: 200, used: false }, expected: false, note: "期限の時刻になったら無効" },
        { name: "使用済み", input: { now: 100, expiresAt: 200, used: true }, expected: false },
      ],
      hint: "< と <= の違いが境界のテストに現れます。",
    },
  ];

  if (typeof module !== "undefined" && module.exports) module.exports = HL;
})(typeof globalThis !== "undefined" ? globalThis : this);
