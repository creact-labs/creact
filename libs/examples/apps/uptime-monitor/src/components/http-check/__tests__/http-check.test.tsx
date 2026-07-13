import { render, resetRuntime } from "@creact-labs/creact";
import { createMemory } from "@creact-labs/example-memory";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CheckTally, ProbeSample } from "../../../shared/rollup";
import { createScriptedFetch } from "../__mocks__/mock-fetch";
import { accumulateTally, HttpCheck } from "../index";

const target = { name: "Example", url: "https://example.com" };

const upSample: ProbeSample = {
  url: target.url,
  status: "up",
  latencyMs: 12,
  checkedAt: 0,
};

const downSample: ProbeSample = {
  url: target.url,
  status: "down",
  latencyMs: 12,
  checkedAt: 0,
};

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("condition never became true");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

afterEach(() => {
  resetRuntime();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("accumulateTally", () => {
  it("starts from zero on the first run with no sample", () => {
    expect(accumulateTally(undefined, target.url, undefined)).toEqual({
      url: target.url,
      checksRun: 0,
      checksFailed: 0,
    });
  });

  it("counts an up sample as a run without a failure", () => {
    expect(accumulateTally(undefined, target.url, upSample)).toEqual({
      url: target.url,
      checksRun: 1,
      checksFailed: 0,
    });
  });

  it("counts a down sample as a run and a failure", () => {
    expect(accumulateTally(undefined, target.url, downSample)).toEqual({
      url: target.url,
      checksRun: 1,
      checksFailed: 1,
    });
  });

  it("accumulates onto a prior tally", () => {
    const prev: CheckTally = { url: target.url, checksRun: 4, checksFailed: 1 };
    expect(accumulateTally(prev, target.url, downSample)).toEqual({
      url: target.url,
      checksRun: 5,
      checksFailed: 2,
    });
  });

  it("leaves counts unchanged when the sample is absent", () => {
    const prev: CheckTally = { url: target.url, checksRun: 4, checksFailed: 1 };
    expect(accumulateTally(prev, target.url, undefined)).toEqual({
      url: target.url,
      checksRun: 4,
      checksFailed: 1,
    });
  });
});

describe("HttpCheck", () => {
  // #region mock-fetch-test
  it("reports up then down as the target starts failing", async () => {
    vi.stubGlobal("fetch", createScriptedFetch([200, 0]));
    const sweep: ProbeSample[] = [];

    const result = await render(
      () => (
        <HttpCheck
          key="check"
          target={target}
          intervalMs={25}
          timeoutMs={50}
          onSample={(sample) => sweep.push(sample)}
          onTally={() => {}}
        />
      ),
      createMemory(),
      "http-check-transitions",
    );

    await waitFor(() => sweep.length >= 2);
    result.dispose();

    expect(sweep[0].status).toBe("up");
    expect(sweep[1].status).toBe("down");
  });
  // #endregion mock-fetch-test

  it("logs the up to down transition once", async () => {
    vi.stubGlobal("fetch", createScriptedFetch([200, 0]));
    const logSpy = vi.spyOn(console, "log");

    const result = await render(
      () => (
        <HttpCheck
          key="check"
          target={target}
          intervalMs={25}
          timeoutMs={50}
          onSample={() => {}}
          onTally={() => {}}
        />
      ),
      createMemory(),
      "http-check-logs",
    );

    await waitFor(() =>
      logSpy.mock.calls.some((call) => String(call[0]).includes("up -> down")),
    );
    result.dispose();

    const transitions = logSpy.mock.calls.filter((call) =>
      String(call[0]).startsWith("[transition]"),
    );
    expect(transitions).toHaveLength(1);
  });

  it("treats non-2xx responses as down", async () => {
    vi.stubGlobal("fetch", createScriptedFetch([503]));
    const sweep: ProbeSample[] = [];

    const result = await render(
      () => (
        <HttpCheck
          key="check"
          target={target}
          intervalMs={25}
          timeoutMs={50}
          onSample={(sample) => sweep.push(sample)}
          onTally={() => {}}
        />
      ),
      createMemory(),
      "http-check-http-error",
    );

    await waitFor(() => sweep.length >= 1);
    result.dispose();

    expect(sweep[0].status).toBe("down");
  });

  it("restores cumulative tallies across restarts", async () => {
    vi.stubGlobal("fetch", createScriptedFetch([200]));
    const memory = createMemory();

    const firstTallies: CheckTally[] = [];
    const first = await render(
      () => (
        <HttpCheck
          key="check"
          target={target}
          intervalMs={25}
          timeoutMs={50}
          onSample={() => {}}
          onTally={(tally) => firstTallies.push(tally)}
        />
      ),
      memory,
      "http-check-durable",
    );
    await waitFor(() => firstTallies.some((tally) => tally.checksRun >= 2));
    await first.settled();
    first.dispose();

    const carriedOver = firstTallies.at(-1)!.checksRun;
    const secondTallies: CheckTally[] = [];
    const second = await render(
      () => (
        <HttpCheck
          key="check"
          target={target}
          intervalMs={25}
          timeoutMs={50}
          onSample={() => {}}
          onTally={(tally) => secondTallies.push(tally)}
        />
      ),
      memory,
      "http-check-durable",
    );
    await waitFor(() => secondTallies.some((tally) => tally.checksRun > carriedOver));
    second.dispose();

    expect(secondTallies.at(-1)!.checksRun).toBeGreaterThan(carriedOver);
  });
});
