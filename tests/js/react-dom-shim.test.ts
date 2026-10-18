import { describe, expect, it } from 'vitest';
import { createPortal, createRoot, flushSync, hydrateRoot } from '../../frontend/shims/react-dom';

describe('react-dom の代用品', () => {
  it('createPortal は React のポータル要素を返す（描画はホストの React DOM）', () => {
    const container = document.createElement('div');
    const portal = createPortal('child', container, 'k') as unknown as Record<string, unknown>;
    expect(portal.$$typeof).toBe(Symbol.for('react.portal'));
    expect(portal.children).toBe('child');
    expect(portal.containerInfo).toBe(container);
    expect(portal.key).toBe('k');
    expect((createPortal('c', container) as unknown as { key: unknown }).key).toBeNull();
  });

  it('flushSync は即時に実行して結果を返す', () => {
    expect(flushSync(() => 42)).toBe(42);
  });

  it('createRoot / hydrateRoot は使えない（呼ぶと例外）', () => {
    expect(() => createRoot()).toThrow(/createRoot/);
    expect(() => hydrateRoot()).toThrow(/hydrateRoot/);
  });
});
