import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const TIPTAP_PM = [
  'state',
  'model',
  'view',
  'transform',
  'commands',
  'keymap',
  'inputrules',
  'changeset',
  'dropcursor',
  'gapcursor',
  'history',
  'schema-list',
  'tables',
] as const;
const camel = (s: string) => s.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

const COMPONENTS_PREFIX = '@ablogcms/components/';

// externals: import 元 → ホストが公開しているグローバル（a-blog cms 3.2.38 以上）
export const globals: Record<string, string> = {
  react: 'ACMS.Library.React',
  'react/jsx-runtime': 'ACMS.Library.ReactJsxRuntime',
  'react-dom': 'ACMS.Library.ReactDom',
  'react-dom/client': 'ACMS.Library.ReactDomClient',
  '@tiptap/core': 'ACMS.Library.tiptap.core',
  '@tiptap/react': 'ACMS.Library.tiptap.react',
  '@tiptap/suggestion': 'ACMS.Library.tiptap.suggestion',
  ...Object.fromEntries(TIPTAP_PM.map((p) => [`@tiptap/pm/${p}`, `ACMS.Library.tiptap.pm.${camel(p)}`])),
};

/**
 * `@ablogcms/components/<サブパス>` は、コアが `ACMS.Library.components['<サブパス>']` で公開している
 * （キーはサブパス名と同じ。`button-v2` のようにハイフンを含むので括弧記法）。
 * 個別に列挙せず、接頭辞で機械的に external にする。
 */
export const isExternal = (id: string): boolean => id in globals || id.startsWith(COMPONENTS_PREFIX);
export const globalFor = (id: string): string =>
  id.startsWith(COMPONENTS_PREFIX)
    ? `ACMS.Library.components[${JSON.stringify(id.slice(COMPONENTS_PREFIX.length))}]`
    : (globals[id] ?? id);

/**
 * 管理画面の JS（admin.js）は async で読み込まれるため、type="module" のプラグインが先に実行されることが
 * ある（ACMS.plugins / ACMS.Library.React がまだ無い）。IIFE は externals を読み込み時に束縛するので、
 * 全体を関数で包み、コアが公開している ACMS.adminReady（acms.js が同期で定義する。admin.js の初期化後に
 * 発火し、後から呼んでも即時に実行される）で実行する。
 * admin.js が読み込まれないページ（未ログインの公開ページなど。adminReady が発火しない）では何も実行しない。
 * register() が投げた例外は握りつぶす（admin.js の初期化の通知を止めないため）。
 */
const BOOT_BANNER = `;(function(){var __run=function(){
var L=window.ACMS&&window.ACMS.Library;
if(!L||!L.ReactDom||!L.components){console.info('[block-editor-emoji] a-blog cms 3.2.38 以上が必要です（ACMS.Library.ReactDom / components がありません）。');return;}
try{`;
const BOOT_FOOTER = `}catch(e){console.error('[block-editor-emoji]',e);}};
var A=window.ACMS;
if(A&&typeof A.adminReady==='function'){A.adminReady(__run);}
})();`;

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // ライブラリモードは process.env.NODE_ENV を置換しない。ブラウザには process が無いので固定する
  define: { 'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production') },
  publicDir: false, // 絵文字データはビルド後に scripts/copy-emojibase.mjs でコピーする
  build: {
    outDir: 'src/assets',
    emptyOutDir: true,
    sourcemap: mode === 'development',
    minify: mode !== 'development',
    lib: {
      entry: 'frontend/index.ts',
      formats: ['iife'],
      name: 'AcmsBlockEditorEmoji',
      fileName: () => 'index.js',
      cssFileName: 'index',
    },
    rolldownOptions: {
      external: isExternal,
      output: { globals: globalFor, banner: BOOT_BANNER, footer: BOOT_FOOTER },
    },
  },
}));
