import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_RECENT, STORAGE_KEY, getRecent, pushRecent } from '../../frontend/recent';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('recent', () => {
  it('最初は空', () => {
    expect(getRecent()).toEqual([]);
  });

  it('新しいものを先頭に追加する', () => {
    pushRecent('😄');
    pushRecent('🐈');
    expect(getRecent()).toEqual(['🐈', '😄']);
  });

  it('重複は先頭に移動する', () => {
    pushRecent('😄');
    pushRecent('🐈');
    pushRecent('😄');
    expect(getRecent()).toEqual(['😄', '🐈']);
  });

  it('最大件数を超えたら古いものを捨てる', () => {
    for (let i = 0; i < MAX_RECENT + 5; i++) pushRecent(`e${i}`);
    const list = getRecent();
    expect(list).toHaveLength(MAX_RECENT);
    expect(list[0]).toBe(`e${MAX_RECENT + 4}`);
  });

  it('壊れた JSON や配列以外は空として扱う', () => {
    localStorage.setItem(STORAGE_KEY, '{oops');
    expect(getRecent()).toEqual([]);
    localStorage.setItem(STORAGE_KEY, '{"a":1}');
    expect(getRecent()).toEqual([]);
    localStorage.setItem(STORAGE_KEY, '["😄", 1, null]');
    expect(getRecent()).toEqual(['😄']);
  });

  it('localStorage が使えなくても例外にならない', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(getRecent()).toEqual([]);
    expect(() => pushRecent('😄')).not.toThrow();
  });

  it('絵文字として不自然な値（HTML・長すぎる文字列）は読み飛ばす', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['<img src=x onerror=alert(1)>', 'a'.repeat(40), '😄']));
    expect(getRecent()).toEqual(['😄']);
  });

  it('絵文字として不自然な値は保存しない', () => {
    pushRecent('<img src=x>');
    pushRecent('');
    expect(getRecent()).toEqual([]);
  });
});
