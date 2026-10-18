export const STORAGE_KEY = 'acms-block-editor-emoji:recent';
export const MAX_RECENT = 24;
/** 絵文字 1 つ（ZWJ 連結を含む）として十分な長さ */
const MAX_LENGTH = 32;

/** localStorage は書き換えられうるので、絵文字として妥当なものだけを使う */
const isEmojiLike = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= MAX_LENGTH && !/[<>&]/.test(v);

export function getRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isEmojiLike) : [];
  } catch {
    return [];
  }
}

export function pushRecent(emoji: string): void {
  if (!isEmojiLike(emoji)) return;
  const next = [emoji, ...getRecent().filter((e) => e !== emoji)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 保存できなくても動作には影響しない
  }
}
