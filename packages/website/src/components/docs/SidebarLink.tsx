import type { Component } from "solid-js";
import { useLocation } from "@solidjs/router";
import { useSidebar } from "../../contexts/SidebarContext";

const SidebarLink: Component<{
  href: string;
  title: string;
  nested?: boolean;
}> = (props) => {
  const location = useLocation();
  const { close } = useSidebar();

  const isActive = () => {
    const path = location.pathname;
    return (
      path === props.href ||
      (props.href === "/docs/getting-started/installation" && path === "/docs")
    );
  };

  return (
    <a
      href={`#${props.href}`}
      class="sidebar-link"
      classList={{ active: isActive(), nested: props.nested }}
      onClick={close}
    >
      {props.title}
    </a>
  );
};

export default SidebarLink;
