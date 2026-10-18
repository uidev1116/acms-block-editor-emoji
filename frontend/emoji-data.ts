export interface EmojiEntry {
  emoji: string;
  label: string;
  tags: string[];
  shortcodes: string[];
  order: number;
  /** 検索用に正規化した文字列 */
  normLabel: string;
  normTags: string[];
  normCodes: string[];
}

interface RawEmoji {
  label: string;
  hexcode: string;
  emoji: string;
  tags?: string[];
  order?: number;
  group?: number;
}

type RawShortcodes = Record<string, string | string[]>;

/** emojibase の group 2 は肌の色などのコンポーネント（単体では使わない） */
const COMPONENT_GROUP = 2;

/** 全角英数→半角、カタカナ→ひらがな、大文字→小文字、前後の空白を除去 */
export function normalizeQuery(text: string): string {
  return text
    .trim()
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .toLowerCase();
}

/** ja/data.json と en/shortcodes/github.json を結合する。肌の色バリエーションは基本形のみ残す */
export function normalizeData(raw: RawEmoji[], shortcodes: RawShortcodes): EmojiEntry[] {
  const entries: EmojiEntry[] = [];
  for (const item of raw) {
    if (item.order === undefined || item.group === undefined || item.group === COMPONENT_GROUP) {
      continue;
    }
    const codes = shortcodes[item.hexcode];
    const tags = item.tags ?? [];
    const list = codes === undefined ? [] : Array.isArray(codes) ? codes : [codes];
    entries.push({
      emoji: item.emoji,
      label: item.label,
      tags,
      shortcodes: list,
      order: item.order,
      normLabel: normalizeQuery(item.label),
      normTags: tags.map(normalizeQuery),
      normCodes: list.map((c) => c.toLowerCase()),
    });
  }
  return entries;
}

let cache: Promise<EmojiEntry[]> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${url} (${res.status})`);
  }
  return (await res.json()) as T;
}

/** 初回だけ取得してキャッシュする。失敗したらキャッシュを捨てて、次回に再試行する */
export function loadEmojiData(baseUrl: string): Promise<EmojiEntry[]> {
  cache ??= Promise.all([
    fetchJson<RawEmoji[]>(`${baseUrl}/ja/data.json`),
    fetchJson<RawShortcodes>(`${baseUrl}/en/shortcodes/github.json`),
  ])
    .then(([data, github]) => normalizeData(data, github))
    .catch((e: unknown) => {
      cache = null;
      throw e;
    });
  return cache;
}

export function resetEmojiDataCache(): void {
  cache = null;
}

function score(entry: EmojiEntry, q: string): number | null {
  const codes = entry.normCodes;
  if (codes.includes(q)) return 0;
  if (codes.some((c) => c.startsWith(q))) return 1;
  if (entry.normLabel.startsWith(q)) return 2;
  if (entry.normTags.some((t) => t.startsWith(q))) return 3;
  if (entry.normLabel.includes(q) || entry.normTags.some((t) => t.includes(q)) || codes.some((c) => c.includes(q))) {
    return 4;
  }
  return null;
}

/** スコア順：ショートコード完全一致 > ショートコード前方一致 > 名前前方一致 > タグ前方一致 > 部分一致。同点は order 順 */
export function searchEmoji(data: EmojiEntry[], query: string, limit: number): EmojiEntry[] {
  const q = normalizeQuery(query);
  if (q === '') return [];
  const hits: { entry: EmojiEntry; score: number }[] = [];
  for (const entry of data) {
    const s = score(entry, q);
    if (s !== null) hits.push({ entry, score: s });
  }
  hits.sort((a, b) => a.score - b.score || a.entry.order - b.entry.order);
  return hits.slice(0, limit).map((h) => h.entry);
}

const toKatakana = (text: string) =>
  text.replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
const toHiragana = (text: string) =>
  text.replace(/[\u30A1-\u30F6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

interface PickerEmoji {
  label: string;
  tags: string[];
}

/**
 * frimousse の検索は名前・タグの部分一致で、ひらがなとカタカナを区別する（「ねこ」で「ネコ」が出ない）。
 * 名前とタグの両方の表記をタグに足して、どちらで入力しても見つかるようにする（表示は変えない）。
 */
export function augmentPickerData<T extends { emojis: PickerEmoji[] }>(data: T): T {
  return {
    ...data,
    emojis: data.emojis.map((item) => {
      const tags = new Set(item.tags);
      for (const text of [item.label, ...item.tags]) {
        tags.add(toHiragana(text));
        tags.add(toKatakana(text));
      }
      return { ...item, tags: [...tags] };
    }),
  };
}
