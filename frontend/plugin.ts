import type { PluginContext } from '@ablogcms/plugins';
import { createEmojiExtension } from './extension';
import { NAMESPACE, resources } from './i18n';

export const PLUGIN_NAME = NAMESPACE;
export const VERSION = '0.1.0';

/** 絵文字データ（emojibase）の置き場所。PHP から渡された値を優先し、無ければ ACMS.Config.root から組み立てる */
export function resolveAssetsUrl(config: Record<string, unknown> | undefined): string {
  const fromConfig = config?.assetsUrl;
  const url =
    typeof fromConfig === 'string' && fromConfig !== ''
      ? fromConfig
      : `${window.ACMS?.Config?.root ?? '/'}extension/plugins/BlockEditorEmoji/assets`;
  return url.replace(/\/+$/, '');
}

/**
 * 絵文字（4 バイト文字）を保存できる DB か。コアのライトエディターの絵文字ピッカーと同じ条件で、
 * 接続文字コード（`ACMS.Config.dbCharset`。config.server.php の `DB_CONNECTION_CHARSET`）が
 * utf8mb4 のときだけ使える。そうでないと、保存した絵文字が `?` などに化ける。
 */
export function canStoreEmoji(): boolean {
  return window.ACMS?.Config?.dbCharset === 'utf8mb4';
}

/**
 * ここでは Tiptap を触らない（この時点ではまだ無い）。値が必要な処理はファクトリの中（エディターの
 * 読み込み後）で行う。
 */
export function setup(ctx: PluginContext): void {
  if (!canStoreEmoji()) {
    console.info(
      '[block-editor-emoji] DB の接続文字コードが utf8mb4 ではないため、絵文字の入力を無効にしました（config.server.php の DB_CONNECTION_CHARSET）。',
    );
    return;
  }

  ctx.i18n.addResources('ja', resources.ja);
  ctx.i18n.addResources('en', resources.en);

  ctx.keyboardShortcuts.registerShortcut('open-emoji-picker', {
    label: resources.ja.shortcutOpenPicker,
    commands: ['Alt', 'Mod', 'E'],
    categoryId: 'block-editor',
  });

  const deps = { emojibaseUrl: `${resolveAssetsUrl(ctx.config)}/emojibase` };
  ctx.blockEditor.registerExtension('emojiInput', (tiptap) => createEmojiExtension(tiptap, deps));
}
