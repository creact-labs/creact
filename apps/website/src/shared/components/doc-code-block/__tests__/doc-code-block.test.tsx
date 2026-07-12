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
    await waitFor(() => {
      expect(
        container.querySelector("[data-testid=highlighted]")?.textContent,
      ).toBe(code);
    });
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
