import { t } from '@ablogcms/i18n';
import { useEffect, useRef, useState } from 'react';
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
    <div className="acms-emoji-picker__recent" role="group" aria-label={t('block-editor-emoji:recent')}>
      {recent.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="acms-emoji-picker__recent-item"
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
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
      <div className="acms-emoji-picker acms-emoji-picker--error" role="alert">
        <p>{t('block-editor-emoji:loadError')}</p>
        <button
          type="button"
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
      className="acms-emoji-picker"
      locale="ja"
      emojibaseUrl={emojibaseUrl}
      resolveEmojiData={resolver}
      columns={9}
      onEmojiSelect={({ emoji }) => onSelect(emoji)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <P.Search
        className="acms-emoji-picker__search"
        placeholder={t('block-editor-emoji:search')}
        autoFocus
        onChange={(e) => setQuery(e.target.value)}
      />
      {query === '' && <RecentRow onSelect={onSelect} />}
      <P.Viewport className="acms-emoji-picker__viewport">
        <P.Loading className="acms-emoji-picker__status">{t('block-editor-emoji:loading')}</P.Loading>
        <P.Empty className="acms-emoji-picker__status">{t('block-editor-emoji:empty')}</P.Empty>
        <P.List className="acms-emoji-picker__list" />
      </P.Viewport>
      <P.SkinToneSelector className="acms-emoji-picker__skin" />
    </P.Root>
  );
}
