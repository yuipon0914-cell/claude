/* 第3章 取引の整合性を守る（Level 11〜15） — 登場する組織・人物・URLはすべて架空です。 */
(function (root) {
  "use strict";
  root.HL.addCases([
    // ------------------------------------------------------------------ 11
    {
      id: "case11", level: 11, chapter: 3,
      title: "1円の買い物かご",
      organization: "雑貨通販「コモレビストア」",
      client: { name: "店長 ヒナタ", role: "ネットショップ運営" },
      summary: "1万2千円のランプが、1円で37件売れていた。決済は正常に完了し、商品はすでに発送準備に入っている。",
      request: "値引きの設定はしていません。どうして1円で買えたのか、発送を止めるべきかも教えてください。",
      concepts: ["信頼境界", "サーバー確定価格", "決済照合"],
      lecture: {
        minutes: 4,
        principle: [
          "信頼境界とは『ここから先は自分で管理している』という線のことです。お店のサーバーは境界の内側、お客さんのブラウザは外側です。外側から来るものは、たとえ自分の店の画面が作った値でも、書き換えられている可能性があります。",
          "商品の値段は画面に表示されますが、画面の値をそのまま注文に使うと、ブラウザ側で数字を1に書き換えて送ることができます。だから合計金額は、サーバーが自分の商品データベースの価格から計算し直します。",
          "さらに、決済会社から『支払いが済んだ』と知らせが来たら、その金額がサーバーで計算した金額と一致するかを照合します。一致しない注文は出荷しません。",
        ],
        mechanism: {
          intro: "ブラウザから届いた値と、サーバーが持つ値を分けて考えます。",
          code: 'const clientPrice = 1;        // ブラウザが送ってきた単価（信用しない）\nconst serverPrice = 12000;    // 商品DBの単価\nconst quantity = 1;\nconst paidAmount = 1;         // 決済会社が確定した金額\n\nconst expectedTotal = serverPrice * quantity;\nconst paidCorrectly = paidAmount === expectedTotal;\n\nif (quantity >= 1 && paidCorrectly) {\n  console.log("出荷へ");\n} else {\n  console.log("保留: 金額不一致", paidAmount, expectedTotal);\n}',
          vars: [
            ["clientPrice", "画面（境界の外）から届いた単価"],
            ["serverPrice", "サーバーの商品データベースにある正しい単価"],
            ["expectedTotal", "サーバーが計算した本来の合計"],
            ["paidAmount", "実際に決済された金額"],
          ],
          flow: [
            "* はかけ算です。単価 × 数量で合計を出します。",
            "数量も外から来る値なので、1以上かどうかを確かめます（0や負の数を防ぐ）。",
            "clientPrice は判定に使いません。",
          ],
        },
        apply: {
          look: ["注文リクエストに含まれる price の値", "商品DBの価格", "決済金額と商品価格の差"],
          allow: ["決済金額がサーバー計算の合計と一致する注文"],
          block: ["画面から送られた価格で計算された注文", "数量0や負の数の注文"],
        },
        quiz: [
          {
            q: "画面に表示した価格を、注文の計算に使ってよい？",
            options: ["自分の店の画面なので使ってよい", "外から届いた値なので、サーバーの価格で計算し直す"],
            answer: 1,
            explain: ["ブラウザに渡した後の値は、利用者が書き換えられます。", "正解。境界の外から来た値は信用しません。"],
          },
          {
            q: "serverPrice が 12000、quantity が 2、paidAmount が 24000 のとき paidCorrectly は？",
            options: ["true", "false"],
            answer: 0,
            explain: ["正解。12000 × 2 = 24000 で一致します。", "計算し直すと一致しています。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "log", title: "注文リクエスト", meta: "order=CM-5521", lines: ["POST /checkout", "{ \"itemId\": \"lamp-07\", \"price\": 1, \"quantity\": 1 }", "→ 決済金額 1円 で決済を作成"], key: true },
        { id: "e2", type: "config", title: "商品データベース", meta: "lamp-07", lines: ["商品名: 真鍮のテーブルランプ", "価格: 12,000円", "セール設定: なし"], key: true },
        { id: "e3", type: "code", title: "決済作成処理（抜粋）", meta: "checkout.js", lines: ["const amount = req.body.price * req.body.quantity", "payment.create({ amount })"], key: true },
        { id: "e4", type: "ledger", title: "1円注文の一覧", meta: "直近24時間", lines: ["37件 / 同じ買い手アカウント 4件 + 転売サイトで手口が共有された跡"], key: false, note: "被害の範囲。原因を示すのは e1〜e3。" },
      ],
      hypotheses: [
        { id: "h1", text: "ブラウザから送られた価格をそのまま決済に使い、サーバーの価格で照合しなかった", correct: true },
        { id: "h2", text: "決済会社のシステムが金額を間違えた", correct: false, why: "決済はお店が送った金額（1円）で正しく作られています。" },
        { id: "h3", text: "店員が誤ってセール価格を設定した", correct: false, why: "商品DBの価格は12,000円で、セール設定もありません。" },
      ],
      codeTask: "注文を出荷してよいかを判定してください。今のコードは画面から来た価格で照合しています。",
      inputs: [["clientPrice", "画面から来た単価"], ["serverPrice", "商品DBの単価"], ["quantity", "数量"], ["paidAmount", "決済額"]],
      starterCode: 'const total = clientPrice * quantity;\n\nif (paidAmount === total) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const expectedTotal = serverPrice * quantity;\n\nif (quantity >= 1 && paidAmount === expectedTotal) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "正しい価格で1個購入", input: { clientPrice: 12000, serverPrice: 12000, quantity: 1, paidAmount: 12000 }, expected: true },
        { name: "今回の1円注文", input: { clientPrice: 1, serverPrice: 12000, quantity: 1, paidAmount: 1 }, expected: false },
        { name: "2個を正しく購入", input: { clientPrice: 12000, serverPrice: 12000, quantity: 2, paidAmount: 24000 }, expected: true },
        { name: "数量0で0円", input: { clientPrice: 12000, serverPrice: 12000, quantity: 0, paidAmount: 0 }, expected: false },
        { name: "画面は正しいが決済額が不足", input: { clientPrice: 12000, serverPrice: 12000, quantity: 1, paidAmount: 1200 }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "金額が一致しない37件の出荷を保留する", effect: "good", urgent: true, feedback: "発送前に止めれば商品の損失を防げます。" },
        { id: "a2", label: "決済作成をサーバーの価格で行うよう修正する", effect: "good", urgent: true, feedback: "これ以上の1円注文を防ぐ根本対策です。" },
        { id: "a3", label: "保留した注文の購入者へ、規約に沿ってキャンセルと返金を案内する", effect: "good", feedback: "1円の決済は返金し、正しい手続きで対応します。" },
        { id: "a4", label: "1円で注文した全員に、差額を独自の判断で強制的に追加請求する", effect: "bad", feedback: "同意のない追加請求はトラブルになります。規約とカード会社のルールに従います。" },
      ],
      report: {
        residual: [
          { text: "クーポンや送料など、ほかに画面の値を信じている計算がないか点検する", correct: true },
          { text: "決済額と注文額の不一致を自動で検知して通知する", correct: true },
          { text: "価格をブラウザで暗号化すれば書き換えは防げる", correct: false },
        ],
      },
      nova: {
        evidence: "リクエストの price と、商品DBの価格を比べてみて。決済作成処理はどちらを使っている？",
        code: "clientPrice はあえて使わない。数量0のテストも、うっかり通らないように気をつけて。",
      },
    },

    // ------------------------------------------------------------------ 12
    {
      id: "case12", level: 12, chapter: 3,
      title: "届いていない入金通知",
      organization: "オンライン講座「マナビバ」",
      client: { name: "マナビバ 経理担当 ツジ", role: "教育サービス運営" },
      summary: "決済会社の入金記録にない注文が、システム上は『支払済み』になり、講座が開放されていた。",
      request: "決済会社からの通知（Webhook）で支払済みにしています。届いていないはずの通知で、なぜ支払済みになったのでしょう。",
      concepts: ["Webhook", "署名検証", "注文照合"],
      lecture: {
        minutes: 5,
        principle: [
          "Webhook（ウェブフック）は、ある出来事が起きたときに、相手のサービスがこちらのURLへ自動で知らせを送る仕組みです。決済会社は『支払いが完了しました』という知らせを、お店の受付URLへ送ります。",
          "問題は、その受付URLはインターネット上に公開されていることです。決済会社でなくても、誰でも同じ形の知らせを送れます。中身が『paid（支払済み）』と書いてあっても、本当に決済会社から来たとは限りません。",
          "そこで決済会社は、知らせに『署名』を付けます。署名は、決済会社とお店だけが知っている秘密の鍵で作られ、中身が1文字でも変わると合わなくなります。お店は署名を検証し、さらに注文番号と金額が自分の記録と合うかを照合してから、支払済みにします。",
        ],
        mechanism: {
          intro: "Webhookを受け取ったときの判定です（署名の計算そのものはライブラリが行い、結果だけを受け取る想定です）。",
          code: 'const signatureValid = false;      // 署名検証の結果\nconst orderExists = true;          // 注文番号が自分の記録にあるか\nconst amount = 9800;               // 知らせに書かれた金額\nconst orderAmount = 9800;          // 自分の記録の金額\nconst status = "paid";\n\nif (signatureValid && orderExists && amount === orderAmount && status === "paid") {\n  console.log("支払済みにする");\n} else {\n  console.log("無視して記録する");\n}',
          vars: [
            ["signatureValid", "決済会社の鍵で作られた署名と中身が一致したら true"],
            ["orderExists", "知らせの注文番号が自分のシステムに存在するか"],
            ["amount / orderAmount", "知らせの金額と、注文時に自分が記録した金額"],
            ["status", "知らせに書かれた状態"],
          ],
          flow: [
            "status が paid というだけでは、誰が書いたか分かりません。",
            "署名で『誰から来たか』『途中で変えられていないか』を確かめます。",
            "署名が正しくても、別の注文や別の金額の知らせを流用されないよう、注文と金額を照合します。",
          ],
        },
        apply: {
          look: ["受付URLへのアクセス元と署名ヘッダー", "決済会社の管理画面の入金記録", "Webhook受付処理のチェック内容"],
          allow: ["署名が正しく、注文番号と金額が記録と一致する paid の知らせ"],
          block: ["署名のない・合わない知らせ", "金額が注文と違う知らせ", "存在しない注文の知らせ"],
        },
        quiz: [
          {
            q: "Webhookの本文に status: \"paid\" とあった。これだけで支払済みにしてよい？",
            options: ["よい。決済会社のフォーマットだから", "だめ。誰でも同じ形の知らせを送れる"],
            answer: 1,
            explain: ["形が同じでも、送り主は分かりません。", "正解。署名検証と注文照合が必要です。"],
          },
          {
            q: "署名が正しいのに金額照合もするのはなぜ？",
            options: ["署名は時々間違えるから", "正しい知らせを別の注文に流用されたり、注文側の金額と食い違ったりするのを防ぐため"],
            answer: 1,
            explain: ["署名は計算上ほぼ間違えません。照合は別の目的です。", "正解。正しい知らせでも、自分の記録と合っているかは別に確かめます。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "log", title: "Webhook受付ログ", meta: "/webhooks/payment", lines: ["10/10 22:41 from 192.0.2.88  order=MB-3307 status=paid amount=1", "  signature: （なし）", "  → 支払済みに更新、講座『データ分析入門』開放"], key: true },
        { id: "e2", type: "ledger", title: "決済会社の入金記録", meta: "管理画面", lines: ["MB-3307 の決済: 記録なし", "決済会社の送信元IP帯: 203.0.113.0/24"], key: true },
        { id: "e3", type: "code", title: "受付処理（抜粋）", meta: "webhook.js", lines: ["if (body.status === 'paid') { markPaid(body.order) }"], key: true },
        { id: "e4", type: "config", title: "注文記録", meta: "MB-3307", lines: ["講座: データ分析入門", "金額: 19,800円", "状態: 支払待ち → 支払済み（22:41）"], key: true },
      ],
      hypotheses: [
        { id: "h1", text: "公開された受付URLに偽の paid 通知が送られ、署名検証も金額照合もせずに支払済みにした", correct: true },
        { id: "h2", text: "決済会社が誤って支払済みの通知を送った", correct: false, why: "決済会社の入金記録にMB-3307はなく、送信元も決済会社のIP帯ではありません。" },
        { id: "h3", text: "利用者が正規に支払ったが記録が遅れた", correct: false, why: "通知の金額は1円で、決済会社には決済自体が存在しません。" },
      ],
      codeTask: "Webhookを受けて支払済みにしてよいかを判定してください。今のコードは status だけを見ています。",
      inputs: [["status", "知らせの状態"], ["signatureValid", "署名検証の結果"], ["orderExists", "注文があるか"], ["amount", "知らせの金額"], ["orderAmount", "注文の金額"]],
      starterCode: 'if (status === "paid") {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const amountMatches = amount === orderAmount;\n\nif (status === "paid" && signatureValid && orderExists && amountMatches) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "決済会社からの正しい通知", input: { status: "paid", signatureValid: true, orderExists: true, amount: 19800, orderAmount: 19800 }, expected: true },
        { name: "今回の偽通知（署名なし・1円）", input: { status: "paid", signatureValid: false, orderExists: true, amount: 1, orderAmount: 19800 }, expected: false },
        { name: "署名は正しいが金額が違う", input: { status: "paid", signatureValid: true, orderExists: true, amount: 9800, orderAmount: 19800 }, expected: false },
        { name: "存在しない注文", input: { status: "paid", signatureValid: true, orderExists: false, amount: 19800, orderAmount: 0 }, expected: false },
        { name: "正しい署名の失敗通知", input: { status: "failed", signatureValid: true, orderExists: true, amount: 19800, orderAmount: 19800 }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "決済会社の記録と照合し、入金のない『支払済み』注文を洗い出す", effect: "good", urgent: true, feedback: "被害の範囲を確定させます。" },
        { id: "a2", label: "署名検証と金額照合を入れ、署名のない通知を拒否する", effect: "good", urgent: true, feedback: "偽通知の受付を止める根本対策です。" },
        { id: "a3", label: "不正に開放された講座のアクセスを停止し、記録を保存する", effect: "good", feedback: "支払いのない利用を止め、後の対応に備えます。" },
        { id: "a4", label: "Webhookの受付URLを長い文字列に変えるだけで対応完了とする", effect: "bad", feedback: "URLを隠すだけでは、知られた時点で同じことが起きます。" },
      ],
      report: {
        residual: [
          { text: "一度受け付けた通知を記録し、同じ通知の再送に備える（次の事件へ）", correct: true },
          { text: "決済会社の管理画面と日次で突き合わせる仕組みを作る", correct: true },
          { text: "Webhookをやめて、利用者の自己申告で支払済みにする", correct: false },
        ],
      },
      nova: {
        evidence: "受付ログの送信元IPと、決済会社の送信元IP帯を見比べて。署名の欄にも注目。",
        code: "status・署名・注文の存在・金額。どれか1つでも欠けたら false。『署名は正しいが金額違い』が落ちることを確かめよう。",
      },
    },

    // ------------------------------------------------------------------ 13
    {
      id: "case13", level: 13, chapter: 3,
      title: "二度届いたチケット",
      organization: "ライブ配信チケット「ステージパス」",
      client: { name: "ステージパス 開発 ユウキ", role: "チケット販売" },
      summary: "1回の支払いで、電子チケットが2枚、3枚と発行された購入者がいる。座席数より多いチケットが出回りそうだ。",
      request: "署名検証は入れています。それでも重複が起きました。決済会社は同じ通知を再送することがあるそうです。",
      concepts: ["冪等性", "重複通知", "原子的処理"],
      lecture: {
        minutes: 4,
        principle: [
          "ネットワークは不安定なので、送る側は『届いたか分からない』とき、同じ知らせをもう一度送ります。決済会社のWebhookも、受け取り側の応答が遅いと同じ通知を再送します。これは正しい動作です。",
          "だから受け取る側は『同じ知らせを何回受け取っても、結果が1回分と同じになる』ように作ります。この性質を冪等性（べきとうせい）と呼びます。エレベーターの呼び出しボタンを何回押しても、来るエレベーターは1台、という感覚です。",
          "やり方は、通知ごとの一意なID（イベントID）を記録し、処理済みのIDなら何もしないことです。さらに『処理済みか確認する』と『処理済みとして記録する』を、間に割り込まれない1つのまとまり（原子的処理）として行います。確認と記録の間に同じ通知が届くと、両方が『未処理』と判断してしまうからです。",
        ],
        mechanism: {
          intro: "通知を処理してよいかを、イベントIDと注文の状態で判定します。",
          code: 'const eventId = "evt_771";\nconst processedIds = ["evt_770", "evt_771"]; // 処理済みの通知ID\nconst ticketIssued = true;                    // この注文のチケット発行済みか\n\nconst alreadyProcessed = processedIds.includes(eventId);\n\nif (!alreadyProcessed && !ticketIssued) {\n  console.log("チケットを1枚発行し、IDを記録");\n} else {\n  console.log("処理済みなので何もしない（成功として応答）");\n}',
          vars: [
            ["eventId", "決済会社が通知ごとに付ける一意な番号（再送でも同じ）"],
            ["processedIds", "すでに処理した通知の番号"],
            ["ticketIssued", "注文側の状態。発行済みなら true"],
          ],
          flow: [
            "再送の通知は eventId が同じなので、processedIds に入っていれば処理しません。",
            "念のため注文側でも『発行済み』を確かめ、二重の守りにします。",
            "重複を見つけても『エラー』ではなく『成功』と応答すると、決済会社の再送が止まります。",
          ],
        },
        apply: {
          look: ["同じ eventId の通知が何回届いたか", "チケット発行の時刻の間隔", "処理済みの確認と記録の順番"],
          allow: ["初めて届いた通知で、まだ発行していない注文"],
          block: ["処理済みのイベントIDの再送", "すでにチケット発行済みの注文への別通知"],
        },
        quiz: [
          {
            q: "冪等な処理とは？",
            options: ["一度しか呼ばれない処理", "何回呼ばれても結果が1回分と同じ処理"],
            answer: 1,
            explain: ["呼ばれる回数は制御できません。結果を同じにします。", "正解。再送が来ても安全な作りです。"],
          },
          {
            q: "『処理済みか確認』と『記録』の間に、同じ通知がもう1つ届いた。何が起きる？",
            options: ["両方とも未処理と判断し、2回発行されうる", "必ず1回だけ発行される"],
            answer: 0,
            explain: ["正解。だから確認と記録を1つのまとまり（原子的処理）にします。", "間に割り込まれると、両方が同じ判断をしてしまいます。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "log", title: "Webhook受付ログ", meta: "order=SP-1204", lines: ["19:00:01.120 evt_771 paid 署名OK → チケット T-88 発行", "19:00:01.135 evt_771 paid 署名OK → チケット T-89 発行（再送）", "19:00:31.400 evt_771 paid 署名OK → チケット T-90 発行（再送）"], key: true },
        { id: "e2", type: "config", title: "決済会社のWebhook仕様", meta: "ドキュメント抜粋", lines: ["10秒以内に200応答がない場合、同じイベントを再送します", "イベントIDは再送でも変わりません"], key: true },
        { id: "e3", type: "code", title: "受付処理（抜粋）", meta: "webhook.js", lines: ["if (verify(sig)) {", "  issueTicket(order)   // 処理に約12秒", "  respond(200)", "}"], key: true },
        { id: "e4", type: "ledger", title: "座席数", meta: "公演 10/20", lines: ["定員 500 / 発行済み 534"], key: false, note: "結果として起きた超過。原因は e1〜e3。" },
      ],
      hypotheses: [
        { id: "h1", text: "処理が遅く再送が届き、同じイベントIDの重複を確かめずに毎回チケットを発行した", correct: true },
        { id: "h2", text: "偽のWebhookが送られた", correct: false, why: "すべて署名OKで、決済会社からの正規の再送です。" },
        { id: "h3", text: "購入者が3回支払った", correct: false, why: "イベントIDは同じ evt_771 で、支払いは1回です。" },
      ],
      codeTask: "通知を受けてチケットを発行してよいかを判定してください。今のコードは支払済みの通知なら毎回発行します。",
      inputs: [["status", "通知の状態"], ["eventId", "通知のID"], ["processedIds", "処理済みID（配列）"], ["ticketIssued", "注文のチケット発行済みか"]],
      starterCode: 'if (status === "paid") {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const alreadyProcessed = processedIds.includes(eventId);\n\nif (status === "paid" && !alreadyProcessed && !ticketIssued) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "初めての支払い通知", input: { status: "paid", eventId: "evt_771", processedIds: ["evt_770"], ticketIssued: false }, expected: true },
        { name: "同じ通知の再送（今回）", input: { status: "paid", eventId: "evt_771", processedIds: ["evt_770", "evt_771"], ticketIssued: true }, expected: false },
        { name: "IDは新しいが注文は発行済み", input: { status: "paid", eventId: "evt_799", processedIds: ["evt_771"], ticketIssued: true }, expected: false, note: "注文側でも二重発行を防ぐ" },
        { name: "未処理だが支払失敗", input: { status: "failed", eventId: "evt_800", processedIds: [], ticketIssued: false }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "重複発行されたチケット（T-89、T-90 など）を無効にする", effect: "good", urgent: true, feedback: "公演前に無効にし、定員超過を防ぎます。" },
        { id: "a2", label: "イベントIDの記録と注文状態の確認を、1つの処理（トランザクション）にまとめる", effect: "good", feedback: "確認と記録の間の割り込みを防ぎます。" },
        { id: "a3", label: "受付ではすぐに200を返し、発行処理は後で行う形に変える", effect: "good", feedback: "そもそもの再送を減らします（冪等性は引き続き必要）。" },
        { id: "a4", label: "決済会社に再送機能を止めてもらう", effect: "bad", feedback: "通知が本当に届かなかったときに、支払済みが反映されなくなります。" },
      ],
      report: {
        residual: [
          { text: "無効化したチケットの購入者に、有効な1枚を案内する", correct: true },
          { text: "返金など、ほかのWebhook処理も冪等になっているか確認する", correct: true },
          { text: "処理を速くすれば重複は二度と起きない", correct: false },
        ],
      },
      nova: {
        evidence: "受付ログの eventId をよく見て。3回とも同じだね。仕様書の『10秒』と処理時間『約12秒』も比べてみよう。",
        code: "イベントIDの確認と、注文側の発行済みチェックの2段構え。3番目のテストがその理由だよ。",
      },
    },

    // ------------------------------------------------------------------ 14
    {
      id: "case14", level: 14, chapter: 3,
      title: "返金された未払い注文",
      organization: "家具レンタル「ルームリース」",
      client: { name: "ルームリース 経理 ササキ", role: "レンタル事業" },
      summary: "支払われていない注文に返金が実行され、さらに支払済み注文に支払額を超える返金が出ていた。操作したのは窓口のアルバイトアカウントだった。",
      request: "返金ボタンは誰でも押せる場所にありました。返金のルールを、注文の状態とあわせて作り直したいです。",
      concepts: ["状態遷移", "返金権限", "返金可能残額"],
      lecture: {
        minutes: 5,
        principle: [
          "注文には『支払待ち → 支払済み → 一部返金 → 全額返金』のような状態があり、決まった矢印でしか進めません。これを状態遷移と呼びます。支払待ちから返金済みへ、のような矢印は存在しないはずです。",
          "返金はお金が会社から出ていく操作なので、誰が実行できるか（権限）も限ります。窓口で受け付けるのはよくても、実行は返金担当、のように分けます。",
          "さらに金額にも上限があります。返金できるのは『支払われた額から、すでに返金した額を引いた残り』までです。これを返金可能残額といいます。何回かに分けて返金しても、合計が支払額を超えてはいけません。",
        ],
        mechanism: {
          intro: "返金の実行前に、状態・権限・金額の3方向から確かめます。",
          code: 'const order = { status: "paid", paidAmount: 30000, refundedAmount: 20000 };\nconst actorRole = "refund_manager";\nconst amount = 15000; // 今回返金しようとしている額\n\nconst refundable = order.paidAmount - order.refundedAmount; // 残り 10000\nconst statusOk = order.status === "paid" || order.status === "partially_refunded";\nconst roleOk = actorRole === "refund_manager";\nconst amountOk = amount > 0 && amount <= refundable;\n\nconsole.log(statusOk, roleOk, amountOk); // true true false',
          vars: [
            ["order.status", "注文の今の状態"],
            ["order.paidAmount", "実際に支払われた額"],
            ["order.refundedAmount", "すでに返金した合計額"],
            ["refundable", "まだ返金できる残り"],
            ["actorRole", "操作しようとしている人の役割（サーバーの記録）"],
          ],
          flow: [
            "- は引き算です。返金可能残額を先に計算しておきます。",
            "<= は「以下」。残額ちょうどの返金は許可されます。",
            "amount > 0 で、0円やマイナスの『返金』を防ぎます。",
          ],
        },
        apply: {
          look: ["返金記録の注文状態と金額", "操作したアカウントの役割", "同じ注文への返金の合計"],
          allow: ["返金担当が、支払済み注文に残額以内で返金"],
          block: ["支払待ちの注文への返金", "残額を超える返金", "アルバイトアカウントによる返金実行"],
        },
        quiz: [
          {
            q: "paidAmount 30000、refundedAmount 20000 の注文。返金可能残額は？",
            options: ["30000", "10000", "50000"],
            answer: 1,
            explain: ["すでに返金した分を引く必要があります。", "正解。30000 − 20000 = 10000 です。", "足し算ではありません。"],
          },
          {
            q: "status が \"pending\"（支払待ち）の注文に返金してよい？",
            options: ["金額が小さければよい", "よくない。支払われていないので返金の矢印がない"],
            answer: 1,
            explain: ["金額に関係なく、支払っていないものは返金できません。", "正解。状態遷移として存在しない操作です。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "ledger", title: "返金記録", meta: "10月", lines: ["RL-201 状態:pending 支払:0 返金 45,000（操作 part_mai）", "RL-188 状態:paid 支払:30,000 返金 20,000 → さらに 25,000（合計45,000）", "RL-176 状態:paid 支払:12,000 返金 12,000（操作 refund_tanaka）"], key: true },
        { id: "e2", type: "code", title: "返金処理（抜粋）", meta: "refund.js", lines: ["if (amount > 0) { payout(order, amount) }"], key: true },
        { id: "e3", type: "config", title: "アカウント台帳", meta: "役割", lines: ["part_mai: staff（窓口アルバイト）", "refund_tanaka: refund_manager"], key: true },
        { id: "e4", type: "chat", title: "part_mai さんの聞き取り", meta: "", lines: ["電話で『返金がまだ』と強く言われ、画面の返金ボタンを押しました", "相手の注文番号と口座は電話で聞きました"], key: false, note: "経緯の補足。ソーシャルエンジニアリングの可能性も今後調査。" },
      ],
      hypotheses: [
        { id: "h1", text: "返金処理が注文状態・操作者の役割・返金可能残額を確かめていなかった", correct: true },
        { id: "h2", text: "決済会社が二重に返金した", correct: false, why: "返金は社内の返金処理から実行されています。" },
        { id: "h3", text: "返金担当 refund_tanaka のアカウントが乗っ取られた", correct: false, why: "問題の返金は part_mai が操作しており、RL-176 は正しい返金です。" },
      ],
      codeTask: "返金を実行してよいかを判定してください。今のコードは金額が0より大きければ通します。",
      inputs: [["order", "{ status, paidAmount, refundedAmount }"], ["actorRole", "操作者の役割"], ["amount", "返金額"]],
      starterCode: 'if (amount > 0) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const refundable = order.paidAmount - order.refundedAmount;\nconst statusOk = order.status === "paid" || order.status === "partially_refunded";\nconst roleOk = actorRole === "refund_manager";\nconst amountOk = amount > 0 && amount <= refundable;\n\nif (statusOk && roleOk && amountOk) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "返金担当が全額返金", input: { order: { status: "paid", paidAmount: 12000, refundedAmount: 0 }, actorRole: "refund_manager", amount: 12000 }, expected: true },
        { name: "一部返金済みの残りを返金", input: { order: { status: "partially_refunded", paidAmount: 30000, refundedAmount: 20000 }, actorRole: "refund_manager", amount: 10000 }, expected: true },
        { name: "支払待ちへの返金（RL-201）", input: { order: { status: "pending", paidAmount: 0, refundedAmount: 0 }, actorRole: "refund_manager", amount: 45000 }, expected: false },
        { name: "残額超過（RL-188）", input: { order: { status: "partially_refunded", paidAmount: 30000, refundedAmount: 20000 }, actorRole: "refund_manager", amount: 25000 }, expected: false },
        { name: "窓口スタッフの実行", input: { order: { status: "paid", paidAmount: 12000, refundedAmount: 0 }, actorRole: "staff", amount: 12000 }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "返金機能を一時停止し、返金担当の手動承認に切り替える", effect: "good", urgent: true, feedback: "穴が残ったままの返金を止めます。" },
        { id: "a2", label: "誤って送金された返金について、振込先の銀行へ組戻しを依頼する", effect: "good", feedback: "戻るかどうかは相手側の同意などによります。依頼と結果は分けて管理します。" },
        { id: "a3", label: "過去の返金を、状態・権限・残額のルールで再点検する", effect: "good", feedback: "ほかにも同じ誤りがないか確かめます。" },
        { id: "a4", label: "依頼すれば返金は全額必ず戻ると経営陣に報告する", effect: "bad", feedback: "組戻しは相手の同意が必要な場合があり、必ず戻るとは限りません。" },
      ],
      report: {
        residual: [
          { text: "組戻しの結果が出るまで、回収できていない額として記録する", correct: true },
          { text: "電話で返金を迫った相手について、手口と注文の関係を調べる", correct: true },
          { text: "返金ボタンを画面から消せば権限チェックは不要", correct: false },
        ],
      },
      nova: {
        evidence: "返金記録の各行で、状態・支払額・返金合計・操作者を表にしてみよう。ルールのどれを破っているか見えてくる。",
        code: "返金可能残額を先に変数にしておくと、条件が読みやすくなるよ。状態は paid と partially_refunded の2つが OK。",
      },
    },

    // ------------------------------------------------------------------ 15
    {
      id: "case15", level: 15, chapter: 3,
      title: "最後の1個が二つ売れた",
      organization: "限定スニーカー販売「ラストステップ」",
      client: { name: "ラストステップ 店長 ジン", role: "限定品販売" },
      summary: "在庫1足の限定モデルが、0.02秒差で2人に売れた。どちらにも『購入完了』のメールが届いている。",
      request: "購入前に在庫を確認しているのに、なぜ2つ売れたのでしょう。",
      concepts: ["同時実行", "競合", "在庫予約"],
      lecture: {
        minutes: 5,
        principle: [
          "サーバーは同時に何人もの注文を処理します。2人が同時に『在庫を読む → 1以上あるので売る → 在庫を1減らす』を行うと、2人とも在庫1を読んだ時点で『売れる』と判断してしまいます。この状態を競合（レースコンディション）と呼びます。",
          "防ぎ方の一つは、更新するときに『自分が読んだときから変わっていないこと』を条件にすることです。在庫データにバージョン番号を付け、読んだときの番号と、今の番号が同じときだけ減らします。先に更新した人がいれば番号が進んでいるので、後の人は失敗してやり直します。",
          "もう一つは在庫予約です。決済の前に在庫を一時的に確保し、一定時間で支払われなければ戻します。どちらの方法でも、『確認』と『減らす』を分けずに1つの条件付き更新として行うことが核心です。",
        ],
        mechanism: {
          intro: "購入処理で、読んだ時点のバージョンと今のバージョンを比べます。",
          code: 'const versionAtRead = 7;   // 在庫を読んだときのバージョン\nconst currentVersion = 8;  // 更新しようとした今のバージョン（誰かが先に更新）\nconst available = 0;       // 今の在庫\nconst qty = 1;\n\nconst unchanged = versionAtRead === currentVersion;\nconst enoughStock = available >= qty;\n\nif (unchanged && enoughStock) {\n  console.log("在庫を減らして購入確定");\n} else {\n  console.log("在庫を読み直す / 売り切れを表示");\n}',
          vars: [
            ["versionAtRead", "在庫を確認したときのバージョン番号"],
            ["currentVersion", "更新しようとしている瞬間のバージョン番号"],
            ["available", "今の時点の在庫数"],
            ["qty", "買おうとしている数"],
          ],
          flow: [
            "在庫を減らすたびにバージョンを1つ進めます。",
            "番号が違う＝間に誰かが更新した、という合図です。",
            "実際のデータベースでは『バージョンが7のときだけ更新』を1つの命令で行い、割り込みを防ぎます。",
          ],
        },
        apply: {
          look: ["2つの注文のタイムスタンプと、在庫を読んだ値", "在庫更新の処理が『確認』と『更新』に分かれているか", "購入確定の時刻"],
          allow: ["読んでから誰も更新しておらず、在庫が足りる注文"],
          block: ["読んだ後に別の人が在庫を減らしていた注文", "在庫が足りない注文"],
        },
        quiz: [
          {
            q: "2人が同時に在庫1を読んで、2人とも買えてしまった。この現象は？",
            options: ["競合（レースコンディション）", "フィッシング", "CSRF"],
            answer: 0,
            explain: ["正解。処理の順番が入れ替わることで起きる不整合です。", "人をだます手口とは別の問題です。", "サイトをまたぐ偽リクエストとは別です。"],
          },
          {
            q: "versionAtRead が 7、currentVersion が 7、available が 1、qty が 1。購入確定？",
            options: ["確定", "やり直し"],
            answer: 0,
            explain: ["正解。誰も更新しておらず、在庫も足ります。", "番号が同じなので、割り込みはありません。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "log", title: "注文処理ログ", meta: "商品 LS-RED-27", lines: ["12:00:00.104 注文A 在庫を読む → 1（version 7）", "12:00:00.121 注文B 在庫を読む → 1（version 7）", "12:00:00.180 注文A 在庫を 0 に更新（version 8）購入確定", "12:00:00.199 注文B 在庫を 0 に更新（version 9）購入確定"], key: true },
        { id: "e2", type: "code", title: "購入処理（抜粋）", meta: "purchase.js", lines: ["const stock = db.read(item)", "if (stock >= qty) {", "  db.write(item, stock - qty)  // 読んだ値を元に上書き", "}"], key: true },
        { id: "e3", type: "config", title: "在庫データ", meta: "LS-RED-27", lines: ["初期在庫: 1", "現在: 0（2件確定済み）"], key: true },
        { id: "e4", type: "chat", title: "SNSの反応", meta: "", lines: ["『買えた！』『私も買えたのに在庫なしって連絡来た』"], key: false, note: "影響の様子。原因を示すのは e1〜e3。" },
      ],
      hypotheses: [
        { id: "h1", text: "在庫の確認と更新が分かれていて、同時に読んだ2つの注文が両方とも確定した（競合）", correct: true },
        { id: "h2", text: "在庫数の入力ミスで実は2足あった", correct: false, why: "初期在庫は1で、ログでも両方が在庫1を読んでいます。" },
        { id: "h3", text: "同じ人が2回注文した", correct: false, why: "注文AとBは別の購入者で、どちらにも購入完了が届いています。" },
      ],
      codeTask: "在庫を減らして購入確定してよいかを判定してください。今のコードは読んだ時点の在庫だけを見ています。",
      inputs: [["stockAtRead", "読んだときの在庫"], ["versionAtRead", "読んだときのバージョン"], ["currentVersion", "今のバージョン"], ["available", "今の在庫"], ["qty", "数量"]],
      starterCode: 'if (stockAtRead >= qty) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const unchanged = versionAtRead === currentVersion;\nconst enoughStock = available >= qty;\n\nif (qty >= 1 && unchanged && enoughStock) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "注文A（先に更新）", input: { stockAtRead: 1, versionAtRead: 7, currentVersion: 7, available: 1, qty: 1 }, expected: true },
        { name: "注文B（後から更新・今回）", input: { stockAtRead: 1, versionAtRead: 7, currentVersion: 8, available: 0, qty: 1 }, expected: false },
        { name: "バージョンは同じだが在庫不足", input: { stockAtRead: 1, versionAtRead: 3, currentVersion: 3, available: 1, qty: 2 }, expected: false },
        { name: "別の人が補充後（読み直して再試行）", input: { stockAtRead: 0, versionAtRead: 10, currentVersion: 10, available: 3, qty: 1 }, expected: true, note: "読み直した最新の情報で判断" },
      ],
      responseActions: [
        { id: "a1", label: "注文Bの購入者へ、事情の説明と返金・代替案を連絡する", effect: "good", urgent: true, feedback: "商品がない以上、早く正直に連絡することが信頼を守ります。" },
        { id: "a2", label: "在庫更新を条件付きの1つの命令（バージョン照合）に直す", effect: "good", feedback: "競合の根本対策です。" },
        { id: "a3", label: "限定品は決済前に在庫を予約し、期限切れで戻す仕組みにする", effect: "good", feedback: "支払い中の取り合いも整理できます。" },
        { id: "a4", label: "注文Bは在庫をマイナス1にしたまま、どこかから調達できると約束する", effect: "bad", feedback: "調達できる保証がなく、さらに不信を招きます。" },
      ],
      report: {
        residual: [
          { text: "過去の限定販売で同じ超過が起きていないか確認する", correct: true },
          { text: "同時に大量アクセスするテストで、超過が起きないことを確かめる", correct: true },
          { text: "サーバーを速くすれば競合は起きなくなる", correct: false },
        ],
      },
      nova: {
        evidence: "注文ログの時刻とversionの番号を順番に追ってみて。注文Bは何番を読んで、何番のときに書いた？",
        code: "読んだ時点の在庫（stockAtRead）はもう古い情報。今のバージョンと在庫で判断しよう。",
      },
    },
  ]);
})(typeof globalThis !== "undefined" ? globalThis : this);
