import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe('index（入口）', () => {
  it('ACMS.plugins があれば register する', async () => {
    const registerFn = vi.fn();
    (window as unknown as { ACMS: unknown }).ACMS = { plugins: { register: registerFn } };
    await import('../../frontend/index');
    expect(registerFn).toHaveBeenCalledWith('block-editor-emoji', expect.objectContaining({ version: '0.1.0' }));
  });

  it('ACMS.plugins が無いページでは何もしない（例外も出さない）', async () => {
    (window as unknown as { ACMS: unknown }).ACMS = undefined;
    await expect(import('../../frontend/index')).resolves.toBeDefined();
  });
});
