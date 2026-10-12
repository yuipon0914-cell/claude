/* 第1章 身近な罠を見抜く（Level 01〜05） — 登場する組織・人物・URLはすべて架空です。 */
(function (root) {
  "use strict";
  root.HL.addCases([
    // ------------------------------------------------------------------ 01
    {
      id: "case01", level: 1, chapter: 1,
      title: "偽りの当選通知",
      organization: "ミナト商店街アプリ運営室",
      client: { name: "ハルカ", role: "商店街アプリの利用者" },
      summary: "「抽選で3万円分のクーポンに当選」というDMを開いた利用者から、カード情報を入れてしまったかもしれないと相談が届いた。",
      request: "商店街アプリの公式アカウントからだと思ってDMのリンクを開き、「受け取り手数料300円」のためにカード番号を入力しました。本物だったのか、何を確認すべきだったのか知りたいです。",
      concepts: ["偽DM", "URL", "変数", "条件分岐"],
      lecture: {
        minutes: 4,
        principle: [
          "メッセージの「差出人の名前」や「アイコン」は、送る側が自由に決められる飾りです。本物の運営とそっくりな名前を付けたアカウントは誰でも作れます。だから名前ではなく、確かめられる事実で判断します。",
          "確かめられる事実の代表がURL（インターネット上の住所）です。URLのうち「どこのサーバーか」を表す部分をホスト名と呼びます。公式サイトのホスト名は、アプリの設定画面や公式サイトのお知らせなど、前から知っている場所で確認できます。",
          "もう一つの事実は「何を求めてきたか」です。当選したのにお金やカード番号を求める、急がせる、という要求は、それだけで立ち止まる理由になります。",
        ],
        mechanism: {
          intro: "判断を小さなプログラムにすると、「事実を変数に入れる → 条件で分岐する」という2段階になります。",
          code: 'const linkHost = "minato-coupon.prize-get.example"; // DMのリンク先\nconst officialHost = "app.minato-shop.example";      // 公式のホスト名\nconst isOfficialHost = linkHost === officialHost;      // 完全に一致するか\n\nif (isOfficialHost && !asksPayment) {\n  console.log("公式の案内として確認を続ける");\n} else {\n  console.log("開かずに公式窓口で確認する");\n}',
          vars: [
            ["linkHost", "DMに書かれたリンクのホスト名（どこのサーバーか）"],
            ["officialHost", "アプリ設定など、前から知っている場所で確認した公式ホスト名"],
            ["isOfficialHost", "2つが完全に同じなら true、違えば false"],
            ["asksPayment", "お金やカード番号を求めているなら true"],
          ],
          flow: [
            "const は「この名前の箱に値を入れて、あとで変えない」という宣言です。",
            "=== は左右が完全に同じかを調べ、true（はい）か false（いいえ）を返します。",
            "&& は「両方とも true のときだけ true」、! は true と false をひっくり返します。",
            "if (条件) { … } else { … } は、条件が true なら上、false なら下の処理を選びます。",
          ],
        },
        apply: {
          look: ["DM本文のリンク先ホスト名", "アプリ設定に載っている公式ホスト名", "DMが求めている操作（支払い・入力）"],
          allow: ["ホスト名が公式と完全一致し、支払いや秘密情報を求めていないお知らせ"],
          block: ["名前に「minato」が入っているだけの別ホスト", "公式ホストでも当選の受け取りに手数料を求める案内（運営に別経路で確認）"],
        },
        quiz: [
          {
            q: "DMの差出人名が「ミナト商店街【公式】」でした。これだけで本物と判断できますか？",
            options: ["できる。公式と書いてある", "できない。表示名は誰でも自由に付けられる", "アイコンも同じなら確実に本物"],
            answer: 1,
            explain: ["表示名は送る側が自由に決められます。「公式」という文字も入れ放題です。", "正解。名前やアイコンは飾りなので、ホスト名や要求内容など確かめられる事実で判断します。", "アイコン画像もコピーできます。見た目の一致は証拠になりません。"],
          },
          {
            q: "const isOfficialHost = linkHost === officialHost; で linkHost が \"minato-shop.prize.example\"、officialHost が \"app.minato-shop.example\" のとき、isOfficialHost は？",
            options: ["true", "false", "エラーになる"],
            answer: 1,
            explain: ["文字の一部が似ていても、=== は完全一致しか true にしません。", "正解。似ている部分があっても、全体が違えば false です。", "文字列どうしの比較なのでエラーにはならず、false が入ります。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "chat", title: "届いたDM", meta: "差出人: ミナト商店街【公式】 / 10:42", lines: ["🎉おめでとうございます！抽選で3万円分のクーポンに当選しました", "本日23:59までに受け取り手続きをしてください", "→ https://minato-coupon.prize-get.example/claim", "※受け取り手数料300円をカードでお支払いください"], key: true },
        { id: "e2", type: "config", title: "アプリ設定 > 公式情報", meta: "アプリ内に固定表示", lines: ["公式サイト: https://app.minato-shop.example", "公式アカウントID: @minato_shop_official（認証バッジあり）", "当選のお知らせはアプリ内『お知らせ』にのみ掲載します", "当選者に手数料を請求することはありません"], key: true },
        { id: "e3", type: "screen", title: "DM差出人のプロフィール", meta: "スクリーンショット", lines: ["表示名: ミナト商店街【公式】", "ID: @minato_shop_0fficial（ゼロが入っている）", "作成日: 3日前 / 認証バッジなし"], key: true },
        { id: "e4", type: "log", title: "アプリのお知らせ一覧", meta: "直近30日", lines: ["10/01 秋の商店街スタンプラリー開催", "10/05 一部店舗の営業時間変更", "（当選に関するお知らせはなし）"], key: false, note: "当選のお知らせがないことは参考になるが、偽DMだと示す直接の決め手はe2・e3。" },
      ],
      hypotheses: [
        { id: "h1", text: "公式に似せた別アカウントが、公式ではないホストへ誘導してカード情報を集めた", correct: true },
        { id: "h2", text: "公式アカウントが乗っ取られ、本物の公式サイトで手数料が請求された", correct: false, why: "差出人IDは公式と違い（0とo）、リンク先も公式ホストではありません。" },
        { id: "h3", text: "本物のキャンペーンで、手数料の支払いは正しい手続きだった", correct: false, why: "公式情報には「当選者に手数料を請求しない」と明記されています。" },
      ],
      codeTask: "DMのリンクを「開いて確認を続けてよいか」を判定してください。今のコードは名前に minato が入っていれば許可してしまいます。",
      inputs: [["linkHost", "DMのリンクのホスト名（文字列）"], ["officialHost", "公式ホスト名（文字列）"], ["asksPayment", "支払いやカード番号を求めているか（true/false）"]],
      starterCode: 'const looksOfficial = linkHost.includes("minato");\n\nif (looksOfficial) {\n  console.log("許可:", linkHost);\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const isOfficialHost = linkHost === officialHost;\n\nif (isOfficialHost && !asksPayment) {\n  console.log("許可:", linkHost);\n  return true;\n} else {\n  console.log("停止:", linkHost);\n  return false;\n}',
      testCases: [
        { name: "公式ホストのお知らせ", input: { linkHost: "app.minato-shop.example", officialHost: "app.minato-shop.example", asksPayment: false }, expected: true, note: "正しい案内は開けるべき" },
        { name: "今回のDM（似せたホスト・手数料）", input: { linkHost: "minato-coupon.prize-get.example", officialHost: "app.minato-shop.example", asksPayment: true }, expected: false },
        { name: "名前を含む別ホスト・支払いなし", input: { linkHost: "minato-shop.example.login-check.example", officialHost: "app.minato-shop.example", asksPayment: false }, expected: false, note: "前半が公式に見えても全体は別物" },
        { name: "公式ホストなのに支払い要求", input: { linkHost: "app.minato-shop.example", officialHost: "app.minato-shop.example", asksPayment: true }, expected: false, note: "当選で支払いは求めない方針。別経路で確認" },
      ],
      responseActions: [
        { id: "a1", label: "カード会社に連絡して利用停止・再発行を依頼する", effect: "good", urgent: true, feedback: "入力したカード番号はすでに相手の手元にあります。最優先で止めます。" },
        { id: "a2", label: "DMとプロフィールの画面を保存してから運営に通報する", effect: "good", feedback: "証拠を残してから通報すると、運営が同じアカウントを止めやすくなります。" },
        { id: "a3", label: "DMの差出人に「本物ですか？」と返信して確かめる", effect: "bad", feedback: "相手は偽物なので「本物です」と答えるだけです。確認は公式の連絡先で行います。" },
        { id: "a4", label: "アプリ内のお知らせで、注意喚起が出ているか確認する", effect: "neutral", feedback: "参考にはなりますが、カードを止める対応の代わりにはなりません。" },
      ],
      report: {
        residual: [
          { text: "カードの利用明細を数か月確認し、身に覚えのない請求がないか見る", correct: true },
          { text: "同じ手口のDMがほかの利用者にも届いていないか運営が確認する", correct: true },
          { text: "これで被害は完全に終わったので追加の確認は不要", correct: false },
        ],
      },
      nova: {
        evidence: "差出人の『表示名』と『ID』を分けて見比べてみて。アプリ設定に載っているIDと一文字ずつ比べると何か見つかるかも。",
        code: "includes は『一部が含まれるか』、=== は『全体が同じか』。偽物は公式の文字を一部に混ぜてくるよ。正しい案内を止めないことも忘れずに。",
      },
    },

    // ------------------------------------------------------------------ 02
    {
      id: "case02", level: 2, chapter: 1,
      title: "配送先のない荷物",
      organization: "クロネコビン宅配（架空）",
      client: { name: "タケル", role: "宅配サービスの利用者" },
      summary: "「お届け先不明のため保管中」というSMSのリンクは鍵マーク付き。安全だと思ってログインしたら、別のサービスのアカウントが乗っ取られた。",
      request: "SMSのリンク先は https で鍵マークも出ていました。だから安全なサイトだと思ったのですが、なぜ盗まれたのでしょうか。",
      concepts: ["ホスト名", "HTTPSと運営者確認の違い"],
      lecture: {
        minutes: 4,
        principle: [
          "HTTPSの鍵マークが保証するのは「あなたの端末と、今つながっているサーバーの間の通信が暗号化されている」ことです。途中で誰かに盗み見されにくい、という意味です。",
          "ところが鍵マークは「そのサーバーを誰が運営しているか」までは教えてくれません。偽サイトの運営者も、自分のホスト名に対する証明書を簡単に取得できます。つまり、偽サイトとの通信が安全に暗号化されているだけ、ということが起こります。",
          "だから見るべきは「ホスト名が、運営者の持っているドメインか」です。ドメインの持ち主は、右側（末尾）から読むと分かります。track.kuroneko-bin.example は kuroneko-bin.example の一部ですが、kuroneko-bin.example.parcel-help.example は parcel-help.example の持ち物です。",
        ],
        mechanism: {
          intro: "URLを部品に分けると、判定に使う値がはっきりします。",
          code: 'const protocol = "https:";                    // 通信の方式\nconst hostname = "kuroneko-bin.example.parcel-help.example";\nconst operatorDomain = "kuroneko-bin.example"; // 運営者のドメイン\n\nconst isEncrypted = protocol === "https:";\nconst isOperator = hostname === operatorDomain ||\n  hostname.endsWith("." + operatorDomain);\n\nconsole.log(isEncrypted, isOperator); // true false',
          vars: [
            ["protocol", "通信の方式。https: なら暗号化される"],
            ["hostname", "接続先サーバーの名前。末尾から読む"],
            ["operatorDomain", "運営者が本当に持っているドメイン（公式アプリや請求書で確認）"],
            ["isOperator", "運営者のドメインそのもの、またはその下の名前なら true"],
          ],
          flow: [
            "endsWith(\"...\") は文字列がその文字で終わるかを調べます。",
            "\".\" + operatorDomain のように点を付けて比べるのは、evil-kuroneko-bin.example のような『くっつけた偽物』を除くためです。",
            "|| は「どちらか一方でも true なら true」です。",
            "暗号化（isEncrypted）と運営者（isOperator）は別の質問なので、両方を && でつなぎます。",
          ],
        },
        apply: {
          look: ["SMSのリンクのホスト名を末尾から読む", "公式アプリに登録されている運営ドメイン", "証明書が誰のホスト名に対して発行されたか"],
          allow: ["https で、ホスト名が kuroneko-bin.example またはその下（track.kuroneko-bin.example など）"],
          block: ["鍵マークはあるが末尾が別ドメイン", "運営ドメインでも http（暗号化なし）でログインを求める"],
        },
        quiz: [
          {
            q: "鍵マーク（HTTPS）が表示されているとき、確実に言えることは？",
            options: ["そのサイトは公式の運営者のもの", "通信が暗号化されている", "サイトにウイルスがない"],
            answer: 1,
            explain: ["偽サイトも自分のホスト名で証明書を取れます。運営者の確認は別に必要です。", "正解。暗号化の保証であって、相手が誰かの保証ではありません。", "鍵マークはサイトの中身の安全性とは関係ありません。"],
          },
          {
            q: "運営ドメインが kuroneko-bin.example のとき、運営者のホストはどれ？",
            options: ["kuroneko-bin.example.parcel-help.example", "my-kuroneko-bin.example", "track.kuroneko-bin.example"],
            answer: 2,
            explain: ["末尾は parcel-help.example。別の持ち主です。", "末尾は my-kuroneko-bin.example という別のドメインです。点で区切られていません。", "正解。末尾が .kuroneko-bin.example なので、運営者のドメインの下にあります。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "chat", title: "受信したSMS", meta: "送信元: +81-50-XXXX-0123", lines: ["【クロネコビン】お届け先不明のため保管中です。", "再配達: https://kuroneko-bin.example.parcel-help.example/redelivery"], key: true },
        { id: "e2", type: "screen", title: "偽サイトの証明書情報", meta: "ブラウザの詳細表示", lines: ["接続: 暗号化されています", "発行先: kuroneko-bin.example.parcel-help.example", "発行日: 2日前（自動発行の無料証明書）"], key: true },
        { id: "e3", type: "config", title: "公式アプリ > 会社情報", meta: "インストール済みアプリ", lines: ["運営ドメイン: kuroneko-bin.example", "追跡ページ: https://track.kuroneko-bin.example", "SMSでIDやパスワードの入力を求めることはありません"], key: true },
        { id: "e4", type: "log", title: "タケルさんのログイン履歴（別サービス）", meta: "ShopNet（架空）", lines: ["10/08 21:14 ログイン成功 IP 203.0.113.50（初めての場所）", "10/08 21:16 登録メールアドレス変更"], key: false, note: "被害の結果を示す。原因（偽サイトの判別）を直接示すのはe1〜e3。" },
      ],
      hypotheses: [
        { id: "h1", text: "鍵マーク付きの偽サイトで、公式に見える文字列を前半に含むホスト名にだまされた", correct: true },
        { id: "h2", text: "HTTPSの暗号が破られて、通信の途中でパスワードを盗まれた", correct: false, why: "通信は正しく暗号化されていました。問題は暗号化された通信の相手が偽サイトだったことです。" },
        { id: "h3", text: "クロネコビン公式サーバーがハッキングされた", correct: false, why: "リンク先は公式ドメインの外（parcel-help.example）でした。" },
      ],
      codeTask: "ログインしてよいリンクかを判定してください。今のコードは https であれば何でも許可します。",
      inputs: [["protocol", "\"https:\" または \"http:\""], ["hostname", "接続先のホスト名"], ["operatorDomain", "運営者のドメイン"]],
      starterCode: 'const isEncrypted = protocol === "https:";\n\nif (isEncrypted) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const isEncrypted = protocol === "https:";\nconst isOperator = hostname === operatorDomain || hostname.endsWith("." + operatorDomain);\n\nif (isEncrypted && isOperator) {\n  return true;\n} else {\n  console.log("止める:", hostname);\n  return false;\n}',
      testCases: [
        { name: "公式の追跡ページ", input: { protocol: "https:", hostname: "track.kuroneko-bin.example", operatorDomain: "kuroneko-bin.example" }, expected: true },
        { name: "公式ドメインそのもの", input: { protocol: "https:", hostname: "kuroneko-bin.example", operatorDomain: "kuroneko-bin.example" }, expected: true },
        { name: "今回のSMS（鍵付き偽サイト）", input: { protocol: "https:", hostname: "kuroneko-bin.example.parcel-help.example", operatorDomain: "kuroneko-bin.example" }, expected: false },
        { name: "くっつけた偽ドメイン", input: { protocol: "https:", hostname: "my-kuroneko-bin.example", operatorDomain: "kuroneko-bin.example" }, expected: false },
        { name: "公式ドメインでも暗号化なし", input: { protocol: "http:", hostname: "track.kuroneko-bin.example", operatorDomain: "kuroneko-bin.example" }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "入力したパスワードを、使っているすべてのサービスで変更する", effect: "good", urgent: true, feedback: "偽サイトに入れたパスワードは漏れた前提で扱います。" },
        { id: "a2", label: "乗っ取られたサービスの公式窓口に連絡し、メールアドレスを戻す", effect: "good", urgent: true, feedback: "登録メールが変わると回復が難しくなるため、早めに公式窓口へ。" },
        { id: "a3", label: "鍵マークがあったので通信は安全だったと判断し、様子を見る", effect: "bad", feedback: "鍵マークは相手が本物かを保証しません。入力した情報は相手に届いています。" },
        { id: "a4", label: "SMSを迷惑メッセージとして報告する", effect: "neutral", feedback: "ほかの人の被害を減らす助けになります。" },
      ],
      report: {
        residual: [
          { text: "ほかのサービスでも同じパスワードを使っていないか洗い出す", correct: true },
          { text: "HTTPSは危険なので今後は使わないようにする", correct: false },
          { text: "公式アプリから再配達を確認する習慣をつける", correct: true },
        ],
      },
      nova: {
        evidence: "証明書の『発行先』と、公式アプリの『運営ドメイン』を並べてみよう。ホスト名は右から読むのがコツ。",
        code: "暗号化かどうかと、運営者かどうかは別の質問。2つの変数に分けて && でつなぐと読みやすいよ。endsWith に点を付ける理由も考えてみて。",
      },
    },

    // ------------------------------------------------------------------ 03
    {
      id: "case03", level: 3, chapter: 1,
      title: "使い回された合鍵",
      organization: "レシピ投稿サイト「ナベノコ」",
      client: { name: "ナベノコ運営チーム", role: "サポート担当" },
      summary: "人気投稿者のアカウントが乗っ取られ、勝手に宣伝投稿が並んだ。ナベノコ自体のシステムには侵入の痕跡がない。",
      request: "うちのサーバーには侵入の跡がないのに、正しいパスワードでログインされています。どうやって鍵が漏れたのか、新規登録時に防げることはないか調べてください。",
      concepts: ["パスワードの使い回し", "資格情報漏えい"],
      lecture: {
        minutes: 4,
        principle: [
          "IDとパスワードの組を「資格情報」と呼びます。どこか一つのサービスから資格情報が漏れると、攻撃者はその組を大量に持ち出し、ほかのサービスに順番に試します。これをクレデンシャル・スタッフィング（資格情報の詰め込み）といいます。",
          "同じパスワードを複数のサービスで使っていると、まったく関係のないサイトの漏えいが、自分の別のアカウントの合鍵になってしまいます。ナベノコが何もミスをしていなくても、ログインは「正しいパスワード」で成功するのです。",
          "サービス側にできることは、既知の漏えいリストに載ったパスワードや、短すぎるパスワードを登録させないこと、そして多要素認証を勧めることです。利用者側の基本は、サービスごとに違うパスワードを使い、パスワード管理ツールに覚えさせることです。",
        ],
        mechanism: {
          intro: "新しいパスワードを受け付けるかどうかを、3つの条件で判定します。",
          code: 'const newPassword = "nabe2024";\nconst leakedList = ["password123", "nabe2024", "qwerty"]; // 漏えい済み\nconst isLongEnough = newPassword.length >= 12;\nconst isLeaked = leakedList.includes(newPassword);\n\nif (isLongEnough && !isLeaked) {\n  console.log("登録できます");\n} else {\n  console.log("別のパスワードにしてください");\n}',
          vars: [
            ["newPassword", "利用者が登録しようとしているパスワード"],
            ["leakedList", "過去の漏えいで出回っているパスワードの一覧（実際は安全な照合方式で確認する）"],
            ["isLongEnough", "12文字以上なら true"],
            ["isLeaked", "漏えい一覧に入っていれば true"],
          ],
          flow: [
            ".length は文字数、>= は「以上」です。",
            "配列.includes(値) は、その値が一覧に入っているかを true / false で返します。",
            "!isLeaked は「漏えい一覧に入っていない」という意味になります。",
            "実際のサービスはパスワードをそのまま保存・比較せず、ハッシュ化などで保護します。ここでは考え方だけを扱います。",
          ],
        },
        apply: {
          look: ["乗っ取りに使われたログインの成功/失敗の並び方", "外部で公開された漏えい情報との一致", "登録時のパスワード条件"],
          allow: ["12文字以上で漏えい一覧にない、今のパスワードと違う新しいパスワード"],
          block: ["漏えい一覧に載っているパスワード", "短いパスワード", "今と同じパスワードへの『変更』"],
        },
        quiz: [
          {
            q: "ナベノコのサーバーに侵入の跡がないのに、正しいパスワードでログインされた。最も考えられる経路は？",
            options: ["別サービスから漏れた同じパスワードが使われた", "ナベノコのデータベースが盗まれた", "パスワードが長すぎた"],
            answer: 0,
            explain: ["正解。使い回しがあると、他社の漏えいが合鍵になります。", "侵入の跡がないため、まずは外部の漏えいを疑います。", "長さは攻撃の経路とは関係ありません。"],
          },
          {
            q: "leakedList.includes(\"nabe2024\") の結果は？（一覧に nabe2024 が入っている）",
            options: ["true", "false", "nabe2024"],
            answer: 0,
            explain: ["正解。一覧に含まれていれば true を返します。", "含まれているので false にはなりません。", "includes は値そのものではなく true/false を返します。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "log", title: "ログイン試行ログ", meta: "対象: nabe_chef_yui", lines: ["03:12:01 失敗 user=nabe_chef_yui IP 198.51.100.7", "03:12:01 失敗 user=cook_ken IP 198.51.100.7", "03:12:02 成功 user=nabe_chef_yui IP 198.51.100.7（1回目の別パスワードで成功）", "03:12:02 失敗 user=sweets_mio IP 198.51.100.7", "… 1分間に420アカウントを試行"], key: true },
        { id: "e2", type: "screen", title: "漏えい情報の照合結果", meta: "セキュリティ担当メモ", lines: ["9月に公表された『フォトシェア（架空）』の漏えいデータに", "nabe_chef_yui と同じメールアドレスとパスワードの組が含まれる"], key: true },
        { id: "e3", type: "config", title: "ナベノコの登録ルール", meta: "現行設定", lines: ["パスワード: 8文字以上", "漏えいパスワードの照合: なし", "多要素認証: 任意（案内なし）"], key: true },
        { id: "e4", type: "log", title: "サーバー監査", meta: "インフラ担当", lines: ["データベースへの不審なアクセス: なし", "管理画面へのログイン: 通常どおり"], key: false, note: "侵入がなかったことを示す補足。原因の仮説を支える中心ではない。" },
      ],
      hypotheses: [
        { id: "h1", text: "他社で漏れた資格情報が使い回されており、大量試行（詰め込み）で一致した", correct: true },
        { id: "h2", text: "ナベノコのデータベースからパスワードが盗まれた", correct: false, why: "サーバー監査に侵入の痕跡はなく、試行ログは外から大量に試すパターンです。" },
        { id: "h3", text: "投稿者本人がパスワードを誰かに教えた", correct: false, why: "1つのIPが420アカウントを機械的に試しており、個人の共有では説明できません。" },
      ],
      codeTask: "新しいパスワードを登録してよいかを判定してください。今のコードは8文字以上なら何でも通します。",
      inputs: [["newPassword", "登録しようとしているパスワード"], ["currentPassword", "今のパスワード（変更時）"], ["leakedList", "漏えいパスワード一覧（配列）"]],
      starterCode: 'if (newPassword.length >= 8) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const isLongEnough = newPassword.length >= 12;\nconst isLeaked = leakedList.includes(newPassword);\nconst isSame = newPassword === currentPassword;\n\nif (isLongEnough && !isLeaked && !isSame) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "長く漏えいしていない新パスワード", input: { newPassword: "kabocha-nimono-77", currentPassword: "nabe2024", leakedList: ["password123", "nabe2024", "qwerty12345678"] }, expected: true },
        { name: "漏えい済み（今回の合鍵）", input: { newPassword: "nabe2024", currentPassword: "x", leakedList: ["password123", "nabe2024", "qwerty12345678"] }, expected: false },
        { name: "長いが漏えい済み", input: { newPassword: "qwerty12345678", currentPassword: "x", leakedList: ["password123", "nabe2024", "qwerty12345678"] }, expected: false },
        { name: "短いパスワード", input: { newPassword: "miso-soup", currentPassword: "x", leakedList: ["password123"] }, expected: false },
        { name: "今と同じパスワードへの変更", input: { newPassword: "kabocha-nimono-77", currentPassword: "kabocha-nimono-77", leakedList: [] }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "乗っ取られたアカウントのセッションを切り、パスワード再設定を求める", effect: "good", urgent: true, feedback: "攻撃者のログイン状態を断ち、正しい持ち主に鍵を戻します。" },
        { id: "a2", label: "同じIPから成功したほかのアカウントにも再設定を案内する", effect: "good", feedback: "1件だけとは限りません。同じ試行で成功した全員が対象です。" },
        { id: "a3", label: "攻撃元IPを一時的に遮断し、ログを保存する", effect: "good", urgent: true, feedback: "試行を止めつつ、後の調査のための記録を残します。" },
        { id: "a4", label: "全利用者のパスワードを予告なく一斉リセットする", effect: "bad", feedback: "影響のない利用者まで締め出し、サポートが混乱します。対象を絞るべきです。" },
      ],
      report: {
        residual: [
          { text: "多要素認証を利用者に案内し、利用率を確認する", correct: true },
          { text: "ほかのIPから同じ手口が続いていないか監視する", correct: true },
          { text: "フォトシェアの漏えいなのでナベノコ側の対策は不要", correct: false },
        ],
      },
      nova: {
        evidence: "試行ログの『1つのIPから何アカウント試したか』に注目。人の手ではなく機械的な試し方に見えないかな？",
        code: "長さ・漏えい一覧・今と同じか、の3つを別々の変数にしてから && でつなぐと、どの条件で落ちたか console.log で確かめやすいよ。",
      },
    },

    // ------------------------------------------------------------------ 04
    {
      id: "case04", level: 4, chapter: 1,
      title: "押していない承認",
      organization: "サクラ設計事務所",
      client: { name: "オオノ", role: "事務所のIT担当" },
      summary: "深夜、所員のスマホに認証アプリの承認通知が20回以上届き、眠気の中で1回『承認』を押してしまった。その直後、社内メールに海外からログインがあった。",
      request: "多要素認証を入れていたのに突破されました。パスワードはすでに漏れていたようです。どこで止められたのか教えてください。",
      concepts: ["MFA（多要素認証）", "本人が始めていない認証要求"],
      lecture: {
        minutes: 4,
        principle: [
          "多要素認証（MFA）は「知っているもの（パスワード）」に加えて「持っているもの（スマホ）」などを確かめる仕組みです。パスワードが漏れても、それだけではログインできないようにします。",
          "ただし、スマホに届く『承認しますか？』の通知は、誰がログインを始めたかを教えてくれません。攻撃者が漏れたパスワードで何度もログインを試すと、本物の持ち主のスマホに通知が何度も届きます。疲れて押してしまうのを狙う手口を『MFA疲労攻撃』と呼びます。",
          "守りの原則は「自分で始めていない認証要求は、必ず拒否する」ことです。仕組みとしては、ログイン画面に表示された数字をスマホに入力させる『番号照合』で、本人がその画面の前にいることを確かめます。",
        ],
        mechanism: {
          intro: "承認を通すには、本人が始めたこと・画面の数字が一致したことの両方が必要です。",
          code: 'const userStartedLogin = false; // 本人が今ログインしようとしているか\nconst shownNumber = 47;          // ログイン画面に表示された数字\nconst typedNumber = 0;           // スマホに入力された数字\n\nconst numberMatches = typedNumber === shownNumber;\n\nif (userStartedLogin && numberMatches) {\n  console.log("承認");\n} else {\n  console.log("拒否して報告");\n}',
          vars: [
            ["userStartedLogin", "本人が自分でログイン操作を始めたなら true"],
            ["shownNumber", "ログインしようとしている画面に出ている数字"],
            ["typedNumber", "スマホの認証アプリに入力された数字"],
            ["numberMatches", "2つの数字が完全に同じなら true"],
          ],
          flow: [
            "通知の『承認』ボタンを押しただけ（tapped）では、本人が始めたかどうかは分かりません。",
            "番号照合では、攻撃者の画面に出た数字を本人は知らないので、一致させられません。",
            "&& でつなぐと、どちらか片方でも欠けた時点で拒否になります。",
          ],
        },
        apply: {
          look: ["承認通知の回数と時刻", "通知を押した時刻とログイン成功の時刻", "ログイン元の場所と、本人の行動"],
          allow: ["本人がPCでログインを始め、画面の数字をスマホに入力した"],
          block: ["本人が寝ていた深夜の通知への承認", "数字が一致しない承認", "本人が始めていないのに承認ボタンだけ押された"],
        },
        quiz: [
          {
            q: "自分でログインしていないのに承認通知が届いた。正しい対応は？",
            options: ["何度も来るので一度承認して止める", "拒否し、パスワードを変えて管理者に報告する", "通知を無視して寝る"],
            answer: 1,
            explain: ["それこそが攻撃者の狙いです。承認すると侵入されます。", "正解。通知が来た時点でパスワードは漏れていると考えます。", "拒否と報告がないと、攻撃は続き、パスワードも漏れたままです。"],
          },
          {
            q: "userStartedLogin が true、typedNumber が 12、shownNumber が 47 のとき、userStartedLogin && numberMatches は？",
            options: ["true", "false"],
            answer: 1,
            explain: ["数字が違うので numberMatches は false。&& の結果も false です。", "正解。片方が false なら && は false になります。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "log", title: "認証アプリの通知履歴", meta: "所員 ミヤタさんのスマホ", lines: ["02:31〜02:47 承認要求 23回（すべて拒否・無応答）", "02:48 承認要求 → 『承認』をタップ"], key: true },
        { id: "e2", type: "log", title: "メールサービスのサインイン記録", meta: "account: miyata@sakura-sekkei.example", lines: ["02:48:09 サインイン成功 場所: 海外（いつもと異なる）", "02:50 転送ルール『全メールを外部へ』作成"], key: true },
        { id: "e3", type: "chat", title: "ミヤタさんの聞き取り", meta: "翌朝", lines: ["寝ていたら何度も通知が鳴って、止めたくて押してしまった", "その時間にパソコンは開いていません"], key: true },
        { id: "e4", type: "config", title: "多要素認証の設定", meta: "管理画面", lines: ["方式: プッシュ通知で承認/拒否", "番号照合: 無効", "連続した拒否のアラート: 無効"], key: true },
        { id: "e5", type: "log", title: "事務所のプリンタログ", meta: "02:00〜03:00", lines: ["印刷ジョブ: なし"], key: false, note: "事件と関係のない記録。" },
      ],
      hypotheses: [
        { id: "h1", text: "漏れたパスワードで繰り返しログインし、承認通知を押させて多要素認証を突破した（MFA疲労）", correct: true },
        { id: "h2", text: "認証アプリの暗号が解読された", correct: false, why: "通知履歴には本人による『承認』のタップが残っています。" },
        { id: "h3", text: "ミヤタさん本人が海外からログインした", correct: false, why: "本人はその時間PCを使っておらず、寝ていたと証言しています。" },
      ],
      codeTask: "承認通知を通してよいかを判定してください。今のコードは承認ボタンが押されたら必ず通します。",
      inputs: [["tappedApprove", "承認ボタンが押されたか"], ["userStartedLogin", "本人がログイン操作を始めたか"], ["shownNumber", "画面の数字"], ["typedNumber", "入力された数字"]],
      starterCode: 'if (tappedApprove) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const numberMatches = typedNumber === shownNumber;\n\nif (tappedApprove && userStartedLogin && numberMatches) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "本人がPCからログインし、数字も一致", input: { tappedApprove: true, userStartedLogin: true, shownNumber: 47, typedNumber: 47 }, expected: true },
        { name: "今回の深夜の承認", input: { tappedApprove: true, userStartedLogin: false, shownNumber: 47, typedNumber: 47 }, expected: false, note: "攻撃者の画面の数字を偶然入れても本人が始めていない" },
        { name: "本人だが数字が違う", input: { tappedApprove: true, userStartedLogin: true, shownNumber: 47, typedNumber: 74 }, expected: false },
        { name: "承認されていない", input: { tappedApprove: false, userStartedLogin: true, shownNumber: 47, typedNumber: 47 }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "ミヤタさんのパスワードを変更し、全セッションを無効にする", effect: "good", urgent: true, feedback: "漏れたパスワードと、攻撃者のログイン状態を同時に断ちます。" },
        { id: "a2", label: "攻撃者が作った外部転送ルールを削除する（記録は保存）", effect: "good", urgent: true, feedback: "転送ルールが残ると、パスワードを変えても情報が流れ続けます。" },
        { id: "a3", label: "番号照合を有効にし、連続拒否のアラートを設定する", effect: "good", feedback: "同じ手口が通りにくくなり、早く気づけます。" },
        { id: "a4", label: "押してしまったミヤタさんを全社に名指しで注意する", effect: "bad", feedback: "報告しづらい空気を作ると、次の被害の発見が遅れます。仕組みで防ぎます。" },
      ],
      report: {
        residual: [
          { text: "転送ルールで外部に送られたメールの範囲を調べる", correct: true },
          { text: "パスワードがどこから漏れたか（使い回し等）を確認する", correct: true },
          { text: "多要素認証は役に立たないので廃止する", correct: false },
        ],
      },
      nova: {
        evidence: "承認をタップした時刻と、サインイン成功の時刻を比べてみて。本人の証言とも照らし合わせよう。",
        code: "『押された』と『本人が始めた』は別の事実だよ。番号が一致しても本人が始めていなければ通さない、をテストで確かめよう。",
      },
    },

    // ------------------------------------------------------------------ 05
    {
      id: "case05", level: 5, chapter: 1,
      title: "助け舟の裏口",
      organization: "ポケット家計簿アプリ",
      client: { name: "サポート窓口 リーダー カトウ", role: "カスタマーサポート" },
      summary: "「スマホを失くした」という問い合わせに応じて、サポートが別のメールアドレスへ回復リンクを送った。リンクは古いものまで使え、何度も開けた。",
      request: "親切に対応したつもりが、乗っ取りの手伝いをしたようです。回復の手続きのどこに穴があったのか教えてください。",
      concepts: ["アカウント回復", "本人確認", "期限", "一回限りのトークン"],
      lecture: {
        minutes: 5,
        principle: [
          "アカウント回復は『パスワードもスマホも使えない人に、もう一度鍵を渡す』手続きです。正しい持ち主にとっては助け舟ですが、攻撃者にとっては正面の鍵を迂回する裏口になります。",
          "だから回復には、前もって登録されている連絡先（登録済みメールや電話）を使い、問い合わせの中で突然示された新しい連絡先は使いません。『急いでいる』『困っている』という訴えは、確認を省く理由になりません。",
          "回復リンクに含まれる長いランダムな文字列を『トークン』と呼びます。安全なトークンは、①推測できない、②短い期限がある、③一度使ったら無効になる、④本人の登録済み連絡先にだけ送る、という性質を持ちます。",
        ],
        mechanism: {
          intro: "回復リンクが開かれたとき、サーバーはトークンについて4つのことを確かめます。",
          code: 'const tokenMatches = token === storedToken; // 発行した値と同じか\nconst notUsed = !used;                      // まだ使われていないか\nconst notExpired = now < expiresAt;         // 期限内か（分単位の時刻）\nconst sentToRegistered = sentTo === registeredEmail;\n\nif (tokenMatches && notUsed && notExpired && sentToRegistered) {\n  console.log("パスワード再設定へ");\n}',
          vars: [
            ["token / storedToken", "リンクに付いていた値と、サーバーが発行時に記録した値"],
            ["used", "そのトークンがすでに使われていれば true"],
            ["now / expiresAt", "今の時刻と有効期限（例: 発行から30分後）"],
            ["sentTo / registeredEmail", "リンクの送り先と、前から登録されているメールアドレス"],
          ],
          flow: [
            "< は「より小さい」。now < expiresAt なら、まだ期限に達していません。",
            "4つの条件のどれか1つでも false なら、&& 全体が false になり拒否されます。",
            "トークンを使ったら used を true にして、同じリンクを二度と使えなくします。",
          ],
        },
        apply: {
          look: ["サポートとのやり取りで、送り先がどう決まったか", "トークンの発行時刻・使用時刻・期限設定", "同じトークンが何回使われたか"],
          allow: ["登録済みメールに送られ、30分以内に初めて使われたトークン"],
          block: ["問い合わせで伝えられた新しいアドレスへ送ったトークン", "期限切れ", "使用済みのトークン"],
        },
        quiz: [
          {
            q: "問い合わせで「新しいメール bob@freemail.example に送って」と頼まれた。正しい対応は？",
            options: ["困っているのでそのアドレスに送る", "登録済みの連絡先で本人確認してから手続きする", "パスワードを電話で読み上げる"],
            answer: 1,
            explain: ["新しい連絡先が本人のものだと確かめる方法がありません。", "正解。前から登録されている経路で確かめるのが回復の原則です。", "パスワードを伝えることは確認にも回復にもなりません。"],
          },
          {
            q: "トークンを一度使ったら無効にする理由は？",
            options: ["サーバーの容量を節約するため", "メールやURLが他人に見られても再利用できないようにするため", "利用者が覚えやすくするため"],
            answer: 1,
            explain: ["容量の問題ではありません。", "正解。転送や閲覧履歴からリンクが漏れても、二度目は使えません。", "トークンは覚えるものではありません。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "chat", title: "サポートとのチャット", meta: "10/09 14:02", lines: ["相談者: スマホを失くしてログインできません。急ぎです", "相談者: 新しいメール bob@freemail.example に回復リンクを送ってください", "サポート: 承知しました。送信しました"], key: true },
        { id: "e2", type: "config", title: "回復トークンの設定", meta: "現行", lines: ["有効期限: なし", "使用後の無効化: なし", "送信先: サポートが手入力で指定可能"], key: true },
        { id: "e3", type: "log", title: "回復トークンの使用記録", meta: "token=rcv_8f…", lines: ["10/09 14:03 発行 送信先 bob@freemail.example", "10/09 14:05 使用 → パスワード変更", "10/11 09:12 再使用 → パスワード変更（期限なし・再利用可）"], key: true },
        { id: "e4", type: "config", title: "アカウント情報", meta: "被害者", lines: ["登録メール: hana.k@mail.example", "電話番号: 登録済み（SMS可）"], key: true },
      ],
      hypotheses: [
        { id: "h1", text: "本人確認をせず未登録の連絡先に回復リンクを送り、期限も使用回数も制限がなかった", correct: true },
        { id: "h2", text: "被害者のスマホが盗まれ、中身を見られた", correct: false, why: "回復リンクは攻撃者が指定したアドレスに届いており、スマホは不要でした。" },
        { id: "h3", text: "トークンの文字列が短く、総当たりで当てられた", correct: false, why: "トークンはサポートが攻撃者に直接送っています。推測する必要はありませんでした。" },
      ],
      codeTask: "回復リンクを受け付けてよいかを判定してください。今のコードはトークンが一致すれば何度でも、いつまでも通します。",
      inputs: [["token", "リンクのトークン"], ["storedToken", "サーバーに記録された値"], ["used", "使用済みか"], ["now", "今の時刻（分）"], ["expiresAt", "期限（分）"], ["sentTo", "リンクの送り先"], ["registeredEmail", "登録済みメール"]],
      starterCode: 'if (token === storedToken) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const tokenMatches = token === storedToken;\nconst notExpired = now < expiresAt;\nconst sentToRegistered = sentTo === registeredEmail;\n\nif (tokenMatches && !used && notExpired && sentToRegistered) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "登録メールに送った期限内・未使用", input: { token: "rcv_a91", storedToken: "rcv_a91", used: false, now: 600, expiresAt: 620, sentTo: "hana.k@mail.example", registeredEmail: "hana.k@mail.example" }, expected: true },
        { name: "未登録アドレスに送ったトークン", input: { token: "rcv_8f2", storedToken: "rcv_8f2", used: false, now: 600, expiresAt: 620, sentTo: "bob@freemail.example", registeredEmail: "hana.k@mail.example" }, expected: false },
        { name: "使用済みトークンの再使用", input: { token: "rcv_a91", storedToken: "rcv_a91", used: true, now: 605, expiresAt: 620, sentTo: "hana.k@mail.example", registeredEmail: "hana.k@mail.example" }, expected: false },
        { name: "期限切れ", input: { token: "rcv_a91", storedToken: "rcv_a91", used: false, now: 700, expiresAt: 620, sentTo: "hana.k@mail.example", registeredEmail: "hana.k@mail.example" }, expected: false },
        { name: "トークン不一致", input: { token: "rcv_zzz", storedToken: "rcv_a91", used: false, now: 600, expiresAt: 620, sentTo: "hana.k@mail.example", registeredEmail: "hana.k@mail.example" }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "発行済みの回復トークンをすべて無効にする", effect: "good", urgent: true, feedback: "期限のないトークンが残る限り、攻撃者は何度でも入れます。" },
        { id: "a2", label: "登録済みの電話で本人確認し、アカウントを持ち主に戻す", effect: "good", feedback: "前から登録されている経路を使って回復します。" },
        { id: "a3", label: "サポート手順を『送り先は登録済み連絡先のみ』に改める", effect: "good", feedback: "人の親切心につけ込む手口を、手順で防ぎます。" },
        { id: "a4", label: "攻撃者のアドレス bob@freemail.example に再度リンクを送り、様子を見る", effect: "bad", feedback: "攻撃者にさらに鍵を渡すことになります。" },
      ],
      report: {
        residual: [
          { text: "攻撃者がアカウント内で見た・変更した情報を確認する", correct: true },
          { text: "過去の回復対応で同じ手口がなかったか調べる", correct: true },
          { text: "回復機能を完全に廃止する", correct: false },
        ],
      },
      nova: {
        evidence: "チャットの『送信先』と、アカウント情報の『登録メール』を比べてみよう。使用記録で同じトークンが何回出てくるかも。",
        code: "条件は4つ。一致・未使用・期限内・登録先へ送信。テストの『使用済み』や『期限切れ』だけが落ちるか、1つずつ確かめてみて。",
      },
    },
  ]);
})(typeof globalThis !== "undefined" ? globalThis : this);
