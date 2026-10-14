# 「ポッケ」シリーズ 制作計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全10巻の原稿・AI用プロンプト・キャラクター資料と、KDP 入稿用 PDF（本文・表紙・Kindle 用）を自動で作る仕組みを用意し、著者が絵を入れるだけで入稿ファイルができる状態にする。

**Architecture:** 原稿は1巻1つの JSON（`ehon/books/volNN.json`）。検証（`lib/manuscript.js`）→ プロンプト生成（`lib/prompts.js`）→ HTML 組版（`lib/layout.js`）→ Playwright の Chromium で PDF 化（`bin/build.js`）の一方向の流れ。絵がまだ無い場面は仮の枠で組むので、絵の前でも通しで確認できる。

**Tech Stack:** Node.js 22（依存パッケージなし）、Playwright 1.56（グローバル導入済み。`NODE_PATH=$(npm root -g)` で読む）、フォント Zen Maru Gothic Medium（OFL、リポジトリに同梱）。

**Spec:** `ehon/docs/specs/2026-10-14-pokke-ehon-design.md`

## Global Constraints

- 判型 8.5in×8.5in、プレミアムカラー、裁ち落とし 0.125in。本文 PDF の1ページは **8.625in×8.75in**（外側と上下に裁ち落とし）
- 総ページ数 **32**：p1 とびら／p2–27 本文13見開き／p28–29 おうちの方へ／p30 シリーズ紹介／p31 奥付／p32 空白
- 背幅 = ページ数 × **0.002347in**（プレミアムカラーの係数。出版前に KDP の表紙計算ツールで照合）。32ページなら 0.0751in で、0.2in 未満なので背に文字は入れない
- 表紙 PDF：幅 = 0.125 + 8.5 + 背幅 + 8.5 + 0.125、高さ 8.75in
- 文字の安全域：外側・上下は仕上がり線から 0.375in、のど（中央の綴じ側）も 0.375in 以上離す
- 印刷用の画像は 300dpi を目標（見開き1枚 = 17.25in×8.75in → 5175×2625px）
- 本文：ひらがな・カタカナ・わかち書きのスペース・「、。！？ー〜…「」」だけ。1見開き40字以内（スペースを除く）
- 物語に「円」を出さない。おうちの方へに「特定の金融商品をすすめるものではありません」を必ず入れる
- 横書き・左開き（日本語の KDP は縦書き用に読む方向の設定があるが、本シリーズは横書きで確定）
- Kindle 版：Kindle Kids' Book Creator は 2025年に提供終了。仕上がりサイズ（裁ち落としなし 8.5in 角）の PDF を作り、著者が Kindle Create に読み込んで KPF にして入稿する
- 奥付に「イラストは画像生成AIで作成しています」と明記する

## Review Focus

1. **絵の解像度不足**：AI の出力は 2000px 前後が多く、印刷すると粗くなる → build が画像ごとの実効 dpi を出し、300dpi 未満を警告する（Task 4）
2. **文字があふれる**：長い文や改行で文字枠からはみ出す → build 時に各文字枠のはみ出しを測り、あったら失敗にする（Task 4）
3. **フォントが埋め込まれていない**：KDP では入稿エラーになる → PDF に Zen Maru Gothic が埋め込まれていることをテストする（Task 4）
4. **漢字や不正な文字が本文に混ざる**：原稿を手で直したときに起きやすい → 検証で拒否する（Task 1）
5. **絵が無い・比率が違う**：まだ描いていない場面や、2:1 でない画像 → 仮の枠で組み、比率違いは中央を切り抜いて警告する（Task 4）

---

## ファイル構成

```
ehon/
  package.json           test / build / prompts のスクリプト
  README.md              著者向けの作業手順（絵の作り方・置き場所・KDP 入稿・AI申告）
  fonts/ZenMaruGothic-Medium.ttf, fonts/OFL.txt
  data/characters.json   固定キャラ2匹＋ゲスト10匹の見た目（プロンプト文・チェック項目）
  data/style.json        画風の共通プロンプト・避けたい要素
  data/series.json       全10巻のタイトル（シリーズ紹介ページ用）
  lib/kdp.js             寸法の計算
  lib/text-rules.js      本文1見開きの文字の検証
  lib/manuscript.js      原稿全体の検証
  lib/prompts.js         場面ごとのプロンプトとチェック表の生成
  lib/layout.js          32ページの HTML の生成
  bin/validate.js        全巻の検証
  bin/prompts.js         books/volNN/prompts.md を書き出す
  bin/build.js           dist/volNN/ に PDF を書き出す
  books/vol01.json … vol10.json
  books/volNN/images/    著者が置く絵（s01.png … s13.png, cover.png）
  docs/trial-prompts.md  ツール選びの試し描き用プロンプト
  tests/run-tests.js     依存なしのテスト（node:assert）
```

---

### Task 1: 寸法計算と原稿の検証

**Files:**
- Create: `ehon/package.json`, `ehon/lib/kdp.js`, `ehon/lib/text-rules.js`, `ehon/lib/manuscript.js`, `ehon/tests/run-tests.js`

**Interfaces:**
- Produces:
  - `kdp.js`: `PAGES = 32`, `TRIM = 8.5`, `BLEED = 0.125`, `SAFE = 0.375`, `SPINE_PER_PAGE = 0.002347`, `spineWidthIn(pages: number): number`, `coverSizeIn(pages: number): {width: number, height: number}`, `interiorPageSizeIn(): {width: 8.625, height: 8.75}`, `dpi(px: number, inches: number): number`
  - `text-rules.js`: `checkSpreadText(text: string): string[]`（エラー文の配列。空なら合格）
  - `manuscript.js`: `validateManuscript(ms: object, characterIds: string[]): string[]`
- 原稿 JSON の形：
  ```json
  {
    "volume": 1, "title": "ポッケと こうかんこ", "guest": "mimi",
    "learning": "お金は交換の道具",
    "spreads": [ { "text": "…", "scene": "場面の説明（日本語）", "characters": ["pokke"], "shot": "wide|medium|close" } ],
    "parents": { "heading": "…", "body": ["段落", "…"], "questions": ["…", "…", "…"] }
  }
  ```

- [ ] **Step 1: テストを書く**（`tests/run-tests.js`。小さな `test(name, fn)` を自作し、失敗数を exit code にする）
  - `spineWidthIn(32)` が `0.0751` に近い（誤差 1e-4）
  - `coverSizeIn(32)` が `{width: 17.3251, height: 8.75}` に近い
  - `checkSpreadText("ポッケは どんぐりを みつけました。")` → `[]`
  - `checkSpreadText("ポッケは森へ")` → 漢字のエラーを含む
  - `checkSpreadText("ぽっけはどんぐりをみつけましたよかったね")`（10字超でスペースなし）→ わかち書きのエラーを含む
  - 41字（スペース除く）→ 文字数のエラーを含む
  - `validateManuscript` の正常な見本（13見開き・質問3つ）→ `[]`
  - 見開き12個 → エラー、質問2つ → エラー、未知のキャラ ID → エラー、本文・場面・おうちの方への本文のどこかに「円」→ エラー
- [ ] **Step 2: `node ehon/tests/run-tests.js` で失敗を確認**
- [ ] **Step 3: 3ファイルを実装**。使える文字は正規表現 `^[ぁ-ゖァ-ヺー 、。！？〜…「」]+$`。`package.json` は `{"scripts": {"test": "node tests/run-tests.js", "validate": "node bin/validate.js", "prompts": "node bin/prompts.js", "build": "node bin/build.js"}}`
- [ ] **Step 4: テストが通ることを確認**
- [ ] **Step 5: コミット**

### Task 2: キャラクター・画風の資料とプロンプト生成

**Files:**
- Create: `ehon/data/characters.json`, `ehon/data/style.json`, `ehon/lib/prompts.js`, `ehon/bin/prompts.js`, `ehon/docs/trial-prompts.md`
- Modify: `ehon/tests/run-tests.js`

**Interfaces:**
- `characters.json`：`[{ "id", "name", "species", "role", "look": "英語の見た目の固定文", "marks": ["チェック項目（日本語）"] }]`。ID は `pokke, momoba, mimi, kira, dosshiri, chuchi, tsuchio, bunta, dan, pichon, jay, kon`（第1〜10巻のゲスト順）
- `style.json`：`{ "style": "画風の共通文（英語）", "avoid": "避けたい要素（英語。文字・ロゴ・人間など）", "aspect": "2:1" }`
- Produces: `buildPrompt(spread, characters, style): string`、`buildChecklist(spread, characters): string[]`、`renderPromptsMarkdown(ms, characters, style): string`
- Consumes: `validateManuscript`（`bin/prompts.js` は検証に通った原稿だけを出力する）

- [ ] **Step 1: テストを書く**
  - `buildPrompt` の結果に、場面に出る各キャラの `look`・`style.style`・「no text」・「keep the center vertical strip free of faces」が含まれ、出ないキャラの `look` は含まれない
  - `buildChecklist` に、出るキャラの `marks` がすべて入る
  - `characters.json` の ID が上の12個ちょうどで、全員 `look` と `marks`（1つ以上）を持つ。ポッケの `marks` に「緑のマフラー」が入る
- [ ] **Step 2: 失敗を確認**
- [ ] **Step 3: 資料と実装**。見た目は設計書どおり（ポッケ＝明るい茶色の毛・大きなふわふわのしっぽ・緑のマフラー）。モモばあは見分けやすい目印（例：灰色まじりの毛・丸めがね・赤いエプロン）を決める。画風はやわらかい水彩・あたたかい秋の森の色。プロンプトは「上側 1/3 は空や葉の、文字を置ける静かな余白」を指定する。`trial-prompts.md` にはポッケの試し描き5場面（正面・横向き・走る・泣く・どんぐりを持つ）と、ツールを比べる観点を書く
- [ ] **Step 4: テストが通ることを確認**
- [ ] **Step 5: コミット**

### Task 3: 32ページの HTML 組版

**Files:**
- Create: `ehon/lib/layout.js`, `ehon/data/series.json`（全10巻の `{volume, title}`。設計書6章のタイトルどおり）
- Modify: `ehon/tests/run-tests.js`

**Interfaces:**
- Consumes: `kdp.js` の寸法、原稿 JSON
- Produces: `renderInterior(ms, opts): string`（`opts = { imagesDir: string, fontPath: string, kindle: boolean }`。`kindle: true` なら裁ち落としなしの 8.5in 角）、`renderCover(ms, opts): string`（`opts = { imagesDir, fontPath, pages: 32 }`）、`renderKindleCover(ms, opts): string`
- 各ページは `<section class="page" data-page="N">`。本文の文字は `class="text"`、見開きの絵は2ページに分けて表示（左ページは画像の左半分、右ページは右半分）。画像が無いときは、場面の説明を書いた灰色の仮の枠

- [ ] **Step 1: テストを書く**
  - `renderInterior` の結果の `data-page` がちょうど32個
  - 本文13見開きの文字がすべて含まれ、p28–29 におうちの方への質問3つ、p31 に「画像生成AI」、おうちの方へに「特定の金融商品をすすめるものではありません」
  - p30 に全10巻のタイトルが含まれ、次の巻（第10巻では「おしまい」の案内）が示される
  - 画像なしのとき仮の枠（`class="placeholder"`）が13組
  - `kindle: false` ではページの CSS サイズが `8.625in` × `8.75in`、`kindle: true` では `8.5in` × `8.5in`
- [ ] **Step 2: 失敗を確認**
- [ ] **Step 3: 実装**。フォントは `@font-face` で `fontPath` を読み込む。文字は 26pt 前後、行間はゆったり。文字枠は安全域の内側に置き、白いふちどり（`paint-order: stroke`）で絵の上でも読めるようにする
- [ ] **Step 4: テストが通ることを確認**
- [ ] **Step 5: コミット**

### Task 4: PDF 書き出し（本文・表紙・Kindle 用）

**Files:**
- Create: `ehon/bin/build.js`, `ehon/bin/validate.js`, `ehon/fonts/ZenMaruGothic-Medium.ttf`, `ehon/fonts/OFL.txt`
- Modify: `ehon/tests/run-tests.js`, `.gitignore`（`ehon/dist/` を追加）

**Interfaces:**
- Consumes: `renderInterior`, `renderCover`, `renderKindleCover`, `validateManuscript`
- Produces: `node ehon/bin/build.js 1` → `ehon/dist/vol01/interior.pdf`, `cover.pdf`, `kindle.pdf`, `kindle-cover.jpg`（2560×2560px）。標準出力に、画像ごとの実効 dpi と警告を出す

- [ ] **Step 1: フォントを取得**：`https://raw.githubusercontent.com/google/fonts/main/ofl/zenmarugothic/` から `ZenMaruGothic-Medium.ttf` と `OFL.txt`
- [ ] **Step 2: テストを書く**（Playwright がある場合だけ実行する `build` グループ。テスト用の原稿で実際に書き出す）
  - `interior.pdf` のページ数が32（`/Type /Page` の数）、MediaBox が 621×630pt
  - `cover.pdf` の MediaBox 幅が `17.3251in × 72` に近い（±1pt）、高さ 630pt
  - `kindle.pdf` が 612×612pt で32ページ
  - PDF に `ZenMaruGothic` の埋め込みフォントが含まれる
  - 文字枠がはみ出す原稿（文字数の上限は無視して、極端に長い文を入れる）では、build が失敗（exit code ≠ 0）し、はみ出したページ番号を出す
  - 1000×500px の画像を置くと「300dpi 未満」の警告を出し、1000×1000px の画像では「比率」の警告も出す
- [ ] **Step 3: 失敗を確認**
- [ ] **Step 4: 実装**。Chromium で HTML を開き、`document.fonts.ready` を待ってから各 `.text` の `scrollHeight > clientHeight` を調べ、`page.pdf({ width, height, printBackground: true })` で書き出す。画像の大きさは PNG/JPEG のヘッダから読む（依存なし）。`validate.js` は `books/vol*.json` をすべて検証し、エラーがあれば exit 1
- [ ] **Step 5: テストが通ることを確認**
- [ ] **Step 6: コミット**

### Task 5: 第1巻の原稿と通しの確認

**Files:**
- Create: `ehon/books/vol01.json`, `ehon/books/vol01/prompts.md`（生成物）

- [ ] **Step 1: 原稿を書く**：設計書6章の第1巻（ポッケと こうかんこ／ウサギのミミ／お金は交換の道具）。13見開きで「おなかがすく → ミミのにんじんがほしい → ドングリと取りかえる → ほかの動物とも取りかえられると気づく → モモばあの問いかけ → 安心して終わる」の流れ。おうちの方へは、物々交換とお金の役割、質問3つ
- [ ] **Step 2: `npm run validate` が通る**
- [ ] **Step 3: `npm run prompts -- 1` でプロンプトとチェック表を書き出す**
- [ ] **Step 4: `npm run build -- 1` で仮の枠入りの PDF を書き出し、全ページを画像にして目で確認する**（文字の位置・安全域・のど・おうちの方へ・奥付）
- [ ] **Step 5: コミット**（`dist/` は含めない）

### Task 6: 第2〜10巻の原稿

**Files:**
- Create: `ehon/books/vol02.json` … `vol10.json`、各 `books/volNN/prompts.md`

各巻について、Task 5 の Step 1〜3 と同じ手順で書く。物語・ゲスト・学ぶことは設計書6章の表のとおり。シリーズを通して守ること：
- ポッケが迷う・失敗する → 自分で気づく。モモばあは問いかけるだけ
- 第8〜10巻の「減る」「失う」場面のあとは、必ず安心できる場面で終える
- 第10巻はそれまでの学び（待つ・育てる・分ける・増減がある）を、ポッケ自身が思い出して見抜く
- おうちの方へは、実際のお金の言葉（第4巻＝利息、第6巻＝複利、第7巻＝株式と配当、第8巻＝値動き、第9巻＝分散、第10巻＝投資詐欺の見分け方）で説明する

- [ ] **Step 1: 第2〜4巻を書き、validate を通して、コミット**
- [ ] **Step 2: 第5〜7巻を書き、validate を通して、コミット**
- [ ] **Step 3: 第8〜10巻を書き、validate を通して、コミット**
- [ ] **Step 4: 全10巻の build が通ることを確認**

### Task 7: 著者向けの手順書

**Files:**
- Create: `ehon/README.md`

- [ ] **Step 1: 書く**：①試し描きでツールを選ぶ（`docs/trial-prompts.md`）②`prompts.md` を使って絵を作り、`books/volNN/images/s01.png…s13.png, cover.png` に置く（5175×2625px 以上が目標。足りなければ各ツールのアップスケール機能を使う）③チェック表で絵を確認 ④`npm run build -- N` ⑤KDP にペーパーバック（interior.pdf・cover.pdf・プレミアムカラー・8.5×8.5in・裁ち落としあり）と、Kindle Create で `kindle.pdf` から作った KPF を登録 ⑥AI生成コンテンツの申告 ⑦著者用見本で確認。KDP の正式な規約・背幅は、出版前に公式ヘルプと表紙計算ツールで照合すること
- [ ] **Step 2: README の手順どおりにコマンドを実行して動くことを確認し、コミットして push**
