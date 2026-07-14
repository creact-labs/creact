import { EditorView, lineNumbers, Decoration, type DecorationSet } from "@codemirror/view";
import { EditorState, StateField, StateEffect } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";

// A CodeMirror view that stays editable but can spotlight a range of lines —
// the scroll stage moves the spotlight as the reader advances through steps.
const setActive = StateEffect.define<{ from: number; to: number }>();
const activeLine = Decoration.line({ class: "cx-cm-active" });

const activeField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    let next = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setActive)) {
        next = lineDecorations(tr.state, effect.value.from, effect.value.to);
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

function lineDecorations(state: EditorState, from: number, to: number): DecorationSet {
  const lo = Math.max(1, from);
  const hi = Math.min(state.doc.lines, to);
  const ranges = [];
  for (let line = lo; line <= hi; line++) {
    ranges.push(activeLine.range(state.doc.line(line).from));
  }
  return Decoration.set(ranges);
}

export interface CodeView {
  view: EditorView;
  /** 1-based line number where a substring first appears (1 if absent). */
  lineOf(substring: string): number;
  /** Spotlight lines [from, to] and scroll them into view. */
  spotlight(from: number, to: number): void;
  /** Current editor contents. */
  doc(): string;
}

export function createCodeView(parent: HTMLElement, source: string): CodeView {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: source,
      extensions: [
        lineNumbers(),
        javascript({ jsx: true, typescript: true }),
        oneDark,
        activeField,
        EditorView.lineWrapping,
        EditorView.theme({
          "&": { height: "100%", fontSize: "13px" },
          ".cm-scroller": { overflow: "auto" },
        }),
      ],
    }),
  });

  return {
    view,
    lineOf(substring) {
      const index = source.indexOf(substring);
      if (index < 0) return 1;
      return source.slice(0, index).split("\n").length;
    },
    spotlight(from, to) {
      view.dispatch({
        effects: [
          setActive.of({ from, to }),
          EditorView.scrollIntoView(view.state.doc.line(Math.min(from, view.state.doc.lines)).from, {
            y: "center",
          }),
        ],
      });
    },
    doc() {
      return view.state.doc.toString();
    },
  };
}
