// U-1/U-2 確認用の最小構成（後で本実装に置き換える）
import { register } from '@ablogcms/plugins';

const w = window as any; // eslint-disable-line
register('block-editor-emoji', {
  version: '0.1.0',
  setup() {
    // eslint-disable-next-line no-console
    console.log('[block-editor-emoji] setup', {
      plugins: typeof w.ACMS?.plugins,
      react: typeof w.ACMS?.Library?.React,
      jsx: typeof w.ACMS?.Library?.ReactJsxRuntime,
      root: w.ACMS?.Config?.root,
      admin: w.ACMS?.Config?.admin,
    });
  },
});
