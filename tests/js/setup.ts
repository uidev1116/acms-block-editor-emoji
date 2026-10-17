import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { NAMESPACE, resources } from '../../frontend/i18n';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// @ablogcms/i18n のファサードは window.ACMS.i18n に委譲する。テストでは日本語リソースを引く。
beforeEach(() => {
  if (typeof window === 'undefined') return;
  const translate = (key: string, options?: Record<string, unknown>) => {
    const [ns, name] = key.split(':');
    const text = ns === NAMESPACE ? ((resources.ja as Record<string, string>)[name] ?? key) : key;
    // i18next の {{name}} 補間
    return text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(options?.[k] ?? ''));
  };
  Object.assign(translate, { lng: 'ja' });
  (window as unknown as { ACMS: unknown }).ACMS = { i18n: translate };
});

afterEach(() => {
  if (typeof window !== 'undefined') cleanup();
});

// jsdom には canvas が無い（frimousse が絵文字の対応判定に使う）。警告を出さないよう null を返す。
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
}

// jsdom に無いブラウザ API（frimousse が使う）
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub;

// jsdom は座標を持たない（ProseMirror の coordsAtPos が使う）
if (typeof Range !== 'undefined') {
  const emptyRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as never;
  Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
  Range.prototype.getClientRects = emptyRects;
  Element.prototype.getClientRects = emptyRects;
  (document as unknown as { elementFromPoint: unknown }).elementFromPoint = () => null;
}
