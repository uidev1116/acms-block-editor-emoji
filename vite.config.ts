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

// externals: import 元 → ホストが公開しているグローバル
export const globals: Record<string, string> = {
  react: 'ACMS.Library.React',
  'react/jsx-runtime': 'ACMS.Library.ReactJsxRuntime',
  '@tiptap/core': 'ACMS.Library.tiptap.core',
  '@tiptap/react': 'ACMS.Library.tiptap.react',
  '@tiptap/suggestion': 'ACMS.Library.tiptap.suggestion',
  ...Object.fromEntries(TIPTAP_PM.map((p) => [`@tiptap/pm/${p}`, `ACMS.Library.tiptap.pm.${camel(p)}`])),
};

/**
 * 管理画面の JS（admin.js）は async で読み込まれるため、type="module" のプラグインが先に実行されることが
 * ある（ACMS.plugins / ACMS.Library.React がまだ無い）。IIFE は externals を読み込み時に束縛するので、
 * 全体を関数で包み、ACMS.plugins が代入された時点（admin.js の初期化の最後）で実行する。
 * ACMS.plugins が最初から有れば即実行。管理画面以外（代入されない）では何も実行しない。
 */
const BOOT_BANNER = ';(function(){var __run=function(){';
const BOOT_FOOTER = `};
var A=window.ACMS;
if(!A)return;
if(A.plugins&&A.Library&&A.Library.React){__run();return;}
var cur;
Object.defineProperty(A,'plugins',{configurable:true,enumerable:true,get:function(){return cur;},set:function(v){
Object.defineProperty(A,'plugins',{configurable:true,enumerable:true,writable:true,value:v});
__run();}});
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
      external: (id: string) => id in globals,
      output: { globals, banner: BOOT_BANNER, footer: BOOT_FOOTER },
    },
  },
}));
