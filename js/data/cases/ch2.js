/* 第2章 アクセスの境界を守る（Level 06〜10） — 登場する組織・人物・URLはすべて架空です。 */
(function (root) {
  "use strict";
  root.HL.addCases([
    // ------------------------------------------------------------------ 06
    {
      id: "case06", level: 6, chapter: 2,
      title: "隣の部屋の秘密",
      organization: "シェアハウス管理クラウド「ネストルーム」",
      client: { name: "ネストルーム開発チーム", role: "Webサービス運営" },
      summary: "入居者が自分の契約書のURLの番号を1つ変えたら、隣の部屋の入居者の契約書が表示された。ログインはちゃんとしていた。",
      request: "ログインしていない人は見られないようにしてあるのに、なぜ他人の書類が見えたのでしょう。",
      concepts: ["認証と認可", "所有者チェック"],
      lecture: {
        minutes: 4,
        principle: [
          "認証（Authentication）は「あなたは誰か」を確かめること。認可（Authorization）は「あなたはこれをしてよいか」を決めることです。名前は似ていますが、まったく別の質問です。",
          "建物で例えると、認証は玄関で住人カードを確かめること、認可は各部屋の鍵です。玄関を通れる住人でも、隣の部屋に入ってよいわけではありません。",
          "Webサービスでは、URLの番号（/contracts/102 など）を書き換えるのは誰にでもできます。だからサーバーは、ログインしているかに加えて『その書類の持ち主はこの人か』を毎回確かめる必要があります。これを所有者チェックと呼びます。",
        ],
        mechanism: {
          intro: "サーバー側で、ログイン中の利用者と書類の持ち主を比べます。",
          code: 'const user = { id: "u-101" };                 // ログイン中の人（サーバーが確認済み）\nconst doc = { id: 102, ownerId: "u-102" };    // 要求された書類\n\nconst isLoggedIn = user.id !== "";\nconst isOwner = doc.ownerId === user.id;\n\nif (isLoggedIn && isOwner) {\n  console.log("表示する");\n} else {\n  console.log("403: 見る権限がありません");\n}',
          vars: [
            ["user.id", "ログインで確かめた本人のID（URLからではなくサーバーのセッションから取る）"],
            ["doc.ownerId", "書類の持ち主のID（データベースの値）"],
            ["isOwner", "持ち主とログイン中の人が同じなら true"],
          ],
          flow: [
            "user.id のように「.」で、まとまったデータの中の項目を取り出せます。",
            "!== は「等しくない」です。",
            "URLの番号（doc.id）は利用者が自由に変えられるので、判定の根拠にはしません。",
          ],
        },
        apply: {
          look: ["アクセスログのURL番号の変化", "番号を変えたときのレスポンス（200か403か）", "サーバーのチェック内容"],
          allow: ["自分の契約書（ownerId が自分）", "管理会社が正式に共有設定した書類（共有先に自分が含まれる）"],
          block: ["ログインはしているが持ち主が別人の書類"],
        },
        quiz: [
          {
            q: "「ログインしているか」を確かめるのはどっち？",
            options: ["認証", "認可"],
            answer: 0,
            explain: ["正解。誰であるかの確認が認証です。", "認可は『その人が何をしてよいか』の判断です。"],
          },
          {
            q: "所有者チェックで使うべきIDは？",
            options: ["URLに書かれた番号", "ログインのセッションからサーバーが取り出した本人ID", "画面に表示されているユーザー名"],
            answer: 1,
            explain: ["URLは誰でも書き換えられます。", "正解。サーバーが確かめた本人IDと、データの持ち主IDを比べます。", "表示名は判定の根拠になりません。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "log", title: "アクセスログ", meta: "user=u-101（ログイン済み）", lines: ["GET /contracts/101 → 200（本人の契約書）", "GET /contracts/102 → 200（隣室 u-102 の契約書）", "GET /contracts/103 → 200（u-103 の契約書）"], key: true },
        { id: "e2", type: "code", title: "サーバーの書類表示処理（抜粋）", meta: "contracts.js", lines: ["if (session.loggedIn) {", "  return db.contracts.find(params.id);", "}"], key: true },
        { id: "e3", type: "screen", title: "入居者の報告", meta: "問い合わせフォーム", lines: ["URLの最後の数字を変えたら、知らない人の名前と口座番号が出ました"], key: true },
        { id: "e4", type: "config", title: "ログイン設定", meta: "認証", lines: ["パスワード + メール確認コード", "直近の不正ログイン: なし"], key: false, note: "認証は正しく動いていた。問題は認可側。" },
      ],
      hypotheses: [
        { id: "h1", text: "ログイン（認証）だけ確かめ、書類の持ち主（認可）を確かめていなかった", correct: true },
        { id: "h2", text: "入居者のパスワードが漏れて他人としてログインされた", correct: false, why: "ログは同じ u-101 のまま他人の書類を取得しています。" },
        { id: "h3", text: "契約書のデータベースが外部に丸ごと公開されていた", correct: false, why: "ログイン済みの利用者の要求に、処理が書類を返していました。公開設定の問題ではありません。" },
      ],
      codeTask: "書類を表示してよいかを判定してください。今のコードはログインしていれば誰の書類でも見せます。",
      inputs: [["user", "{ id, loggedIn }  ログイン中の人"], ["doc", "{ ownerId, sharedWith }  要求された書類（sharedWith は共有先IDの配列）"]],
      starterCode: 'if (user.loggedIn) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const isOwner = doc.ownerId === user.id;\nconst isShared = doc.sharedWith.includes(user.id);\n\nif (user.loggedIn && (isOwner || isShared)) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "自分の契約書", input: { user: { id: "u-101", loggedIn: true }, doc: { ownerId: "u-101", sharedWith: [] } }, expected: true },
        { name: "隣室の契約書", input: { user: { id: "u-101", loggedIn: true }, doc: { ownerId: "u-102", sharedWith: [] } }, expected: false },
        { name: "共有された書類", input: { user: { id: "u-101", loggedIn: true }, doc: { ownerId: "u-900", sharedWith: ["u-101"] } }, expected: true, note: "正式な共有は通す" },
        { name: "未ログイン", input: { user: { id: "", loggedIn: false }, doc: { ownerId: "u-101", sharedWith: [] } }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "書類表示APIを一時停止するか、所有者チェックを緊急で入れる", effect: "good", urgent: true, feedback: "穴が開いたままだと、誰でも番号を変えて見続けられます。" },
        { id: "a2", label: "アクセスログから、他人の書類を開いた記録をすべて洗い出す", effect: "good", feedback: "誰の書類が誰に見られたかで、連絡対象が決まります。" },
        { id: "a3", label: "影響を受けた入居者に事実と対応を知らせる", effect: "good", feedback: "口座番号を含むため、本人が注意できるよう知らせます。" },
        { id: "a4", label: "URLの番号をランダムな文字列に変えて、修正完了とする", effect: "bad", feedback: "推測しにくくなるだけで、URLを知った人は見られます。所有者チェックの代わりになりません。" },
      ],
      report: {
        residual: [
          { text: "ほかのAPI（請求書・鍵の受け渡し記録など）にも同じ漏れがないか点検する", correct: true },
          { text: "所有者チェックの自動テストをリリース前に必ず実行する", correct: true },
          { text: "ログイン方式を変えれば解決する", correct: false },
        ],
      },
      nova: {
        evidence: "アクセスログの user= は全部同じ人。なのにどの番号も 200 が返ってる。処理の抜粋で何を確かめているか見てみよう。",
        code: "持ち主か、正式に共有されているか。|| をカッコでくくってから && でログインとつなぐと、意味がはっきりするよ。",
      },
    },

    // ------------------------------------------------------------------ 07
    {
      id: "case07", level: 7, chapter: 2,
      title: "管理者の名札",
      organization: "フィットネス予約SaaS「ジムノート」",
      client: { name: "ジムノート セキュリティ担当 アオイ", role: "SaaS運営" },
      summary: "ある店舗のアルバイト用アカウントが、ほかの会社の店舗の会員一覧をダウンロードしていた。リクエストには role=admin と書かれていた。",
      request: "管理者だけが使える画面に、なぜアルバイトが入れたのでしょう。しかも他社のデータです。",
      concepts: ["サーバー側の役割検証", "組織の検証"],
      lecture: {
        minutes: 4,
        principle: [
          "利用者のブラウザから届くリクエストの中身は、利用者がすべて書き換えられます。画面上でボタンを隠しても、送られてくる値に『私は管理者です』と書くことはできます。これは自分で書いた名札を首から下げているのと同じです。",
          "だから役割（role）は、サーバーが自分のデータベースで確かめた値を使います。リクエストに書かれた role は参考情報にもしません。",
          "多くの会社が同じサービスを使うSaaSでは、もう一つの境界があります。それが組織（テナント）です。A社の管理者でも、B社のデータを扱ってよいわけではありません。役割と組織の両方をサーバー側で確かめます。",
        ],
        mechanism: {
          intro: "サーバーが持つ利用者情報と、操作対象の組織を突き合わせます。",
          code: 'const requestRole = "admin";                                 // リクエストに書かれた値（信用しない）\nconst serverUser = { role: "staff", orgId: "org-shibuya" }; // サーバーのDBの値\nconst targetOrgId = "org-umeda";                             // 操作対象の組織\n\nconst isAdmin = serverUser.role === "admin";\nconst sameOrg = serverUser.orgId === targetOrgId;\n\nif (isAdmin && sameOrg) {\n  console.log("会員一覧を出力");\n} else {\n  console.log("403");\n}',
          vars: [
            ["requestRole", "ブラウザから届いた役割の値。誰でも書き換えられる"],
            ["serverUser.role", "サーバーがログイン情報から調べた本当の役割"],
            ["serverUser.orgId", "その利用者が属する組織"],
            ["targetOrgId", "ダウンロードしようとしている会員一覧の組織"],
          ],
          flow: [
            "requestRole は判定に使いません。使わない値はあえて無視するのが正解です。",
            "役割の確認と組織の確認を && でつなぎ、両方そろって初めて許可します。",
          ],
        },
        apply: {
          look: ["リクエスト本文の role の値", "DB上のそのアカウントの役割と組織", "ダウンロードされた会員一覧の組織ID"],
          allow: ["自社の管理者が自社の会員一覧を出力"],
          block: ["リクエストに admin と書いただけのスタッフ", "他社の会員一覧を求める自社の管理者"],
        },
        quiz: [
          {
            q: "リクエストに role=admin と書かれていた。サーバーはどうすべき？",
            options: ["admin として扱う", "その値は無視し、DBの役割を確かめる", "role が書かれていたらエラーにして全員締め出す"],
            answer: 1,
            explain: ["利用者が書き換えた名札をそのまま信じることになります。", "正解。役割はサーバー側の記録で判断します。", "値を無視すれば十分で、正当な利用者を締め出す必要はありません。"],
          },
          {
            q: "A社の管理者がB社の会員一覧を要求した。許可すべき？",
            options: ["管理者なので許可", "組織が違うので拒否"],
            answer: 1,
            explain: ["管理者の権限は自分の組織の中だけです。", "正解。役割と組織の両方を確かめます。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "log", title: "APIリクエスト記録", meta: "account=part_kenta", lines: ["POST /api/export-members", "body: { \"role\": \"admin\", \"orgId\": \"org-umeda\" }", "→ 200 会員 1,820 件を出力"], key: true },
        { id: "e2", type: "config", title: "アカウント台帳（DB）", meta: "part_kenta", lines: ["role: staff", "orgId: org-shibuya（渋谷店のある会社）"], key: true },
        { id: "e3", type: "code", title: "出力APIの判定（抜粋）", meta: "export.js", lines: ["if (req.body.role === 'admin') { exportMembers(req.body.orgId) }"], key: true },
        { id: "e4", type: "screen", title: "管理画面のメニュー", meta: "スタッフでログイン", lines: ["『会員一覧の出力』ボタン: 非表示"], key: false, note: "画面で隠していても、APIは直接呼べる。" },
      ],
      hypotheses: [
        { id: "h1", text: "サーバーがリクエスト内の役割と組織を信じ、DBの役割・所属組織を確かめなかった", correct: true },
        { id: "h2", text: "管理者のパスワードが盗まれてログインされた", correct: false, why: "記録のアカウントはアルバイトの part_kenta のままです。" },
        { id: "h3", text: "画面のボタンが表示されてしまっていた", correct: false, why: "ボタンは非表示でした。APIを直接呼ばれています。" },
      ],
      codeTask: "会員一覧の出力を許可してよいかを判定してください。今のコードはリクエストの role を信じています。",
      inputs: [["requestRole", "リクエストに書かれた役割（信用しない）"], ["serverUser", "{ role, orgId }  サーバーの記録"], ["targetOrgId", "出力対象の組織"]],
      starterCode: 'if (requestRole === "admin") {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const isAdmin = serverUser.role === "admin";\nconst sameOrg = serverUser.orgId === targetOrgId;\n\nif (isAdmin && sameOrg) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "自社の管理者・自社データ", input: { requestRole: "admin", serverUser: { role: "admin", orgId: "org-shibuya" }, targetOrgId: "org-shibuya" }, expected: true },
        { name: "今回の名札（staff が admin と申告）", input: { requestRole: "admin", serverUser: { role: "staff", orgId: "org-shibuya" }, targetOrgId: "org-umeda" }, expected: false },
        { name: "管理者が他社データを要求", input: { requestRole: "admin", serverUser: { role: "admin", orgId: "org-shibuya" }, targetOrgId: "org-umeda" }, expected: false },
        { name: "管理者が role を書き忘れた", input: { requestRole: "", serverUser: { role: "admin", orgId: "org-umeda" }, targetOrgId: "org-umeda" }, expected: true, note: "リクエストの値に頼らないので正しく通る" },
      ],
      responseActions: [
        { id: "a1", label: "出力APIを停止し、サーバー側の役割・組織チェックを入れる", effect: "good", urgent: true, feedback: "同じ手口での出力を即座に止めます。" },
        { id: "a2", label: "org-umeda の会社に、会員情報が出力された事実を連絡する", effect: "good", feedback: "データの持ち主である会社が、会員への対応を判断します。" },
        { id: "a3", label: "part_kenta のアカウントを一時停止し、出力ファイルの行方を確認する", effect: "good", feedback: "持ち出されたファイルの削除と経緯の聞き取りを行います。" },
        { id: "a4", label: "画面のボタンをさらに見つけにくい場所に移す", effect: "bad", feedback: "画面の見た目では守れません。APIは直接呼べます。" },
      ],
      report: {
        residual: [
          { text: "ほかの管理APIもリクエスト内の役割を信じていないか点検する", correct: true },
          { text: "出力された1,820件の会員への通知方法を相手企業と決める", correct: true },
          { text: "リクエストの role を暗号化すれば安全になる", correct: false },
        ],
      },
      nova: {
        evidence: "リクエストの body と、アカウント台帳の値を見比べて。どちらが本当の役割かな？",
        code: "requestRole はあえて使わないのがポイント。4つ目のテストは、リクエストに頼っていると落ちるように作ってあるよ。",
      },
    },

    // ------------------------------------------------------------------ 08
    {
      id: "case08", level: 8, chapter: 2,
      title: "ログアウトの残像",
      organization: "市立図書館 予約システム",
      client: { name: "図書館システム係 ムラカミ", role: "公共施設のIT担当" },
      summary: "館内の共用PCでログアウトした利用者の予約履歴が、次の人に見られた。ログアウトボタンは押されていた。",
      request: "ログアウトしたのに、ブラウザの『戻る』と保存されたクッキーで前の人のページが開けたそうです。",
      concepts: ["セッション", "有効期限", "失効"],
      lecture: {
        minutes: 4,
        principle: [
          "ログインに成功すると、サーバーは『この人はログイン済み』という印を発行し、ブラウザはそれをクッキーとして持ちます。この印と、それに結びついたサーバー側の記録をセッションと呼びます。以後の操作では毎回この印を見せることで、いちいちパスワードを入れずに済みます。",
          "印は鍵と同じです。持っている人が誰であれ、本物の印なら通ってしまいます。だから印には期限を付け、ログアウトしたらサーバー側でその印を無効（失効）にする必要があります。",
          "ブラウザ側のクッキーを消すだけのログアウトは、『鍵を自分のポケットから出しただけ』で、鍵そのものは使える状態です。コピーや保存されたものがあれば、まだ扉は開きます。",
        ],
        mechanism: {
          intro: "サーバーが印を受け取ったら、記録と照らして3つを確かめます。",
          code: 'const session = { exists: true, revoked: true, expiresAt: 1080 };\nconst now = 1030; // 分単位の時刻\n\nconst notRevoked = !session.revoked;\nconst notExpired = now < session.expiresAt;\n\nif (session.exists && notRevoked && notExpired) {\n  console.log("ログイン中として扱う");\n} else {\n  console.log("ログイン画面へ");\n}',
          vars: [
            ["session.exists", "印に対応する記録がサーバーにあるか"],
            ["session.revoked", "ログアウトなどで失効させたら true"],
            ["session.expiresAt", "その印が使える最後の時刻"],
            ["now", "今の時刻"],
          ],
          flow: [
            "ログアウト時はサーバーの記録を revoked: true にします（クッキー削除だけでは不十分）。",
            "共用PCのように危険な環境では、期限を短くするのも有効です。",
            "失効と期限は別の仕組みです。どちらか一方で十分、ではありません。",
          ],
        },
        apply: {
          look: ["ログアウトの時刻と、その後同じ印が使われた時刻", "ログアウト処理がサーバー側で何をしているか", "セッションの期限設定"],
          allow: ["期限内でログアウトしていない本人の印"],
          block: ["ログアウト済み（失効）の印", "期限切れの印"],
        },
        quiz: [
          {
            q: "ログアウトでクッキーだけ消した。同じ印のコピーを持つ人は？",
            options: ["もうアクセスできない", "サーバーが失効させていなければアクセスできる"],
            answer: 1,
            explain: ["サーバーが記録を無効にしていなければ、印は有効なままです。", "正解。失効はサーバー側で行う必要があります。"],
          },
          {
            q: "session.revoked が false、now が 1100、expiresAt が 1080。ログイン中として扱う？",
            options: ["扱う", "扱わない"],
            answer: 1,
            explain: ["失効していなくても、期限を過ぎています。", "正解。now < expiresAt が false なので拒否です。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "log", title: "セッション利用記録", meta: "sid=lib_7c2…", lines: ["16:02 ログイン 利用者カード 0042", "16:20 ログアウトボタン押下", "16:24 同じ sid で /my/reservations を表示 → 200"], key: true },
        { id: "e2", type: "code", title: "ログアウト処理（抜粋）", meta: "logout.js", lines: ["res.clearCookie('sid')", "// サーバー側のセッション記録は何もしていない"], key: true },
        { id: "e3", type: "config", title: "セッション設定", meta: "現行", lines: ["有効期限: 30日", "共用PC用の短い期限: なし"], key: true },
        { id: "e4", type: "screen", title: "共用PCのブラウザ設定", meta: "館内PC-3", lines: ["閲覧履歴とキャッシュを残す設定", "終了時の自動消去: 無効"], key: false, note: "被害を広げた環境要因だが、印が使えた原因はサーバー側。" },
      ],
      hypotheses: [
        { id: "h1", text: "ログアウト時にサーバー側でセッションを失効させず、期限も30日と長かった", correct: true },
        { id: "h2", text: "次の利用者が前の人のパスワードを盗み見た", correct: false, why: "ログインは行われず、前の人と同じ sid がそのまま使われています。" },
        { id: "h3", text: "予約システムのデータベースが漏えいした", correct: false, why: "見られたのは1人分の画面で、同じ印の再利用で説明できます。" },
      ],
      codeTask: "セッションをログイン中として扱ってよいかを判定してください。今のコードは記録があれば通します。",
      inputs: [["session", "{ exists, revoked, expiresAt }"], ["now", "今の時刻（分）"]],
      starterCode: 'if (session.exists) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const notRevoked = !session.revoked;\nconst notExpired = now < session.expiresAt;\n\nif (session.exists && notRevoked && notExpired) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "期限内でログアウトしていない", input: { session: { exists: true, revoked: false, expiresAt: 1080 }, now: 1030 }, expected: true },
        { name: "ログアウト済みの印（今回）", input: { session: { exists: true, revoked: true, expiresAt: 1080 }, now: 1030 }, expected: false },
        { name: "期限切れ", input: { session: { exists: true, revoked: false, expiresAt: 1080 }, now: 1200 }, expected: false },
        { name: "存在しない印", input: { session: { exists: false, revoked: false, expiresAt: 0 }, now: 1030 }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "現在発行中のセッションをすべて失効させる", effect: "good", urgent: true, feedback: "共用PCに残った印も含めて、一度すべて無効にします。" },
        { id: "a2", label: "ログアウト処理でサーバー側の記録を失効させる修正を入れる", effect: "good", feedback: "根本原因の修正です。" },
        { id: "a3", label: "共用PCの終了時にブラウザのデータを消去する設定にする", effect: "good", feedback: "環境面の被害の広がりを抑えます。" },
        { id: "a4", label: "期限を365日に延ばして、ログインの手間を減らす", effect: "bad", feedback: "印が長く使えるほど、残像の被害は広がります。" },
      ],
      report: {
        residual: [
          { text: "ほかに失効されずに使われたセッションがないか記録を調べる", correct: true },
          { text: "閲覧された利用者0042さんに事実を伝える", correct: true },
          { text: "クッキーを使わないようにすればセッションは不要", correct: false },
        ],
      },
      nova: {
        evidence: "ログアウト後の 16:24 の記録と、ログアウト処理の中身を並べてみよう。サーバーは何を忘れているかな？",
        code: "失効と期限は別々の条件。テストで『ログアウト済み』『期限切れ』がそれぞれ別の理由で落ちることを確認しよう。",
      },
    },

    // ------------------------------------------------------------------ 09
    {
      id: "case09", level: 9, chapter: 2,
      title: "勝手に変わった通知先",
      organization: "オンライン英会話「トークリンク」",
      client: { name: "トークリンク サポート", role: "サービス運営" },
      summary: "受講者の通知先メールアドレスが、本人の知らないうちに別のアドレスへ変わっていた。直前に受講者は『無料レッスン券』のページを開いていた。",
      request: "本人はログインしたまま別のサイトを見ていただけです。うちのサイトの設定がどうして変えられたのでしょう。",
      concepts: ["CSRF", "更新操作の検証"],
      lecture: {
        minutes: 5,
        principle: [
          "ブラウザは、あるサイトにリクエストを送るとき、そのサイトのクッキーを自動で付けます。これは便利な反面、別のサイトがあなたのブラウザに『トークリンクに設定変更を送れ』と仕向けると、あなたのログイン状態付きで送られてしまうことがあります。",
          "この手口をCSRF（クロスサイト・リクエスト・フォージェリ：サイトをまたいだリクエストの偽造）と呼びます。攻撃者はあなたのクッキーを盗んでいません。あなたのブラウザに『押させている』だけです。",
          "防ぐには、更新操作のときに『このリクエストは本当に自分のサイトの画面から来たか』を確かめます。代表的なのが、自分のサイトの画面にだけ埋め込んだ秘密の値（CSRFトークン）を一緒に送らせて照合する方法と、リクエストの送信元（Origin）を確かめる方法です。クッキーに SameSite 属性を付けることも助けになります。",
        ],
        mechanism: {
          intro: "通知先の変更（更新操作）を受け付ける前に、3つを確かめます。",
          code: 'const method = "POST";\nconst origin = "https://free-lesson.example";    // 送信元\nconst ourOrigin = "https://talklink.example";\nconst sentToken = "";                             // フォームと一緒に来た値\nconst sessionToken = "csrf_91ab";                 // サーバーが画面に埋め込んだ値\n\nconst fromOurSite = origin === ourOrigin;\nconst tokenOk = sentToken !== "" && sentToken === sessionToken;\n\nif (method === "POST" && fromOurSite && tokenOk) {\n  console.log("変更する");\n}',
          vars: [
            ["origin", "リクエストを送らせたページのサイト"],
            ["sentToken", "フォームに入っていたCSRFトークン（攻撃者のページは知らない）"],
            ["sessionToken", "サーバーがこの利用者の画面に埋め込んだ値"],
            ["tokenOk", "空でなく、かつ一致していれば true"],
          ],
          flow: [
            "攻撃者のページはトークンの値を読めないので、空か違う値しか送れません。",
            "空どうしの一致を避けるため、sentToken !== \"\" も確かめます。",
            "設定の変更は GET（表示用）では受け付けず、POST だけにします。",
          ],
        },
        apply: {
          look: ["変更リクエストの Origin / Referer", "フォームにトークンが入っていたか", "変更直前に利用者が見ていたページ"],
          allow: ["自社の設定画面から、正しいトークン付きで送られた変更"],
          block: ["他サイトから自動送信された変更", "トークンが空・不一致の変更", "GETで送られた変更"],
        },
        quiz: [
          {
            q: "CSRFで攻撃者が手に入れているものは？",
            options: ["利用者のクッキー", "利用者のパスワード", "どちらも手に入れず、利用者のブラウザに送信させている"],
            answer: 2,
            explain: ["クッキーはブラウザが自動で付けるだけで、攻撃者は読めません。", "パスワードは必要ありません。", "正解。ログイン中のブラウザに、望まない操作を送らせる手口です。"],
          },
          {
            q: "sentToken が \"\"、sessionToken が \"\" の場合、tokenOk はどうあるべき？",
            options: ["true（一致している）", "false（空は無効）"],
            answer: 1,
            explain: ["空どうしの一致を許すと、トークンを送らない攻撃が通ってしまいます。", "正解。空のトークンは常に無効です。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "log", title: "設定変更リクエスト", meta: "user=student_rin", lines: ["POST /settings/notify-email", "Origin: https://free-lesson.example", "csrf_token: （なし）", "→ 200 通知先を attacker-box@mail.example に変更"], key: true },
        { id: "e2", type: "screen", title: "『無料レッスン券』ページのソース（抜粋）", meta: "free-lesson.example", lines: ["<form action=\"https://talklink.example/settings/notify-email\" method=\"POST\">", "<input name=\"email\" value=\"attacker-box@mail.example\">", "</form><script>document.forms[0].submit()</script>"], key: true },
        { id: "e3", type: "code", title: "設定変更APIの判定（抜粋）", meta: "settings.js", lines: ["if (session.loggedIn) { updateEmail(body.email) }"], key: true },
        { id: "e4", type: "log", title: "ログイン記録", meta: "student_rin", lines: ["09:00 本人の端末からログイン（いつもの場所）", "以降、別の端末からのログインなし"], key: false, note: "乗っ取りではないことを示す補足。" },
      ],
      hypotheses: [
        { id: "h1", text: "外部ページが本人のブラウザに変更を送らせ、サーバーは送信元やトークンを確かめなかった（CSRF）", correct: true },
        { id: "h2", text: "攻撃者が本人のパスワードでログインして変更した", correct: false, why: "ログインは本人の端末からの1件のみで、変更の送信元は外部ページです。" },
        { id: "h3", text: "本人が自分で通知先を入力し間違えた", correct: false, why: "変更は外部ページのフォームの自動送信によるものです。" },
      ],
      codeTask: "通知先の変更を受け付けてよいかを判定してください。今のコードはログイン中なら何でも受け付けます。",
      inputs: [["loggedIn", "ログイン中か"], ["method", "\"POST\" / \"GET\""], ["origin", "送信元"], ["ourOrigin", "自社サイト"], ["sentToken", "送られたトークン"], ["sessionToken", "サーバーの値"]],
      starterCode: 'if (loggedIn) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const fromOurSite = origin === ourOrigin;\nconst tokenOk = sentToken !== "" && sentToken === sessionToken;\n\nif (loggedIn && method === "POST" && fromOurSite && tokenOk) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "自社の設定画面から正しく送信", input: { loggedIn: true, method: "POST", origin: "https://talklink.example", ourOrigin: "https://talklink.example", sentToken: "csrf_91ab", sessionToken: "csrf_91ab" }, expected: true },
        { name: "今回の外部ページからの自動送信", input: { loggedIn: true, method: "POST", origin: "https://free-lesson.example", ourOrigin: "https://talklink.example", sentToken: "", sessionToken: "csrf_91ab" }, expected: false },
        { name: "自社からだがトークン不一致", input: { loggedIn: true, method: "POST", origin: "https://talklink.example", ourOrigin: "https://talklink.example", sentToken: "csrf_0000", sessionToken: "csrf_91ab" }, expected: false },
        { name: "空どうし", input: { loggedIn: true, method: "POST", origin: "https://talklink.example", ourOrigin: "https://talklink.example", sentToken: "", sessionToken: "" }, expected: false },
        { name: "GETでの変更", input: { loggedIn: true, method: "GET", origin: "https://talklink.example", ourOrigin: "https://talklink.example", sentToken: "csrf_91ab", sessionToken: "csrf_91ab" }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "student_rin の通知先を本人確認のうえ元に戻す", effect: "good", urgent: true, feedback: "通知先が攻撃者のままだと、パスワード再設定メールなどが奪われます。" },
        { id: "a2", label: "更新系APIにCSRFトークンと送信元の確認を入れる", effect: "good", feedback: "根本対策です。" },
        { id: "a3", label: "同じ外部ページ経由の変更が他にないかログを検索する", effect: "good", feedback: "被害者は1人とは限りません。" },
        { id: "a4", label: "student_rin のアカウントを『不正利用者』として削除する", effect: "bad", feedback: "本人は被害者です。削除は誤りで、記録も失われます。" },
      ],
      report: {
        residual: [
          { text: "クッキーに SameSite 属性を設定し、多層で防ぐ", correct: true },
          { text: "通知先変更時に、旧アドレスへも確認メールを送る", correct: true },
          { text: "HTTPSにすればCSRFは防げる", correct: false },
        ],
      },
      nova: {
        evidence: "変更リクエストの Origin を見て。トークン欄は空だね。外部ページのソースと合わせると流れが見えるはず。",
        code: "『空どうしの一致』のテストが落ちないように、sentToken !== \"\" を先に確かめておくのがコツ。",
      },
    },

    // ------------------------------------------------------------------ 10
    {
      id: "case10", level: 10, chapter: 2,
      title: "公開された企画書",
      organization: "広告制作会社「アトリエ・ミナミ」",
      client: { name: "プロデューサー ミナミ", role: "制作会社" },
      summary: "未発表の新商品の企画書が、SNSで画像付きで出回った。共有リンクは『リンクを知っている全員』の設定で、期限もなかった。",
      request: "取引先の担当者1人に送っただけなのに、なぜ広がったのでしょう。今後どう共有すればいいですか。",
      concepts: ["共有範囲", "受信者", "期限"],
      lecture: {
        minutes: 4,
        principle: [
          "クラウドのファイル共有には、大きく分けて『リンクを知っている全員』と『指定した人だけ』の設定があります。前者はリンクそのものが鍵です。メールの転送、チャットへの貼り付け、スクリーンショットで、リンクは簡単に広がります。",
          "『指定した人だけ』にすると、リンクを開いた人がログインして、その人が受信者の一覧に入っているかが確かめられます。リンクが転送されても、受信者でなければ開けません。",
          "さらに期限を付けると、プロジェクトが終わった後や担当者が異動した後に、共有が残り続けるのを防げます。共有は『誰に・いつまで』をセットで決めます。",
        ],
        mechanism: {
          intro: "共有リンクが開かれたとき、共有設定に従って判定します。",
          code: 'const share = {\n  mode: "restricted",                  // "anyone" か "restricted"\n  recipients: ["sato@client.example"], // 受信者\n  expiresAt: 2400                      // 期限（時刻）\n};\nconst viewerEmail = "someone@sns.example";\nconst now = 1500;\n\nconst isRecipient = share.recipients.includes(viewerEmail);\nconst notExpired = now < share.expiresAt;\n\nif (share.mode === "restricted" && isRecipient && notExpired) {\n  console.log("表示");\n}',
          vars: [
            ["share.mode", "共有範囲。anyone はリンクだけで開ける"],
            ["share.recipients", "見てよい人のメールアドレス一覧"],
            ["viewerEmail", "リンクを開いてログインした人"],
            ["share.expiresAt", "共有の期限"],
          ],
          flow: [
            "リンクを持っていること自体は、判定の条件にしません。",
            "受信者一覧に入っていて、期限内であることを両方確かめます。",
          ],
        },
        apply: {
          look: ["共有設定の範囲と期限", "閲覧記録に出てくる人の数と所属", "最初に共有した相手と送信方法"],
          allow: ["受信者として指定された取引先担当者が期限内に閲覧"],
          block: ["リンクを転送された第三者", "期限切れ後の閲覧"],
        },
        quiz: [
          {
            q: "『リンクを知っている全員』の共有で、リンクが転送されたら？",
            options: ["転送先の人も開ける", "最初の受信者以外は開けない"],
            answer: 0,
            explain: ["正解。リンクそのものが鍵として働きます。", "その制限をするのが『指定した人だけ』の設定です。"],
          },
          {
            q: "共有に期限を付ける主な理由は？",
            options: ["ファイルが壊れないように", "役目を終えた共有が残り続けないように"],
            answer: 1,
            explain: ["期限はファイルの保護とは関係ありません。", "正解。異動やプロジェクト終了後の『消し忘れ』を防ぎます。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "config", title: "企画書の共有設定", meta: "新商品_企画書_v3.pdf", lines: ["共有範囲: リンクを知っている全員", "権限: 閲覧・ダウンロード可", "期限: なし"], key: true },
        { id: "e2", type: "log", title: "閲覧記録", meta: "直近7日", lines: ["10/01 sato@client.example（取引先）", "10/03 匿名の閲覧者 ×3", "10/06〜 匿名の閲覧者 ×212"], key: true },
        { id: "e3", type: "chat", title: "取引先からの連絡", meta: "サトウさん", lines: ["社内の企画会議用に、リンクを部署のチャットに貼りました", "そのチャットには外部の協力会社の方も入っています"], key: true },
        { id: "e4", type: "screen", title: "SNSの投稿", meta: "10/06", lines: ["『〇〇社の新商品、これらしい』（企画書の1ページ目の画像）"], key: false, note: "流出の結果。経路を示すのは e1〜e3。" },
      ],
      hypotheses: [
        { id: "h1", text: "誰でも開ける期限なしリンクが転送され、受信者以外に広がった", correct: true },
        { id: "h2", text: "アトリエ・ミナミのクラウドアカウントが乗っ取られた", correct: false, why: "閲覧は共有リンク経由の匿名閲覧です。アカウントへの不正ログインの記録はありません。" },
        { id: "h3", text: "取引先のサトウさんが意図的にSNSに投稿した", correct: false, why: "サトウさんは社内チャットに貼っただけで、閲覧者はその後に急増しています。" },
      ],
      codeTask: "共有ファイルを表示してよいかを判定してください。今のコードはリンクを持っていれば誰でも表示します。",
      inputs: [["hasLink", "リンクを持っているか"], ["share", "{ mode, recipients, expiresAt }"], ["viewerEmail", "閲覧者のメール"], ["now", "今の時刻"]],
      starterCode: 'if (hasLink) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const isRecipient = share.recipients.includes(viewerEmail);\nconst notExpired = now < share.expiresAt;\n\nif (share.mode === "restricted" && isRecipient && notExpired) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "指定した受信者が期限内に閲覧", input: { hasLink: true, share: { mode: "restricted", recipients: ["sato@client.example"], expiresAt: 2400 }, viewerEmail: "sato@client.example", now: 1500 }, expected: true },
        { name: "転送された第三者", input: { hasLink: true, share: { mode: "restricted", recipients: ["sato@client.example"], expiresAt: 2400 }, viewerEmail: "partner@other.example", now: 1500 }, expected: false },
        { name: "受信者でも期限切れ", input: { hasLink: true, share: { mode: "restricted", recipients: ["sato@client.example"], expiresAt: 2400 }, viewerEmail: "sato@client.example", now: 2500 }, expected: false },
        { name: "誰でも共有の設定（今回）", input: { hasLink: true, share: { mode: "anyone", recipients: [], expiresAt: 99999 }, viewerEmail: "someone@sns.example", now: 1500 }, expected: false, note: "機密ファイルでは anyone を許さない" },
      ],
      responseActions: [
        { id: "a1", label: "共有リンクを無効にし、受信者限定で作り直す", effect: "good", urgent: true, feedback: "出回っているリンクからの閲覧を止めます。" },
        { id: "a2", label: "発表前の商品を持つクライアントへ流出の事実を報告する", effect: "good", feedback: "クライアントが発表時期などを判断する材料になります。" },
        { id: "a3", label: "SNS運営に、権利侵害として画像の削除を申請する", effect: "good", feedback: "完全には消せなくても、拡散を減らせます。" },
        { id: "a4", label: "企画書のファイル名を変えて、同じリンクのまま共有を続ける", effect: "bad", feedback: "ファイル名を変えてもリンクは有効なままです。" },
      ],
      report: {
        residual: [
          { text: "すでにダウンロードされた複製は回収できない前提で影響を評価する", correct: true },
          { text: "社内の共有設定の初期値を『指定した人だけ・期限付き』にする", correct: true },
          { text: "リンクを無効にしたので流出は完全に取り消せた", correct: false },
        ],
      },
      nova: {
        evidence: "閲覧記録の人数の増え方と、取引先からの連絡の日時を並べて。リンクがどこで広がったか見えるかも。",
        code: "mode が anyone のときは受信者一覧が空でも通ってしまわないように。テスト4がその確認だよ。",
      },
    },
  ]);
})(typeof globalThis !== "undefined" ? globalThis : this);
