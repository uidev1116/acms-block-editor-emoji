import type { Tiptap } from '@ablogcms/block-editor/tiptap';
import type { Editor } from '@tiptap/core';
import type { ComponentType } from 'react';
import { PopupShell, type PopupVariant } from './PopupShell';

export interface PopupOptions {
  /** 見た目と挙動。`picker` は外側クリックで閉じてフォーカスを中に移す。`list` はエディターのフォーカスを奪わない */
  variant?: PopupVariant;
  /** ポップアップの外側を押したとき（`picker` のみ） */
  onOutsideClick?: () => void;
  /** 他のポップアップに置き換えられたり closeActivePopup() で閉じられたとき */
  onClose?: () => void;
}

export interface PopupHandle<P = Record<string, unknown>, R = unknown> {
  /** コンポーネントが useImperativeHandle で公開した値（キー操作の委譲に使う） */
  getRef(): R | null;
  update(props: Partial<P>): void;
  destroy(): void;
}

/** ポップアップは同時に 1 つだけ */
let active: { handle: PopupHandle<never, unknown>; editor: Editor } | null = null;

/** 開いているポップアップを閉じる。editor を渡すと、そのエディターのものだけ閉じる */
export function closeActivePopup(editor?: Editor): void {
  if (active && (!editor || active.editor === editor)) {
    active.handle.destroy();
  }
}

/**
 * Tiptap の ReactRenderer（ホストの React ツリーに描画される）で、管理画面の Popover に包んだ
 * Component を出す。`react-dom` は使わない（ポータルは frontend/shims/react-dom.ts）。
 */
export function createPopup<P extends Record<string, unknown>, R = unknown>(
  tiptap: Tiptap,
  editor: Editor,
  Component: ComponentType<P> | unknown,
  props: P,
  getRect: () => DOMRect | null,
  options: PopupOptions = {},
): PopupHandle<P, R> {
  closeActivePopup();

  const variant = options.variant ?? 'list';
  let contentProps: Record<string, unknown> = props;
  let destroyed = false;

  const shellProps = () => ({
    Content: Component as ComponentType<Record<string, unknown>>,
    contentProps,
    getRect,
    interactive: variant === 'picker',
    variant,
    onDismiss: () => options.onOutsideClick?.(),
  });

  const renderer = new tiptap.react.ReactRenderer(PopupShell as unknown as ComponentType<Record<string, unknown>>, {
    editor,
    props: shellProps(),
  });

  const handle: PopupHandle<P, R> = {
    getRef: () => (renderer.ref as R | null) ?? null,
    update(next) {
      contentProps = { ...contentProps, ...next };
      renderer.updateProps(shellProps());
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      renderer.destroy();
      if (active?.handle === (handle as unknown)) active = null;
      options.onClose?.();
    },
  };
  active = { handle: handle as unknown as PopupHandle<never, unknown>, editor };
  return handle;
}
