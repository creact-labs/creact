import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { faker } from "@faker-js/faker";
import TextLink from "@/shared/components/text-link";

describe("TextLink", () => {
  it("renders an anchor with its href and children", () => {
    const href = `#/${faker.lorem.slug()}`;
    const label = faker.lorem.words(2);
    const { container } = render(() => (
      <TextLink href={href}>{label}</TextLink>
    ));
    const anchor = container.querySelector("a");
    expect(anchor?.getAttribute("href")).toBe(href);
    expect(anchor?.textContent).toBe(label);
  });
});
