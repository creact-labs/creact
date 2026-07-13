import { afterEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@solidjs/testing-library";

type Write = (chunk: string) => void;
const runSource = vi.fn<(id: string, source: string, write: Write) => Promise<void>>();
const prefetchRuntime = vi.fn<() => void>();
const createEditor = vi.fn<(el: HTMLElement, doc: string) => unknown>(() => ({
  state: { doc: { toString: () => "EDITED" } },
}));

vi.mock("../runner", () => ({
  runSource: (id: string, source: string, write: Write) => runSource(id, source, write),
  prefetchRuntime: () => prefetchRuntime(),
}));
vi.mock("../editor", () => ({
  createEditor: (el: HTMLElement, doc: string) => createEditor(el, doc),
}));

// An IntersectionObserver that reports the target as visible immediately, so
// the background-prefetch path runs.
class ImmediateIO {
  constructor(private cb: IntersectionObserverCallback) {}
  observe() {
    this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

import LiveExample from "../live-example";
import { DEMOS } from "../demos";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LiveExample", () => {
  it("prefetches the runtime when it nears the viewport", () => {
    vi.stubGlobal("IntersectionObserver", ImmediateIO);
    render(() => <LiveExample app="durable-counter" />);
    expect(prefetchRuntime).toHaveBeenCalled();
  });

  it("stays a poster until activated, then runs the demo", async () => {
    vi.stubGlobal("IntersectionObserver", ImmediateIO);
    const { container } = render(() => <LiveExample app="durable-counter" />);
    expect(container.querySelector(".cx-poster")).toBeTruthy();
    expect(container.querySelector(".cx-live-bar")).toBeNull();

    fireEvent.click(container.querySelector(".cx-poster")!);

    await waitFor(() => expect(container.querySelector(".cx-live-bar")).toBeTruthy());
    expect(runSource).toHaveBeenCalledWith(
      "durable-counter",
      DEMOS["durable-counter"]!.source,
      expect.any(Function),
    );
  });

  it("reveals the editor and re-runs with edited source", async () => {
    vi.stubGlobal("IntersectionObserver", ImmediateIO);
    const { container, getByText } = render(() => <LiveExample app="uptime-monitor" />);
    fireEvent.click(container.querySelector(".cx-poster")!);
    await waitFor(() => expect(container.querySelector(".cx-live-bar")).toBeTruthy());

    fireEvent.click(getByText("Edit code"));
    expect(createEditor).toHaveBeenCalled();

    fireEvent.click(getByText("▶ Run"));
    await waitFor(() =>
      expect(runSource).toHaveBeenLastCalledWith("uptime-monitor", "EDITED", expect.any(Function)),
    );
  });

  it("surfaces a run failure to the console", async () => {
    vi.stubGlobal("IntersectionObserver", ImmediateIO);
    runSource.mockRejectedValueOnce(new Error("boom"));
    const { container } = render(() => <LiveExample app="page-writer" />);
    fireEvent.click(container.querySelector(".cx-poster")!);
    await waitFor(() => expect(container.querySelector(".cx-console")?.textContent).toContain("boom"));
  });
});
