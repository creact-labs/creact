import { afterEach, describe, expect, it, vi } from "vitest";
import { render, resetRuntime } from "@creact-labs/creact";
import { createMemory } from "@creact-labs/example-memory";
import { TenantApp } from "../index";

afterEach(() => {
  resetRuntime();
});

describe("TenantApp", () => {
  it("boots each tenant as its own runtime and reports ready on the wrapper node", async () => {
    const fleetMemory = createMemory();
    const acmeMemory = createMemory();
    const globexMemory = createMemory();

    const result = render(
      () => (
        <>
          <TenantApp key="acme" name="acme" region="us-east-1" plan="pro" memory={acmeMemory} />
          <TenantApp key="globex" name="globex" region="eu-west-1" memory={globexMemory} />
        </>
      ),
      fleetMemory,
      "tenant-fleet-test",
    );
    await result.ready;
    await result.settled();

    const wrappers = result.getNodes();
    expect(wrappers.map((node) => node.id).sort()).toEqual([
      "tenant-tree-runtime-acme",
      "tenant-tree-runtime-globex",
    ]);
    for (const wrapper of wrappers) {
      expect(wrapper.outputs).toMatchObject({ status: "ready", ready: true });
    }

    result.dispose();
  });

  it("keeps each tenant's outputs isolated in its own sovereign ledger", async () => {
    const fleetMemory = createMemory();
    const acmeMemory = createMemory();
    const globexMemory = createMemory();

    const result = render(
      () => (
        <>
          <TenantApp key="acme" name="acme" region="us-east-1" plan="pro" memory={acmeMemory} />
          <TenantApp key="globex" name="globex" region="eu-west-1" memory={globexMemory} />
        </>
      ),
      fleetMemory,
      "tenant-fleet-test",
    );
    await result.ready;
    await result.settled();

    const acmeStack = await acmeMemory.getState("tenant-tree-runtime-acme");
    expect(acmeStack).not.toBeNull();
    expect(await acmeMemory.getState("tenant-tree-runtime-globex")).toBeNull();
    expect(await globexMemory.getState("tenant-tree-runtime-acme")).toBeNull();

    const acmeDb = acmeStack!.nodes.find((node) => node.id === "tenant-database-database");
    expect(acmeDb!.outputs!.connectionString).toBe(
      "postgres://acme.us-east-1.fleet.internal:5432/acme",
    );

    await vi.waitFor(
      async () => {
        const acmeApi = (await acmeMemory.getState("tenant-tree-runtime-acme"))!.nodes.find(
          (node) => node.id.endsWith("tenant-api-api"),
        );
        expect(acmeApi?.outputs).toMatchObject({
          endpoint: "https://acme.fleet.dev",
          database: "postgres://acme.us-east-1.fleet.internal:5432/acme",
          requestsPerMinute: 1000,
        });
        const globexApi = (await globexMemory.getState("tenant-tree-runtime-globex"))!.nodes.find(
          (node) => node.id.endsWith("tenant-api-api"),
        );
        expect(globexApi?.outputs).toMatchObject({
          endpoint: "https://globex.fleet.dev",
          database: "postgres://globex.eu-west-1.fleet.internal:5432/globex",
          requestsPerMinute: 100,
        });
      },
      { timeout: 3000 },
    );

    result.dispose();
  });
});
