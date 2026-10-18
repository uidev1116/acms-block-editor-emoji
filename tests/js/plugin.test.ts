import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PLUGIN_NAME, canStoreEmoji, resolveAssetsUrl, setup } from '../../frontend/plugin';

afterEach(() => vi.unstubAllGlobals());

const setCharset = (dbCharset: unknown) => {
  (window as unknown as { ACMS: unknown }).ACMS = { Config: { root: '/', dbCharset } };
};

beforeEach(() => setCharset('utf8mb4'));

function fakeCtx(config: Record<string, unknown> = {}) {
  return {
    name: PLUGIN_NAME,
    config,
    i18n: { addResources: vi.fn() },
    keyboardShortcuts: { registerShortcut: vi.fn() },
    blockEditor: { registerExtension: vi.fn() },
  };
}

describe('canStoreEmoji（コアのライトエディターの絵文字ピッカーと同じ条件）', () => {
  it('DB の接続文字コードが utf8mb4 のときだけ true', () => {
    setCharset('utf8mb4');
    expect(canStoreEmoji()).toBe(true);
  });

  it.each(['utf8', 'utf8mb3', '', null, undefined])('%s のときは false（4 バイト文字が壊れる）', (charset) => {
    setCharset(charset);
    expect(canStoreEmoji()).toBe(false);
  });

  it('ACMS.Config が無ければ false', () => {
    (window as unknown as { ACMS: unknown }).ACMS = {};
    expect(canStoreEmoji()).toBe(false);
  });
});

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
  it('utf8mb4 でない DB では何も登録しない（保存した絵文字が壊れるため）', () => {
    setCharset(null);
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const ctx = fakeCtx();
    setup(ctx as never);
    expect(ctx.blockEditor.registerExtension).not.toHaveBeenCalled();
    expect(ctx.keyboardShortcuts.registerShortcut).not.toHaveBeenCalled();
    expect(ctx.i18n.addResources).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(expect.stringContaining('utf8mb4'));
    info.mockRestore();
  });

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
