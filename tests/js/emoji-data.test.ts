import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type EmojiEntry,
  loadEmojiData,
  normalizeData,
  augmentPickerData,
  normalizeQuery,
  resetEmojiDataCache,
  searchEmoji,
} from '../../frontend/emoji-data';

const raw = [
  { label: 'にっこり笑う', hexcode: '1F604', emoji: '😄', tags: ['かお', 'えがお', '笑顔'], order: 2, group: 0 },
  { label: 'ねこ', hexcode: '1F408', emoji: '🐈', tags: ['どうぶつ', 'ペット'], order: 30, group: 3 },
  { label: '猫の顔', hexcode: '1F431', emoji: '🐱', tags: ['ネコ', 'ねこ'], order: 29, group: 3 },
  {
    label: '手を振る',
    hexcode: '1F44B',
    emoji: '👋',
    tags: ['あいさつ'],
    order: 10,
    group: 1,
    skins: [{ label: '手を振る: 薄い肌色', hexcode: '1F44B-1F3FB', emoji: '👋🏻', order: 11, group: 1 }],
  },
  { label: '地域指標 A', hexcode: '1F1E6', emoji: '🇦' }, // order / group なし → 除外
  { label: '薄い肌色', hexcode: '1F3FB', emoji: '🏻', order: 900, group: 2 }, // component → 除外
  { label: 'プラス', hexcode: '1F44D', emoji: '👍', tags: ['いいね'], order: 12, group: 1 },
];
const github = { '1F604': 'smile', '1F44D': ['+1', 'thumbsup'], '1F431': 'cat', '1F408': 'cat2' };

const data = normalizeData(raw, github);
const emojis = (r: EmojiEntry[]) => r.map((e) => e.emoji);

describe('normalizeQuery', () => {
  it('カタカナをひらがなに、全角英数を半角に、大文字を小文字にそろえる', () => {
    expect(normalizeQuery('ネコ')).toBe('ねこ');
    expect(normalizeQuery('ＳＭＩＬＥ')).toBe('smile');
    expect(normalizeQuery(' Smile ')).toBe('smile');
    expect(normalizeQuery('＋１')).toBe('+1');
  });
});

describe('normalizeData', () => {
  it('ショートコードを hexcode で結合する（配列・文字列の両方）', () => {
    expect(data.find((e) => e.emoji === '😄')?.shortcodes).toEqual(['smile']);
    expect(data.find((e) => e.emoji === '👍')?.shortcodes).toEqual(['+1', 'thumbsup']);
    expect(data.find((e) => e.emoji === '👋')?.shortcodes).toEqual([]);
  });

  it('肌の色バリエーション・order 無し・component を含めない', () => {
    expect(emojis(data)).not.toContain('👋🏻');
    expect(emojis(data)).not.toContain('🇦');
    expect(emojis(data)).not.toContain('🏻');
    expect(data).toHaveLength(5);
  });

  it('tags が無くても動く', () => {
    const d = normalizeData([{ label: 'x', hexcode: 'AAAA', emoji: 'x', order: 1, group: 0 }], {});
    expect(d[0].tags).toEqual([]);
  });
});

describe('searchEmoji', () => {
  it('ショートコードで検索できる', () => {
    expect(emojis(searchEmoji(data, 'smile', 8))).toEqual(['😄']);
    expect(emojis(searchEmoji(data, '+1', 8))).toEqual(['👍']);
  });

  it('ひらがなとカタカナを同一視する', () => {
    const a = emojis(searchEmoji(data, 'ねこ', 8));
    const b = emojis(searchEmoji(data, 'ネコ', 8));
    expect(a).toEqual(b);
    expect(a).toContain('🐈');
    expect(a).toContain('🐱');
  });

  it('全角英数は半角に寄せる', () => {
    expect(emojis(searchEmoji(data, 'ｓｍｉｌｅ', 8))).toEqual(['😄']);
  });

  it('並び順：ショートコード前方一致 > 名前前方一致 > タグ前方一致 > 部分一致。同点は order 順', () => {
    // 'cat' → 🐱(shortcode cat, 完全〜前方一致) と 🐈(cat2, 前方一致)。どちらもショートコード前方一致 → order 順で 🐱 が先
    expect(emojis(searchEmoji(data, 'cat', 8))).toEqual(['🐱', '🐈']);
    // 'ねこ': 🐈 は名前前方一致、🐱 はタグ前方一致 → 🐈 が先
    expect(emojis(searchEmoji(data, 'ねこ', 8))).toEqual(['🐈', '🐱']);
    // 'こり': 部分一致のみ
    expect(emojis(searchEmoji(data, 'こり', 8))).toEqual(['😄']);
  });

  it('ショートコードの完全一致は、前方一致より先に出る（:smile で 😄 が 😃 より上）', () => {
    const d = normalizeData(
      [
        { label: 'わーい', hexcode: 'A', emoji: '😃', order: 1, group: 0 },
        { label: '笑顔', hexcode: 'B', emoji: '😄', order: 2, group: 0 },
      ],
      { A: 'smiley', B: 'smile' },
    );
    expect(emojis(searchEmoji(d, 'smile', 8))).toEqual(['😄', '😃']);
  });

  it('部分一致は最下位', () => {
    // 'ご' は 'にっこり笑う' に含まれない。'ねこ' の部分一致は '猫の顔' のタグ。ここでは "こ" を使う
    const r = emojis(searchEmoji(data, 'こ', 8));
    expect(r).toContain('😄'); // にっこり：部分一致
    expect(r).toContain('🐈'); // ねこ：部分一致
  });

  it('limit で件数を絞る', () => {
    expect(searchEmoji(data, 'ね', 1)).toHaveLength(1);
  });

  it('空クエリ・該当なしは空配列', () => {
    expect(searchEmoji(data, '', 8)).toEqual([]);
    expect(searchEmoji(data, '   ', 8)).toEqual([]);
    expect(searchEmoji(data, 'zzzzzz', 8)).toEqual([]);
  });
});

describe('loadEmojiData', () => {
  afterEach(() => {
    resetEmojiDataCache();
    vi.unstubAllGlobals();
  });

  const ok = (body: unknown) => ({ ok: true, json: async () => body });

  it('2 つのファイルを取得してキャッシュする', async () => {
    const fetchMock = vi.fn(async (url: string) => (url.endsWith('github.json') ? ok(github) : ok(raw)));
    vi.stubGlobal('fetch', fetchMock);
    const a = await loadEmojiData('/emojibase');
    const b = await loadEmojiData('/emojibase');
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('/emojibase/ja/data.json');
    expect(fetchMock).toHaveBeenCalledWith('/emojibase/en/shortcodes/github.json');
  });

  it('失敗したら例外を投げ、次回は再取得する', async () => {
    const fetchMock = vi.fn(async (_url: string) => ({ ok: false, status: 404, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadEmojiData('/emojibase')).rejects.toThrow(/404/);
    fetchMock.mockImplementation((async (url: string) => (url.endsWith('github.json') ? ok(github) : ok(raw))) as never);
    await expect(loadEmojiData('/emojibase')).resolves.toHaveLength(5);
  });

  it('ネットワークエラーでも次回は再取得する', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('offline'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadEmojiData('/x')).rejects.toThrow('offline');
    await expect(loadEmojiData('/x')).rejects.toThrow('offline');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe('augmentPickerData（ピッカーの検索用）', () => {
  const base = {
    locale: 'ja',
    categories: [],
    skinTones: {},
    emojis: [
      { emoji: '🐈', category: 3, label: 'ネコ', version: 0.7, tags: ['どうぶつ', 'ペット'] },
      { emoji: '😄', category: 0, label: 'にっこり笑う', version: 0.6, tags: [] },
    ],
  } as never;

  it('名前とタグのひらがな・カタカナ表記をタグに足す（frimousse の検索は表記を区別するため）', () => {
    const out = augmentPickerData(base) as { emojis: { label: string; tags: string[] }[] };
    expect(out.emojis[0].label).toBe('ネコ'); // 表示は変えない
    expect(out.emojis[0].tags).toEqual(expect.arrayContaining(['ねこ', 'ネコ', 'どうぶつ', 'ドウブツ', 'ぺっと', 'ペット']));
    expect(out.emojis[1].tags).toEqual(expect.arrayContaining(['にっこり笑う', 'ニッコリ笑ウ']));
  });

  it('重複は足さず、元のデータを書き換えない', () => {
    const out = augmentPickerData(base) as { emojis: { tags: string[] }[] };
    expect(new Set(out.emojis[0].tags).size).toBe(out.emojis[0].tags.length);
    expect((base as { emojis: { tags: string[] }[] }).emojis[0].tags).toEqual(['どうぶつ', 'ペット']);
  });
});
