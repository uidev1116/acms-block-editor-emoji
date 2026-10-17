// @vitest-environment node
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import * as React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { tiptap } from './helpers/tiptap';

/**
 * ビルド成果物（IIFE）の読み込みテスト。
 * - Tiptap がまだ無い状態（ホストのエディター読み込み前）で読み込んでも例外にならない
 * - Tiptap を用意した後にファクトリが拡張を返す
 * - react / tiptap / prosemirror の実装や絵文字データが同梱されていない
 */
let outDir: string;
let js: string;

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), 'emoji-bundle-'));
  await build({ configFile: 'vite.config.ts', logLevel: 'silent', build: { outDir, emptyOutDir: true } });
  js = readFileSync(join(outDir, 'index.js'), 'utf8');
}, 60_000);

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

/** ホストが公開する遅延 Proxy の再現：実体が入るまで触ると例外 */
function lazyTiptap() {
  let runtime: unknown = null;
  const ns = (get: (r: any) => unknown) =>
    new Proxy({}, {
      get: (_t, prop) => {
        if (!runtime) throw new Error('tiptap is not ready');
        return (get(runtime) as any)[prop];
      },
    });
  return {
    set: (r: unknown) => (runtime = r),
    global: {
      core: ns((r) => r.core),
      react: ns((r) => r.react),
      suggestion: ns((r) => r.suggestion),
      pm: { state: ns((r) => r.pm.state) },
    },
  };
}

function loadBundle() {
  const register = vi.fn();
  const lazy = lazyTiptap();
  const win: any = {
    ACMS: { plugins: { register }, Library: { React, ReactJsxRuntime, tiptap: lazy.global }, Config: { root: '/' } },
  };
  win.window = win;
  vm.runInNewContext(js, win);
  return { register, lazy };
}

describe('ビルド成果物', () => {
  it('Tiptap が無い状態で読み込んでも例外にならず、register される', () => {
    const { register } = loadBundle();
    expect(register).toHaveBeenCalledTimes(1);
    expect(register.mock.calls[0][0]).toBe('block-editor-emoji');
  });

  it('setup は Tiptap に触れずに完了し、ファクトリは Tiptap の用意後に拡張を返す', async () => {
    const { register, lazy } = loadBundle();
    const ctx = {
      config: {},
      i18n: { addResources: vi.fn() },
      keyboardShortcuts: { registerShortcut: vi.fn() },
      blockEditor: { registerExtension: vi.fn() },
    };
    expect(() => register.mock.calls[0][1].setup(ctx)).not.toThrow();
    const factory = ctx.blockEditor.registerExtension.mock.calls[0][1];
    lazy.set(tiptap);
    const ext = await factory(tiptap);
    expect(ext.name).toBe('emojiInput');
  });

  it('react / tiptap / prosemirror の実装・react-dom・絵文字データを含まない（60KB 未満）', () => {
    expect(js.length).toBeLessThan(60 * 1024);
    // addProseMirrorPlugins は Tiptap の API 名なので除く
    expect(js.replaceAll('addProseMirrorPlugins', '')).not.toMatch(/prosemirror/i);
    expect(js).not.toMatch(/react-dom|ReactDOM/);
    expect(js).not.toContain('にっこり笑う');
    expect(js).not.toContain('"hexcode"');
    // React 本体（reconciler）が入っていない
    expect(js).not.toContain('react.element');
    expect(js).not.toContain('__SECRET_INTERNALS');
  });

  it('process など Node 専用のグローバルを参照しない（ブラウザで例外になる）', () => {
    expect(js).not.toMatch(/\bprocess\./);
  });

  it('CSS が書き出される', () => {
    expect(readdirSync(outDir)).toContain('index.css');
  });
});
