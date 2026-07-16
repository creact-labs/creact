import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";

// Monaco is the editor VS Code is built on — same view, same feel. Its language
// services run in web workers; Vite bundles each with ?worker so they are
// same-origin and load under the playground's cross-origin isolation.
self.MonacoEnvironment = {
  getWorker(_id, label) {
    if (label === "json") return new jsonWorker();
    if (label === "typescript" || label === "javascript") return new tsWorker();
    return new editorWorker();
  },
};

// This is a code editor, not a type checker: the example's imports
// (@creact-labs/creact, ./src/app) don't resolve here, so silence semantic
// errors. JSX stays on so .tsx highlights like real VS Code.
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
  target: monaco.languages.typescript.ScriptTarget.Latest,
  allowNonTsExtensions: true,
});
monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false,
});

export interface Editor {
  getValue(): string;
  dispose(): void;
}

function languageFor(path: string): string {
  return path.endsWith(".json") ? "json" : "typescript";
}

/** A Monaco editor bound to `parent`, seeded with `doc`, highlighted for `path`. */
export function createEditor(parent: HTMLElement, doc: string, path: string): Editor {
  const model = monaco.editor.createModel(doc, languageFor(path));
  const editor = monaco.editor.create(parent, {
    model,
    theme: "vs-dark",
    fontSize: 13,
    fontFamily: "JetBrains Mono, ui-monospace, monospace",
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    tabSize: 2,
    padding: { top: 10 },
  });
  return {
    getValue: () => editor.getValue(),
    dispose: () => {
      editor.dispose();
      model.dispose();
    },
  };
}
