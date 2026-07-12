import { describe, expect, it } from "vitest";
import TableOfContents from "@/pages/docs/layout/components/table-of-contents";
import DocHeading from "@/shared/components/doc-heading";
import { flushAsyncEffects, renderWithProviders } from "@/testing/testing";
import { generateDocHeadingProps } from "../__mocks__/generate-doc-heading-props";

describe("DocHeading", () => {
  it.each([{ level: 2 as const }, { level: 3 as const }])(
    "level $level heading renders the right tag with a self anchor",
    ({ level }) => {
      const props = generateDocHeadingProps({ level });
      const { container } = renderWithProviders(() => (
        <DocHeading level={props.level} id={props.id}>
          {props.text}
        </DocHeading>
      ));

      const heading = container.querySelector(`h${level}`);
      expect(heading?.id).toBe(props.id);
      expect(heading?.textContent).toContain(props.text);
      expect(
        heading?.querySelector(".doc-heading-anchor")?.getAttribute("href"),
      ).toBe(`#${props.id}`);
    },
  );

  it("mounted headings appear as links in the table of contents", async () => {
    const first = generateDocHeadingProps({ level: 2 });
    const second = generateDocHeadingProps({ level: 3 });
    const { container } = renderWithProviders(() => (
      <>
        <DocHeading level={first.level} id={first.id}>
          {first.text}
        </DocHeading>
        <DocHeading level={second.level} id={second.id}>
          {second.text}
        </DocHeading>
        <TableOfContents />
      </>
    ));
    await flushAsyncEffects();

    const links = [...container.querySelectorAll(".docs-toc-link")];
    expect(links.map((link) => link.textContent)).toEqual([
      first.text,
      second.text,
    ]);
    expect(container.querySelector(".docs-toc-title")?.textContent).toBe(
      "docs.toc_title",
    );
  });
});
