import { afterEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@solidjs/testing-library";

type Write = (chunk: string) => void;
const runSource = vi.fn<(id: string, source: string, write: Write) => Promise<void>>();
const spotlight = vi.fn<(from: number, to: number) => void>();
const createCodeView = vi.fn<(el: HTMLElement, source: string) => unknown>(() => ({
  view: {},
  lineOf: () => 1,
  spotlight,
  doc: () => "EDITED SOURCE",
}));

vi.mock("../runner", () => ({
  runSource: (id: string, source: string, write: Write) => runSource(id, source, write),
}));
vi.mock("../code-view", () => ({
  createCodeView: (el: HTMLElement, source: string) => createCodeView(el, source),
}));

// Report the target as visible immediately so the boot-and-run path fires.
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

describe("LiveExample stage", () => {
  it("renders the code and the inspector together, with step dots", () => {
    vi.stubGlobal("IntersectionObserver", ImmediateIO);
    const { container } = render(() => <LiveExample app="durable-counter" />);
    expect(container.querySelector(".cx-stage")).toBeTruthy();
    expect(createCodeView).toHaveBeenCalled();
    expect(container.querySelector(".cx-inspector")).toBeTruthy();
    expect(container.querySelectorAll(".cx-step-dots span")).toHaveLength(
      DEMOS["durable-counter"]!.steps.length,
    );
    expect(container.querySelector(".cx-step-text")?.textContent).toBe(
      DEMOS["durable-counter"]!.steps[0]!.caption,
    );
  });

  it("boots and runs when scrolled into view", async () => {
    vi.stubGlobal("IntersectionObserver", ImmediateIO);
    render(() => <LiveExample app="uptime-monitor" />);
    await waitFor(() =>
      expect(runSource).toHaveBeenCalledWith("uptime-monitor", "EDITED SOURCE", expect.any(Function)),
    );
  });

  it("re-runs from the edited source on Run", async () => {
    vi.stubGlobal("IntersectionObserver", ImmediateIO);
    const { getByText } = render(() => <LiveExample app="site-publisher" />);
    await waitFor(() => expect(runSource).toHaveBeenCalled());
    fireEvent.click(getByText("▶ Run"));
    await waitFor(() => expect(runSource).toHaveBeenCalledTimes(2));
  });

  it("surfaces a run failure as an error banner", async () => {
    vi.stubGlobal("IntersectionObserver", ImmediateIO);
    runSource.mockRejectedValueOnce(new Error("boom"));
    const { container } = render(() => <LiveExample app="page-writer" />);
    await waitFor(() => expect(container.querySelector(".cx-error")?.textContent).toContain("boom"));
  });
});
