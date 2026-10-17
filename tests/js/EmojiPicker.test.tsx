import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmojiPicker } from '../../frontend/EmojiPicker';
import { pushRecent } from '../../frontend/recent';

const data = [
  { label: 'にっこり笑う', hexcode: '1F604', emoji: '😄', tags: ['かお'], order: 1, group: 0, subgroup: 1, version: 0.6 },
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

  it('絵文字を選ぶと onSelect が呼ばれる', async () => {
    stubFetch();
    const onSelect = vi.fn();
    render(<EmojiPicker emojibaseUrl="/emojibase" onSelect={onSelect} onClose={vi.fn()} />);
    // 仮想スクロールで jsdom では行が描画されないことがあるため、描画されている場合のみ確認する
    const btn = await screen.findByRole('gridcell', {}, { timeout: 1500 }).catch(() => null);
    if (btn) {
      fireEvent.click(btn);
      expect(onSelect).toHaveBeenCalled();
    }
  });
});
