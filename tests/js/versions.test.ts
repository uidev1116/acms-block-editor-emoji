// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VERSION } from '../../frontend/plugin';

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
