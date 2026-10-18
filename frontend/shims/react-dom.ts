/**
 * `react-dom` の代わり（vite.config.ts の alias）。
 *
 * ホストは `react-dom` を公開していない（`ACMS.Library` は React と JSX ランタイムのみ）。
 * `@ablogcms/components` の Popover が使う `@floating-ui/react` が必要とするのは `createPortal` と
 * `flushSync` だけなので、`react-dom` 本体（約 130KB）を同梱して React DOM を二重にする代わりに、
 * この 2 つだけを置く。
 *
 * - `createPortal` は React のポータル要素（`$$typeof: Symbol.for('react.portal')`）を作るだけで、
 *   描画はホストの React DOM が行う（Tiptap の `ReactRenderer` もホストの React ツリーに描画される）。
 * - `flushSync` は即時実行する。位置の更新が 1 フレーム遅れ得るだけで、結果は変わらない。
 */
import type { ReactNode } from 'react';

const REACT_PORTAL_TYPE = Symbol.for('react.portal');

export function createPortal(children: ReactNode, containerInfo: Element | DocumentFragment, key?: string | null) {
  return {
    $$typeof: REACT_PORTAL_TYPE,
    key: key == null ? null : String(key),
    children,
    containerInfo,
    implementation: null,
  } as unknown as ReactNode;
}

export function flushSync<R>(fn: () => R): R {
  return fn();
}

/**
 * `@ablogcms/react-utils` は `react-dom/client` を import している（`handleRef` だけ使う
 * `useMergeRefs` 経由で巻き込まれる）。使わないので、呼ばれたら分かるように例外を投げる。
 */
const unavailable = (name: string) => () => {
  throw new Error(`[block-editor-emoji] react-dom の ${name} は使えません（ホストの React DOM を使ってください）`);
};
export const createRoot = unavailable('createRoot');
export const hydrateRoot = unavailable('hydrateRoot');
