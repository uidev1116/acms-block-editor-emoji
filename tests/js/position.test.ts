import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';
import { isAllowedPosition } from '../../frontend/position';

let editor: Editor;
afterEach(() => editor?.destroy());

function make(content: string) {
  editor = new Editor({ extensions: [StarterKit], content });
  return editor;
}

/** 文書内のテキストから `:` の位置を探して range を返す */
function rangeOf(ed: Editor, needle: string) {
  let found = -1;
  ed.state.doc.descendants((node, pos) => {
    if (found === -1 && node.isText && node.text?.includes(needle)) {
      found = pos + node.text.indexOf(needle);
    }
  });
  return { from: found, to: found + needle.length };
}

describe('isAllowedPosition', () => {
  it('通常の段落内では許可', () => {
    const ed = make('<p>hello :smile</p>');
    expect(isAllowedPosition(ed.state, rangeOf(ed, ':smile'))).toBe(true);
  });

  it('行頭では許可', () => {
    const ed = make('<p>:smile</p>');
    expect(isAllowedPosition(ed.state, rangeOf(ed, ':smile'))).toBe(true);
  });

  it('日本語の直後は許可', () => {
    const ed = make('<p>今日は：ねこ</p>');
    expect(isAllowedPosition(ed.state, rangeOf(ed, '：ねこ'))).toBe(true);
  });

  it('スペース・全角スペースの直後は許可', () => {
    const ed = make('<p>a　:smile</p>');
    expect(isAllowedPosition(ed.state, rangeOf(ed, ':smile'))).toBe(true);
  });

  it.each(['10:30', 'https://x', 'abc:def', 'ＡＢ：ねこ', '１０：３０'])('英数字の直後は不許可: %s', (text) => {
    const ed = make(`<p>${text}</p>`);
    const needle = text.includes('：') ? '：' : ':';
    const r = rangeOf(ed, needle);
    expect(isAllowedPosition(ed.state, { from: r.from, to: r.from + 3 })).toBe(false);
  });

  it('コードブロック内では不許可', () => {
    const ed = make('<pre><code>x :smile</code></pre>');
    expect(isAllowedPosition(ed.state, rangeOf(ed, ':smile'))).toBe(false);
  });

  it('インラインコード内では不許可', () => {
    const ed = make('<p>a <code>:smile</code></p>');
    expect(isAllowedPosition(ed.state, rangeOf(ed, ':smile'))).toBe(false);
  });

  it('見出し・リストの中でも許可', () => {
    const ed = make('<h2>見出し :smile</h2><ul><li><p>項目 :cat</p></li></ul>');
    expect(isAllowedPosition(ed.state, rangeOf(ed, ':smile'))).toBe(true);
    expect(isAllowedPosition(ed.state, rangeOf(ed, ':cat'))).toBe(true);
  });
});
