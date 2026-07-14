import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";

// A minimal TSX/JSX editor for the playground entry file.
export function createEditor(parent: HTMLElement, doc: string): EditorView {
  return new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        basicSetup,
        javascript({ jsx: true, typescript: true }),
        oneDark,
        EditorView.lineWrapping,
        EditorView.theme({ "&": { height: "100%" }, ".cm-scroller": { overflow: "auto" } }),
      ],
    }),
  });
}
