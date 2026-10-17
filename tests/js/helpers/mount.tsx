import { Editor, type AnyExtension } from '@tiptap/core';
import { EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { render } from '@testing-library/react';

/** EditorContent まで描画した本物のエディター（ReactRenderer のポータルが動く） */
export function mountEditor(extensions: AnyExtension[], content = '<p></p>') {
  const editor = new Editor({ extensions: [StarterKit, ...extensions], content });
  const view = render(<EditorContent editor={editor} />);
  return {
    editor,
    unmount() {
      view.unmount();
      editor.destroy();
    },
  };
}
