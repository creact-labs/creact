import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, waitFor } from "@solidjs/testing-library";
import { MemoryRouter, Route, createMemoryHistory } from "@solidjs/router";

// The StackBlitz embed mounts a real cross-origin iframe; here we only assert
// the page asks it to embed the right app.
const embed = vi.fn<(el: HTMLElement, app: string, title: string) => Promise<unknown>>(
  () => Promise.resolve({}),
);
vi.mock("@/shared/playground/stackblitz", () => ({
  embed: (el: HTMLElement, app: string, title: string) => embed(el, app, title),
}));

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
  it("embeds the StackBlitz IDE for the requested app on mount", async () => {
    const { getByText } = renderAt("/playground/durable-counter");
    expect(getByText("Durable Counter")).toBeTruthy();
    await waitFor(() =>
      expect(embed).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        "durable-counter",
        "Durable Counter",
      ),
    );
  });

  it("links back to the example's docs page", () => {
    const { getByText } = renderAt("/playground/site-publisher");
    expect(getByText("← Docs").getAttribute("href")).toBe("#/docs/examples/site-publisher");
  });

  it("falls back for an unknown example without embedding", () => {
    const { container } = renderAt("/playground/nope");
    expect(container.querySelector(".pg-unknown")).toBeTruthy();
    expect(embed).not.toHaveBeenCalled();
  });
});
