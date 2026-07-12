import type { Component, ParentComponent } from "solid-js";
import { Suspense, createEffect } from "solid-js";
import { useLocation } from "@solidjs/router";
import { SidebarProvider } from "@/pages/docs/layout/context/sidebar";
import { TocProvider, useToc } from "@/shared/context/toc";
import DocNav from "@/pages/docs/layout/components/doc-nav";
import Sidebar from "@/pages/docs/layout/components/sidebar";
import TableOfContents from "@/pages/docs/layout/components/table-of-contents";
import PrevNext from "@/pages/docs/layout/components/prev-next";

const DocsContent: ParentComponent = (props) => {
  const location = useLocation();
  const { clearHeadings } = useToc();

  createEffect(() => {
    location.pathname;
    clearHeadings();
  });

  return (
    <div class="docs-body">
      <Sidebar />
      <main class="docs-content">
        <Suspense fallback={<div class="docs-loading">Loading...</div>}>
          <article class="docs-article">{props.children}</article>
        </Suspense>
        <PrevNext />
      </main>
      <TableOfContents />
    </div>
  );
};

const DocsLayout: ParentComponent = (props) => {
  return (
    <SidebarProvider>
      <TocProvider>
        <DocNav />
        <div class="docs-shell">
          <DocsContent>{props.children}</DocsContent>
        </div>
      </TocProvider>
    </SidebarProvider>
  );
};

export default DocsLayout;
