import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import Timeline from "../timeline";
import type { TimelineEvent } from "../../stream";

describe("Timeline", () => {
  it("shows a fallback when there are no events", () => {
    const { container } = render(() => <Timeline events={[]} />);
    expect(container.querySelector(".cx-empty")).toBeTruthy();
  });

  it("renders newest events first with their kind label", () => {
    const events: TimelineEvent[] = [
      { kind: "mount", label: "counter", ts: 1 },
      { kind: "output", label: "counter.count", ts: 2 },
      { kind: "surprise", label: "custom", ts: 3 },
    ];
    const { container } = render(() => <Timeline events={events} />);
    const rows = container.querySelectorAll(".cx-event");
    expect(rows).toHaveLength(3);
    // reversed: newest (ts 3) first
    expect(rows[0]!.textContent).toContain("custom");
  });
});
