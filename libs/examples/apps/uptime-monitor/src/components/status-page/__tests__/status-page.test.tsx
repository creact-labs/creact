import { afterEach, describe, expect, it, vi } from "vitest";
import { resetRuntime } from "@creact-labs/creact";
import { renderTest, waitFor } from "@creact-labs/testing";
import { StatusPage } from "../index";
import type { CheckTally, ProbeSample, Target } from "../../../shared/rollup";

const writes: Record<string, string> = {};
vi.mock("fs/promises", () => ({
  mkdir: vi.fn(async () => undefined),
  writeFile: vi.fn(async (path: string, data: string) => {
    writes[path] = data;
  }),
}));

const targets: Target[] = [
  { name: "Home", url: "https://home.example.com" },
  { name: "Docs", url: "https://docs.example.com" },
];

function render(
  samples: Record<string, ProbeSample[]>,
  tallies: Record<string, CheckTally>,
) {
  return renderTest(() => (
    <StatusPage
      key="status"
      targets={targets}
      samples={() => samples}
      tallies={() => tallies}
      overall={() => "degraded"}
    />
  ));
}

describe("StatusPage", () => {
  afterEach(() => {
    resetRuntime();
    for (const key of Object.keys(writes)) delete writes[key];
  });

  it("writes a status page with a row per target", async () => {
    const result = render(
      {
        "https://home.example.com": [
          {
            url: "https://home.example.com",
            status: "up",
            latencyMs: 42,
            checkedAt: 0,
          },
        ],
      },
      {
        "https://home.example.com": { url: "https://home.example.com", checksRun: 10, checksFailed: 1 },
      },
    );
    await result.ready;
    const html = await waitFor(() => writes["./out/status.html"]);

    expect(html).toContain("Overall: degraded");
    expect(html).toContain("<strong>Home</strong> up");
    expect(html).toContain("90% uptime, last probe 42ms");
    result.dispose();
  });

  it("falls back to pending and zeroes when a target has no samples or tally", async () => {
    const result = render({}, {});
    await result.ready;
    const html = await waitFor(() => writes["./out/status.html"]);

    expect(html).toContain("<strong>Docs</strong> pending");
    expect(html).toContain("100% uptime, last probe 0ms");
    result.dispose();
  });
});
