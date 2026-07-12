import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import DocSteps from "@/shared/components/doc-steps";
import { generateDocSteps } from "../__mocks__/generate-doc-steps";

describe("DocSteps", () => {
  it("reader sees each step with its bold lead-in and body", () => {
    const steps = generateDocSteps();
    const { container } = render(() => <DocSteps steps={steps} />);

    const items = [...container.querySelectorAll("ol > li")];
    expect(items).toHaveLength(steps.length);
    for (const [index, step] of steps.entries()) {
      const item = items[index]!;
      expect(item.querySelector("strong")?.textContent).toBe(`${step.label}:`);
      expect(item.textContent).toContain(step.body);
    }
  });
});
