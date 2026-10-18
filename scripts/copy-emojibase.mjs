// ビルド後に emojibase-data から必要な 3 ファイルだけを src/assets/emojibase/ へコピーする。
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['ja/data.json', 'ja/messages.json', 'en/shortcodes/github.json'];

for (const file of files) {
  const dest = join(root, 'src/assets/emojibase', file);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(root, 'node_modules/emojibase-data', file), dest);
}
