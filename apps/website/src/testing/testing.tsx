/**
 * Shared test configuration: custom renderer wiring the app-level providers.
 */
import type { JSX, ParentComponent } from "solid-js";
import { render } from "@solidjs/testing-library";
import { createMemoryHistory, MemoryRouter, Route } from "@solidjs/router";
import { SidebarProvider } from "@/pages/docs/layout/context/sidebar";
import { TocProvider } from "@/shared/context/toc";

interface RenderWithProvidersOptions {
  /** Path to mount at — wraps the tree in a memory router */
  location?: string;
}

const Providers: ParentComponent = (props) => {
  return (
    <SidebarProvider>
      <TocProvider>{props.children}</TocProvider>
    </SidebarProvider>
  );
};

export function renderWithProviders(
  ui: () => JSX.Element,
  options: RenderWithProvidersOptions = {},
) {
  const { location } = options;
  if (location === undefined) {
    return render(ui, { wrapper: Providers });
  }

  // Router wired here rather than via the render() location option: that
  // option imports a second @solidjs/router instance whose context the
  // statically imported useLocation cannot see.
  const history = createMemoryHistory();
  history.set({ value: location, scroll: false, replace: true });
  return render(() => (
    <MemoryRouter history={history}>
      <Route path="*all" component={() => <Providers>{ui()}</Providers>} />
    </MemoryRouter>
  ));
}

/** Deterministically drain microtasks queued by mount-time effects */
export async function flushAsyncEffects(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
