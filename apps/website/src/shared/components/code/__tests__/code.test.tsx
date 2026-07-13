import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { faker } from "@faker-js/faker";
import Code from "@/shared/components/code";

describe("Code", () => {
  it("renders its children inside a code element", () => {
    const snippet = faker.lorem.word();
    const { container } = render(() => <Code>{snippet}</Code>);
    expect(container.querySelector("code")?.textContent).toBe(snippet);
  });
});
