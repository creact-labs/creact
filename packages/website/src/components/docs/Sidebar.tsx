import type { Component } from "solid-js";
import { For } from "solid-js";
import { sidebarNav } from "../../data/sidebar-nav";
import { useSidebar } from "../../contexts/SidebarContext";
import SidebarSection from "./SidebarSection";

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
