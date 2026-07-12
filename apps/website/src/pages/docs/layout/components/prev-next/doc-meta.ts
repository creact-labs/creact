import { sidebarNav } from "@/pages/docs/layout/sidebar-nav";

export interface DocPage {
  title: string;
  href: string;
}

/**
 * Ordered list of all doc pages for prev/next navigation.
 * Derived from the sidebar so the two can never drift apart.
 */
export const docPages: DocPage[] = sidebarNav.flatMap((section) => [
  ...(section.links ?? []),
  ...(section.subsections?.flatMap((subsection) => subsection.links) ?? []),
]);
