import { t } from '@ablogcms/i18n';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { EmojiPicker as P, defaultEmojiDataResolver, type EmojiDataResolver } from 'frimousse';
import { augmentPickerData } from './emoji-data';
import { getRecent } from './recent';

export interface EmojiPickerProps {
  emojibaseUrl: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const failureListeners = new Set<() => void>();

/**
 * 失敗したらリゾルバーを作り直す。frimousse はリゾルバーの関数ごとに読み込み結果を覚えているので、
 * 次に開いたときに再取得させるには別の関数にする必要がある。
 * frimousse 自身は失敗を console.error に出すだけで画面に出さないため、ここで失敗を通知する。
 */
let resolver: EmojiDataResolver = createResolver();
function createResolver(): EmojiDataResolver {
  return async (locale, options) => {
    try {
      return augmentPickerData(await defaultEmojiDataResolver(locale, options));
    } catch (e) {
      resolver = createResolver();
      failureListeners.forEach((listener) => listener());
      throw e;
    }
  };
}

function RecentRow({ onSelect }: { onSelect: (emoji: string) => void }) {
  const recent = getRecent();
  if (recent.length === 0) return null;
  return (
    <div className="acms-admin-emoji-picker__recent" role="group" aria-label={t('block-editor-emoji:recent')}>
      {recent.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="acms-admin-emoji-picker__recent-item"
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

/** Esc で閉じる。IME の変換中の Esc（変換の取り消し）では閉じない */
function closeOnEscape(e: KeyboardEvent<HTMLElement>, onClose: () => void) {
  if (e.key === 'Escape' && !e.nativeEvent.isComposing) {
    e.stopPropagation();
    onClose();
  }
}

export function EmojiPicker({ emojibaseUrl, onSelect, onClose }: EmojiPickerProps) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  // ツールバーのボタンから開いたとき、ボタンがフォーカスを持ち直すことがあるので、少し後に検索欄へ移す
  useEffect(() => {
    const timer = setTimeout(() => rootRef.current?.querySelector('input')?.focus(), 0);
    return () => clearTimeout(timer);
  }, [attempt, failed]);

  useEffect(() => {
    const listener = () => setFailed(true);
    failureListeners.add(listener);
    return () => {
      failureListeners.delete(listener);
    };
  }, []);

  if (failed) {
    return (
      <div
        className="acms-admin-emoji-picker acms-admin-emoji-picker--error"
        role="alert"
        onKeyDown={(e) => closeOnEscape(e, onClose)}
      >
        <p>{t('block-editor-emoji:loadError')}</p>
        <button
          type="button"
          autoFocus
          onClick={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
        >
          {t('block-editor-emoji:retry')}
        </button>
      </div>
    );
  }

  return (
    <P.Root
      key={attempt}
      ref={rootRef}
      className="acms-admin-emoji-picker"
      locale="ja"
      emojibaseUrl={emojibaseUrl}
      resolveEmojiData={resolver}
      columns={9}
      onEmojiSelect={({ emoji }) => onSelect(emoji)}
      onKeyDown={(e) => closeOnEscape(e, onClose)}
    >
      <P.Search
        className="acms-admin-emoji-picker__search"
        placeholder={t('block-editor-emoji:search')}
        autoFocus
        onChange={(e) => setQuery(e.target.value)}
      />
      {query === '' && <RecentRow onSelect={onSelect} />}
      <P.Viewport className="acms-admin-emoji-picker__viewport">
        <P.Loading className="acms-admin-emoji-picker__status">{t('block-editor-emoji:loading')}</P.Loading>
        <P.Empty className="acms-admin-emoji-picker__status">{t('block-editor-emoji:empty')}</P.Empty>
        <P.List className="acms-admin-emoji-picker__list" />
      </P.Viewport>
      <P.SkinToneSelector className="acms-admin-emoji-picker__skin" />
    </P.Root>
  );
}
