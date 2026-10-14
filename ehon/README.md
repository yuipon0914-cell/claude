# ポッケの おかねの えほん

3〜5歳向けの読み聞かせ絵本シリーズ（全10巻）です。お金の基本から、投資の考え方までを学べます。Amazon KDP でペーパーバックと Kindle 版を出すための原稿・画像プロンプト・入稿ファイルの作成手順をまとめています。

- 設計書：`docs/specs/2026-10-14-pokke-ehon-design.md`
- 制作計画：`docs/plans/2026-10-14-pokke-ehon.md`

## 準備

- Node.js 22 以上
- PDF 書き出しに Playwright（Chromium）を使います。グローバルに入っている場合は `NODE_PATH=$(npm root -g)` を付けて実行します（以下のコマンドは `ehon/` フォルダで実行）

```sh
npm test                                   # テスト
npm run validate                           # 全巻の原稿チェック
npm run prompts -- 1                       # 第1巻の画像プロンプトを books/vol01/prompts.md に書き出す
NODE_PATH=$(npm root -g) npm run build -- 1  # 第1巻の入稿ファイルを dist/vol01/ に書き出す
```

## 作業の流れ

### 1. 画像生成AIを選ぶ（最初に1回）

`docs/trial-prompts.md` の5場面を、候補のツール（Midjourney、Leonardo AI）で描いて比べます。決めたら、ポッケの基準の絵を `data/reference/pokke.png` に保存し、以後はキャラクター参照機能に毎回登録して使います。モモばあや各巻のゲストも、最初に描いた1枚を基準にしてください。

**販売するので、商用利用できるプランと規約か必ず確認してください。**

### 2. 絵を作る（1巻ごと）

`books/volNN/prompts.md` に、見開きごとのプロンプトとチェック表があります。

| 絵 | ファイル名 | 比率 | 目標の大きさ |
|---|---|---|---|
| 見開き1〜13 | `books/volNN/images/s01.png` 〜 `s13.png` | 2:1 | 5250×2625px 以上 |
| 表紙 | `books/volNN/images/cover.png` | 1:1 | 2625×2625px 以上 |

- AIの出力はたいてい印刷には小さいので、ツールのアップスケール機能で大きくしてください。足りないと書き出し時に「300dpi 未満」と警告が出ます
- Midjourney では、プロンプト末尾の「no text, …」を `--no text, letters, logo` のように書きかえると効きやすくなります。比率は `--ar 2:1` を付けます
- 描けたら、チェック表で目印（ポッケの緑のマフラーなど）を確認します
- 絵の中央（のど）は製本で見えにくくなるので、顔が中央にかかった絵は作り直してください

### 3. 入稿ファイルを書き出す

```sh
NODE_PATH=$(npm root -g) npm run build -- 1
```

`dist/vol01/` に次のファイルができます。

| ファイル | 使い道 |
|---|---|
| `interior.pdf` | ペーパーバックの本文（32ページ・裁ち落としあり） |
| `cover.pdf` | ペーパーバックの表紙（裏表紙・背・表表紙が1枚） |
| `kindle.pdf` | Kindle 版の元（Kindle Create に読み込む） |
| `kindle-cover.jpg` | Kindle 版の表紙（2560×2560px） |

絵がまだ無い場面は灰色の仮の枠で組まれます。文字が枠からはみ出すと書き出しは失敗し、ページ番号が表示されます（そのときは PDF を残しません）。

**入稿用は `--final 1` を付けて書き出してください。** 絵が無い・300dpi 未満・比率違い・著者名が空のどれかがあると、書き出さずに止まります。仮の枠入りの確認用 PDF を、まちがえて入稿しないためです。

```sh
NODE_PATH=$(npm root -g) npm run build -- 1 --final 1
```

**著者名**：`data/series.json` の `author` に入れると、とびらと奥付に入ります（空のままだと表示されず、書き出し時に注意が出ます）。

### 4. KDP に登録する

**ペーパーバック**
- 判型 8.5×8.5in（21.59×21.59cm）、プレミアムカラー、白い紙、裁ち落としあり
- 本文に `interior.pdf`、表紙に `cover.pdf` をアップロード
- 背幅は 32ページで約 0.0751in で計算しています。**KDP の表紙計算ツールの値と照合してください。** 違っていたら `lib/kdp.js` の `SPINE_PER_PAGE` を直して書き出し直します
- 裏表紙の右下（約 2×1.2in）は KDP がバーコードを置く場所なので空けてあります

**Kindle 版**
- Kindle Kids' Book Creator は 2025年に提供終了しました。Kindle Create で `kindle.pdf` を読み込み（コミック・絵本の固定レイアウト）、KPF ファイルを作ってアップロードします
- 表紙に `kindle-cover.jpg` を使います

**AI生成コンテンツの申告**
- 登録時の「AI生成コンテンツ」の質問で、画像（表紙を含む）をAIで作成したと申告します。文章はAIの支援を受けて作成しています。申告しないと販売停止になることがあると報じられています
- 奥付にも「イラストは画像生成AIで作成しています」と入っています

**出版前に**
- 著者用見本（印刷した実物）を注文して、色・文字の読みやすさ・のど・裁ち落としを確認してください
- KDP の規約・寸法は変わることがあるので、公式ヘルプで最新の内容を確認してください

## 原稿を直すとき

`books/volNN.json` を編集し、`npm run validate` で確認します。本文の決まりごと：

- ひらがな・カタカナだけ。わかち書き（言葉の区切りにスペース）
- 1見開き40字まで（スペースを除く）
- 「円」は使わない
- 各見開きに `sceneEn`（場面の英訳。プロンプトに使う）が必要。看板・ポスター・文字など、AIに文字を描かせる言葉は入れない
- `volume` はファイル名の番号と、`title` は `data/series.json` のタイトルと同じにする

## フォルダ構成

```
data/characters.json   キャラクターの見た目（プロンプト文・チェック項目）
data/style.json        画風の共通プロンプト
data/series.json       シリーズ名・著者名・全巻タイトル
books/volNN.json       原稿
books/volNN/prompts.md 画像プロンプトとチェック表（npm run prompts で再生成）
books/volNN/images/    絵を置く場所
lib/                   検証・プロンプト・組版
bin/                   validate / prompts / build
fonts/                 Zen Maru Gothic（SIL Open Font License、OFL.txt 参照）
```
