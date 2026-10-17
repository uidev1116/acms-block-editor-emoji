/** ctx.i18n.addResources に渡す翻訳リソース（名前空間は register 名の block-editor-emoji） */
export const NAMESPACE = 'block-editor-emoji';

export const resources = {
  ja: {
    openPicker: '絵文字（⌘⌥E）',
    search: '絵文字を検索',
    loading: '読み込み中…',
    empty: '見つかりませんでした',
    loadError: '絵文字データを読み込めませんでした',
    retry: '再試行',
    recent: '最近使った絵文字',
    shortcutOpenPicker: '絵文字ピッカーを開く',
  },
  en: {
    openPicker: 'Emoji (⌘⌥E)',
    search: 'Search emoji',
    loading: 'Loading…',
    empty: 'No emoji found',
    loadError: 'Could not load the emoji data',
    retry: 'Retry',
    recent: 'Recently used',
    shortcutOpenPicker: 'Open the emoji picker',
  },
} as const;

export type MessageKey = keyof (typeof resources)['ja'];
