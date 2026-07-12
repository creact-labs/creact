/**
 * createRuntime - mount a component tree as its own sovereign runtime.
 *
 * The returned component is a package-provided component in the Show/For
 * family, built entirely on useAsyncOutput + render(). Mounting it boots a
 * child runtime with its own ledger, its own lock, and its own failure
 * domain; the wrapper node's outputs (status/ready/error) are the only
 * thing the parent sees. Props cross the boundary exactly as at any
 * component boundary; parent context does not.
 */

import type { CReactNode } from "../jsx/jsx-runtime";
import { Fragment, jsx } from "../jsx/jsx-runtime";
import { deriveInstanceAddress, useAsyncOutput } from "./instance";
import type { Memory } from "./memory";
import { getCurrentFiber } from "./render";
import { render } from "./run";

/** Runtime-provided outputs of the wrapper node */
export interface RuntimeOutputs {
  status: "deploying" | "ready" | "failed";
  ready: boolean;
  error?: string;
}

/**
 * Wrap a root component so that mounting it boots a child runtime.
 *
 * - `key` is required, as for any resource component; the wrapper node's
 *   path+key address becomes the child's stack name and ledger name.
 * - `memory` is the only boundary prop: omitted, the child inherits the
 *   parent runtime's backend; supplied, the child keeps a sovereign ledger.
 * - All other RenderOptions inherit from the parent runtime.
 * - Child deployment failure and lock-acquisition failure surface on the
 *   wrapper node's outputs as data — a child universe never throws through
 *   the parent's executor.
 * - Removing the JSX (or disposing the parent) detaches the child: its
 *   ledger persists, and re-mounting re-hydrates and re-converges.
 *   Destroying a child universe is only ever an explicit act against its
 *   own Memory.
 *
 * @param Root - The child universe's root component
 * @returns A component accepting Root's props plus optional `memory`
 *
 * @example
 * ```tsx
 * const TenantApp = createRuntime(App);
 *
 * <TenantApp key="tenant-a" region="us-east-1" />
 * <TenantApp key="tenant-b" region="eu-west-1" memory={tenantBMemory} />
 * ```
 */
export function createRuntime<P extends Record<string, unknown>>(
  Root: (props: P) => CReactNode,
): (props: P & { memory?: Memory }) => CReactNode {
  const rootName = Root.name || "Root";

  const RuntimeBoundary = (props: P & { memory?: Memory }): CReactNode => {
    const { memory, ...rootProps } = props;

    const fiber = getCurrentFiber();
    if (!fiber) {
      throw new Error("createRuntime component must be rendered");
    }
    // The wrapper node's address doubles as the child's stack name — one
    // identity scheme at every level. (If key is missing, the
    // useAsyncOutput call below rejects the component before the
    // placeholder address here is ever used.)
    const { nodeId: stackName } = deriveInstanceAddress(fiber);

    const parent = fiber.ctx;
    const childMemory = memory ?? parent.memory;
    if (!childMemory) {
      throw new Error(
        `createRuntime component "${rootName}" has no Memory: ` +
          "pass the memory prop or mount it inside a runtime to inherit one",
      );
    }
    const childOptions = parent.options;

    useAsyncOutput<RuntimeOutputs>({}, async (_props, setOutputs) => {
      setOutputs({ status: "deploying", ready: false });

      // Props pass through verbatim — receiver contracts govern, as at any
      // component boundary
      const child = render(
        () => jsx(Root, rootProps),
        childMemory,
        stackName,
        childOptions,
      );

      try {
        await child.ready;
        setOutputs({ status: "ready", ready: true, error: undefined });
      } catch (err) {
        // The child's failure domain ends here: surface it as data.
        // render() normalizes every ready rejection to an Error.
        setOutputs({
          status: "failed",
          ready: false,
          error: (err as Error).message,
        });
      }

      // Detach-and-resume: dispose stops the child; its ledger persists
      return () => child.dispose();
    });

    return jsx(Fragment, {});
  };

  // Name the wrapper after the root so node addresses read naturally
  // (e.g. billing-runtime-tenant-a instead of runtime-boundary-tenant-a)
  Object.defineProperty(RuntimeBoundary, "name", {
    value: `${rootName}Runtime`,
  });

  return RuntimeBoundary;
}
