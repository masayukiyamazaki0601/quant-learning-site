# Quant Learning — 1年52週のクオンツ学習サイト（自分用）

金融クオンツ1年カリキュラムに基づく自分用の理解サイトです。
**1ユニット = 1週間**の粒度で、数学・金融工学・Python/C++の学習内容をMarkdownで積み上げていきます。

- 数式の手写しはしない運用（MathJax で描画 → コードで数値検証 → 自分の言葉で要約）
- 静的サイト生成は **MkDocs Material**（Markdown中心・検索・数式・コードハイライト対応）

## 起動方法

```bash
cd quant-learning-site

# 初回のみ
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# ローカルプレビュー（http://127.0.0.1:8000/）
.venv/bin/mkdocs serve

# 本番ビルド（site/ に出力）
.venv/bin/mkdocs build
```

## ディレクトリ構成

```
quant-learning-site/
├── mkdocs.yml            # サイト設定（ナビ・テーマ・数式・プラグイン）
├── requirements.txt      # mkdocs-material
├── docs/                 # 本文（Markdown）
│   ├── index.md          # ホーム
│   ├── roadmap/          # ロードマップ（歩き方・全体設計・フェーズ1〜4概要）
│   ├── units/            # ★ユニット本文（52ページの下書きを生成済み）
│   │   ├── p1/p1-01.md … p1-13.md    # フェーズ1（第1〜13週）
│   │   ├── p2/ … p4/                  # フェーズ2〜4
│   ├── javascripts/mathjax.js         # 数式描画設定
│   └── stylesheets/extra.css          # 配色カスタマイズ
└── site/                 # ビルド成果物（git管理外）
```

## 編集ルール

### ユニット（1週間 = 1ページ）

- ファイル：`docs/units/pN/pN-NN.md`（例：フェーズ1・第1週 → `units/p1/p1-01.md`）
- 下書きには「ゴール / 主なトピック / 教材・参考 / 復習ログ」欄があります。学習しながら追記していく
- ページ冒頭の状態（予定 / 制作中 / 公開中）と、対応するフェーズ概要ページの一覧を同じ状態に更新する
- 確認クイズは **選択式**（`.qwrap` 形式・正解音/不正解音つき。`docs/javascripts/quiz.js` と p1-02 内の例を参照）で入れる
- 各概念の直後に **「🏠 日常でいうと…」ボックス**（`.daily-example`）を最低1つ入れる（スマホ・買い物・旅行など身近な例）

### 数式の書き方（MathJax）

```markdown
インライン式：\( r = \ln(S_T/S_0) \)

表示式：
\[
  C = S_0 N(d_1) - K e^{-rT} N(d_2)
\]
```

### ナビゲーション

- ページを追加したら `mkdocs.yml` の `nav:` に追記する
- フェーズ概要ページの「ユニット一覧」表にもリンクを追加する
- ユニットの下書きはナビに載せず、フェーズ概要ページの一覧からのみ開く運用（ナビが肥大化しないように）

## 進捗の記録

- 各ユニット末尾の **復習ログ** テーブル（日付・理解度・メモ）を更新する
- 3ヶ月ごとの節目は `docs/roadmap/index.md` の「四半期ゲート」に確認結果を追記する
