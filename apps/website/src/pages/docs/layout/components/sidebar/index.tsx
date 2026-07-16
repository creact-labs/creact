import type { Component } from "solid-js";
import { For } from "solid-js";
import { sidebarNav } from "@/pages/docs/layout/sidebar-nav";
import { useSidebar } from "@/pages/docs/layout/context/sidebar";
import SidebarSection from "./sidebar-section";

const Sidebar: Component = () => {
  const { isOpen, close } = useSidebar();

  return (
    <>
      <div
        class="docs-sidebar-overlay"
        classList={{ open: isOpen() }}
        onClick={close}
      />
      <aside class="docs-sidebar" classList={{ open: isOpen() }}>
        <For each={sidebarNav}>
          {(section) => <SidebarSection section={section} />}
        </For>
      </aside>
    </>
  );
};

export default Sidebar;
