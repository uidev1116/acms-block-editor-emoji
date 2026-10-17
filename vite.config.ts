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
      output: { globals },
    },
  },
}));
