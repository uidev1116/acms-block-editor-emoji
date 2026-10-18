import type { EditorState } from '@tiptap/pm/state';

/** 直前がこれらの文字ならサジェストを出さない（`10:30`、`https://`、`１０：３０` など） */
const ALNUM = /[A-Za-z0-9０-９Ａ-Ｚａ-ｚ]/;

/**
 * サジェストを出してよい位置か。
 * コードブロック内・インラインコード内・直前が英数字の場合は出さない。
 */
export function isAllowedPosition(state: EditorState, range: { from: number; to: number }): boolean {
  const $from = state.doc.resolve(range.from);
  if ($from.parent.type.spec.code || $from.parent.type.name === 'codeBlock') {
    return false;
  }
  const $to = state.doc.resolve(range.to);
  if ($to.marks().some((mark) => mark.type.name === 'code')) {
    return false;
  }
  const before = range.from > $from.start() ? state.doc.textBetween(range.from - 1, range.from) : '';
  return !ALNUM.test(before);
}
