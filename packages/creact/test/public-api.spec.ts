import { describe, expect, it } from "vitest";
import * as creact from "../src/index";
import * as jsxTypes from "../src/jsx/types";
import * as sharedTypes from "../src/types";
import * as jsxBarrel from "../src/jsx/index";
import * as jsxDevRuntime from "../src/jsx/jsx-dev-runtime";
import * as reactiveBarrel from "../src/reactive/index";
import * as flowBarrel from "../flow/src/index";
import * as runtimeBarrel from "../runtime/src/index";
import * as storeBarrel from "../store/src/index";

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

  it("reactive barrel re-exports the primitives", () => {
    expect(reactiveBarrel.createSignal).toBe(creact.createSignal);
    expect(reactiveBarrel.createEffect).toBe(creact.createEffect);
  });

  it("runtime barrel re-exports render and the reconciler helpers", () => {
    expect(runtimeBarrel.render).toBe(creact.render);
    expect(runtimeBarrel.reconcile).toBeDefined();
    expect(runtimeBarrel.createFiber).toBeDefined();
  });

  it("flow barrel re-exports the control-flow components", () => {
    expect(flowBarrel.Show).toBe(creact.Show);
    expect(flowBarrel.Switch).toBe(creact.Switch);
  });

  it("store barrel re-exports createStore and unwrap", () => {
    expect(storeBarrel.createStore).toBe(creact.createStore);
    expect(storeBarrel.unwrap).toBe(creact.unwrap);
  });

  it("jsx barrels expose the automatic-transform entry points", () => {
    expect(jsxBarrel.jsx).toBeDefined();
    expect(jsxBarrel.Fragment).toBeDefined();
    expect(jsxDevRuntime.jsxDEV).toBeDefined();
  });

  it("type barrels are type-only: no runtime exports", () => {
    expect(Object.keys(sharedTypes)).toEqual([]);
    expect(Object.keys(jsxTypes)).toEqual([]);
  });
});
