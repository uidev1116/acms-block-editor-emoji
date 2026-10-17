# acms-block-editor-emoji

a-blog cms のブロックエディターに、絵文字の**サジェスト**と**ピッカー**を追加するプラグイン。

- **サジェスト**：本文で `:`（半角）または `：`（全角）に続けて入力すると候補が出る（`:smile`、`：ねこ`）。↑↓ で選択、Enter / Tab で確定、Esc で閉じる。
- **ピッカー**：ツールバーの絵文字ボタン、または `⌘⌥E`（Windows は `Ctrl+Alt+E`）で、検索・カテゴリ・肌の色・最近使った絵文字つきのピッカーを開く。
- 絵文字は Unicode の文字そのものとして本文に入る。保存される HTML に余計な要素は無く、プラグインを無効にしても本文は変わらない。

設計は [docs/design.md](docs/design.md)。

## 動作環境

- a-blog cms 3.2 系（ブロックエディターのプラグイン拡張基盤 `ACMS.plugins` が必要）
- PHP 8.1 – 8.5

## インストール

1. [Releases](https://github.com/uidev1116/acms-block-editor-emoji/releases) の zip（または `src/` を `BlockEditorEmoji` にしたもの）を `extension/plugins/BlockEditorEmoji/` に置く。
2. 管理画面の「拡張アプリ」で `BlockEditorEmoji` をインストールして有効化する。
3. ブロックエディターのあるエントリー編集画面を開いて確認する。

JS / CSS / 絵文字データ（`assets/`）はビルド済みでリポジトリに含まれている。絵文字データは `assets/emojibase/` から自前で配信し、外部の CDN には接続しない。

## 開発

必要なもの：Node 22（`.node-version`）、Docker（PHP のテスト用）。

```bash
npm ci
npm run typecheck   # 型チェック
npm test            # vitest
npm run coverage    # vitest + カバレッジ
npm run build       # src/assets/ に書き出す（コミットする）。CI は再ビルドして差分が無いことを確認する
npm run dev         # 変更を監視してビルド
```

PHP（`docker compose` でコンテナを起動する。ポートは `.env` の `ACMS_PORT`、既定 8080）：

```bash
cp .env.example .env
docker compose up -d --wait
docker compose exec acms bash -lc "cd /workspace && composer install && ACMS_ROOT=/var/www/html vendor/bin/acms-create-database"
docker compose exec acms bash -lc "cd /workspace && composer lint && composer analyse && composer test"
docker compose exec acms bash -lc "cd /workspace && composer coverage"   # カバレッジ
```

バックエンドのリポジトリに submodule として取り込んだ場合は、`npm run setup`（`tools/setup.js`）が `ablogcms/extension/plugins/BlockEditorEmoji` にシンボリックリンクを作る。

## コア更新時の確認事項

`@ablogcms/*` はインストール済みのコアと同じバージョンに固定している（拡張 API の型がコアと一致している必要がある）。コアを更新したら次を確認する。

1. `package.json` の `@ablogcms/*` を合わせて上げ、`npm run typecheck` / `npm test` / `npm run build` を通す。
2. エントリー編集画面で、サジェスト（`:smile`、`：ねこ`）、ツールバーのボタン、`⌘⌥E` のピッカーが動くこと。
3. `blockMenu`（ツールバーの宣言）と `Suggestion` の仕様がコアの更新で変わっていないこと。

## ライセンス

MIT。絵文字データは [emojibase-data](https://github.com/milesj/emojibase)（MIT）。
