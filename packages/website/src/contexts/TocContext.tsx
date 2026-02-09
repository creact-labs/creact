import { createContext, useContext, createSignal, onCleanup, type ParentComponent } from "solid-js";

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

interface TocContextValue {
  headings: () => TocEntry[];
  activeId: () => string;
  registerHeading: (entry: TocEntry) => void;
  clearHeadings: () => void;
}

const TocContext = createContext<TocContextValue>();

export const TocProvider: ParentComponent = (props) => {
  const [headings, setHeadings] = createSignal<TocEntry[]>([]);
  const [activeId, setActiveId] = createSignal("");

  let observer: IntersectionObserver | undefined;

  const setupObserver = () => {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    // Observe all heading elements
    const h = headings();
    for (const heading of h) {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    }
  };

  const registerHeading = (entry: TocEntry) => {
    setHeadings((prev) => {
      // Avoid duplicates
      if (prev.some((h) => h.id === entry.id)) return prev;
      const next = [...prev, entry];
      // Re-setup observer after a tick so DOM is ready
      queueMicrotask(setupObserver);
      return next;
    });
  };

  const clearHeadings = () => {
    setHeadings([]);
    if (observer) observer.disconnect();
  };

  onCleanup(() => {
    if (observer) observer.disconnect();
  });

  return (
    <TocContext.Provider value={{ headings, activeId, registerHeading, clearHeadings }}>
      {props.children}
    </TocContext.Provider>
  );
};

export function useToc() {
  const ctx = useContext(TocContext);
  if (!ctx) throw new Error("useToc must be used within TocProvider");
  return ctx;
}
