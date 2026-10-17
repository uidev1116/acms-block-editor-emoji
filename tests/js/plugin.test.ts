import { afterEach, describe, expect, it, vi } from 'vitest';
import { PLUGIN_NAME, resolveAssetsUrl, setup } from '../../frontend/plugin';

afterEach(() => vi.unstubAllGlobals());

function fakeCtx(config: Record<string, unknown> = {}) {
  return {
    name: PLUGIN_NAME,
    config,
    i18n: { addResources: vi.fn() },
    keyboardShortcuts: { registerShortcut: vi.fn() },
    blockEditor: { registerExtension: vi.fn() },
  };
}

describe('resolveAssetsUrl', () => {
  it('PHP から渡された assetsUrl を優先し、末尾のスラッシュを落とす', () => {
    expect(resolveAssetsUrl({ assetsUrl: '/cdn/assets//' })).toBe('/cdn/assets');
  });

  it('無ければ ACMS.Config.root から組み立てる', () => {
    (window as unknown as { ACMS: unknown }).ACMS = { Config: { root: '/blog/' } };
    expect(resolveAssetsUrl(undefined)).toBe('/blog/extension/plugins/BlockEditorEmoji/assets');
    expect(resolveAssetsUrl({ assetsUrl: '' })).toBe('/blog/extension/plugins/BlockEditorEmoji/assets');
  });

  it('ACMS.Config も無ければ / 起点', () => {
    (window as unknown as { ACMS: unknown }).ACMS = {};
    expect(resolveAssetsUrl({})).toBe('/extension/plugins/BlockEditorEmoji/assets');
  });
});

describe('setup', () => {
  it('翻訳・ショートカット・拡張を登録する（Tiptap にはまだ触らない）', () => {
    const ctx = fakeCtx({ assetsUrl: '/a' });
    setup(ctx as never);
    expect(ctx.i18n.addResources).toHaveBeenCalledWith('ja', expect.objectContaining({ search: expect.any(String) }));
    expect(ctx.i18n.addResources).toHaveBeenCalledWith('en', expect.objectContaining({ search: expect.any(String) }));
    expect(ctx.keyboardShortcuts.registerShortcut).toHaveBeenCalledWith(
      'open-emoji-picker',
      expect.objectContaining({ commands: ['Alt', 'Mod', 'E'], categoryId: 'block-editor' }),
    );
    expect(ctx.blockEditor.registerExtension).toHaveBeenCalledWith('emojiInput', expect.any(Function));
  });

  it('ファクトリは Tiptap を受け取って拡張を返す', async () => {
    const { tiptap } = await import('./helpers/tiptap');
    const ctx = fakeCtx();
    setup(ctx as never);
    const factory = ctx.blockEditor.registerExtension.mock.calls[0][1] as (t: unknown) => { name: string };
    expect(factory(tiptap).name).toBe('emojiInput');
  });
});
