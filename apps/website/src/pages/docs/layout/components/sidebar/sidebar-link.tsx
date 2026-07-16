import type { Component } from "solid-js";
import { useLocation } from "@solidjs/router";
import { type TranslationKey, t } from "@/i18n";
import { useSidebar } from "@/pages/docs/layout/context/sidebar";

const SidebarLink: Component<{
  href: string;
  title: TranslationKey;
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
      {t(props.title)}
    </a>
  );
};

export default SidebarLink;
