import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SuggestionList, type SuggestionListHandle } from '../../frontend/SuggestionList';
import type { EmojiEntry } from '../../frontend/emoji-data';

const entry = (emoji: string, label: string, shortcodes: string[] = []): EmojiEntry => ({
  emoji,
  label,
  tags: [],
  shortcodes,
  order: 0,
  normLabel: label,
  normTags: [],
  normCodes: shortcodes,
});
const items = [entry('😄', 'にっこり笑う', ['smile']), entry('🐈', 'ねこ', ['cat2']), entry('🐱', '猫の顔')];

const key = (k: string, extra: Partial<KeyboardEventInit> = {}) =>
  new KeyboardEvent('keydown', { key: k, ...extra });

function setup(list = items) {
  const command = vi.fn();
  const ref = createRef<SuggestionListHandle>();
  const view = render(<SuggestionList ref={ref} items={list} command={command} />);
  return { command, ref, ...view };
}

describe('SuggestionList', () => {
  it('絵文字・名前・ショートコードを縦に並べ、最初の項目が選択状態', () => {
    setup();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toContain('😄');
    expect(options[0].textContent).toContain('にっこり笑う');
    expect(options[0].textContent).toContain(':smile:');
    expect(options[2].textContent).not.toContain('::');
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    expect(options[1].getAttribute('aria-selected')).toBe('false');
  });

  it('0 件のときは何も描画しない', () => {
    const { container } = setup([]);
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it('↓↑で選択が移動し、端でループする', () => {
    const { ref } = setup();
    let handled = false;
    act(() => {
      handled = ref.current!.onKeyDown({ event: key('ArrowDown') });
    });
    expect(handled).toBe(true);
    expect(screen.getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true');
    act(() => {
      ref.current!.onKeyDown({ event: key('ArrowUp') });
      ref.current!.onKeyDown({ event: key('ArrowUp') });
    });
    expect(screen.getAllByRole('option')[2].getAttribute('aria-selected')).toBe('true');
    act(() => {
      ref.current!.onKeyDown({ event: key('ArrowDown') });
    });
    expect(screen.getAllByRole('option')[0].getAttribute('aria-selected')).toBe('true');
  });

  it('Enter / Tab で選択中の項目を確定する', () => {
    const { ref, command } = setup();
    act(() => {
      ref.current!.onKeyDown({ event: key('ArrowDown') });
    });
    act(() => {
      expect(ref.current!.onKeyDown({ event: key('Enter') })).toBe(true);
    });
    expect(command).toHaveBeenLastCalledWith({ emoji: '🐈' });
    act(() => {
      expect(ref.current!.onKeyDown({ event: key('Tab') })).toBe(true);
    });
    expect(command).toHaveBeenCalledTimes(2);
  });

  it('IME 変換中のキー操作は無視する（isComposing / keyCode 229）', () => {
    const { ref, command } = setup();
    expect(ref.current!.onKeyDown({ event: key('Enter', { isComposing: true }) })).toBe(false);
    expect(ref.current!.onKeyDown({ event: key('ArrowDown', { isComposing: true }) })).toBe(false);
    expect(ref.current!.onKeyDown({ event: key('Enter', { keyCode: 229 }) })).toBe(false);
    expect(command).not.toHaveBeenCalled();
  });

  it('Shift+Enter など修飾キー付きは奪わない（改行・ショートカットはエディターに任せる）', () => {
    const { ref, command } = setup();
    for (const mod of ['shiftKey', 'ctrlKey', 'altKey', 'metaKey'] as const) {
      expect(ref.current!.onKeyDown({ event: key('Enter', { [mod]: true }) })).toBe(false);
    }
    expect(command).not.toHaveBeenCalled();
  });

  it('関係ないキーは処理しない。0 件のときも処理しない', () => {
    const { ref } = setup();
    expect(ref.current!.onKeyDown({ event: key('a') })).toBe(false);
    const empty = setup([]);
    expect(empty.ref.current!.onKeyDown({ event: key('Enter') })).toBe(false);
  });

  it('クリックで確定。mousedown ではエディターのフォーカスを奪わない', () => {
    const { command } = setup();
    const second = screen.getAllByRole('option')[1];
    const down = fireEvent.mouseDown(second);
    expect(down).toBe(false); // preventDefault された
    fireEvent.click(second);
    expect(command).toHaveBeenCalledWith({ emoji: '🐈' });
  });

  it('マウスを載せると選択が移る', () => {
    setup();
    fireEvent.mouseEnter(screen.getAllByRole('option')[2]);
    expect(screen.getAllByRole('option')[2].getAttribute('aria-selected')).toBe('true');
  });

  it('items が変わったら選択を先頭に戻す', () => {
    const { ref, rerender, command } = setup();
    act(() => {
      ref.current!.onKeyDown({ event: key('ArrowDown') });
    });
    rerender(<SuggestionList ref={ref} items={[items[2], items[0]]} command={command} />);
    expect(screen.getAllByRole('option')[0].getAttribute('aria-selected')).toBe('true');
  });

  it('各項目に id があり、listbox に名前がある', () => {
    setup();
    const options = screen.getAllByRole('option');
    const ids = options.map((o) => o.id);
    expect(ids.every((id) => id !== '')).toBe(true);
    expect(new Set(ids).size).toBe(3);
    expect(screen.getByRole('listbox').getAttribute('aria-label')).toBe('絵文字の候補');
  });

  it('選択が変わるたびに onActive へ listbox と選択項目の id を伝え、消えるときは null を伝える', () => {
    const onActive = vi.fn();
    const ref = createRef<SuggestionListHandle>();
    const view = render(<SuggestionList ref={ref} items={items} command={vi.fn()} onActive={onActive} />);
    const options = screen.getAllByRole('option');
    const listId = screen.getByRole('listbox').id;
    expect(onActive).toHaveBeenLastCalledWith({ listId, optionId: options[0].id });
    act(() => {
      ref.current!.onKeyDown({ event: key('ArrowDown') });
    });
    expect(onActive).toHaveBeenLastCalledWith({ listId, optionId: options[1].id });
    view.unmount();
    expect(onActive).toHaveBeenLastCalledWith(null);
  });

  it('候補の件数を、読み上げ用の status で通知する', () => {
    setup();
    expect(screen.getByRole('status').textContent).toBe('3 件の候補');
  });
});
