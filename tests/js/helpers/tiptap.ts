import * as core from '@tiptap/core';
import * as react from '@tiptap/react';
import * as suggestion from '@tiptap/suggestion';
import * as pmState from '@tiptap/pm/state';
import type { Tiptap } from '@ablogcms/block-editor/tiptap';

/** ホストが渡すランタイムの代わり（テストでは npm のパッケージをそのまま使う） */
export const tiptap = {
  core,
  react,
  suggestion,
  pm: { state: pmState },
} as unknown as Tiptap;
