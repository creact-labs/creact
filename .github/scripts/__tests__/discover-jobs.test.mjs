// Tests for the CI matrix discovery script. Run with `node --test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildOrder,
  collectPackages,
  discoverJobs,
  safeName,
  safeTask,
  toMatrix,
  workspaceDeps,
  WORKSPACE_ROOTS,
} from "../discover-jobs.mjs";

// Build a name → { name, dir, pkg } map from terse package literals.
function makePackages(pkgs) {
  const packages = new Map();
  for (const pkg of pkgs) {
    packages.set(pkg.name, { name: pkg.name, dir: `packages/${pkg.name}`, pkg });
  }
  return packages;
}

const buildScripts = { build: "tsc", typecheck: "tsc", "test:coverage": "vitest" };

// creact ← testing: testing peer-depends on creact and dev-depends on it too;
// creact only dev-depends on testing (its test suite). The dev edges must not
// create build prerequisites or a cycle.
const graph = makePackages([
  { name: "creact", scripts: buildScripts, devDependencies: { testing: "*" } },
  {
    name: "testing",
    scripts: { build: "tsc", typecheck: "tsc" },
    peerDependencies: { creact: "*" },
    devDependencies: { creact: "*", vitest: "*" },
  },
  { name: "cli", scripts: { build: "tsc" } },
]);

test("safeName strips the scope and slashes for job/artifact names", () => {
  assert.equal(safeName("@creact-labs/creact"), "creact-labs-creact");
  assert.equal(safeName("create-creact-app"), "create-creact-app");
});

test("safeTask replaces colons", () => {
  assert.equal(safeTask("test:coverage"), "test-coverage");
  assert.equal(safeTask("build"), "build");
});

test("workspaceDeps returns only runtime/peer workspace packages", () => {
  assert.deepEqual(workspaceDeps("testing", graph), ["creact"]);
});

test("workspaceDeps excludes devDependencies and external packages", () => {
  // creact's only creact-labs edge to testing is a devDependency → dropped.
  assert.deepEqual(workspaceDeps("creact", graph), []);
});

test("buildOrder lists a package's workspace deps before it", () => {
  assert.deepEqual(buildOrder("testing", graph), ["packages/creact"]);
});

test("buildOrder is empty when there are no runtime/peer workspace deps", () => {
  assert.deepEqual(buildOrder("creact", graph), []);
  assert.deepEqual(buildOrder("cli", graph), []);
});

test("buildOrder tolerates mutual dependencies without recursing forever", () => {
  const cyclic = makePackages([
    { name: "a", scripts: { build: "x" }, peerDependencies: { b: "*" } },
    { name: "b", scripts: { build: "x" }, peerDependencies: { a: "*" } },
  ]);
  // Root is seeded into `seen`, so the cycle terminates and excludes self.
  assert.deepEqual(buildOrder("a", cyclic), ["packages/b"]);
});

test("buildOrder skips dependencies that have no build script", () => {
  const withUnbuilt = makePackages([
    { name: "lib" }, // no scripts at all
    { name: "app", scripts: { build: "x" }, dependencies: { lib: "*" } },
  ]);
  assert.deepEqual(buildOrder("app", withUnbuilt), []);
});

test("buildOrder orders transitive deps deepest-first and dedupes", () => {
  const chain = makePackages([
    { name: "base", scripts: { build: "x" } },
    { name: "mid", scripts: { build: "x" }, dependencies: { base: "*" } },
    {
      name: "top",
      scripts: { build: "x" },
      dependencies: { mid: "*", base: "*" },
    },
  ]);
  assert.deepEqual(buildOrder("top", chain), ["packages/base", "packages/mid"]);
});

test("discoverJobs emits one job per defined task, carrying deps", () => {
  const jobs = discoverJobs(graph);
  const testingBuild = jobs.find(
    (job) => job.phase === "build" && job.name === "testing",
  );
  assert.deepEqual(testingBuild, {
    phase: "build",
    name: "testing",
    path: "packages/testing",
    safeName: "build-testing",
    deps: "packages/creact",
  });
  // cli only defines build → exactly one job for it.
  assert.deepEqual(
    jobs.filter((job) => job.name === "cli").map((job) => job.phase),
    ["build"],
  );
});

test("discoverJobs sorts by phase then name", () => {
  const phases = discoverJobs(graph).map((job) => `${job.phase}:${job.name}`);
  assert.deepEqual(phases, [...phases].sort());
});

test("toMatrix filters by phase and keeps only matrix fields", () => {
  const matrix = toMatrix(discoverJobs(graph), "typecheck");
  assert.deepEqual(matrix.include, [
    {
      name: "creact",
      path: "packages/creact",
      safeName: "typecheck-creact",
      deps: "",
    },
    {
      name: "testing",
      path: "packages/testing",
      safeName: "typecheck-testing",
      deps: "packages/creact",
    },
  ]);
});

test("collectPackages reads the real workspaces and wires the graph", () => {
  const packages = collectPackages(WORKSPACE_ROOTS);
  assert.ok(packages.has("@creact-labs/creact"));
  assert.ok(packages.has("@creact-labs/testing"));
  // The real testing → creact edge is what this whole feature exists to build.
  assert.deepEqual(workspaceDeps("@creact-labs/testing", packages), [
    "@creact-labs/creact",
  ]);
  assert.deepEqual(buildOrder("@creact-labs/testing", packages), [
    "packages/creact",
  ]);
});

test("collectPackages tolerates missing workspace roots", () => {
  assert.equal(collectPackages(["does-not-exist"]).size, 0);
});
