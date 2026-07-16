import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";
import SidebarLink from "@/pages/docs/layout/components/sidebar/sidebar-link";
import { docPages } from "@/pages/docs/layout/components/prev-next/doc-meta";
import { renderWithProviders } from "@/testing/testing";

const page = faker.helpers.arrayElement(docPages.slice(1));

describe("SidebarLink", () => {
  it.each([
    {
      label: "link to the current page is highlighted",
      href: page.href,
      location: page.href,
      active: true,
    },
    {
      label: "link to another page is not highlighted",
      href: page.href,
      location: docPages[0]!.href,
      active: false,
    },
    {
      label: "installation link is highlighted on the docs root",
      href: "/docs/getting-started/installation",
      location: "/docs",
      active: true,
    },
  ])("$label", ({ href, location, active }) => {
    const { container } = renderWithProviders(
      () => <SidebarLink href={href} title={page.title} />,
      { location },
    );

    const link = container.querySelector(".sidebar-link")!;
    expect(link.textContent).toBe(page.title);
    expect(link.getAttribute("href")).toBe(`#${href}`);
    expect(link.classList.contains("active")).toBe(active);
  });
});
