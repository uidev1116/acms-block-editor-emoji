import { Alert } from '@ablogcms/components/alert';
import { ButtonV2 } from '@ablogcms/components/button-v2';
import { t } from '@ablogcms/i18n';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { EmojiPicker as P, defaultEmojiDataResolver, type EmojiDataResolver } from 'frimousse';
import { augmentPickerData } from './emoji-data';
import { getRecent } from './recent';

export interface EmojiPickerProps {
  emojibaseUrl: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  /** フォーカスがピッカーの外へ移ったとき（Esc ではない閉じ方。フォーカスは戻さない） */
  onDismiss?: () => void;
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

/** IME の変換中か（変換を確定する Enter も、この間のキーイベントとして届く） */
function isComposingKey(e: KeyboardEvent<HTMLElement>): boolean {
  return e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229;
}

export function EmojiPicker({ emojibaseUrl, onSelect, onClose, onDismiss }: EmojiPickerProps) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const searchId = useId();

  // 開いた直後に検索欄へフォーカスする（ページをスクロールさせない）。ツールバーのボタンから開いたときは、ボタンがフォーカスを持ち直すことがあるので、少し後に行う
  useEffect(() => {
    const timer = setTimeout(() => {
      const target = failed ? errorRef.current?.querySelector('button') : rootRef.current?.querySelector('input');
      target?.focus({ preventScroll: true });
    }, 0);
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
      <div ref={errorRef} className="acms-admin-emoji-picker acms-admin-emoji-picker--error" onKeyDown={(e) => closeOnEscape(e, onClose)}>
        <Alert variant="danger">{t('block-editor-emoji:loadError')}</Alert>
        <ButtonV2
          variant="outlined"
          onClick={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
        >
          {t('block-editor-emoji:retry')}
        </ButtonV2>
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
      // 変換中のキーは frimousse に渡さない（変換を確定する Enter で、選択中の絵文字が挿入されてしまうため）。
      // preventDefault はしない（IME の確定は通常どおり行われる）
      onKeyDownCapture={(e) => {
        if (isComposingKey(e)) e.stopPropagation();
      }}
      onKeyDown={(e) => closeOnEscape(e, onClose)}
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        const scope = e.currentTarget.closest('.acms-admin-emoji-popup') ?? e.currentTarget;
        if (next && !scope.contains(next)) onDismiss?.();
      }}
    >
      {/* 管理画面標準の入力欄の見た目（フォーム部品のスタイルは .acms-admin-form の中だけに効く） */}
      <div className="acms-admin-form acms-admin-emoji-picker__search-wrap">
        <P.Search
          id={searchId}
          // id / name が無いフォーム要素は、ブラウザ（Chrome の Issues）に警告される。自動入力は不要
          name="block-editor-emoji-search"
          autoComplete="off"
          aria-label={t('block-editor-emoji:search')}
          className="acms-admin-form-control acms-admin-emoji-picker__search"
          placeholder={t('block-editor-emoji:search')}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
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
