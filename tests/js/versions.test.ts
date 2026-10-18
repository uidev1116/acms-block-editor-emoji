// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VERSION } from '../../frontend/plugin';
import { globals } from '../../vite.config';

/** バージョンは 3 か所にある（リリース時にそろえる）。ずれたらここで気づく */
describe('バージョン', () => {
  it('ServiceProvider::$version・package.json・frontend/plugin.ts が一致する', () => {
    const php = readFileSync('src/ServiceProvider.php', 'utf8');
    const phpVersion = /public \$version = '([^']+)'/.exec(php)?.[1];
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    expect(phpVersion).toBe(VERSION);
    expect(pkg.version).toBe(VERSION);
  });
});

/** 直接 import しているパッケージは、推移的依存に頼らず package.json に宣言する */
describe('依存の宣言', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  const files = readdirSync('frontend', { recursive: true, encoding: 'utf8' }).filter((f) => /\.tsx?$/.test(f));

  /** import / export from / 副作用 import / 動的 import の指定子（相対パスを除く） */
  function specifiers(): string[] {
    const found = new Set<string>();
    for (const file of files) {
      const source = readFileSync(`frontend/${file}`, 'utf8');
      for (const m of source.matchAll(/(?:from\s*|import\s*\(?\s*)['"]([^'".][^'"]*)['"]/g)) found.add(m[1]);
    }
    return [...found];
  }
  const packageName = (spec: string) =>
    spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];

  it('frontend/ が import するパッケージは dependencies / devDependencies にある', () => {
    const declared = new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)]);
    expect(
      specifiers()
        .map(packageName)
        .filter((n) => !declared.has(n)),
    ).toEqual([]);
  });

  it('バンドルに同梱される（ホストが公開しない）パッケージは dependencies にある', () => {
    // 型だけの import（実行時には消える）は除く
    const typeOnly = ['@ablogcms/block-editor/tiptap', '@ablogcms/block-editor/types', '@ablogcms/types/acms'];
    const bundled = specifiers()
      .filter((spec) => !(spec in globals) && !typeOnly.includes(spec))
      .map(packageName);
    expect(bundled.filter((n) => !(n in pkg.dependencies))).toEqual([]);
  });
});
