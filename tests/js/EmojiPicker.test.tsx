import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmojiPicker } from '../../frontend/EmojiPicker';
import { pushRecent } from '../../frontend/recent';

const data = [
  {
    label: 'にっこり笑う',
    hexcode: '1F604',
    emoji: '😄',
    tags: ['かお'],
    order: 1,
    group: 0,
    subgroup: 1,
    version: 0.6,
  },
  { label: 'ねこ', hexcode: '1F408', emoji: '🐈', tags: ['どうぶつ'], order: 2, group: 3, subgroup: 1, version: 0.7 },
];
const messages = {
  groups: [
    { key: 'smileys-emotion', message: 'スマイリー', order: 0 },
    { key: 'animals-nature', message: '動物', order: 3 },
  ],
  subgroups: [],
  skinTones: [{ key: 'light', message: '薄い' }],
};

const body = (b: unknown) => ({ ok: true, status: 200, json: async () => b, headers: new Headers() });

beforeEach(() => {
  localStorage.clear();
  // jsdom に無いブラウザ API
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

function stubFetch(ok = true) {
  const fetchMock = vi.fn(async (url: string) => {
    if (!ok) {
      return {
        ok: false,
        status: 404,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON');
        },
        headers: new Headers(),
      };
    }
    return body(url.endsWith('messages.json') ? messages : data);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('EmojiPicker', () => {
  it('検索欄・読み込み表示を出し、自前の URL から辞書を取得する', async () => {
    const fetchMock = stubFetch();
    render(<EmojiPicker emojibaseUrl="/emojibase" onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText('絵文字を検索')).not.toBeNull();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls.some(([u]) => String(u).startsWith('/emojibase/ja/'))).toBe(true);
    expect(fetchMock.mock.calls.every(([u]) => !String(u).includes('jsdelivr'))).toBe(true);
  });

  it('開いたあと、検索欄にフォーカスが移る（ボタンがフォーカスを持っていても）', async () => {
    stubFetch();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    render(<EmojiPicker emojibaseUrl="/emojibase" onSelect={vi.fn()} onClose={vi.fn()} />);
    outside.focus();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByPlaceholderText('絵文字を検索')));
    outside.remove();
  });

  it('検索欄に id と name がある（フォーム要素の警告の対策）。ブラウザの自動入力は無効', () => {
    stubFetch();
    render(<EmojiPicker emojibaseUrl="/emojibase" onSelect={vi.fn()} onClose={vi.fn()} />);
    const search = screen.getByPlaceholderText('絵文字を検索');
    expect(search.getAttribute('name')).toBe('block-editor-emoji-search');
    expect(search.id).toMatch(/\S+/);
    expect(search.getAttribute('autocomplete')).toBe('off');
    expect(search.getAttribute('aria-label')).toBe('絵文字を検索');
  });

  it('Esc で onClose', () => {
    stubFetch();
    const onClose = vi.fn();
    render(<EmojiPicker emojibaseUrl="/emojibase" onSelect={vi.fn()} onClose={onClose} />);
    fireEvent.keyDown(screen.getByPlaceholderText('絵文字を検索'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('最近使った絵文字を表示し、クリックで選択できる。検索中は隠す', async () => {
    stubFetch();
    pushRecent('🐱');
    const onSelect = vi.fn();
    render(<EmojiPicker emojibaseUrl="/emojibase" onSelect={onSelect} onClose={vi.fn()} />);
    const group = screen.getByRole('group', { name: '最近使った絵文字' });
    fireEvent.click(group.querySelector('button')!);
    expect(onSelect).toHaveBeenCalledWith('🐱');
    fireEvent.change(screen.getByPlaceholderText('絵文字を検索'), { target: { value: 'ね' } });
    expect(screen.queryByRole('group', { name: '最近使った絵文字' })).toBeNull();
  });

  it('最近使った絵文字が無ければ行を出さない', () => {
    stubFetch();
    render(<EmojiPicker emojibaseUrl="/emojibase" onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('辞書の取得に失敗したらエラーを表示し（エディターは落ちない）、再試行できる', async () => {
    stubFetch(false);
    render(<EmojiPicker emojibaseUrl="/missing" onSelect={vi.fn()} onClose={vi.fn()} />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('絵文字データを読み込めませんでした');

    const fetchMock = stubFetch(true);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    });
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(fetchMock).toHaveBeenCalled();
  });

  it('エラー表示では「再試行」ボタンにフォーカスが移る', async () => {
    stubFetch(false);
    render(<EmojiPicker emojibaseUrl="/missing3" onSelect={vi.fn()} onClose={vi.fn()} />);
    const retry = await screen.findByRole('button', { name: '再試行' });
    await waitFor(() => expect(document.activeElement).toBe(retry));
  });

  it('Esc はエラー表示でも効く。IME の変換中の Esc では閉じない', async () => {
    stubFetch(false);
    const onClose = vi.fn();
    render(<EmojiPicker emojibaseUrl="/missing2" onSelect={vi.fn()} onClose={onClose} />);
    const alert = await screen.findByRole('alert');
    fireEvent.keyDown(alert, { key: 'Escape', isComposing: true });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(alert, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('IME の変換中の Esc では閉じない（検索欄）', () => {
    stubFetch();
    const onClose = vi.fn();
    render(<EmojiPicker emojibaseUrl="/emojibase" onSelect={vi.fn()} onClose={onClose} />);
    fireEvent.keyDown(screen.getByPlaceholderText('絵文字を検索'), { key: 'Escape', isComposing: true });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('絵文字を選ぶと onSelect が呼ばれる（レイアウトを持たない jsdom に寸法を与えて描画させる）', async () => {
    stubFetch();
    const size = { width: 300, height: 300, top: 0, left: 0, right: 300, bottom: 300, x: 0, y: 0, toJSON: () => ({}) };
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(size as DOMRect);
    for (const prop of ['clientHeight', 'clientWidth', 'offsetHeight', 'offsetWidth'] as const) {
      vi.spyOn(HTMLElement.prototype, prop, 'get').mockReturnValue(300);
    }
    const onSelect = vi.fn();
    render(<EmojiPicker emojibaseUrl="/emojibase" onSelect={onSelect} onClose={vi.fn()} />);
    // 読み込み前は 🙂 のプレースホルダーが並ぶので、実データの絵文字が出るまで待つ
    const cell = await waitFor(() => {
      const el = [...document.querySelectorAll<HTMLElement>('[frimousse-emoji]')].find((e) => e.textContent === '😄');
      expect(el).not.toBeUndefined();
      return el as HTMLElement;
    });
    fireEvent.click(cell);
    expect(onSelect).toHaveBeenCalledWith('😄');
  });

  it('検索欄で、IME の変換を確定する Enter では絵文字を挿入しない。通常の Enter では挿入する', async () => {
    stubFetch();
    const size = { width: 300, height: 300, top: 0, left: 0, right: 300, bottom: 300, x: 0, y: 0, toJSON: () => ({}) };
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(size as DOMRect);
    for (const prop of ['clientHeight', 'clientWidth', 'offsetHeight', 'offsetWidth'] as const) {
      vi.spyOn(HTMLElement.prototype, prop, 'get').mockReturnValue(300);
    }
    const onSelect = vi.fn();
    render(<EmojiPicker emojibaseUrl="/emojibase" onSelect={onSelect} onClose={vi.fn()} />);
    const search = screen.getByPlaceholderText('絵文字を検索');
    fireEvent.change(search, { target: { value: 'にっこり' } });
    await waitFor(() => {
      const cells = [...document.querySelectorAll<HTMLElement>('[frimousse-emoji]')];
      expect(cells.some((e) => e.textContent === '😄')).toBe(true);
    });
    // 検索結果がある状態で、候補が選ばれている（frimousse は検索中、先頭を選択状態にする）
    // 変換中（isComposing / keyCode 229）の Enter は、frimousse に渡さない
    fireEvent.keyDown(search, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(search, { key: 'Enter', keyCode: 229 });
    expect(onSelect).not.toHaveBeenCalled();
    // 変換中でない Enter は、これまでどおり選択する
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('😄');
  });

  it('フォーカスがピッカーの外へ移ったら onDismiss を呼ぶ。中での移動では呼ばない', async () => {
    stubFetch();
    const onDismiss = vi.fn();
    render(
      <div>
        <button type="button">外</button>
        <EmojiPicker emojibaseUrl="/emojibase" onSelect={vi.fn()} onClose={vi.fn()} onDismiss={onDismiss} />
      </div>,
    );
    const search = document.querySelector('input') as HTMLInputElement;
    const outside = screen.getByText('外');
    fireEvent.blur(search, { relatedTarget: search.closest('.acms-admin-emoji-picker') });
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.blur(search, { relatedTarget: outside });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('検索欄は管理画面標準のフォーム部品（acms-admin-form 内の acms-admin-form-control）で描画する', () => {
    stubFetch();
    render(<EmojiPicker emojibaseUrl="/emojibase" onSelect={vi.fn()} onClose={vi.fn()} />);
    const search = document.querySelector('input') as HTMLInputElement;
    expect(search.classList.contains('acms-admin-form-control')).toBe(true);
    expect(search.closest('.acms-admin-form')).not.toBeNull();
  });
});
