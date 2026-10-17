import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { EmojiEntry } from './emoji-data';

export interface SuggestionListHandle {
  /** Suggestion の onKeyDown から呼ぶ。処理したら true */
  onKeyDown(props: { event: KeyboardEvent }): boolean;
}

interface Props {
  items: EmojiEntry[];
  command: (props: { emoji: string }) => void;
}

/** IME の変換中（確定の Enter など）はキー操作を奪わない */
function isComposingEvent(event: KeyboardEvent): boolean {
  return event.isComposing || event.keyCode === 229;
}

export const SuggestionList = forwardRef<SuggestionListHandle, Props>(function SuggestionList(
  { items, command },
  ref,
) {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }) {
      if (items.length === 0 || isComposingEvent(event)) return false;
      // Shift+Enter（改行）などの修飾キー付きは、エディター本来の動作に任せる
      if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return false;
      const current = Math.min(selected, items.length - 1);
      switch (event.key) {
        case 'ArrowDown':
          setSelected((s) => (s + 1) % items.length);
          return true;
        case 'ArrowUp':
          setSelected((s) => (s - 1 + items.length) % items.length);
          return true;
        case 'Enter':
        case 'Tab':
          command({ emoji: items[current].emoji });
          return true;
        default:
          return false;
      }
    },
  }));

  if (items.length === 0) return null;
  const active = Math.min(selected, items.length - 1);

  return (
    <ul className="acms-emoji-list" role="listbox">
      {items.map((item, index) => (
        <li
          key={item.emoji}
          role="option"
          aria-selected={index === active}
          className="acms-emoji-list__item"
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setSelected(index)}
          onClick={() => command({ emoji: item.emoji })}
        >
          <span className="acms-emoji-list__emoji" aria-hidden="true">
            {item.emoji}
          </span>
          <span className="acms-emoji-list__label">{item.label}</span>
          {item.shortcodes[0] && <span className="acms-emoji-list__code">:{item.shortcodes[0]}:</span>}
        </li>
      ))}
    </ul>
  );
});
