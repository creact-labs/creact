import { afterEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@solidjs/testing-library";
import { MemoryRouter, Route, createMemoryHistory } from "@solidjs/router";

const runApp = vi.fn<(app: string, files: Record<string, string>, write: (c: string) => void) => Promise<void>>();
const createEditor = vi.fn<(el: HTMLElement, doc: string, path: string) => unknown>(() => ({
  getValue: () => "EDITED",
  dispose: vi.fn(),
}));

vi.mock("@/shared/playground/runner", () => ({
  runApp: (app: string, files: Record<string, string>, write: (c: string) => void) => runApp(app, files, write),
}));
vi.mock("@/shared/playground/editor", () => ({
  createEditor: (el: HTMLElement, doc: string, path: string) => createEditor(el, doc, path),
}));
vi.mock("@/shared/playground/sources", () => ({
  appSources: () => ({
    files: { "index.tsx": "ENTRY", "src/app.tsx": "APP", "site/index.html": "<h1>hi</h1>" },
  }),
}));
vi.mock("@xterm/xterm/css/xterm.css", () => ({}));
vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    loadAddon() {}
    open() {}
    clear() {}
    writeln() {}
    write() {}
  },
}));
vi.mock("@xterm/addon-fit", () => ({ FitAddon: class { fit() {} } }));

import Playground from "..";

function renderAt(path: string) {
  const history = createMemoryHistory();
  history.set({ value: path, scroll: false, replace: true });
  return render(() => (
    <MemoryRouter history={history}>
      <Route path="/playground/:app" component={Playground} />
    </MemoryRouter>
  ));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Playground", () => {
  it("shows the real file tree and boots the app on mount", async () => {
    const { container } = renderAt("/playground/durable-counter");
    const files = [...container.querySelectorAll(".pg-file")].map((f) => f.textContent);
    expect(files).toContain("index.tsx");
    expect(files).toContain("src/app.tsx");
    await waitFor(() =>
      expect(runApp).toHaveBeenCalledWith("durable-counter", expect.any(Object), expect.any(Function)),
    );
  });

  it("opens a source file in the editor and a data file read-only", async () => {
    const { container, getByText } = renderAt("/playground/durable-counter");
    await waitFor(() => expect(runApp).toHaveBeenCalled());

    fireEvent.click(getByText("src/app.tsx"));
    expect(createEditor).toHaveBeenCalledTimes(2); // entry on mount + this file

    fireEvent.click(getByText("site/index.html"));
    expect(container.querySelector(".pg-readonly")?.textContent).toContain("<h1>hi</h1>");
  });

  it("re-runs on the Run button", async () => {
    const { getByText } = renderAt("/playground/durable-counter");
    await waitFor(() => expect(runApp).toHaveBeenCalledTimes(1));
    fireEvent.click(getByText("▶ Run"));
    await waitFor(() => expect(runApp).toHaveBeenCalledTimes(2));
  });

  it("falls back for an unknown example", () => {
    const { container } = renderAt("/playground/nope");
    expect(container.querySelector(".pg-unknown")).toBeTruthy();
  });
});
