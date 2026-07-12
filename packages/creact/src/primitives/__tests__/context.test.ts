import { faker} from "@faker-js/faker";
import { afterEach, describe, expect, it} from "vitest";
import { createRoot} from "../../reactive/owner";
import { clearContextStacks, createContext, getContextSnapshot, popContext, pushContext, restoreContextSnapshot, useContext} from "../context";

afterEach(() => {
  clearContextStacks();
});

describe("createContext / useContext", () => {
  it("returns the default value when no provider is active", () => {
    const fallback = faker.internet.url();
    const Ctx = createContext(fallback);

    expect(useContext(Ctx)).toBe(fallback);
  });

  it("returns undefined when there is no provider and no default", () => {
    const Ctx = createContext<string>();

    expect(useContext(Ctx)).toBeUndefined();
  });

  it("Provider factory produces a renderable provider element", () => {
    const Ctx = createContext<number>();

    const el = Ctx.Provider({ value: 42, children: "child" });

    expect(el.__isProvider).toBe(true);
    expect(el.__context).toBe(Ctx.id);
    expect(el.props.value).toBe(42);
  });

  it("reads the innermost pushed value and unwinds on pop", () => {
    const Ctx = createContext("default");

    pushContext(Ctx.id, "outer");
    pushContext(Ctx.id, "inner");
    expect(useContext(Ctx)).toBe("inner");

    popContext(Ctx.id);
    expect(useContext(Ctx)).toBe("outer");

    popContext(Ctx.id);
    expect(useContext(Ctx)).toBe("default");
  });

  it("prefers the reactive owner chain over the render stack", () => {
    const Ctx = createContext("default");

    createRoot((_dispose) => {
      pushContext(Ctx.id, "from-owner"); // sets both stack and owner
      popContext(Ctx.id); // stack unwound, owner keeps the value

      expect(useContext(Ctx)).toBe("from-owner");
    });
  });
});

describe("context snapshots (render-time capture/restore)", () => {
  it("captures and restores the full stack state", () => {
    const Ctx = createContext("default");
    pushContext(Ctx.id, "captured");
    const snapshot = getContextSnapshot();
    popContext(Ctx.id);
    expect(useContext(Ctx)).toBe("default");

    restoreContextSnapshot(snapshot);

    expect(useContext(Ctx)).toBe("captured");
  });

  it("restoring a snapshot replaces values pushed after the capture", () => {
    const Ctx = createContext<string>();
    const snapshot = getContextSnapshot(); // empty

    pushContext(Ctx.id, "later");
    restoreContextSnapshot(snapshot);

    expect(useContext(Ctx)).toBeUndefined();
  });

  it("snapshots are isolated copies, not live references", () => {
    const Ctx = createContext<string>();
    pushContext(Ctx.id, "original");

    const snapshot = getContextSnapshot();
    pushContext(Ctx.id, "mutation-after-snapshot");
    restoreContextSnapshot(snapshot);

    expect(useContext(Ctx)).toBe("original");
  });
});
