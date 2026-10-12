/* 第6章 銀行を守りきる（Level 26〜30）
 * 舞台の「AEGIS BANK」とその顧客・口座・金額はすべて架空です。実在の銀行・口座には一切接続しません。 */
(function (root) {
  "use strict";
  root.HL.addCases([
    // ------------------------------------------------------------------ 26
    {
      id: "case26", level: 26, chapter: 6,
      title: "すり替わった振込先",
      organization: "AEGIS BANK 法人営業部（架空）",
      client: { name: "アサヒ精機 経理課長 ミズノ", role: "AEGIS BANK の法人顧客" },
      summary: "取引先から『口座を変更しました』というメールが届き、部品代 860万円を新しい口座へ振り込んだ。翌週、本物の取引先から『未入金です』と連絡が来た。",
      request: "メールは取引先の担当者のアドレスから来ていました。本物にしか見えなかったのに、なぜ。",
      concepts: ["受取人変更", "既知の別経路による確認"],
      lecture: {
        minutes: 4,
        principle: [
          "ビジネスメール詐欺（BEC）は、取引先や社長になりすましたメールで、振込先の変更や急ぎの送金を指示する手口です。攻撃者は事前に取引先のメールアカウントを乗っ取り、本物のやり取りの流れに割り込むこともあります。この場合、送信元アドレスは本物そのものです。",
          "だから『アドレスが正しいか』では見抜けません。振込先の変更のような重大な依頼は、そのメールとは別の、前から知っている経路で確認します。例えば、契約時に登録した電話番号に、こちらから電話をかけます。",
          "注意すべきは『メールに書かれた電話番号』に電話することです。それは攻撃者の番号かもしれません。確認に使う連絡先は、依頼の中身とは独立した、以前から登録されているものに限ります。",
        ],
        mechanism: {
          intro: "振込先の変更を受け付けるかを判定します。",
          code: 'const change = {\n  fromDomain: "asahi-parts.example",     // 送信元（乗っ取りなら本物）\n  confirmedByCallback: true,             // 電話で確認したか\n  callbackNumberSource: "email"          // 電話番号の出どころ\n};\n\nconst independentCheck = change.confirmedByCallback &&\n  change.callbackNumberSource === "registered";\n\nif (independentCheck) {\n  console.log("変更を登録");\n} else {\n  console.log("保留: 登録済みの番号へ確認");\n}',
          vars: [
            ["change.fromDomain", "依頼メールの送信元ドメイン。乗っ取られていれば本物と同じ"],
            ["change.confirmedByCallback", "こちらから電話で確認したか"],
            ["change.callbackNumberSource", "確認に使った番号の出どころ。registered（契約時の登録）か email（依頼メールに記載）か"],
          ],
          flow: [
            "送信元ドメインは判定に使いません。",
            "電話で確認していても、番号の出どころが依頼メールなら意味がありません。",
          ],
        },
        apply: {
          look: ["依頼メールのヘッダーと、過去のやり取りとの違い", "確認に使った電話番号の出どころ", "変更前後の口座名義"],
          allow: ["契約時に登録された番号へ電話し、担当者本人が変更を認めた"],
          block: ["メールだけの依頼", "メールに書かれた番号への確認"],
        },
        quiz: [
          {
            q: "取引先の本物のアドレスから振込先変更の依頼。そのまま信じてよい？",
            options: ["本物のアドレスなので信じてよい", "アカウント乗っ取りもあるので、別経路で確認する"],
            answer: 1,
            explain: ["送信元が本物でも、送っているのが本人とは限りません。", "正解。"],
          },
          {
            q: "確認の電話をかける番号として正しいのは？",
            options: ["依頼メールの署名にある番号", "契約時から登録されている番号"],
            answer: 1,
            explain: ["攻撃者が用意した番号かもしれません。", "正解。依頼と独立した経路を使います。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "mail", title: "振込先変更の依頼メール", meta: "From: kato@asahi-parts.example", lines: ["いつもお世話になっております。監査対応のため振込口座を変更しました。", "新口座: 別銀行 普通 XXXX-123（名義: アサヒパーツ合同会社）", "ご不明点は 050-XXXX-9981 までお電話ください。"], key: true },
        { id: "e2", type: "log", title: "取引先メールサーバーの調査結果", meta: "アサヒパーツ社より共有", lines: ["kato@ のアカウントに海外から不正ログイン（3週間前）", "受信メールを外部へ自動転送する設定が作られていた"], key: true },
        { id: "e3", type: "chat", title: "ミズノさんの聞き取り", meta: "", lines: ["メールにあった番号に電話して、加藤さんと名乗る人が『はい変更しました』と", "契約書の番号には電話していません"], key: true },
        { id: "e4", type: "config", title: "取引先マスタ", meta: "AEGIS BANK 法人ネットバンキング", lines: ["アサヒパーツ株式会社 / 登録電話 03-XXXX-1100", "受取口座の変更: 担当者1名の操作で即時反映"], key: true },
      ],
      hypotheses: [
        { id: "h1", text: "乗っ取られた取引先のメールから変更依頼が送られ、依頼メール記載の番号で確認したため見抜けなかった", correct: true },
        { id: "h2", text: "AEGIS BANK のシステムが振込先を書き換えた", correct: false, why: "振込先はミズノさんがメールの情報で登録したものです。" },
        { id: "h3", text: "アサヒ精機の社内に協力者がいた", correct: false, why: "取引先のメールアカウントの不正ログインと転送設定が確認されています。" },
      ],
      codeTask: "振込先の変更を登録してよいかを判定してください。今のコードは送信元ドメインが取引先と同じなら登録します。",
      inputs: [["change", "{ fromDomain, confirmedByCallback, callbackNumberSource }"], ["vendorDomain", "取引先のドメイン"]],
      starterCode: 'if (change.fromDomain === vendorDomain) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const independentCheck = change.confirmedByCallback && change.callbackNumberSource === "registered";\n\nif (independentCheck) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "登録番号へ電話で確認済み", input: { change: { fromDomain: "asahi-parts.example", confirmedByCallback: true, callbackNumberSource: "registered" }, vendorDomain: "asahi-parts.example" }, expected: true },
        { name: "今回（本物のアドレス・メールの番号）", input: { change: { fromDomain: "asahi-parts.example", confirmedByCallback: true, callbackNumberSource: "email" }, vendorDomain: "asahi-parts.example" }, expected: false },
        { name: "本物のアドレス・確認なし", input: { change: { fromDomain: "asahi-parts.example", confirmedByCallback: false, callbackNumberSource: "none" }, vendorDomain: "asahi-parts.example" }, expected: false },
        { name: "似せたドメイン・確認なし", input: { change: { fromDomain: "asahi-partz.example", confirmedByCallback: false, callbackNumberSource: "none" }, vendorDomain: "asahi-parts.example" }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "振込先の銀行へ、受取口座の凍結と組戻しを至急依頼する", effect: "good", urgent: true, feedback: "残っている資金があれば止められる可能性があります。結果は保証されません。" },
        { id: "a2", label: "警察に被害を相談し、メールなどの証拠を保存する", effect: "good", urgent: true, feedback: "捜査や回収の手続きに必要です。" },
        { id: "a3", label: "取引先に、メールアカウントの乗っ取りを登録番号で伝える", effect: "good", feedback: "取引先のほかの顧客も狙われている可能性があります。" },
        { id: "a4", label: "変更依頼メールに返信して『本当ですか』と確認する", effect: "bad", feedback: "返信は攻撃者に届きます。" },
      ],
      report: {
        residual: [
          { text: "受取口座の変更を、2人の承認と登録番号への確認を必須にする", correct: true },
          { text: "回収できなかった額を、未解決として記録し続ける", correct: true },
          { text: "取引先のドメインを一覧で管理すれば防げる", correct: false },
        ],
      },
      nova: {
        evidence: "依頼メールの電話番号と、取引先マスタの登録電話を比べてみよう。取引先のメールサーバーの調査結果も重要だよ。",
        code: "送信元ドメインはあえて使わない。『電話した』だけでなく『どの番号に』まで確かめよう。",
      },
    },

    // ------------------------------------------------------------------ 27
    {
      id: "case27", level: 27, chapter: 6,
      title: "本人なのに別の操作",
      organization: "AEGIS BANK 個人ネットバンキング（架空）",
      client: { name: "AEGIS BANK 不正対策室 リン", role: "銀行の不正対策" },
      summary: "顧客のクロダさんは家賃3,000円の振込のつもりで、届いた確認コードを入力した。実行されたのは別の口座への28万円だった。ログインも確認コードも本人のものだった。",
      request: "ログインは本人、確認コードも本人の端末に届いたもの。どこで操作がすり替わったのでしょう。",
      concepts: ["ログイン認証と取引認証の違い"],
      lecture: {
        minutes: 5,
        principle: [
          "ログイン認証は『この操作をしているのは本人か』を確かめます。でも、ログインした後の画面や通信が乗っ取られていれば、本人が見ている内容と、銀行に届く内容が違うことがあります。例えば、パソコンに入り込んだ不正なプログラムが、送金先と金額をこっそり書き換えるのです。",
          "そこで送金のような重要な操作には、取引認証を使います。これは『この送金先に、この金額を送ること』そのものを本人に確かめる仕組みです。確認コードを、送金先と金額に紐づけて作り、本人の登録済み端末に送金先と金額を表示して承認させます。",
          "取引に紐づかない確認コード（どの送金にも使える6桁の数字）は、ログイン認証の延長にすぎません。本人が3,000円のつもりで入力したコードが、28万円の送金にも使えてしまいます。",
        ],
        mechanism: {
          intro: "送金を実行してよいかを、承認された内容と実際の内容を比べて判定します。",
          code: 'const tx = { payee: "XXXX-7741", amount: 280000 };          // 銀行に届いた送金\nconst txAuth = { payee: "XXXX-2010", amount: 3000, used: false }; // 本人が承認した内容\n\nconst samePayee = txAuth.payee === tx.payee;\nconst sameAmount = txAuth.amount === tx.amount;\n\nif (loggedIn && samePayee && sameAmount && !txAuth.used) {\n  console.log("送金実行");\n} else {\n  console.log("承認内容と違うので止める");\n}',
          vars: [
            ["tx", "銀行に届いた送金の内容（送金先・金額）"],
            ["txAuth", "本人が登録済み端末で確認・承認した内容"],
            ["txAuth.used", "その承認がすでに使われたか"],
            ["loggedIn", "ログイン認証が済んでいるか"],
          ],
          flow: [
            "ログインしていること（loggedIn）は必要ですが、それだけでは不十分です。",
            "承認された送金先・金額と、実際の送金先・金額が完全に一致するかを確かめます。",
            "1つの承認は1回の送金にだけ使えます。",
          ],
        },
        apply: {
          look: ["クロダさんの画面に表示されていた内容", "銀行に届いた送金の内容", "確認コードが何に紐づいて発行されたか"],
          allow: ["承認した送金先・金額と同じ送金"],
          block: ["承認と送金先が違う送金", "承認と金額が違う送金", "使用済みの承認の再利用"],
        },
        quiz: [
          {
            q: "ログイン認証が確かめるのは？",
            options: ["操作しているのが本人か", "この送金先・金額で送ってよいか"],
            answer: 0,
            explain: ["正解。", "それは取引認証の役割です。"],
          },
          {
            q: "確認コードが送金先と金額に紐づいていないと？",
            options: ["書き換えられた送金にも使えてしまう", "特に問題ない"],
            answer: 0,
            explain: ["正解。本人の意図と違う送金を止められません。", "画面のすり替えを止められません。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "screen", title: "クロダさんの画面の記録", meta: "本人のPC", lines: ["振込先: XXXX-2010（大家さん） 金額: 3,000円", "『確認コードを入力してください』→ 入力"], key: true },
        { id: "e2", type: "log", title: "銀行が受け取った送金", meta: "", lines: ["振込先: XXXX-7741（初めての送金先） 金額: 280,000円", "確認コード: 一致 → 実行"], key: true },
        { id: "e3", type: "config", title: "確認コードの仕様", meta: "現行", lines: ["SMSで6桁を送信: 『確認コードは 418203 です』", "送金先・金額との紐づけ: なし", "SMS本文に送金内容の表示: なし"], key: true },
        { id: "e4", type: "log", title: "クロダさんのPCの検査結果", meta: "", lines: ["ブラウザ拡張機能『PDF Helper Pro』が銀行サイトの送信内容を書き換え"], key: true },
      ],
      hypotheses: [
        { id: "h1", text: "不正な拡張機能が送金内容を書き換え、取引に紐づかない確認コードがそのまま使われた", correct: true },
        { id: "h2", text: "クロダさんのパスワードが漏れ、攻撃者が別の端末から送金した", correct: false, why: "送金はクロダさん本人のPC・本人のログインから行われています。" },
        { id: "h3", text: "銀行の送金システムが金額を間違えた", correct: false, why: "銀行は受け取った内容どおりに処理しています。書き換えはPC側です。" },
      ],
      codeTask: "送金を実行してよいかを判定してください。今のコードはログイン中で確認コードが合っていれば実行します。",
      inputs: [["loggedIn", "ログイン済みか"], ["otpValid", "確認コードが合っているか"], ["tx", "{ payee, amount }"], ["txAuth", "{ payee, amount, used }"]],
      starterCode: 'if (loggedIn && otpValid) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const samePayee = txAuth.payee === tx.payee;\nconst sameAmount = txAuth.amount === tx.amount;\n\nif (loggedIn && otpValid && samePayee && sameAmount && !txAuth.used) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "承認どおりの家賃振込", input: { loggedIn: true, otpValid: true, tx: { payee: "XXXX-2010", amount: 3000 }, txAuth: { payee: "XXXX-2010", amount: 3000, used: false } }, expected: true },
        { name: "今回（送金先と金額がすり替え）", input: { loggedIn: true, otpValid: true, tx: { payee: "XXXX-7741", amount: 280000 }, txAuth: { payee: "XXXX-2010", amount: 3000, used: false } }, expected: false },
        { name: "金額だけ書き換え", input: { loggedIn: true, otpValid: true, tx: { payee: "XXXX-2010", amount: 30000 }, txAuth: { payee: "XXXX-2010", amount: 3000, used: false } }, expected: false },
        { name: "承認の再利用", input: { loggedIn: true, otpValid: true, tx: { payee: "XXXX-2010", amount: 3000 }, txAuth: { payee: "XXXX-2010", amount: 3000, used: true } }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "受取口座 XXXX-7741 の銀行へ凍結を依頼する", effect: "good", urgent: true, feedback: "資金が残っていれば止められる可能性があります。" },
        { id: "a2", label: "クロダさんに不正な拡張機能の削除と、PCの点検を案内する", effect: "good", urgent: true, feedback: "放置すると次の送金も書き換えられます。" },
        { id: "a3", label: "高額・新規送金先には、登録端末に送金先と金額を表示して承認させる方式を導入する", effect: "good", feedback: "取引認証の導入です。" },
        { id: "a4", label: "確認コードを6桁から8桁に伸ばして対応完了とする", effect: "bad", feedback: "桁数を増やしても、送金内容と紐づかなければ同じことが起きます。" },
      ],
      report: {
        residual: [
          { text: "同じ拡張機能による被害がほかの顧客にないか調べる", correct: true },
          { text: "28万円の回収状況を、確定するまで未解決として管理する", correct: true },
          { text: "ログイン認証を強化すればこの手口は防げる", correct: false },
        ],
      },
      nova: {
        evidence: "クロダさんの画面と、銀行に届いた送金を横に並べてみよう。確認コードの仕様に『紐づけ: なし』とあるね。",
        code: "ログインと確認コードだけでは今回は止まらない。承認された内容と実際の内容の一致、そして再利用の禁止。",
      },
    },

    // ------------------------------------------------------------------ 28
    {
      id: "case28", level: 28, chapter: 6,
      title: "7口座の同じ影",
      organization: "AEGIS BANK 不正検知センター（架空）",
      client: { name: "AEGIS BANK 不正検知センター長 ホシノ", role: "銀行の監視部門" },
      summary: "別々の顧客7人の口座から、数日のうちに同じ受取口座へ送金が出ていた。7口座のログインには同じ端末の指紋が残っている。一方、給与振込の代行会社には毎月数百口座から送金があるが、これは正常だ。",
      request: "1口座ずつ見ていたので気づけませんでした。でも、正常な送金まで止めて顧客を怒らせたくありません。",
      concepts: ["複数口座の異常検知", "独立審査", "正常利用の維持"],
      lecture: {
        minutes: 5,
        principle: [
          "1つの口座だけを見ると、1回の送金はどれも普通に見えます。しかし、複数の口座を横断して見ると、『新しく作られた同じ受取口座に、無関係な何人もの顧客から送金がある』『同じ端末が何人もの顧客としてログインしている』という影が浮かび上がります。",
          "ただし、多くの口座から同じ相手へ送金が集まること自体は珍しくありません。家賃の管理会社、給与の代行会社、公共料金などです。だから『集まっている』だけでなく、受取口座が確認済みの事業者か、最近作られたばかりか、同じ端末を共有しているか、など複数の特徴を組み合わせます。",
          "検知した後は、検知のルールを作った人とは別の担当が審査します（独立審査）。作った人は自分のルールの判定を正しいと思いがちだからです。審査で正常と分かった例はルールの改善に戻し、誤って止める件数（誤検知）を減らしていきます。",
        ],
        mechanism: {
          intro: "送金をそのまま通すか、保留して審査に回すかを判定します（true＝そのまま通す）。",
          code: 'const payee = { verifiedBusiness: false, linkedNewAccounts: 7 };\nconst sharedDeviceCount = 7; // この送金の端末でログインした顧客の数\n\nconst concentrated = payee.linkedNewAccounts >= 3;\nconst sharedDevice = sharedDeviceCount >= 2;\n\nif (payee.verifiedBusiness || (!concentrated && !sharedDevice)) {\n  console.log("通常どおり送金");\n} else {\n  console.log("保留して独立審査へ");\n}',
          vars: [
            ["payee.verifiedBusiness", "受取口座が審査済みの事業者（給与代行など）か"],
            ["payee.linkedNewAccounts", "最近この受取口座へ初めて送金した顧客の数"],
            ["sharedDeviceCount", "この端末でログインした別々の顧客の数"],
          ],
          flow: [
            "( ) でまとめた部分が先に計算されます。",
            "確認済みの事業者は通常どおり通し、正常利用を止めません。",
            "そうでなければ、集中も端末共有もないときだけ通します。",
          ],
        },
        apply: {
          look: ["受取口座ごとの送金元顧客の数と、口座の開設時期", "ログインの端末指紋の重なり", "誤検知になりそうな正常パターン（給与代行など）"],
          allow: ["確認済み事業者への多数の送金", "家族間の普段どおりの送金"],
          block: ["新しい受取口座へ無関係な多数の顧客から送金", "複数の顧客が同じ端末でログインしての送金"],
        },
        quiz: [
          {
            q: "多くの口座から同じ相手に送金が集まっている。すぐ不正と判断してよい？",
            options: ["よい", "だめ。給与代行など正常な例もあるので、他の特徴と組み合わせる"],
            answer: 1,
            explain: ["正常な利用を大量に止めてしまいます。", "正解。"],
          },
          {
            q: "独立審査の目的は？",
            options: ["審査を速くするため", "ルールを作った人の思い込みを避け、誤検知と見逃しを確かめるため"],
            answer: 1,
            explain: ["速さが目的ではありません。", "正解。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "ledger", title: "受取口座別の集計", meta: "直近14日", lines: ["他行 XXXX-5530（開設 9日前）: 送金元 7顧客 / 合計 486万円", "給与代行ペイロールワークス（審査済み事業者）: 送金元 412顧客"], key: true },
        { id: "e2", type: "log", title: "端末指紋の重なり", meta: "", lines: ["端末 fp_c81e…: 7顧客としてログイン（いずれも送金の直前）"], key: true },
        { id: "e3", type: "config", title: "現在の検知ルール", meta: "", lines: ["1口座ごとに、1回50万円以上なら保留", "口座をまたいだ集計: なし"], key: true },
        { id: "e4", type: "chat", title: "コールセンターの記録", meta: "", lines: ["先月、給与振込が止まったと企業から苦情 23件（ルール試行時）"], key: true },
      ],
      hypotheses: [
        { id: "h1", text: "口座ごとの判定しかなく、新しい受取口座への集中と端末の共有という横断的な特徴を見ていなかった", correct: true },
        { id: "h2", text: "7人の顧客が共謀していた", correct: false, why: "7人に面識はなく、同じ端末が各顧客としてログインしています。乗っ取りの特徴です。" },
        { id: "h3", text: "給与代行会社が不正の受取口座だった", correct: false, why: "給与代行は審査済み事業者で、送金元が多いのは正常な業務です。" },
      ],
      codeTask: "送金をそのまま通すか判定してください（true＝通常どおり、false＝保留して審査）。今のコードは金額だけを見ています。",
      inputs: [["amount", "金額"], ["payee", "{ verifiedBusiness, linkedNewAccounts }"], ["sharedDeviceCount", "端末を共有する顧客数"]],
      starterCode: 'if (amount < 500000) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const concentrated = payee.linkedNewAccounts >= 3;\nconst sharedDevice = sharedDeviceCount >= 2;\n\nif (payee.verifiedBusiness || (!concentrated && !sharedDevice)) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "給与代行への送金（正常・高額）", input: { amount: 3200000, payee: { verifiedBusiness: true, linkedNewAccounts: 412 }, sharedDeviceCount: 1 }, expected: true, note: "誤検知させない" },
        { name: "家族への送金", input: { amount: 80000, payee: { verifiedBusiness: false, linkedNewAccounts: 1 }, sharedDeviceCount: 1 }, expected: true },
        { name: "今回の XXXX-5530 への送金", input: { amount: 450000, payee: { verifiedBusiness: false, linkedNewAccounts: 7 }, sharedDeviceCount: 7 }, expected: false, note: "50万円未満でも止める" },
        { name: "受取口座は新しくないが端末を共有", input: { amount: 120000, payee: { verifiedBusiness: false, linkedNewAccounts: 1 }, sharedDeviceCount: 3 }, expected: false },
      ],
      responseActions: [
        { id: "a1", label: "XXXX-5530 への送金を一時保留し、受取銀行へ凍結を依頼する", effect: "good", urgent: true, feedback: "これ以上の流出を止めます。" },
        { id: "a2", label: "7顧客に登録電話で連絡し、ログインの停止と再設定を支援する", effect: "good", urgent: true, feedback: "乗っ取られた口座を持ち主に戻します。" },
        { id: "a3", label: "検知した案件を、ルール作成者とは別の審査担当が確認する体制にする", effect: "good", feedback: "独立審査です。" },
        { id: "a4", label: "受取口座に送金元が3件以上ある送金はすべて自動で拒否する", effect: "bad", feedback: "給与代行や家賃の送金まで止め、正常利用を大きく損ないます。" },
      ],
      report: {
        residual: [
          { text: "誤検知の件数を毎週測り、ルールを調整する", correct: true },
          { text: "端末 fp_c81e… が関わったほかの顧客がいないか調べる", correct: true },
          { text: "検知ルールは一度作れば見直し不要", correct: false },
        ],
      },
      nova: {
        evidence: "受取口座の集計で『開設日』と『送金元の数』に注目。苦情の記録は、誤検知の大切さを教えてくれるよ。",
        code: "審査済み事業者 || （集中なし && 端末共有なし）。カッコの位置で意味が変わるから気をつけて。",
      },
    },

    // ------------------------------------------------------------------ 29
    {
      id: "case29", level: 29, chapter: 6,
      title: "止めずに守る決済網",
      organization: "AEGIS BANK 決済基盤部（架空）",
      client: { name: "AEGIS BANK 決済基盤部 ナカジマ", role: "銀行のシステム部門" },
      summary: "不正対策の新しい判定を入れたところ、正常なデビットカード決済まで次々と拒否され、全国の店舗で支払いが止まった。いったん元に戻したが、対策は入れなければならない。",
      request: "守りを入れると止まる、外すと危ない。止めずに守るための進め方を決めたいです。",
      concepts: ["段階的な再開", "回帰テスト", "監視", "切り戻し"],
      lecture: {
        minutes: 5,
        principle: [
          "新しい仕組みを一度に全利用者へ入れると、想定外の問題が起きたとき、被害も全利用者に及びます。そこで、まず社員だけ、次に1%、10%、50%…と、段階的に広げます。各段階で問題がないことを確かめてから次へ進みます。",
          "各段階の前には回帰テストを行います。回帰テストとは、今まで正しく動いていたこと（正常な決済が通る、など）が、変更後も変わらず動くかを確かめるテストです。新しい対策が攻撃を止めるか、だけでなく、正常を止めないかも見るのです。",
          "そして監視です。エラー率や、正常な取引が拒否された割合（誤拒否率）を見張り、決めておいた基準を超えたらすぐ元に戻します（切り戻し）。切り戻しの手順は事前に準備し、試しておきます。",
        ],
        mechanism: {
          intro: "次の段階へ広げてよいかを判定します。",
          code: 'const regressionPassed = true;  // 回帰テストがすべて合格\nconst errorRate = 0.3;          // エラー率（%）\nconst falseDeclineRate = 2.4;   // 正常な取引の誤拒否率（%）\nconst rollbackReady = true;     // 切り戻し手順を準備・確認済み\nconst monitoringOn = true;      // 監視と警報が有効\n\nif (regressionPassed && errorRate <= 0.5 && falseDeclineRate <= 1 && rollbackReady && monitoringOn) {\n  console.log("次の段階へ");\n} else {\n  console.log("この段階で止める / 切り戻す");\n}',
          vars: [
            ["regressionPassed", "回帰テストがすべて合格したか"],
            ["errorRate", "システムエラーの割合（%）。基準 0.5 以下"],
            ["falseDeclineRate", "正常な取引を拒否した割合（%）。基準 1 以下"],
            ["rollbackReady", "すぐ元に戻せる準備ができているか"],
            ["monitoringOn", "監視と警報が動いているか"],
          ],
          flow: [
            "テストに合格しても、実際の利用で基準を超えれば止めます。",
            "切り戻しの準備がないまま広げるのは、ブレーキのない車で坂を下るのと同じです。",
          ],
        },
        apply: {
          look: ["前回の障害時の誤拒否率", "回帰テストの結果と対象範囲", "切り戻しにかかった時間"],
          allow: ["テスト合格・基準内・切り戻し準備済み・監視中の段階拡大"],
          block: ["誤拒否率が基準を超えている", "切り戻し手順が未確認", "監視なしでの拡大"],
        },
        quiz: [
          {
            q: "回帰テストで確かめるのは？",
            options: ["新しい対策が攻撃を止めるかだけ", "今まで正しく動いていたことが、変更後も動くか"],
            answer: 1,
            explain: ["それだけでは、正常な決済を止める問題を見逃します。", "正解。"],
          },
          {
            q: "falseDeclineRate が 2.4、基準が 1 以下。次の段階へ進む？",
            options: ["進む", "進まない"],
            answer: 1,
            explain: ["基準を超えています。", "正解。この段階で止め、原因を調べます。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "log", title: "前回の導入記録", meta: "10/02", lines: ["09:00 新判定を全利用者へ一斉に有効化", "09:07 誤拒否率 18%（通常 0.2%）", "10:40 切り戻し完了（手順書なし・手作業で1時間33分）"], key: true },
        { id: "e2", type: "log", title: "テスト記録", meta: "", lines: ["攻撃パターン 40件: すべて拒否 → 合格", "正常な決済のテスト: 実施なし"], key: true },
        { id: "e3", type: "config", title: "監視の設定", meta: "", lines: ["エラー率の警報: あり", "誤拒否率の警報: なし"], key: true },
        { id: "e4", type: "chat", title: "店舗からの苦情", meta: "10/02", lines: ["レジで全員のデビットが通らない。現金のないお客さんが帰ってしまった"], key: false, note: "影響の様子。" },
      ],
      hypotheses: [
        { id: "h1", text: "正常系の回帰テストも段階導入もなく、誤拒否の監視と切り戻しの準備がないまま一斉に有効化した", correct: true },
        { id: "h2", text: "攻撃者が決済網を停止させた", correct: false, why: "拒否は新しい判定の有効化直後に始まり、切り戻しで収まっています。" },
        { id: "h3", text: "店舗のレジ端末が一斉に故障した", correct: false, why: "全国の店舗で同時に、銀行側の判定の変更と同時刻に起きています。" },
      ],
      codeTask: "次の段階へ広げてよいかを判定してください。今のコードは回帰テストの合格だけを見ています。",
      inputs: [["regressionPassed", "回帰テスト合格"], ["errorRate", "エラー率（%）"], ["falseDeclineRate", "誤拒否率（%）"], ["rollbackReady", "切り戻し準備"], ["monitoringOn", "監視"]],
      starterCode: 'if (regressionPassed) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const healthy = errorRate <= 0.5 && falseDeclineRate <= 1;\n\nif (regressionPassed && healthy && rollbackReady && monitoringOn) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "すべて基準内", input: { regressionPassed: true, errorRate: 0.1, falseDeclineRate: 0.3, rollbackReady: true, monitoringOn: true }, expected: true },
        { name: "誤拒否率が基準超え", input: { regressionPassed: true, errorRate: 0.1, falseDeclineRate: 2.4, rollbackReady: true, monitoringOn: true }, expected: false },
        { name: "切り戻し未準備", input: { regressionPassed: true, errorRate: 0.1, falseDeclineRate: 0.3, rollbackReady: false, monitoringOn: true }, expected: false },
        { name: "監視なし", input: { regressionPassed: true, errorRate: 0.1, falseDeclineRate: 0.3, rollbackReady: true, monitoringOn: false }, expected: false },
        { name: "回帰テスト不合格", input: { regressionPassed: false, errorRate: 0.1, falseDeclineRate: 0.3, rollbackReady: true, monitoringOn: true }, expected: false },
        { name: "基準ちょうど（誤拒否1%）", input: { regressionPassed: true, errorRate: 0.5, falseDeclineRate: 1, rollbackReady: true, monitoringOn: true }, expected: true, note: "以下（<=）なので通る" },
      ],
      responseActions: [
        { id: "a0", label: "新判定を無効のまま固定し、障害中に失敗した決済の二重請求や未処理がないか確認する", effect: "good", urgent: true, feedback: "まず現在の利用者への影響を止め、障害の後始末を確実にします。" },
        { id: "a1", label: "正常な決済パターンの回帰テストを作り、合格を導入条件にする", effect: "good", feedback: "正常を止めないことを事前に確かめます。" },
        { id: "a2", label: "社員 → 1% → 10% → 50% → 全体 の段階導入計画を作る", effect: "good", feedback: "問題があっても影響を小さく抑えます。" },
        { id: "a3", label: "誤拒否率の警報と、自動切り戻しの手順を用意して訓練する", effect: "good", feedback: "基準を超えたら数分で戻せるようにします。" },
        { id: "a4", label: "苦情が怖いので、不正対策の導入そのものを見送る", effect: "bad", feedback: "攻撃に対して無防備なままになります。止めずに守る方法を選びます。" },
      ],
      report: {
        residual: [
          { text: "前回の障害で決済できなかった店舗・顧客への対応を確認する", correct: true },
          { text: "段階ごとの判断基準と判断者を記録に残す", correct: true },
          { text: "テストで攻撃を全部止められたので本番も安全", correct: false },
        ],
      },
      nova: {
        evidence: "テスト記録の『正常な決済のテスト: 実施なし』と、監視設定の『誤拒否率の警報: なし』。前回の切り戻しにかかった時間も見てね。",
        code: "5つの条件。基準ちょうど（1%）が通ることも確認しよう。< と <= の違いだよ。",
      },
    },

    // ------------------------------------------------------------------ 30
    {
      id: "case30", level: 30, chapter: 6,
      title: "消えた120万円",
      organization: "AEGIS BANK（架空）",
      client: { name: "AEGIS BANK 最高情報セキュリティ責任者 カミヤ", role: "銀行の経営層" },
      summary: "顧客ソラの口座から、合計120万円の不正送金指示が出た。1件は予約中、1件は着金済み、1件はすでに別の口座へ移されている。原因を突き止め、資金を追い、銀行全体の防御を組み直せ。",
      request: "ソラさんは『銀行のサポートから連絡が来て、言われたとおりに入力しただけ』と話しています。今わかっていることを全部渡します。原因、回収、そして二度と同じことが起きない守りを、あなたに組み立ててほしい。",
      concepts: ["原因調査", "封じ込め", "資金回収", "銀行全体の防御"],
      hypothesisMode: "multi",
      lecture: {
        minutes: 5,
        principle: [
          "大きな事件は、たいてい1つの穴ではなく、いくつかの穴が重なって起きます。今回もフィッシング（第1章）、セッション（第2章）、取引認証（第6章）、高リスク取引の審査（第6章）といった、これまでの学びが組み合わさっています。原因を1つに決めつけず、証拠ごとに『どの穴を通ったか』を確かめます。",
          "対応には順番があります。まず封じ込め（これ以上の被害を止める）、次に証拠保全、そして回収と復旧です。お金については『凍結（動かせなくした）』と『返金完了（持ち主に戻った）』を必ず区別します。凍結はゴールではなく、返還の手続きの出発点です。手続きの結果は相手の銀行や法的な手続きによって決まり、必ず全額戻るとは限りません。",
          "最後に、同じ事件を防ぐ守りを銀行全体に組み立てます。強すぎる守り（新しい端末を全部拒否するなど）は、機種変更した正当な顧客を締め出します。攻撃を止めることと、正常な利用を通すことの両方を、シナリオで検証します。",
        ],
        mechanism: {
          intro: "送金を実行してよいかの最終判定です。これまでの事件の条件を組み合わせます。",
          code: '// 取引認証: 承認内容と実際の送金が一致し、登録済み端末で承認されたか\nconst authBound = txAuth.payee === tx.payee &&\n  txAuth.amount === tx.amount && txAuth.onRegisteredDevice;\n// セッション: 失効していないか\nconst sessionOk = !session.revoked;\n// 高リスク取引: 独立審査で承認されたか\nconst reviewOk = !tx.highRisk || tx.reviewApproved;\n\nif (authBound && sessionOk && reviewOk) {\n  console.log("実行");\n}',
          vars: [
            ["txAuth.onRegisteredDevice", "承認が、本人確認を経て登録された端末で行われたか"],
            ["session.revoked", "セッションが失効しているか（即時反映）"],
            ["tx.highRisk", "新規受取人への高額送金など、高リスクと判定されたか"],
            ["tx.reviewApproved", "独立した審査担当が承認したか"],
          ],
          flow: [
            "『新しい端末だから拒否』ではなく、『本人確認を経て登録された端末で、内容に紐づいた承認があるか』で判定します。",
            "高リスクでなければ審査は不要（!tx.highRisk が true）。高リスクなら審査の承認が必要です。",
            "実際の銀行の仕組みは、ここに書いた数行よりはるかに多くの検査と手続きで成り立っています。",
          ],
        },
        apply: {
          look: ["偽サポートの案内とソラさんの入力内容", "未知の端末のセッションと失効の記録", "取引認証の監査記録", "送金台帳の各送金の状態", "ほかの口座の兆候"],
          allow: ["機種変更後に本人確認を経て端末を登録し、内容に紐づいた承認と審査を通った送金"],
          block: ["盗んだ一時コードで作られた未知の端末のセッションによる送金", "承認内容と違う送金", "審査を経ない新規受取人への高額送金"],
        },
        quiz: [
          {
            q: "受取口座の凍結に成功した。顧客に伝える内容として正しいのは？",
            options: ["『お金は戻りました』", "『資金を動かせないよう止めました。返還の手続きはこれからで、結果は確定していません』"],
            answer: 1,
            explain: ["凍結は返金完了ではありません。", "正解。凍結と返金完了を区別して伝えます。"],
          },
          {
            q: "『新しい端末からの送金をすべて拒否』する守りの問題点は？",
            options: ["問題ない。最も安全", "機種変更した正当な顧客まで締め出してしまう"],
            answer: 1,
            explain: ["安全に見えても、正常な利用を大きく損ないます。", "正解。本人確認と審査で正当な利用を通します。"],
          },
          {
            q: "送金台帳で『着金後に別の口座へ移され、残存なし』の送金は？",
            options: ["凍結すれば全額戻る", "凍結できる資金が残っておらず、追跡を続ける未解決の被害"],
            answer: 1,
            explain: ["残っていない資金は凍結できません。", "正解。"],
          },
        ],
      },
      evidence: [
        { id: "e1", type: "mail", title: "偽サポートの案内", meta: "SMS → Webページ", lines: ["【AEGIS BANK】お客様の口座で不審な取引を検知しました。", "本人確認: https://aegis-bank.secure-verify.example/login", "ページ内: 『IDとパスワード、SMSで届いた確認コードを入力してください』", "ソラさんの証言: 『言われたとおり全部入力した』"], key: true },
        { id: "e2", type: "log", title: "認証ログ", meta: "顧客ソラ", lines: ["10/11 20:14 ログイン成功 端末 dev_9a3（初めての端末）一時コードで認証", "10/11 20:15 端末 dev_9a3 を『信頼済み』に自動登録", "10/11 20:31 ソラさんが本人のスマホでパスワード変更 → dev_9a3 のセッションは失効まで最大24時間（キャッシュ）"], key: true },
        { id: "e3", type: "log", title: "取引認証の監査", meta: "", lines: ["TX-701〜703: 承認はすべて dev_9a3 上で実施", "承認方式: ログイン時の一時コードを流用（送金先・金額への紐づけなし）", "新規受取人の高額送金: 審査ルールなし"], key: true },
        { id: "e4", type: "ledger", title: "送金台帳", meta: "顧客ソラ / 合計120万円", lines: ["TX-701  300,000円  予約キューにあり、未実行（実行予定 10/13 09:00）", "TX-702  600,000円  着金済み。受取先に 400,000円 残存", "TX-703  300,000円  着金後に別口座へ移動、残存なし"], key: true },
        { id: "e5", type: "log", title: "他口座の兆候", meta: "不正検知センター", lines: ["同じ偽サイトの誘導SMSを受けたと申告: 3顧客", "TX-702 と同じ受取口座への送金未遂: 2顧客（いずれも残高不足で失敗）"], key: true },
        { id: "e6", type: "log", title: "ATM利用記録", meta: "顧客ソラ", lines: ["10/09 駅前ATMで出金 20,000円（本人）"], key: false, note: "本人の通常の利用。事件とは無関係。" },
      ],
      hypotheses: [
        { id: "h1", text: "銀行を装った偽サイトに、認証情報と一時コードを入力させられた", correct: true },
        { id: "h2", text: "未知の端末で作られたログインセッションが使われ、失効もすぐに反映されなかった", correct: true },
        { id: "h3", text: "送金先と金額に紐づく取引認証がなく、ログインの一時コードで送金が承認できた", correct: true },
        { id: "h4", text: "新規受取人への高額送金に、保留や独立審査がなかった", correct: true },
        { id: "h5", text: "AEGIS BANK の勘定系サーバーに外部から侵入された", correct: false, why: "すべての操作はソラさんのアカウントの正規の画面とセッションから行われています。" },
        { id: "h6", text: "ソラさん本人が送金し、後から不正だと申告している", correct: false, why: "送金は初めての端末 dev_9a3 から行われ、偽サイトへの誘導の記録があります。" },
      ],
      codeTask: "送金を実行してよいか、これまでの学びを組み合わせて判定してください。今のコードはログインと一時コードだけを見ています。『新しい端末を全部拒否』では、機種変更した正当な顧客のテストが失敗します。",
      inputs: [["loggedIn", "ログイン済みか"], ["otpValid", "一時コードが合っているか"], ["session", "{ revoked, newDevice }"], ["tx", "{ payee, amount, highRisk, reviewApproved }"], ["txAuth", "{ payee, amount, onRegisteredDevice }"]],
      starterCode: 'if (loggedIn && otpValid) {\n  return true;\n} else {\n  return false;\n}',
      solutionCode: 'const authBound = txAuth.payee === tx.payee && txAuth.amount === tx.amount && txAuth.onRegisteredDevice;\nconst sessionOk = !session.revoked;\nconst reviewOk = !tx.highRisk || tx.reviewApproved;\n\nif (loggedIn && authBound && sessionOk && reviewOk) {\n  return true;\n} else {\n  return false;\n}',
      testCases: [
        { name: "いつもの家賃（登録端末・低リスク）", input: { loggedIn: true, otpValid: true, session: { revoked: false, newDevice: false }, tx: { payee: "XXXX-2010", amount: 80000, highRisk: false, reviewApproved: false }, txAuth: { payee: "XXXX-2010", amount: 80000, onRegisteredDevice: true } }, expected: true },
        { name: "機種変更した正当な顧客（本人確認済み・審査承認）", input: { loggedIn: true, otpValid: true, session: { revoked: false, newDevice: true }, tx: { payee: "XXXX-3301", amount: 500000, highRisk: true, reviewApproved: true }, txAuth: { payee: "XXXX-3301", amount: 500000, onRegisteredDevice: true } }, expected: true, note: "新端末の全拒否では不合格になる" },
        { name: "TX-702（未知の端末・紐づけなし）", input: { loggedIn: true, otpValid: true, session: { revoked: false, newDevice: true }, tx: { payee: "XXXX-6620", amount: 600000, highRisk: true, reviewApproved: false }, txAuth: { payee: "", amount: 0, onRegisteredDevice: false } }, expected: false },
        { name: "パスワード変更後の古いセッション", input: { loggedIn: true, otpValid: true, session: { revoked: true, newDevice: true }, tx: { payee: "XXXX-2010", amount: 80000, highRisk: false, reviewApproved: false }, txAuth: { payee: "XXXX-2010", amount: 80000, onRegisteredDevice: true } }, expected: false },
        { name: "承認内容と違う送金先", input: { loggedIn: true, otpValid: true, session: { revoked: false, newDevice: false }, tx: { payee: "XXXX-6620", amount: 80000, highRisk: false, reviewApproved: false }, txAuth: { payee: "XXXX-2010", amount: 80000, onRegisteredDevice: true } }, expected: false },
        { name: "高リスクで審査待ち", input: { loggedIn: true, otpValid: true, session: { revoked: false, newDevice: false }, tx: { payee: "XXXX-3301", amount: 900000, highRisk: true, reviewApproved: false }, txAuth: { payee: "XXXX-3301", amount: 900000, onRegisteredDevice: true } }, expected: false },
      ],
      responseActions: [
        { id: "stop701", label: "TX-701（30万円・予約中）の実行を停止する", effect: "good", urgent: true, ledger: "TX-701", feedback: "実行前なので、30万円は銀行の外に出る前に止まります。" },
        { id: "freeze702", label: "TX-702 の受取銀行へ、受取口座の凍結を依頼する（残存40万円）", effect: "good", urgent: true, ledger: "TX-702", feedback: "凍結は『動かせなくした』段階です。まだソラさんに戻ってはいません。" },
        { id: "return702", label: "TX-702 の凍結資金について、受取銀行と返還の手続きを進める", effect: "good", ledger: "TX-702", requires: "freeze702", feedback: "演習では、受取銀行の確認と返還手続きが完了したと仮定します。実際には相手の確認や法的手続きに時間がかかり、結果も保証されません。" },
        { id: "trace703", label: "TX-703 の移動先を追跡し、警察・関係機関と連携する", effect: "good", ledger: "TX-703", feedback: "残存がないため凍結はできません。追跡を続ける未解決の被害として扱います。" },
        { id: "revoke", label: "ソラさんの全セッションを即時失効させ、dev_9a3 の登録を解除する", effect: "good", urgent: true, feedback: "攻撃者の足場を断ちます。キャッシュによる失効の遅れも解消します。" },
        { id: "reauth", label: "窓口または登録電話で本人確認し、パスワードと認証方式を再設定する", effect: "good", feedback: "ソラさんに安全な鍵を戻します。" },
        { id: "takedown", label: "偽サイトの閉鎖を依頼し、兆候のある顧客に連絡・注意喚起する", effect: "good", feedback: "他の顧客への被害の広がりを止めます。" },
        { id: "promiseAll", label: "ソラさんに『120万円は必ず全額戻ります』と伝えて安心させる", effect: "bad", feedback: "回収できるかは確定していません。誤った約束は信頼を損ない、後で大きな問題になります。" },
        { id: "haltAll", label: "全顧客のオンライン送金を無期限で停止する", effect: "bad", feedback: "封じ込めの範囲が広すぎ、正常な顧客の生活を止めます。対象を絞った対応が必要です。" },
      ],
      completionRules: { extra: ["bankDefense"] },
      bank: {
        total: 1200000,
        ledger: [
          { id: "TX-701", amount: 300000, state: "予約キューにあり、未実行", remaining: 300000 },
          { id: "TX-702", amount: 600000, state: "着金済み。受取先に40万円残存", remaining: 400000 },
          { id: "TX-703", amount: 300000, state: "着金後に移動し、残存なし", remaining: 0 },
        ],
        defense: {
          options: [
            { id: "bindTxAuth", label: "送金先・金額に紐づく取引認証（登録端末に内容を表示して承認）" },
            { id: "holdHighRisk", label: "高リスク取引（新規受取人への高額送金など）の保留と独立審査" },
            { id: "instantRevoke", label: "セッション失効の即時反映（キャッシュを待たない）" },
            { id: "aggregateAlerts", label: "複数口座の異常（同じ受取口座・同じ端末）の集約と通知" },
            { id: "falsePositiveCheck", label: "正常利用者への誤停止の検証（機種変更・給与振込などのシナリオ）" },
            { id: "blockNewDevices", label: "新しい端末からの送金をすべて拒否する" },
            { id: "longerOtp", label: "一時コードを6桁から8桁にする" },
          ],
          required: ["bindTxAuth", "holdHighRisk", "instantRevoke", "aggregateAlerts", "falsePositiveCheck"],
          scenarios: [
            { id: "s1", kind: "attack", label: "盗んだ一時コードで作った未知の端末から、別の送金先へ送金", stoppedBy: ["bindTxAuth", "blockNewDevices"] },
            { id: "s2", kind: "attack", label: "パスワード変更後も、古いセッションのまま送金を続ける", stoppedBy: ["instantRevoke"] },
            { id: "s3", kind: "attack", label: "だまされた本人が自分の端末で、新しい受取人へ90万円を承認", stoppedBy: ["holdHighRisk"] },
            { id: "s4", kind: "attack", label: "同じ受取口座へ、複数の顧客口座から少しずつ送金", stoppedBy: ["aggregateAlerts"] },
            { id: "s5", kind: "legit", label: "機種変更した顧客が、窓口で本人確認して新端末を登録し、家賃を送金", brokenBy: ["blockNewDevices"] },
            { id: "s6", kind: "legit", label: "給与代行会社への毎月の送金（多数の口座から同じ受取先）", brokenBy: [], needs: ["falsePositiveCheck"], needsNote: "集約検知が正常な給与振込を止めないことを、検証で確かめる必要があります" },
          ],
        },
      },
      report: {
        residual: [
          { text: "TX-703 の30万円と TX-702 の移動済み20万円、計50万円は未解決として追跡を続ける", correct: true },
          { text: "TX-702 の返還は演習上の仮定であり、実際の手続き状況を記録し続ける", correct: true },
          { text: "同じ受取口座を狙われた他の顧客について、被害の有無を確認する", correct: true },
          { text: "必要な対応をしたので、120万円は全額回収できた", correct: false },
        ],
      },
      nova: {
        evidence: "証拠が5つの方向から来ているよ。偽サイト・端末・承認の方式・お金の行方・他口座。どれも『どの穴を通ったか』の手がかり。原因は1つではないかもしれない。",
        code: "取引認証・セッション・審査の3つを変数にしてから && でつなごう。『新端末は全部拒否』だとテスト2が落ちるはず。",
      },
    },
  ]);
})(typeof globalThis !== "undefined" ? globalThis : this);
