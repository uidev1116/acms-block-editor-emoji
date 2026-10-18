import { Popover, PopoverContent } from '@ablogcms/components/popover';
import { flip, offset, shift, size } from '@floating-ui/react';
import { forwardRef, type ComponentType } from 'react';

export type PopupVariant = 'list' | 'picker';

interface Props {
  Content: ComponentType<Record<string, unknown>>;
  contentProps: Record<string, unknown>;
  getRect: () => DOMRect | null;
  /** true のとき、外側のクリックで閉じる（ピッカー）。false は閉じない（候補リスト。Suggestion が閉じる） */
  interactive: boolean;
  variant: PopupVariant;
  onDismiss: () => void;
}

/**
 * 管理画面のデザインシステム（`@ablogcms/components` の Popover）で包む。位置合わせ・はみ出し防止・
 * 外側クリック・フォーカス管理・z-index（`.acms-admin-popover`）はそちらに任せる。
 * 基準位置は仮想要素（`getAnchorRect`）なので、エディターの中のカーソル位置を指せる。
 */
export const PopupShell = forwardRef<unknown, Props>(function PopupShell(
  { Content, contentProps, getRect, interactive, variant, onDismiss },
  ref,
) {
  return (
    <Popover
      isOpen
      placement="bottom-start"
      getAnchorRect={getRect}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
      // Esc はこちらでは扱わない（Suggestion と、IME を見ているピッカー自身が扱う）
      dismissOptions={{ enabled: interactive, escapeKey: false }}
      // フォーカスの移動はこちらでは扱わない。FloatingFocusManager は、開いた直後（位置が決まる前）に
      // フォーカスしてページが先頭へスクロールしてしまうため。ピッカーは自分で検索欄へ移す（EmojiPicker）
      focusManagerOptions={{ disabled: true }}
      floatingOptions={{
        middleware: [
          offset(4),
          flip({ padding: 8 }),
          shift({ padding: 8 }),
          // 空きが足りないときは、画面からはみ出さないよう高さを抑える（CSS が参照する）
          size({
            padding: 8,
            apply({ availableHeight, elements }) {
              elements.floating.style.setProperty(
                '--acms-admin-emoji-max-height',
                `${Math.max(Math.floor(availableHeight), 160)}px`,
              );
            },
          }),
        ],
      }}
    >
      <PopoverContent size="small" className={`acms-admin-emoji-popup acms-admin-emoji-popup--${variant}`}>
        <Content ref={ref} {...contentProps} />
      </PopoverContent>
    </Popover>
  );
});
