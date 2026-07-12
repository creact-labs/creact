import { describe, expect, it} from "vitest";
import * as creact from "../index";
import * as jsxBarrel from "../jsx/index";
import * as jsxDevRuntime from "../jsx/jsx-dev-runtime";
import * as sharedTypes from "../types";

describe("public API surface", () => {
  it.each([
    "createSignal",
    "createMemo",
    "createEffect",
    "createComputed",
    "createRenderEffect",
    "onMount",
    "onCleanup",
    "batch",
    "untrack",
    "on",
    "createSelector",
    "createReaction",
    "catchError",
    "createRoot",
    "getOwner",
    "runWithOwner",
    "useAsyncOutput",
    "Show",
    "For",
    "Switch",
    "Match",
    "ErrorBoundary",
    "createContext",
    "useContext",
    "mergeProps",
    "splitProps",
    "createStore",
    "unwrap",
    "mapArray",
    "indexArray",
    "children",
    "createElement",
    "jsx",
    "jsxs",
    "render",
    "resetRuntime",
    "access",
  ] as const)("exports %s from the package root", (name) => {
    expect((creact as Record<string, unknown>)[name]).toBeDefined();
  });

  it("jsx entry points expose the automatic-transform API", () => {
    expect(jsxBarrel.jsx).toBeDefined();
    expect(jsxBarrel.createElement).toBeDefined();
    expect(jsxBarrel.Fragment).toBeDefined();
    expect(jsxDevRuntime.jsxDEV).toBeDefined();
  });

  it("the shared types module is type-only: no runtime exports", () => {
    expect(Object.keys(sharedTypes)).toEqual([]);
  });
});
