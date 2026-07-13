import { describe, expect, it } from "vitest";
import { latestReadySlug, listPages, reportSettled } from "../app";
import type { PageOutputs } from "../components/page";

const ready: PageOutputs = { state: "ready", file: "out/a.html", error: undefined };
const writing: PageOutputs = { state: "writing", file: undefined, error: undefined };

describe("latestReadySlug", () => {
  it("returns the last ready slug scanning newest first", () => {
    const requests = [
      { slug: "a", prompt: "a", requestedAt: "1" },
      { slug: "b", prompt: "b", requestedAt: "2" },
    ];
    expect(latestReadySlug(requests, { a: ready, b: ready })).toBe("b");
  });

  it("returns undefined when nothing is ready", () => {
    const requests = [{ slug: "a", prompt: "a", requestedAt: "1" }];
    expect(latestReadySlug(requests, { a: writing })).toBeUndefined();
  });
});

describe("listPages", () => {
  it("merges request, state, and latest flag", () => {
    const requests = [{ slug: "a", prompt: "a", requestedAt: "1" }];
    const rows = listPages(requests, { a: ready }, (slug) => slug === "a");
    expect(rows).toEqual([
      { slug: "a", prompt: "a", requestedAt: "1", state: "ready", file: "out/a.html", error: undefined, latest: true },
    ]);
  });

  it("falls back to writing when a request has no state", () => {
    const requests = [{ slug: "a", prompt: "a", requestedAt: "1" }];
    const rows = listPages(requests, {}, () => false);
    expect(rows[0].state).toBe("writing");
    expect(rows[0].latest).toBe(false);
  });
});

describe("reportSettled", () => {
  it("short-circuits when already settled", () => {
    let disposed = false;
    expect(reportSettled("a", {}, true, () => { disposed = true; })).toBe(true);
    expect(disposed).toBe(false);
  });

  it("stays unsettled while the page is still writing", () => {
    let disposed = false;
    expect(reportSettled("a", { a: writing }, false, () => { disposed = true; })).toBe(false);
    expect(disposed).toBe(false);
  });

  it("disposes once the page reaches a terminal state", () => {
    let disposed = false;
    expect(reportSettled("a", { a: ready }, false, () => { disposed = true; })).toBe(true);
    expect(disposed).toBe(true);
  });
});
