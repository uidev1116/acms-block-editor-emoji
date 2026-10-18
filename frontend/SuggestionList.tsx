import { t } from '@ablogcms/i18n';
import { forwardRef, useEffect, useId, useImperativeHandle, useState } from 'react';
import type { EmojiEntry } from './emoji-data';

export interface SuggestionListHandle {
  /** Suggestion の onKeyDown から呼ぶ。処理したら true */
  onKeyDown(props: { event: KeyboardEvent }): boolean;
}

export interface ActiveOption {
  listId: string;
  optionId: string;
}

interface Props {
  items: EmojiEntry[];
  command: (props: { emoji: string }) => void;
  /** 選択中の項目が変わったとき（消えるときは null）。エディター側の aria-activedescendant に使う */
  onActive?: (active: ActiveOption | null) => void;
}

/** IME の変換中（確定の Enter など）はキー操作を奪わない */
function isComposingEvent(event: KeyboardEvent): boolean {
  return event.isComposing || event.keyCode === 229;
}

export const SuggestionList = forwardRef<SuggestionListHandle, Props>(function SuggestionList(
  { items, command, onActive },
  ref,
) {
  const [selected, setSelected] = useState(0);
  // 候補が入れ替わったら、描画の前に先頭へ戻す（古い選択位置の id を一瞬でも出さない）
  const [shownItems, setShownItems] = useState(items);
  if (shownItems !== items) {
    setShownItems(items);
    setSelected(0);
  }
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;
  const activeIndex = items.length === 0 ? -1 : Math.min(selected, items.length - 1);

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

  useEffect(() => {
    if (activeIndex < 0) return;
    onActive?.({ listId, optionId: `${listId}-option-${activeIndex}` });
  }, [onActive, listId, activeIndex, items]);
  useEffect(() => () => onActive?.(null), [onActive]);

  if (items.length === 0) return null;
  const active = activeIndex;

  return (
    <>
    <ul id={listId} className="acms-admin-emoji-list" role="listbox" aria-label={t('block-editor-emoji:suggestions')}>
      {items.map((item, index) => (
        <li
          key={item.emoji}
          id={optionId(index)}
          role="option"
          aria-selected={index === active}
          className="acms-admin-emoji-list__item"
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setSelected(index)}
          onClick={() => command({ emoji: item.emoji })}
        >
          <span className="acms-admin-emoji-list__emoji" aria-hidden="true">
            {item.emoji}
          </span>
          <span className="acms-admin-emoji-list__label">{item.label}</span>
          {item.shortcodes[0] && <span className="acms-admin-emoji-list__code">:{item.shortcodes[0]}:</span>}
        </li>
      ))}
    </ul>
    <span role="status" className="acms-admin-emoji-visually-hidden">
      {t('block-editor-emoji:suggestionCount', { count: items.length })}
    </span>
    </>
  );
});
