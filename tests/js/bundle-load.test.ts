// @vitest-environment node
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import * as alert from '@ablogcms/components/alert';
import * as buttonV2 from '@ablogcms/components/button-v2';
import * as popover from '@ablogcms/components/popover';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import * as ReactDomClient from 'react-dom/client';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { tiptap } from './helpers/tiptap';

/**
 * ビルド成果物（IIFE）の読み込みテスト。
 * - Tiptap がまだ無い状態（ホストのエディター読み込み前）で読み込んでも例外にならない
 * - Tiptap を用意した後にファクトリが拡張を返す
 * - react / react-dom / tiptap / prosemirror / デザインシステムの部品の実装や絵文字データが同梱されていない
 *   （どれもコアが `ACMS.Library` で公開しているものを使う。a-blog cms 3.2.38 以上）
 */
let outDir: string;
let js: string;

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), 'emoji-bundle-'));
  await build({ configFile: 'vite.config.ts', logLevel: 'silent', build: { outDir, emptyOutDir: true } });
  js = readFileSync(join(outDir, 'index.js'), 'utf8');
}, 60_000);

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

/** コア（a-blog cms 3.2.38 以上）が `ACMS.Library` で公開するもの。実物のパッケージで代用する */
const coreLibrary = () => ({
  React,
  ReactJsxRuntime,
  ReactDom,
  ReactDomClient,
  components: { popover, alert, 'button-v2': buttonV2 },
});

/** acms.js の ACMS.adminReady の再現：発火済みなら即実行、そうでなければ発火時に実行 */
function fakeAcms(extra: Record<string, unknown> = {}) {
  const listeners: (() => void)[] = [];
  let done = false;
  const acms: any = {
    Config: { root: '/', dbCharset: 'utf8mb4' },
    adminReady: (fn: () => void) => (done ? fn() : listeners.push(fn)),
    ...extra,
  };
  return {
    acms,
    /** admin.js の初期化が終わったことにする */
    fireAdminReady() {
      acms.Library = coreLibrary();
      done = true;
      listeners.forEach((fn) => fn());
    },
  };
}

function run(acms: unknown) {
  const win: any = { ACMS: acms, console };
  win.window = win;
  vm.runInNewContext(js, win);
  return win;
}

describe('ビルド成果物', () => {
  it('admin.js より先に実行されても例外にならず、adminReady で register する', () => {
    const register = vi.fn();
    const { acms, fireAdminReady } = fakeAcms();
    expect(() => run(acms)).not.toThrow();
    // この時点では ACMS.plugins も Library も無い
    acms.plugins = { register };
    fireAdminReady();
    expect(register).toHaveBeenCalledTimes(1);
    expect(register.mock.calls[0][0]).toBe('block-editor-emoji');
  });

  it('adminReady の発火後に読み込まれても、即時に register する', () => {
    const register = vi.fn();
    const { acms, fireAdminReady } = fakeAcms();
    acms.plugins = { register };
    fireAdminReady();
    run(acms);
    expect(register).toHaveBeenCalledTimes(1);
  });

  it('古いコア（ReactDom / components が無い。3.2.37 まで）では、何も登録せず、必要なバージョンを案内する', () => {
    const register = vi.fn();
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { acms } = fakeAcms();
    acms.plugins = { register };
    acms.Library = { React, ReactJsxRuntime }; // React と JSX ランタイムだけ
    acms.adminReady = (fn: () => void) => fn(); // 初期化済みのコア：即時に実行される
    expect(() => run(acms)).not.toThrow();
    expect(register).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(expect.stringContaining('3.2.38'));
    info.mockRestore();
  });

  it('管理画面以外（adminReady が発火しない）では何もしない。ACMS が無い・古いコアでも例外にならない', () => {
    const register = vi.fn();
    const { acms } = fakeAcms();
    acms.plugins = { register };
    expect(() => run(acms)).not.toThrow();
    expect(register).not.toHaveBeenCalled();
    expect(() => run({ Library: {}, Config: {} })).not.toThrow(); // adminReady が無い
    const none: any = {};
    none.window = none;
    expect(() => vm.runInNewContext(js, none)).not.toThrow(); // ACMS が無い
  });

  it('register が例外を投げても、adminReady の通知側には伝えない', () => {
    const { acms, fireAdminReady } = fakeAcms();
    acms.plugins = {
      register: () => {
        throw new Error('boom');
      },
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    run(acms);
    expect(() => fireAdminReady()).not.toThrow();
  });

  it('setup は Tiptap に触れずに完了し、ファクトリは Tiptap の用意後に拡張を返す', async () => {
    const register = vi.fn();
    const { acms, fireAdminReady } = fakeAcms();
    acms.plugins = { register };
    run(acms);
    fireAdminReady();
    const ctx = {
      config: {},
      i18n: { addResources: vi.fn() },
      keyboardShortcuts: { registerShortcut: vi.fn() },
      blockEditor: { registerExtension: vi.fn() },
    };
    expect(() => register.mock.calls[0][1].setup(ctx)).not.toThrow();
    const factory = ctx.blockEditor.registerExtension.mock.calls[0][1];
    const ext = await factory(tiptap);
    expect(ext.name).toBe('emojiInput');
  });

  it('react / react-dom / tiptap / prosemirror / デザインシステムの部品・絵文字データを含まない（60KB 未満）', () => {
    expect(js.length).toBeLessThan(60 * 1024);
    // コアの公開物を、external として参照している
    // （バンドラーは `components.popover` / ``components[`button-v2`]`` のどちらの書き方にも整形する）
    for (const name of ['popover', 'alert', 'button-v2']) {
      expect(js).toMatch(new RegExp(`ACMS\\.Library\\.components(\\.${name}|\\[[\`"']${name}[\`"']\\])`));
    }
    // Popover（@floating-ui/react）や classnames の実装を同梱していない
    expect(js).not.toContain('acms-admin-popover');
    expect(js).not.toContain('FloatingPortal');
    expect(js).not.toContain('classNames');
    // addProseMirrorPlugins は Tiptap の API 名なので除く
    expect(js.replaceAll('addProseMirrorPlugins', '')).not.toMatch(/prosemirror/i);
    expect(js).not.toMatch(/react-dom|ReactDOM/);
    // react-dom 本体（reconciler / scheduler）を同梱していない
    expect(js).not.toContain('__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE');
    expect(js).not.toContain('unstable_scheduleCallback');
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
