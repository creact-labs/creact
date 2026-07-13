import { describe, expect, it, vi } from "vitest";
import { render } from "@solidjs/testing-library";

// The global setup mock replaces Trans with a key passthrough; this suite
// tests the real component and its placeholder parser.
const { parseTransValue } = await vi.importActual<
  typeof import("../trans")
>("../trans");

function renderParts(value: string) {
  const { container } = render(() => <>{parseTransValue(value)}</>);
  return container;
}

describe("parseTransValue", () => {
  it("plain text becomes one text node", () => {
    const container = renderParts("just words");
    expect(container.textContent).toBe("just words");
    expect(container.querySelector("*")).toBeNull();
  });

  it("code placeholders become real code elements", () => {
    const container = renderParts("Omit for <code>T | undefined</code>.");
    expect(container.querySelector("code")?.textContent).toBe("T | undefined");
    expect(container.textContent).toBe("Omit for T | undefined.");
  });

  it("several placeholders interpolate in order", () => {
    const container = renderParts(
      "Set <code>equals</code> to <code>false</code> or <strong>never</strong>.",
    );
    const codes = [...container.querySelectorAll("code")];
    expect(codes.map((c) => c.textContent)).toEqual(["equals", "false"]);
    expect(container.querySelector("strong")?.textContent).toBe("never");
  });

  it("anchors carry their href", () => {
    const container = renderParts(
      'See <a href="#/docs/architecture/runtime-boundaries">Runtime Boundaries</a> for more.',
    );
    const anchor = container.querySelector("a");
    expect(anchor?.getAttribute("href")).toBe(
      "#/docs/architecture/runtime-boundaries",
    );
    expect(anchor?.textContent).toBe("Runtime Boundaries");
  });

  it("em renders as emphasis", () => {
    const container = renderParts("<em>detaches</em> the child");
    expect(container.querySelector("em")?.textContent).toBe("detaches");
  });

  it("entities decode into plain characters", () => {
    const container = renderParts(
      "<code>SignalOptions&lt;T&gt;</code> &amp; friends",
    );
    expect(container.querySelector("code")?.textContent).toBe(
      "SignalOptions<T>",
    );
    expect(container.textContent).toBe("SignalOptions<T> & friends");
  });

  it("TypeScript syntax inside a code chunk renders literally, not as markup", () => {
    const container = renderParts("<code>Accessor<any></code> stays intact");
    expect(container.querySelector("code")?.textContent).toBe("Accessor<any>");
  });
});
