export const STORAGE_KEY = 'acms-block-editor-emoji:recent';
export const MAX_RECENT = 24;

export function getRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function pushRecent(emoji: string): void {
  const next = [emoji, ...getRecent().filter((e) => e !== emoji)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 保存できなくても動作には影響しない
  }
}
