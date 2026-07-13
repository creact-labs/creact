import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { faker } from "@faker-js/faker";
import Callout from "@/shared/components/callout";

describe("Callout", () => {
  it.each([
    { type: "info", titleKey: "docs.ui.callout.info" },
    { type: "warning", titleKey: "docs.ui.callout.warning" },
    { type: "tip", titleKey: "docs.ui.callout.tip" },
  ] as const)(
    "$type callout shows its $titleKey title and the message",
    ({ type, titleKey }) => {
      const message = faker.lorem.sentence();
      const { container } = render(() => (
        <Callout type={type}>{message}</Callout>
      ));

      const callout = container.querySelector(".callout");
      expect(callout?.classList.contains(type)).toBe(true);
      expect(container.querySelector(".callout-title")?.textContent).toBe(
        titleKey,
      );
      expect(callout?.textContent).toContain(message);
    },
  );
});
