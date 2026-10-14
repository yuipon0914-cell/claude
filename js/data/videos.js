/*
 * 動画で学ぶ — 実在を確認した YouTube 動画だけを掲載する。
 *
 * 確認方法: 2026-10-12 に Web 検索のインデックスで、URL（動画ID）とタイトルの組を確認した。
 * 開発環境からは youtube.com に直接接続できなかったため、埋め込み可否は未確認。
 * そのため画面では埋め込みを試しつつ、必ず「YouTubeで開く」リンクも表示する。
 * channel は検索結果で投稿元を確認できたものだけ記載し、不明なものは null にしている。
 * 日本語の動画は、初心者向けにわかりやすいという評判（紹介記事・公的機関・著名な専門家）を確認できたものに絞った。
 * 新しい動画を追加するときも、実在を確認できたものだけを足すこと。
 */
(function (root) {
  "use strict";
  const HL = (root.HL = root.HL || {});

  HL.VIDEO_CATEGORIES = [
    { id: "programming", label: "プログラミング入門" },
    { id: "accounts", label: "アカウントと認証" },
    { id: "web", label: "Web・通信の仕組み" },
    { id: "systems", label: "システムとデータの保護" },
    { id: "ai", label: "AIのセキュリティ" },
  ];

  HL.VIDEOS_VERIFIED_ON = "2026-10-12";

  // 評判の根拠（reputation）は画面にも表示する。根拠を確認できなかった動画は載せない。
  const SHIMABU = "プログラミング学習向けのおすすめYouTubeチャンネル紹介記事（WEBCAMP MEDIA、Qbook など）で、初心者に丁寧でわかりやすいと繰り返し紹介されているチャンネル";
  const NISC = "政府のサイバーセキュリティ担当機関（内閣サイバーセキュリティセンター）による公式の啓発動画";
  const TOKUMARU = "『体系的に学ぶ 安全なWebアプリケーションの作り方』（通称：徳丸本）の著者で、ウェブセキュリティの第一人者として広く支持されている徳丸浩氏";

  HL.VIDEOS = [
    // ---------- 日本語（初心者向けでわかりやすいと評判のもの） ----------
    { id: "pnsieVYy72M", title: "【基礎から学ぶ JavaScript 入門 #1】フロントエンド開発でJavaScriptが必要な理由を解説！【ヤフー出身エンジニアが教える初心者向けプログラミング講座】", channel: "しまぶーのIT大学", lang: "ja", category: "programming", level: "入門", description: "JavaScriptが何のためにあるのかを、Webサイトの例で説明する第1回。最初の1本におすすめ。", reputation: SHIMABU, cases: [] },
    { id: "5U0nAojNQS0", title: "【基礎から学ぶ JavaScript 入門 #2】Twitterを例にJavaScriptがどんな働きをするのか理解しよう【ヤフー出身エンジニアが教える初心者向けプログラミング講座】", channel: "しまぶーのIT大学", lang: "ja", category: "programming", level: "入門", description: "身近なSNSの画面を例に、JavaScriptが画面の裏で何をしているかをつかむ。", reputation: SHIMABU, cases: [] },
    { id: "vD1qoNrU8FY", title: "【JavaScript入門 #3】オブジェクト・プロパティ・メソッドについて理解しよう【ヤフー出身エンジニアの初心者向けプログラミング講座】", channel: "しまぶーのIT大学", lang: "ja", category: "programming", level: "入門", description: "user.id のような「.」で項目を取り出す書き方の土台。第2章の事件のコードが読みやすくなる。", reputation: SHIMABU, cases: ["case06", "case07"] },
    { id: "4NPrR_szrUM", title: "【JavaScript入門 #5】変数を理解しよう！var, let, constの使い分けまで解説！【ヤフー出身エンジニアの初心者向けプログラミング講座】", channel: "しまぶーのIT大学", lang: "ja", category: "programming", level: "入門", description: "const と let の使い分けを解説。コード演習の最初に見ておくと安心。", reputation: SHIMABU, cases: ["case01"] },
    { id: "FDqbbLCT4yM", title: "【JavaScript入門 #6】初心者がつまづきがちな「関数」を分かりやすく解説しました【ヤフー出身エンジニアの入門プログラミング講座】", channel: "しまぶーのIT大学", lang: "ja", category: "programming", level: "初級", description: "つまずきやすい「関数」を丁寧に解説。演習の次のステップに。", reputation: SHIMABU, cases: [] },
    { id: "Oi38X7mNixE", title: "【JavaScript入門 #9】これまで講座で学習した知識をフル活用しようヤフー出身エンジニアの入門プログラミング講座】", channel: "しまぶーのIT大学", lang: "ja", category: "programming", level: "初級", description: "シリーズのまとめ回。学んだ知識を組み合わせて使う。", reputation: SHIMABU, cases: [] },
    { id: "SjGEl2OBDwg", title: "【NISC】サイバーセキュリティ対策 フィッシング編", channel: "NISC（内閣サイバーセキュリティセンター）", lang: "ja", category: "accounts", level: "入門", description: "公的機関や有名企業を装ったメール・SMSで偽サイトへ誘導する手口と、被害に遭わないための対策。", reputation: NISC, cases: ["case01", "case02", "case30"] },
    { id: "v36XoD0HIVE", title: "PHP Conference Japan 2020: ウェブセキュリティのありがちな誤解を解説する / 徳丸浩", channel: null, lang: "ja", category: "web", level: "中級", description: "XSSやSQLインジェクションなど、Webアプリの基本的な脆弱性についての「よくある誤解」を解く講演。", reputation: TOKUMARU + "の講演", cases: ["case06", "case09", "case11"] },
    { kind: "channel", id: "websecstudy", url: "https://www.youtube.com/@websecstudy", title: "徳丸浩のウェブセキュリティ講座（チャンネル）", channel: "徳丸浩のウェブセキュリティ講座", lang: "ja", category: "web", level: "初級〜中級", description: "ウェブセキュリティの話題をピンポイントで解説するチャンネル。デモや検証、視聴者の質問への回答も。", reputation: TOKUMARU + "の公式チャンネル", cases: ["case09", "case19"] },
    // ---------- 英語（字幕で見られる定番講座） ----------
    { id: "kmJlnUfMd7I", title: "CS50 Cybersecurity - Introduction", channel: "CS50（Harvard）", lang: "en", category: "systems", level: "入門", description: "ハーバード大学CS50のサイバーセキュリティ講座の導入。講座全体の地図をつかめる。", cases: [] },
    { id: "kUovJpWqEMk", title: "CS50 Cybersecurity - Lecture 0 - Securing Accounts", channel: "CS50（Harvard）", lang: "en", category: "accounts", level: "入門", description: "パスワード、多要素認証、アカウントの守り方。第1章の土台。", cases: ["case03", "case04", "case05"] },
    { id: "X3DVaMnl5n8", title: "CS50 Cybersecurity - Lecture 1 - Securing Data", channel: "CS50（Harvard）", lang: "en", category: "systems", level: "入門", description: "ハッシュや暗号化など、データを守る仕組み。", cases: ["case16", "case21"] },
    { id: "9phdZjF8qOk", title: "CS50 Cybersecurity - Lecture 2 - Securing Systems", channel: "CS50（Harvard）", lang: "en", category: "systems", level: "入門", description: "ネットワークやシステム全体の守り方。", cases: ["case17", "case20"] },
    { id: "5rsKrTh3fAo", title: "CS50 Cybersecurity - Lecture 3 - Securing Software", channel: "CS50（Harvard）", lang: "en", category: "web", level: "初級", description: "ソフトウェアの脆弱性（入力の扱い、CSRFなど）と対策。", cases: ["case09", "case11", "case19"] },
    { id: "3LPJfIKxwWc", title: "CS50x 2024 - Lecture 0 - Scratch", channel: "CS50（Harvard）", lang: "en", category: "programming", level: "入門", description: "変数・条件分岐・ブール式など、プログラミングの考え方の出発点。", cases: ["case01"] },
    { id: "ZXFYT-BG2So", title: "2FA: Two Factor Authentication - Computerphile", channel: "Computerphile", lang: "en", category: "accounts", level: "初級", description: "二要素認証の仕組みと限界。", cases: ["case04"] },
    { id: "86cQJ0MMses", title: "TLS Handshake Explained - Computerphile", channel: "Computerphile", lang: "en", category: "web", level: "初級", description: "HTTPSの裏で動くTLSが何を保証するのか。", cases: ["case02"] },
    { id: "vRBihr41JTo", title: "Cross Site Request Forgery - Computerphile", channel: "Computerphile", lang: "en", category: "web", level: "初級", description: "CSRFがどのように起きるか。", cases: ["case09"] },
    { id: "7U-RbOKanYs", title: "Password Cracking - Computerphile", channel: "Computerphile", lang: "en", category: "accounts", level: "初級", description: "漏れたパスワードがどのように解析されるか。使い回しの危険を理解する助けに。", cases: ["case03"] },
    { id: "ciNHn38EyRc", title: "Running an SQL Injection Attack - Computerphile", channel: "Computerphile", lang: "en", category: "web", level: "中級", description: "入力をそのまま命令に混ぜる危険。プロンプトインジェクションとの共通点も考えられる。", cases: ["case23"] },
    { id: "rAEqP9VEhe8", title: "Generative AI's Greatest Flaw - Computerphile", channel: "Computerphile", lang: "en", category: "ai", level: "中級", description: "間接プロンプトインジェクションの解説。", cases: ["case23", "case24", "case25"] },
  ];


  HL.videoUrl = (v) => (typeof v === "object" ? (v.url || `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`) : `https://www.youtube.com/watch?v=${encodeURIComponent(v)}`);
  HL.videoThumbUrl = (id) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
  HL.videoEmbedUrl = (id) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;

  if (typeof module !== "undefined" && module.exports) module.exports = HL;
})(typeof globalThis !== "undefined" ? globalThis : this);
