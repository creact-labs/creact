import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import { t } from "@/i18n";
import { useToc } from "@/shared/context/toc";

const TableOfContents: Component = () => {
  const { headings, activeId } = useToc();

  return (
    <Show when={headings().length > 0}>
      <nav class="docs-toc">
        <div class="docs-toc-title">{t("docs.toc_title")}</div>
        <For each={headings()}>
          {(heading) => (
            <a
              href={`#${heading.id}`}
              class="docs-toc-link"
              classList={{
                active: activeId() === heading.id,
                "level-3": heading.level === 3,
              }}
            >
              {heading.text}
            </a>
          )}
        </For>
      </nav>
    </Show>
  );
};

export default TableOfContents;
