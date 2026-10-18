import { act, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmojiExtension, createSuggestionRender, shortcutLabel } from '../../frontend/extension';
import { resetEmojiDataCache } from '../../frontend/emoji-data';
import { closeActivePopup } from '../../frontend/popup';
import { getRecent } from '../../frontend/recent';
import { mountEditor } from './helpers/mount';
import { tiptap } from './helpers/tiptap';

const raw = [
  { label: 'にっこり笑う', hexcode: '1F604', emoji: '😄', tags: ['かお'], order: 1, group: 0 },
  { label: 'ねこ', hexcode: '1F408', emoji: '🐈', tags: ['どうぶつ'], order: 2, group: 3 },
];
const github = { '1F604': 'smile', '1F408': 'cat2' };
const ok = (b: unknown) => ({ ok: true, status: 200, json: async () => b, headers: new Headers() });

let mounted: ReturnType<typeof mountEditor>;

function mount(content = '<p></p>') {
  mounted = mountEditor([createEmojiExtension(tiptap, { emojibaseUrl: '/emojibase' })], content);
  return mounted.editor;
}

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

/** 末尾に文字を打ち込む（ProseMirror のトランザクション経由） */
async function type(editor: ReturnType<typeof mount>, text: string) {
  await act(async () => {
    editor.chain().focus('end').insertContent(text).run();
  });
  await flush();
}

const list = () => document.body.querySelector('.acms-admin-emoji-list');
const options = () => [...document.body.querySelectorAll('[role="option"]')];

function press(editor: ReturnType<typeof mount>, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  act(() => {
    editor.view.dom.dispatchEvent(event);
  });
  return event;
}

beforeEach(() => {
  localStorage.clear();
  resetEmojiDataCache();
  vi.stubGlobal('fetch', vi.fn(async (u: string) => ok(u.endsWith('github.json') ? github : raw)));
});
afterEach(() => {
  closeActivePopup();
  mounted?.unmount();
  vi.unstubAllGlobals();
});

describe('サジェスト', () => {
  it(':smile で候補が出て、Enter で置き換わり、最近使った絵文字に入る', async () => {
    const editor = mount();
    await type(editor, ':smile');
    expect(options()).toHaveLength(1);
    expect(options()[0].textContent).toContain('😄');
    press(editor, 'Enter');
    expect(editor.getHTML()).toBe('<p>😄</p>');
    expect(getRecent()).toEqual(['😄']);
    await flush();
    expect(list()).toBeNull();
  });

  it('全角コロンでも候補が出る（日本語で検索）', async () => {
    const editor = mount();
    await type(editor, '：ねこ');
    expect(options()[0].textContent).toContain('🐈');
    press(editor, 'Tab');
    expect(editor.getHTML()).toBe('<p>🐈</p>');
  });

  it('日本語の直後でも出る', async () => {
    const editor = mount('<p>今日は</p>');
    await type(editor, '：ねこ');
    expect(options()).toHaveLength(1);
  });

  it('1 文字目のコロンだけでは出ない', async () => {
    const editor = mount();
    await type(editor, ':');
    expect(list()).toBeNull();
  });

  it.each(['10:30', 'https://example.com', 'a:smile'])('英数字の直後では出ない: %s', async (text) => {
    const editor = mount();
    await type(editor, text);
    expect(list()).toBeNull();
  });

  it('コードブロック内・インラインコード内では出ない', async () => {
    const editor = mount('<pre><code></code></pre>');
    await type(editor, ' :smile');
    expect(list()).toBeNull();
    mounted.unmount();
    const editor2 = mount('<p>a <code>x</code></p>');
    await type(editor2, ' :smile');
    expect(list()).toBeNull();
  });

  it('該当なしならリストが出ない。続けて入力できる', async () => {
    const editor = mount();
    await type(editor, ':zzzz');
    expect(list()).toBeNull();
    await type(editor, 'あ');
    expect(editor.getHTML()).toBe('<p>:zzzzあ</p>');
  });

  it('候補が 0 件になったらリストを閉じ、戻ると再表示する', async () => {
    const editor = mount();
    await type(editor, ':smil');
    expect(list()).not.toBeNull();
    await type(editor, 'zz');
    expect(list()).toBeNull();
    await act(async () => {
      editor.commands.deleteRange({ from: editor.state.doc.content.size - 3, to: editor.state.doc.content.size - 1 });
    });
    await flush();
    expect(list()).not.toBeNull();
  });

  it('Esc で閉じ、その後は普通に入力できる（再び候補は出ない）', async () => {
    const editor = mount();
    await type(editor, ':smile');
    expect(list()).not.toBeNull();
    press(editor, 'Escape');
    await flush();
    expect(list()).toBeNull();
    await type(editor, 'x');
    expect(editor.getHTML()).toBe('<p>:smilex</p>');
  });

  it('↓ で選択を移して確定できる', async () => {
    const editor = mount();
    await type(editor, ':ね');
    expect(options()).toHaveLength(1);
    await type(editor, '');
    const ev = press(editor, 'ArrowDown');
    expect(ev.defaultPrevented).toBe(true);
  });

  it('IME 変換中の Enter は絵文字を確定しない', async () => {
    const editor = mount();
    await type(editor, ':smile');
    const ev = press(editor, 'Enter', { isComposing: true });
    void ev;
    expect(editor.getHTML()).not.toContain('😄');
    expect(getRecent()).toEqual([]);
  });

  it('辞書の取得に失敗してもエディターは動き続ける', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    const editor = mount();
    await type(editor, ':smile');
    expect(list()).toBeNull();
    await type(editor, 'ok');
    expect(editor.getHTML()).toBe('<p>:smileok</p>');
  });

  it('クリックで確定できる', async () => {
    const editor = mount();
    await type(editor, ':smile');
    await act(async () => {
      (options()[0] as HTMLElement).click();
    });
    expect(editor.getHTML()).toBe('<p>😄</p>');
  });
});

describe('コマンドとショートカット', () => {
  it('insertEmoji はカーソル位置に文字として挿入する（余計な要素なし）', () => {
    const editor = mount('<p>ab</p>');
    editor.commands.setTextSelection(2);
    expect(editor.commands.insertEmoji('😄')).toBe(true);
    expect(editor.getHTML()).toBe('<p>a😄b</p>');
  });

  it('コードブロック内では insertEmoji / openEmojiPicker は何もしない', () => {
    const editor = mount('<pre><code>x</code></pre>');
    editor.commands.setTextSelection(2);
    expect(editor.commands.insertEmoji('😄')).toBe(false);
    expect(editor.commands.openEmojiPicker()).toBe(false);
    expect(editor.getHTML()).not.toContain('😄');
    expect(document.querySelector('.acms-admin-emoji-picker')).toBeNull();
  });

  it('ツールバーの項目が宣言されている（scope: text、add_reaction、コードブロックでは無効）', () => {
    const editor = mount();
    const ext = editor.extensionManager.extensions.find((e) => e.name === 'emojiInput')!;
    const [item] = ext.options.blockMenu;
    expect(item).toMatchObject({ scope: 'text', icon: 'add_reaction', tooltip: `絵文字（${shortcutLabel()}）` });
    expect(item.isDisabled(editor)).toBe(false);
    editor.commands.setCodeBlock();
    expect(item.isDisabled(editor)).toBe(true);
  });

  it('ツールバーのボタンでピッカーが開き、選ぶと開く前のカーソル位置に入る', async () => {
    const editor = mount('<p>ab</p>');
    editor.commands.setTextSelection(2);
    const ext = editor.extensionManager.extensions.find((e) => e.name === 'emojiInput')!;
    await act(async () => ext.options.blockMenu[0].onSelect(editor));
    await flush();
    expect(document.querySelector('.acms-admin-emoji-picker')).not.toBeNull();

    // 選択を動かしても、保存した範囲に入る
    editor.commands.setTextSelection(3);
    const props = (document.querySelector('.acms-admin-emoji-popup') as HTMLElement).querySelector('.acms-admin-emoji-picker__recent');
    expect(props).toBeNull();
  });

  it('Mod-Alt-e でピッカーが開く。外側クリックで閉じる', async () => {
    const editor = mount();
    press(editor, 'e', { key: 'e', ctrlKey: true, altKey: true });
    await flush();
    expect(document.querySelector('.acms-admin-emoji-picker')).not.toBeNull();
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await flush();
    expect(document.querySelector('.acms-admin-emoji-picker')).toBeNull();
  });

  it('フォーカスがピッカーの外へ出たらピッカーを閉じる', async () => {
    const messages = { groups: [{ key: 'smileys-emotion', message: 'スマイリー', order: 0 }], subgroups: [], skinTones: [] };
    vi.stubGlobal('fetch', vi.fn(async (u: string) => ok(u.endsWith('messages.json') ? messages : raw)));
    const editor = mount();
    press(editor, 'e', { key: 'e', ctrlKey: true, altKey: true });
    await flush();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    const search = document.querySelector('.acms-admin-emoji-picker input') as HTMLInputElement;
    await act(async () => {
      fireEvent.blur(search, { relatedTarget: outside });
    });
    expect(document.querySelector('.acms-admin-emoji-picker')).toBeNull();
    outside.remove();
  });

  it('ピッカーを開くとサジェストは閉じる', async () => {
    const editor = mount();
    await type(editor, ':smile');
    expect(list()).not.toBeNull();
    await act(async () => {
      editor.commands.openEmojiPicker();
    });
    await flush();
    expect(list()).toBeNull();
    expect(document.querySelectorAll('.acms-admin-emoji-popup')).toHaveLength(1);
  });

  it('エディターを破棄するとポップアップも消える', async () => {
    const editor = mount();
    await act(async () => {
      editor.commands.openEmojiPicker();
    });
    editor.destroy();
    await flush();
    expect(document.querySelector('.acms-admin-emoji-popup')).toBeNull();
  });
});

describe('ショートカットの表示', () => {
  afterEach(() => vi.restoreAllMocks());

  it('Mac では ⌘⌥E、それ以外では Ctrl+Alt+E', () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    expect(shortcutLabel()).toBe('⌘⌥E');
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');
    expect(shortcutLabel()).toBe('Ctrl+Alt+E');
  });
});

describe('候補の更新', () => {
  it('入力を続けても、リストを作り直さない（ちらつき防止）', async () => {
    const editor = mount();
    await type(editor, ':sm');
    const first = document.querySelector('.acms-admin-emoji-popup');
    expect(first).not.toBeNull();
    await type(editor, 'i');
    expect(document.querySelector('.acms-admin-emoji-popup')).toBe(first);
  });

  it('候補の取得中（loading）は前の表示を保つ', async () => {
    const editor = mount();
    const render = createSuggestionRender(tiptap);
    const base = { editor, command: () => {}, clientRect: () => new DOMRect(0, 0, 0, 0) };
    const entry = { emoji: '😄', label: 'x', tags: [], shortcodes: [], order: 0, normLabel: 'x', normTags: [], normCodes: [] };
    await act(async () => render.onStart({ ...base, items: [entry] }));
    const popup = document.querySelector('.acms-admin-emoji-popup');
    await act(async () => render.onUpdate({ ...base, items: [], loading: true }));
    expect(document.querySelector('.acms-admin-emoji-popup')).toBe(popup);
    await act(async () => render.onUpdate({ ...base, items: [] }));
    expect(document.querySelector('.acms-admin-emoji-popup')).toBeNull();
    render.onExit();
  });

  it('別のエディターを破棄しても、自分のポップアップは閉じない', async () => {
    const editor = mount();
    await act(async () => {
      editor.commands.openEmojiPicker();
    });
    const other = mountEditor([createEmojiExtension(tiptap, { emojibaseUrl: '/emojibase' })]);
    other.unmount();
    expect(document.querySelector('.acms-admin-emoji-popup')).not.toBeNull();
  });

  it('候補が出ている間、エディターに aria-activedescendant / aria-controls / aria-expanded が付き、閉じると外れる', async () => {
    const editor = mount();
    await type(editor, ':smile');
    const dom = editor.view.dom;
    const option = document.querySelector('[role="option"]') as HTMLElement;
    expect(dom.getAttribute('role')).toBe('combobox');
    expect(dom.getAttribute('aria-autocomplete')).toBe('list');
    expect(dom.getAttribute('aria-controls')).toBe(document.querySelector('[role="listbox"]')!.id);
    expect(dom.getAttribute('aria-activedescendant')).toBe(option.id);
    await act(async () => {
      editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await flush();
    expect(dom.hasAttribute('aria-activedescendant')).toBe(false);
    expect(dom.hasAttribute('aria-controls')).toBe(false);
    expect(dom.getAttribute('role')).toBe('textbox');
    expect(dom.hasAttribute('aria-autocomplete')).toBe(false);
  });

  it('元の role が無いエディターは、閉じたとき role 属性ごと外す', async () => {
    const editor = mount();
    editor.view.dom.removeAttribute('role');
    await type(editor, ':smile');
    expect(editor.view.dom.getAttribute('role')).toBe('combobox');
    await act(async () => {
      editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await flush();
    expect(editor.view.dom.hasAttribute('role')).toBe(false);
  });

  it('候補を出したままエディターを破棄しても、アンマウント時に例外にならない', async () => {
    const editor = mount();
    await type(editor, ':smile');
    editor.destroy();
    expect(() => mounted.unmount()).not.toThrow();
  });

  it('候補の文字列は HTML として解釈せず、テキストとして挿入する', () => {
    const editor = mount();
    editor.commands.insertEmoji('<b>x</b>');
    expect(editor.getHTML()).toBe('<p>&lt;b&gt;x&lt;/b&gt;</p>');
  });
});
