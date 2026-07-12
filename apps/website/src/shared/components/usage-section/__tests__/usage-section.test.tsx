import { describe, expect, it } from "vitest";
import { waitFor } from "@solidjs/testing-library";
import { faker } from "@faker-js/faker";
import UsageSection from "@/shared/components/usage-section";
import { renderWithProviders } from "@/testing/testing";
import { generateUsageSectionProps } from "../__mocks__/generate-usage-section-props";

describe("UsageSection", () => {
  it("reader sees the usage heading, highlighted example, and extra prose", async () => {
    const props = generateUsageSectionProps();
    const prose = faker.lorem.sentence();
    const { container } = renderWithProviders(() => (
      <UsageSection code={props.code} filename={props.filename}>
        {prose}
      </UsageSection>
    ));

    expect(container.querySelector("#usage")?.textContent).toContain(
      "docs.usage",
    );
    expect(
      container.querySelector(".doc-code-filename")?.textContent,
    ).toBe(props.filename);
    await waitFor(() => {
      expect(
        container.querySelector("[data-testid=highlighted]")?.textContent,
      ).toBe(props.code);
    });
    expect(container.textContent).toContain(prose);
  });
});
