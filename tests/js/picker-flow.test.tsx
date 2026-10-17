import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmojiExtension } from '../../frontend/extension';
import { closeActivePopup } from '../../frontend/popup';
import { getRecent } from '../../frontend/recent';
import { mountEditor } from './helpers/mount';
import { tiptap } from './helpers/tiptap';

// ピッカー本体（frimousse）は別テスト。ここでは「開く前の位置に入る」流れだけを確かめる
vi.mock('../../frontend/EmojiPicker', () => ({
  EmojiPicker: ({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) => (
    <div className="acms-emoji-picker">
      <button onClick={() => onSelect('😄')}>pick</button>
      <button onClick={onClose}>close</button>
    </div>
  ),
}));

let mounted: ReturnType<typeof mountEditor>;
afterEach(() => {
  closeActivePopup();
  mounted?.unmount();
});

function open(content: string, pos: number) {
  mounted = mountEditor([createEmojiExtension(tiptap, { emojibaseUrl: '/e' })], content);
  const { editor } = mounted;
  editor.commands.setTextSelection(pos);
  act(() => {
    editor.commands.openEmojiPicker();
  });
  return editor;
}

describe('ピッカーを開く流れ', () => {
  it('選ぶと、ピッカーを開く前のカーソル位置に入り、最近使った絵文字に追加され、閉じる', async () => {
    const editor = open('<p>abcd</p>', 3);
    // ピッカー操作中にカーソルが動いても、保存した位置に入る
    editor.commands.setTextSelection(5);
    await act(async () => {
      fireEvent.click(await screen.findByText('pick'));
    });
    expect(editor.getHTML()).toBe('<p>ab😄cd</p>');
    expect(getRecent()).toEqual(['😄']);
    expect(document.querySelector('.acms-emoji-popup')).toBeNull();
  });

  it('閉じるとエディターにフォーカスを戻し、何も挿入しない', async () => {
    const editor = open('<p>abcd</p>', 3);
    const focus = vi.spyOn(editor.view, 'focus');
    await act(async () => {
      fireEvent.click(await screen.findByText('close'));
    });
    expect(editor.getHTML()).toBe('<p>abcd</p>');
    expect(document.querySelector('.acms-emoji-popup')).toBeNull();
    expect(focus).toHaveBeenCalled();
  });

  it('選択範囲があるときはその範囲を置き換える', async () => {
    mounted = mountEditor([createEmojiExtension(tiptap, { emojibaseUrl: '/e' })], '<p>abcd</p>');
    const { editor } = mounted;
    editor.commands.setTextSelection({ from: 2, to: 4 });
    act(() => {
      editor.commands.openEmojiPicker();
    });
    await act(async () => {
      fireEvent.click(await screen.findByText('pick'));
    });
    expect(editor.getHTML()).toBe('<p>a😄d</p>');
  });
});
