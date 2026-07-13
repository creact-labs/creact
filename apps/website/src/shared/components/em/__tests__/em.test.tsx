import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { faker } from "@faker-js/faker";
import Em from "@/shared/components/em";

describe("Em", () => {
  it("renders its children inside an em element", () => {
    const phrase = faker.lorem.words(2);
    const { container } = render(() => <Em>{phrase}</Em>);
    expect(container.querySelector("em")?.textContent).toBe(phrase);
  });
});
