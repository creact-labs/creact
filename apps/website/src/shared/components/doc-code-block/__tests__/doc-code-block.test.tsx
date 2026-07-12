import { describe, expect, it } from "vitest";
import { fireEvent, render, waitFor } from "@solidjs/testing-library";
import { faker } from "@faker-js/faker";
import DocCodeBlock from "@/shared/components/doc-code-block";
import { installMockClipboard } from "../__mocks__/mock-clipboard";

describe("DocCodeBlock", () => {
  it("reader sees the highlighted code and the filename badge", async () => {
    const code = `let ${faker.lorem.word()} = "${faker.lorem.word()}";`;
    const filename = faker.system.commonFileName("ts");
    const { container } = render(() => (
      <DocCodeBlock code={code} filename={filename} />
    ));

    expect(container.querySelector(".doc-code-filename")?.textContent).toBe(
      filename,
    );
    // Once highlighting resolves, the plain <code> fallback is replaced by
    // the highlighter's HTML — asserted through the component's own
    // structure, not markup invented by the mock
    await waitFor(() => {
      expect(container.querySelector("code")).toBeNull();
    });
    expect(container.querySelector(".doc-code-block")?.textContent).toContain(
      code,
    );
  });

  it("copy button copies the source and flips to the copied label", async () => {
    const { writeText } = installMockClipboard();
    const code = faker.lorem.sentence();
    const { container } = render(() => <DocCodeBlock code={code} />);

    const button = container.querySelector(".doc-code-copy")!;
    expect(button.textContent).toContain("docs.copy");
    fireEvent.click(button);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(code);
    });
    await waitFor(() => {
      expect(button.textContent).toContain("docs.copied");
    });
  });
});
