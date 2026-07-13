import { afterEach, describe, expect, it } from "vitest";
import { resetRuntime } from "@creact-labs/creact";
import type { DeploymentState } from "@creact-labs/creact";
import { describeTenant, projectFleet } from "../index";

afterEach(() => {
  resetRuntime();
});

function fleetState(nodes: DeploymentState["nodes"]): DeploymentState {
  return {
    nodes,
    status: "deployed",
    stackName: "tenant-fleet",
    lastDeployedAt: 0,
  };
}

describe("projectFleet", () => {
  it("keys tenant-runtime nodes by their tenant name and drops everything else", () => {
    const state = fleetState([
      {
        id: "tenant-tree-runtime-acme",
        path: [],
        props: {},
        outputs: { status: "ready", ready: true },
      },
      {
        id: "tenant-tree-runtime-globex",
        path: [],
        props: {},
        outputs: { status: "deploying", ready: false },
      },
      { id: "tenant-database-database", path: [], props: {}, outputs: { url: "x" } },
      { id: "tenant-tree-runtime-empty", path: [], props: {} },
    ]);

    const fleet = projectFleet(state);

    expect(Object.keys(fleet).sort()).toEqual(["acme", "globex"]);
    expect(fleet.acme).toEqual({ status: "ready", ready: true });
    expect(fleet.globex).toEqual({ status: "deploying", ready: false });
  });

  it("returns an empty fleet when no node matches", () => {
    const state = fleetState([
      { id: "tenant-database-database", path: [], props: {}, outputs: { url: "x" } },
    ]);

    expect(projectFleet(state)).toEqual({});
  });
});

describe("describeTenant", () => {
  it("reports attaching while the runtime is undefined", () => {
    expect(describeTenant({ name: "acme", region: "us-east-1" })).toBe("acme: attaching");
  });

  it("reports the runtime status once present", () => {
    expect(
      describeTenant({ name: "acme", region: "us-east-1" }, { status: "ready", ready: true }),
    ).toBe("acme: ready");
  });

  it("appends the error when the runtime failed", () => {
    expect(
      describeTenant(
        { name: "globex", region: "eu-west-1" },
        { status: "failed", ready: false, error: "lock held" },
      ),
    ).toBe("globex: failed, lock held");
  });
});
