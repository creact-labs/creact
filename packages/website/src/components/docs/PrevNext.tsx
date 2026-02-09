import type { Component } from "solid-js";
import { Show } from "solid-js";
import { useLocation } from "@solidjs/router";
import { docPages } from "../../data/doc-meta";

const PrevNext: Component = () => {
  const location = useLocation();

  const currentIndex = () => {
    const path = location.pathname;
    const idx = docPages.findIndex((p) => p.href === path);
    if (idx === -1 && path === "/docs") return 0;
    return idx;
  };

  const prev = () => {
    const idx = currentIndex();
    return idx > 0 ? docPages[idx - 1] : undefined;
  };

  const next = () => {
    const idx = currentIndex();
    return idx >= 0 && idx < docPages.length - 1 ? docPages[idx + 1] : undefined;
  };

  return (
    <Show when={prev() || next()}>
      <nav class="prev-next">
        <Show when={prev()}>
          {(p) => (
            <a href={`#${p().href}`} class="prev-next-link">
              <span class="prev-next-label">&larr; Previous</span>
              <span class="prev-next-title">{p().title}</span>
            </a>
          )}
        </Show>
        <Show when={next()}>
          {(n) => (
            <a href={`#${n().href}`} class="prev-next-link next">
              <span class="prev-next-label">Next &rarr;</span>
              <span class="prev-next-title">{n().title}</span>
            </a>
          )}
        </Show>
      </nav>
    </Show>
  );
};

export default PrevNext;
