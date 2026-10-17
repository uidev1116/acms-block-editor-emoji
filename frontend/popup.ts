import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import type { Editor } from '@tiptap/core';
import type { ComponentType } from 'react';
import type { Tiptap } from '@ablogcms/block-editor/tiptap';

export interface PopupOptions {
  /** ポップアップの外側を押したとき */
  onOutsideClick?: () => void;
  /** 他のポップアップに置き換えられたり closeActivePopup() で閉じられたとき */
  onClose?: () => void;
}

export interface PopupHandle<P = Record<string, unknown>, R = unknown> {
  element: HTMLElement;
  /** コンポーネントが useImperativeHandle で公開した値（キー操作の委譲に使う） */
  getRef(): R | null;
  update(props: Partial<P>): void;
  updatePosition(): Promise<void>;
  destroy(): void;
}

/** ポップアップは同時に 1 つだけ */
let active: { destroy: () => void } | null = null;

export function closeActivePopup(): void {
  active?.destroy();
}

/**
 * ReactRenderer（ホストの React ツリーにポータルで描画される）で Component を body に出し、
 * getRect を基準に @floating-ui/dom で配置する。react-dom は使わない。
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

  const renderer = new tiptap.react.ReactRenderer(Component as ComponentType<P>, { editor, props });
  const element = renderer.element;
  element.classList.add('acms-emoji-popup');
  element.style.position = 'fixed';
  element.style.zIndex = '10000';
  element.style.visibility = 'hidden';
  document.body.appendChild(element);

  const onPointerDown = (event: Event) => {
    if (!element.contains(event.target as Node)) {
      options.onOutsideClick?.();
    }
  };
  document.addEventListener('pointerdown', onPointerDown, true);

  let destroyed = false;

  const handle: PopupHandle<P, R> = {
    element,
    getRef: () => (renderer.ref as R | null) ?? null,
    update(next) {
      renderer.updateProps(next);
      void handle.updatePosition();
    },
    async updatePosition() {
      const rect = getRect();
      if (!rect || destroyed) return;
      const { x, y } = await computePosition({ getBoundingClientRect: () => rect }, element, {
        placement: 'bottom-start',
        strategy: 'fixed',
        middleware: [offset(4), flip(), shift({ padding: 8 })],
      });
      if (destroyed) return;
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.visibility = 'visible';
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener('pointerdown', onPointerDown, true);
      renderer.destroy();
      if (active === handle) active = null;
      options.onClose?.();
    },
  };
  active = handle;
  void handle.updatePosition();
  return handle;
}
