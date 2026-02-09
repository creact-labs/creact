import type { Component, ParentComponent } from "solid-js";
import { Suspense, createEffect } from "solid-js";
import { useLocation } from "@solidjs/router";
import { SidebarProvider } from "../contexts/SidebarContext";
import { TocProvider, useToc } from "../contexts/TocContext";
import DocNav from "../components/docs/DocNav";
import Sidebar from "../components/docs/Sidebar";
import TableOfContents from "../components/docs/TableOfContents";
import PrevNext from "../components/docs/PrevNext";

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
          <article class="docs-article">
            {props.children}
          </article>
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
