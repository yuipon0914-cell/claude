/*
 * 動画で学ぶ — 実在を確認した YouTube 動画だけを掲載する。
 *
 * 確認方法: 2026-10-12 に Web 検索のインデックスで、URL（動画ID）とタイトルの組を確認した。
 * 開発環境からは youtube.com に直接接続できなかったため、埋め込み可否は未確認。
 * そのため画面では埋め込みを試しつつ、必ず「YouTubeで開く」リンクも表示する。
 * channel は検索結果で投稿元を確認できたものだけ記載し、不明なものは null にしている。
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

  HL.VIDEOS = [
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
    { id: "E08jeQBa1D0", title: "JavaScriptの「基礎」が1時間で分かる「超」入門講座【初心者向け】", channel: null, lang: "ja", category: "programming", level: "入門", description: "JavaScriptの基本文法を日本語で学べる入門講座。", cases: [] },
    { id: "pnsieVYy72M", title: "【基礎から学ぶ JavaScript 入門 #1】フロントエンド開発でJavaScriptが必要な理由を解説！【ヤフー出身エンジニアが教える初心者向けプログラミング講座】", channel: null, lang: "ja", category: "programming", level: "入門", description: "JavaScript入門シリーズの第1回（日本語）。", cases: [] },
    { id: "1mp29oseeFE", title: "華麗なる情報セキュリティ対策 統合版", channel: null, lang: "ja", category: "systems", level: "入門", description: "日常の情報セキュリティ対策を紹介する日本語の動画。", cases: ["case01", "case02"] },
  ];

  HL.videoUrl = (id) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  HL.videoEmbedUrl = (id) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;

  if (typeof module !== "undefined" && module.exports) module.exports = HL;
})(typeof globalThis !== "undefined" ? globalThis : this);
