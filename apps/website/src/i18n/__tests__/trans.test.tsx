import { describe, expect, it, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import Code from "@/shared/components/code";
import Em from "@/shared/components/em";
import Strong from "@/shared/components/strong";
import TextLink from "@/shared/components/text-link";
import type { TransComponents } from "../trans";

// The global setup mock replaces Trans with a key passthrough; this suite
// tests the real component and its placeholder parser.
const { Trans, parseTransValue } = await vi.importActual<
  typeof import("../trans")
>("../trans");

function renderParts(value: string, components: TransComponents = []) {
  const { container } = render(() => (
    <>{parseTransValue(value, components)}</>
  ));
  return container;
}

describe("parseTransValue", () => {
  it("plain text becomes one text node", () => {
    const container = renderParts("just words");
    expect(container.textContent).toBe("just words");
    expect(container.querySelector("*")).toBeNull();
  });

  it("a placeholder renders through its supplied component", () => {
    const container = renderParts("Omit for <0>T | undefined</0>.", [Code]);
    expect(container.querySelector("code")?.textContent).toBe("T | undefined");
    expect(container.textContent).toBe("Omit for T | undefined.");
  });

  it("placeholders interpolate in index order", () => {
    const container = renderParts(
      "Set <0>equals</0> to <1>false</1> or <2>never</2>.",
      [Code, Em, Strong],
    );
    expect(container.querySelector("code")?.textContent).toBe("equals");
    expect(container.querySelector("em")?.textContent).toBe("false");
    expect(container.querySelector("strong")?.textContent).toBe("never");
    expect(container.textContent).toBe("Set equals to false or never.");
  });

  it("composed components receive the chunk as children", () => {
    const container = renderParts("See <0>Runtime Boundaries</0> for more.", [
      (props) => (
        <TextLink href="#/docs/architecture/runtime-boundaries">
          {props.children}
        </TextLink>
      ),
    ]);
    const anchor = container.querySelector("a");
    expect(anchor?.getAttribute("href")).toBe(
      "#/docs/architecture/runtime-boundaries",
    );
    expect(anchor?.textContent).toBe("Runtime Boundaries");
  });

  it("a placeholder without a component degrades to its own text", () => {
    const container = renderParts("plain <0>chunk</0> survives");
    expect(container.querySelector("*")).toBeNull();
    expect(container.textContent).toBe("plain chunk survives");
  });

  it("TypeScript syntax inside a chunk renders literally, not as markup", () => {
    const container = renderParts("<0>Accessor<any></0> stays intact", [Code]);
    expect(container.querySelector("code")?.textContent).toBe("Accessor<any>");
  });
});

describe("Trans", () => {
  it("resolves its key and interpolates the supplied components", () => {
    const { container } = render(() => (
      <Trans
        k="docs.api.reactive.create_signal.param_value_desc"
        components={[Code]}
      />
    ));
    expect(container.querySelector("code")?.textContent).toBe(
      "T | undefined",
    );
    expect(container.textContent).toBe(
      "Initial value of the signal. Optional; omit for T | undefined.",
    );
  });

  it("renders placeholder chunks as text when no components are passed", () => {
    const { container } = render(() => (
      <Trans k="docs.api.reactive.create_signal.param_value_name" />
    ));
    expect(container.querySelector("*")).toBeNull();
    expect(container.textContent).toBe("value");
  });
});
