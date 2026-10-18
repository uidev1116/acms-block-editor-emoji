import { act, fireEvent } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeActivePopup, createPopup } from '../../frontend/popup';
import { mountEditor } from './helpers/mount';
import { tiptap } from './helpers/tiptap';

const Probe = forwardRef<{ hello: () => string }, { text: string }>(function Probe({ text }, ref) {
  useImperativeHandle(ref, () => ({ hello: () => 'hi' }));
  return <div data-testid="probe">{text}</div>;
});

const rect = () => new DOMRect(10, 20, 0, 16);
const popups = () => document.body.querySelectorAll('.acms-admin-popover.acms-admin-emoji-popup');
const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });

let mounted: ReturnType<typeof mountEditor>;
afterEach(() => {
  closeActivePopup();
  mounted?.unmount();
});

describe('createPopup（管理画面の Popover で包む）', () => {
  it('Popover（acms-admin-popover）に描画し、props を更新でき、destroy で消える', async () => {
    mounted = mountEditor([]);
    const popup = createPopup<{ text: string }, { hello: () => string }>(
      tiptap,
      mounted.editor,
      Probe,
      { text: 'a' },
      rect,
    );
    await flush();
    expect(popups()).toHaveLength(1);
    expect(document.body.textContent).toContain('a');
    expect(popup.getRef()?.hello()).toBe('hi');

    await act(async () => popup.update({ text: 'b' }));
    expect(document.body.textContent).toContain('b');

    popup.destroy();
    await flush();
    expect(popups()).toHaveLength(0);
  });

  it('候補リスト用（list）は、フォーカスを奪わず、外側クリックでも閉じない', async () => {
    mounted = mountEditor([]);
    const outside = vi.fn();
    createPopup(tiptap, mounted.editor, Probe, { text: 'x' }, rect, { onOutsideClick: outside });
    await flush();
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(outside).not.toHaveBeenCalled();
    expect(popups()).toHaveLength(1);
  });

  it('ピッカー用（picker）は、外側のクリックで onOutsideClick を呼ぶ。内側では呼ばない', async () => {
    mounted = mountEditor([]);
    const outside = vi.fn();
    createPopup(tiptap, mounted.editor, Probe, { text: 'x' }, rect, { variant: 'picker', onOutsideClick: outside });
    await flush();
    const inside = popups()[0] as HTMLElement;
    fireEvent.pointerDown(inside);
    fireEvent.pointerUp(inside);
    fireEvent.click(inside);
    expect(outside).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body);
    fireEvent.pointerUp(document.body);
    fireEvent.click(document.body);
    await flush();
    expect(outside).toHaveBeenCalledTimes(1);
  });

  it('同時に 1 つだけ。新しく開くと前のものを閉じる（onClose も呼ぶ）', async () => {
    mounted = mountEditor([]);
    const onClose = vi.fn();
    createPopup(tiptap, mounted.editor, Probe, { text: 'first' }, rect, { onClose });
    createPopup(tiptap, mounted.editor, Probe, { text: 'second' }, rect);
    await flush();
    expect(popups()).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain('second');
  });

  it('closeActivePopup(editor) は、そのエディターのポップアップだけ閉じる', async () => {
    mounted = mountEditor([]);
    const other = mountEditor([]);
    createPopup(tiptap, mounted.editor, Probe, { text: 'x' }, rect);
    await flush();
    closeActivePopup(other.editor);
    await flush();
    expect(popups()).toHaveLength(1);
    closeActivePopup(mounted.editor);
    await flush();
    expect(popups()).toHaveLength(0);
    other.unmount();
  });

  it('基準位置が取れなくても例外にならない', async () => {
    mounted = mountEditor([]);
    createPopup(tiptap, mounted.editor, Probe, { text: 'x' }, () => null);
    await flush();
    expect(popups()).toHaveLength(1);
  });

  it('destroy は二度呼んでも安全', async () => {
    mounted = mountEditor([]);
    const popup = createPopup(tiptap, mounted.editor, Probe, { text: 'x' }, rect);
    popup.destroy();
    expect(() => popup.destroy()).not.toThrow();
  });
});
