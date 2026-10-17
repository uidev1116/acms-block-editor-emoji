import { t } from '@ablogcms/i18n';
import type { Tiptap } from '@ablogcms/block-editor/tiptap';
import type { BlockMenuToolbarItem } from '@ablogcms/block-editor/types';
import type { Editor, Range } from '@tiptap/core';
import { EmojiPicker } from './EmojiPicker';
import { SuggestionList, type SuggestionListHandle } from './SuggestionList';
import { loadEmojiData, searchEmoji, type EmojiEntry } from './emoji-data';
import { isAllowedPosition } from './position';
import { createPopup, closeActivePopup, type PopupHandle } from './popup';
import { pushRecent } from './recent';

export interface Deps {
  /** emojibase のデータ（ja/data.json など）の置き場所。末尾にスラッシュを付けない */
  emojibaseUrl: string;
}

export interface EmojiOptions {
  blockMenu: BlockMenuToolbarItem[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emojiInput: {
      /** カーソル位置に絵文字を挿入する */
      insertEmoji: (emoji: string) => ReturnType;
      /** 絵文字ピッカーを開く */
      openEmojiPicker: () => ReturnType;
    };
  }
}

const MAX_ITEMS = 8;

/** ツールチップに出すショートカット（Mod は Mac では ⌘、それ以外では Ctrl） */
export function shortcutLabel(): string {
  return /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘⌥E' : 'Ctrl+Alt+E';
}
const TRIGGERS = [':', '：'] as const;

/** コードブロック内では絵文字を入れない */
function canInsertHere(editor: Editor): boolean {
  return !editor.isActive('codeBlock');
}

export function openPicker(tiptap: Tiptap, editor: Editor, deps: Deps): void {
  // ピッカーの検索欄にフォーカスが移ると選択範囲が見えなくなるので、開く前の範囲を保存しておく
  const range = { from: editor.state.selection.from, to: editor.state.selection.to };
  const rect = () => {
    const coords = editor.view.coordsAtPos(range.from);
    return new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top);
  };
  const popup = createPopup(
    tiptap,
    editor,
    EmojiPicker,
    {
      emojibaseUrl: deps.emojibaseUrl,
      onSelect: (emoji: string) => {
        editor.chain().focus().insertContentAt(range, emoji).run();
        pushRecent(emoji);
        popup.destroy();
      },
      onClose: () => {
        popup.destroy();
        editor.commands.focus();
      },
    },
    rect,
    { onOutsideClick: () => popup.destroy() },
  );
}

interface SuggestionRenderProps {
  editor: Editor;
  items: EmojiEntry[];
  command: (props: { emoji: string }) => void;
  clientRect?: (() => DOMRect | null) | null;
  /** Tiptap 3.31 以降：items の取得中は true（このとき items は空） */
  loading?: boolean;
}

/** Suggestion の render()。候補が 0 件のときはリストを閉じる */
export function createSuggestionRender(tiptap: Tiptap) {
  let popup: PopupHandle<{ items: EmojiEntry[]; command: SuggestionRenderProps['command'] }, SuggestionListHandle> | null =
    null;
  let current: SuggestionRenderProps | null = null;

  const close = () => {
    popup?.destroy();
    popup = null;
  };

  const show = (props: SuggestionRenderProps) => {
    current = props;
    // 候補の取得中は前の表示を保つ（毎回作り直すとちらつき、選択位置も戻ってしまう）
    if (props.loading) return;
    if (props.items.length === 0) {
      close();
      return;
    }
    if (popup) {
      popup.update({ items: props.items, command: props.command });
      return;
    }
    popup = createPopup(
      tiptap,
      props.editor,
      SuggestionList,
      { items: props.items, command: props.command },
      () => current?.clientRect?.() ?? null,
      // 他のポップアップ（ピッカー）に置き換えられたら、参照を捨てる
      { onClose: () => (popup = null) },
    );
  };

  return {
    onStart: show,
    onUpdate: show,
    onKeyDown: ({ event }: { event: KeyboardEvent }): boolean => popup?.getRef()?.onKeyDown({ event }) ?? false,
    onExit: close,
  };
}

export function createEmojiExtension(tiptap: Tiptap, deps: Deps) {
  const {
    core,
    suggestion: { Suggestion },
    pm: {
      state: { PluginKey },
    },
  } = tiptap;

  return core.Extension.create<EmojiOptions>({
    name: 'emojiInput',

    addOptions() {
      return {
        blockMenu: [
          {
            scope: 'text',
            order: 50,
            icon: 'add_reaction',
            tooltip: t('block-editor-emoji:openPicker', { shortcut: shortcutLabel() }),
            isDisabled: (editor: Editor) => !canInsertHere(editor),
            onSelect: (editor: Editor) => {
              editor.commands.openEmojiPicker();
            },
          },
        ],
      };
    },

    addCommands() {
      return {
        insertEmoji:
          (emoji: string) =>
          ({ chain }) =>
            canInsertHere(this.editor) && chain().focus().insertContent(emoji).run(),
        openEmojiPicker:
          () =>
          ({ editor }) => {
            if (!canInsertHere(editor)) return false;
            openPicker(tiptap, editor, deps);
            return true;
          },
      };
    },

    addKeyboardShortcuts() {
      return { 'Mod-Alt-e': () => this.editor.commands.openEmojiPicker() };
    },

    onDestroy() {
      closeActivePopup(this.editor);
    },

    addProseMirrorPlugins() {
      return TRIGGERS.map((char, i) =>
        Suggestion<EmojiEntry, { emoji: string }>({
          editor: this.editor,
          pluginKey: new PluginKey(`emojiSuggestion${i}`),
          char,
          // 直前の文字の判定は allow（isAllowedPosition）で行う。日本語の直後でも出したいので null
          allowedPrefixes: null,
          allowSpaces: false,
          allow: ({ state, range }: { state: Editor['state']; range: Range }) => isAllowedPosition(state, range),
          items: async ({ query }: { query: string }) => {
            if (query.length < 1) return [];
            try {
              return searchEmoji(await loadEmojiData(deps.emojibaseUrl), query, MAX_ITEMS);
            } catch {
              // 辞書が取れなくても、エディターの入力は邪魔しない
              return [];
            }
          },
          command: ({ editor, range, props }: { editor: Editor; range: Range; props: { emoji: string } }) => {
            editor.chain().focus().insertContentAt(range, props.emoji).run();
            pushRecent(props.emoji);
          },
          render: () => createSuggestionRender(tiptap),
        }),
      );
    },
  });
}
