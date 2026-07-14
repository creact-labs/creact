import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { faker } from "@faker-js/faker";
import Strong from "@/shared/components/strong";

describe("Strong", () => {
  it("renders its children inside a strong element", () => {
    const phrase = faker.lorem.words(2);
    const { container } = render(() => <Strong>{phrase}</Strong>);
    expect(container.querySelector("strong")?.textContent).toBe(phrase);
  });
});
