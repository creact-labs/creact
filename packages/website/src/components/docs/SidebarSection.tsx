import { createSignal, For, Show, type Component } from "solid-js";
import type { NavSection } from "../../data/sidebar-nav";
import SidebarLink from "./SidebarLink";

const SidebarSection: Component<{ section: NavSection }> = (props) => {
  const [isOpen, setIsOpen] = createSignal(true);

  return (
    <div class="sidebar-section">
      <button
        class="sidebar-section-header"
        onClick={() => setIsOpen((v) => !v)}
      >
        {props.section.title}
        <svg
          class="sidebar-section-chevron"
          classList={{ collapsed: !isOpen() }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <Show when={isOpen()}>
        <div class="sidebar-section-links">
          {/* Flat links */}
          <Show when={props.section.links}>
            <For each={props.section.links}>
              {(link) => <SidebarLink href={link.href} title={link.title} />}
            </For>
          </Show>
          {/* Subsections (API Reference) */}
          <Show when={props.section.subsections}>
            <For each={props.section.subsections}>
              {(sub) => (
                <>
                  <div class="sidebar-subsection-label">{sub.label}</div>
                  <For each={sub.links}>
                    {(link) => (
                      <SidebarLink href={link.href} title={link.title} nested />
                    )}
                  </For>
                </>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default SidebarSection;
