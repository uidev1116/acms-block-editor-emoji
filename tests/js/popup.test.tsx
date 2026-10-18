import { act } from '@testing-library/react';
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

let mounted: ReturnType<typeof mountEditor>;
afterEach(() => {
  closeActivePopup();
  mounted?.unmount();
});

describe('createPopup', () => {
  it('body に描画し、props を更新でき、destroy で消える', async () => {
    mounted = mountEditor([]);
    const popup = createPopup<{ text: string }, { hello: () => string }>(tiptap, mounted.editor, Probe, { text: 'a' }, rect);
    await act(async () => {});
    expect(document.body.querySelector('.acms-admin-emoji-popup')).not.toBeNull();
    expect(document.body.textContent).toContain('a');
    expect(popup.getRef()?.hello()).toBe('hi');

    await act(async () => popup.update({ text: 'b' }));
    expect(document.body.textContent).toContain('b');

    popup.destroy();
    expect(document.body.querySelector('.acms-admin-emoji-popup')).toBeNull();
  });

  it('同時に 1 つだけ。新しく開くと前のものを閉じる（onClose も呼ぶ）', async () => {
    mounted = mountEditor([]);
    const onClose = vi.fn();
    createPopup(tiptap, mounted.editor, Probe, { text: 'first' }, rect, { onClose });
    createPopup(tiptap, mounted.editor, Probe, { text: 'second' }, rect);
    await act(async () => {});
    expect(document.body.querySelectorAll('.acms-admin-emoji-popup')).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain('second');
  });

  it('外側のクリックで onOutsideClick を呼ぶ。内側では呼ばない', async () => {
    mounted = mountEditor([]);
    const onOutsideClick = vi.fn();
    const popup = createPopup(tiptap, mounted.editor, Probe, { text: 'x' }, rect, { onOutsideClick });
    await act(async () => {});
    popup.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onOutsideClick).not.toHaveBeenCalled();
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onOutsideClick).toHaveBeenCalledTimes(1);
    popup.destroy();
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onOutsideClick).toHaveBeenCalledTimes(1);
  });

  it('位置を計算して style に反映する', async () => {
    mounted = mountEditor([]);
    const popup = createPopup(tiptap, mounted.editor, Probe, { text: 'x' }, rect);
    await act(async () => {});
    await popup.updatePosition();
    expect(popup.element.style.position).toBe('fixed');
    expect(Number(popup.element.style.zIndex)).toBeGreaterThan(100015);
    expect(popup.element.style.visibility).toBe('visible');
    expect(popup.element.style.left).toMatch(/px$/);
  });

  it('矩形が取れないときは位置更新を何もしない', async () => {
    mounted = mountEditor([]);
    const popup = createPopup(tiptap, mounted.editor, Probe, { text: 'x' }, () => null);
    await act(async () => {});
    await expect(popup.updatePosition()).resolves.toBeUndefined();
  });

  it('closeActivePopup(editor) は、そのエディターのポップアップだけ閉じる', async () => {
    mounted = mountEditor([]);
    const other = mountEditor([]);
    createPopup(tiptap, mounted.editor, Probe, { text: 'x' }, rect);
    await act(async () => {});
    closeActivePopup(other.editor);
    expect(document.body.querySelector('.acms-admin-emoji-popup')).not.toBeNull();
    closeActivePopup(mounted.editor);
    expect(document.body.querySelector('.acms-admin-emoji-popup')).toBeNull();
    other.unmount();
  });

  it('destroy は二度呼んでも安全', async () => {
    mounted = mountEditor([]);
    const popup = createPopup(tiptap, mounted.editor, Probe, { text: 'x' }, rect);
    popup.destroy();
    expect(() => popup.destroy()).not.toThrow();
  });
});
