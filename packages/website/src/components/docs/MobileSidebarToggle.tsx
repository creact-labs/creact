import type { Component } from "solid-js";
import { useSidebar } from "../../contexts/SidebarContext";

const MobileSidebarToggle: Component = () => {
  const { toggle } = useSidebar();

  return (
    <button class="mobile-sidebar-toggle" onClick={toggle} aria-label="Toggle sidebar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
};

export default MobileSidebarToggle;
