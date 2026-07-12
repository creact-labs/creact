import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";
import PrevNext from "@/pages/docs/layout/components/prev-next";
import { renderWithProviders } from "@/testing/testing";
import { docPages } from "../doc-meta";

const middleIndex = faker.number.int({ min: 1, max: docPages.length - 2 });

describe("PrevNext", () => {
  it.each([
    {
      label: "first page only offers the next page",
      index: 0,
      expectPrev: undefined,
      expectNext: docPages[1],
    },
    {
      label: "middle page offers both neighbours",
      index: middleIndex,
      expectPrev: docPages[middleIndex - 1],
      expectNext: docPages[middleIndex + 1],
    },
    {
      label: "last page only offers the previous page",
      index: docPages.length - 1,
      expectPrev: docPages[docPages.length - 2],
      expectNext: undefined,
    },
  ])("$label", ({ index, expectPrev, expectNext }) => {
    const { container } = renderWithProviders(() => <PrevNext />, {
      location: docPages[index]!.href,
    });

    const prevLink = container.querySelector(".prev-next-link:not(.next)");
    const nextLink = container.querySelector(".prev-next-link.next");

    if (expectPrev) {
      expect(prevLink?.textContent).toContain(expectPrev.title);
      expect(prevLink?.textContent).toContain("docs.prev");
      expect(prevLink?.getAttribute("href")).toBe(`#${expectPrev.href}`);
    } else {
      expect(prevLink).toBeNull();
    }

    if (expectNext) {
      expect(nextLink?.textContent).toContain(expectNext.title);
      expect(nextLink?.textContent).toContain("docs.next");
      expect(nextLink?.getAttribute("href")).toBe(`#${expectNext.href}`);
    } else {
      expect(nextLink).toBeNull();
    }
  });

  it("docs root behaves like the first page", () => {
    const { container } = renderWithProviders(() => <PrevNext />, {
      location: "/docs",
    });

    expect(container.querySelector(".prev-next-link:not(.next)")).toBeNull();
    expect(
      container.querySelector(".prev-next-link.next")?.textContent,
    ).toContain(docPages[1]!.title);
  });
});
