#!/usr/bin/env node
// Discover the CI matrices. For every workspace under packages/, apps/, and
// libs/, emit one matrix entry per task (typecheck, build, test) whose script
// the package.json actually defines. Nothing is hardcoded, so adding a package
// (or a task to a package) is covered automatically and no package can be
// silently skipped — the gap that let a broken `packages/testing` build reach
// the release step.
//
// Each entry also carries `deps`: the workspace packages it must build first
// (topologically ordered), derived from its declared dependencies. A package
// like `@creact-labs/testing` typechecks/builds against the published dist of
// `@creact-labs/creact`, so creact must be built before it — again, discovered
// from package.json rather than pinned in the workflow.
//
// The pure functions are exported and exercised by __tests__/discover-jobs.test.mjs;
// filesystem reads and the GITHUB_OUTPUT write only run when invoked as a script.
//
// Writes to GITHUB_OUTPUT (or stdout locally):
//   typecheckJobs / buildJobs / testJobs — each a JSON `{ "include": [...] }`
//   ready to feed `strategy.matrix`. Each entry: { name, path, safeName, deps }.
import { appendFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { argv, env } from "node:process";
import { pathToFileURL } from "node:url";

// Top-level workspace roots only. Nested example workspaces
// (libs/examples/{apps,packages}/*) typecheck and test as one unit through
// libs/examples itself, so they are intentionally not scanned individually.
export const WORKSPACE_ROOTS = ["packages", "apps", "libs"];

export const TASKS = [
  { script: "typecheck", phase: "typecheck" },
  { script: "build", phase: "build" },
  { script: "test:coverage", phase: "test" },
];

// Only runtime and peer dependencies count toward build order: those are what a
// package's own source compiles against, so they must be built first.
// devDependencies are deliberately excluded — a package used only in tests
// (creact dev-depends on testing) must not become a build prerequisite, and
// doing so would form a false cycle with the peer edge pointing the other way.
const DEP_FIELDS = ["dependencies", "peerDependencies"];

// GitHub artifact/job suffixes disallow `/` and `@`.
export function safeName(value) {
  return value.replace(/^@/, "").replace(/[/@]/g, "-");
}
export function safeTask(script) {
  return script.replace(/:/g, "-");
}

function packageName(pkg, dir) {
  return pkg.name || dir;
}

// ── Filesystem collection (only the leaves touch the disk) ──────────────────

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function readDirNames(root) {
  try {
    return readdirSync(root);
  } catch {
    return [];
  }
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function addPackage(root, dir, packages) {
  const pkgDir = join(root, dir);
  if (!isDirectory(pkgDir)) return;
  const pkg = readJson(join(pkgDir, "package.json"));
  if (!pkg) return;
  const record = { name: packageName(pkg, dir), dir: pkgDir, pkg };
  packages.set(record.name, record);
}

function addRoot(root, packages) {
  for (const dir of readDirNames(root)) addPackage(root, dir, packages);
}

// name → { name, dir, pkg } for every workspace found under the given roots.
export function collectPackages(roots) {
  const packages = new Map();
  for (const root of roots) addRoot(root, packages);
  return packages;
}

// ── Dependency graph (pure over the collected packages map) ─────────────────

function depsInField(pkg, field, packages) {
  const section = pkg[field] || {};
  return Object.keys(section).filter((name) => packages.has(name));
}

// The local workspace packages a package depends on (deduped).
export function workspaceDeps(name, packages) {
  const pkg = packages.get(name).pkg;
  const named = DEP_FIELDS.flatMap((field) => depsInField(pkg, field, packages));
  return [...new Set(named)];
}

function hasBuildScript(name, packages) {
  const scripts = packages.get(name).pkg.scripts || {};
  return Boolean(scripts.build);
}

function queueIfBuildable(name, packages, order) {
  if (hasBuildScript(name, packages)) order.push(packages.get(name).dir);
}

function visitDependency(dep, packages, seen, order) {
  if (seen.has(dep)) return;
  seen.add(dep);
  collectDependencies(dep, packages, seen, order);
  queueIfBuildable(dep, packages, order);
}

function collectDependencies(name, packages, seen, order) {
  for (const dep of workspaceDeps(name, packages)) {
    visitDependency(dep, packages, seen, order);
  }
  return order;
}

// Transitive workspace dependencies with a `build` script, in the order they
// must be built (each dependency before the package that consumes it). Seeding
// `seen` with the root keeps a self- or mutually-referential dependency from
// recursing forever.
export function buildOrder(name, packages) {
  return collectDependencies(name, packages, new Set([name]), []);
}

// ── Job discovery ───────────────────────────────────────────────────────────

function definesTask(pkg, task) {
  const scripts = pkg.scripts || {};
  return Boolean(scripts[task.script]);
}

function taskJob(record, task, deps) {
  return {
    phase: task.phase,
    name: record.name,
    path: record.dir,
    safeName: `${safeTask(task.script)}-${safeName(record.name)}`,
    deps,
  };
}

function addJobsFor(record, packages, jobs) {
  const deps = buildOrder(record.name, packages).join(" ");
  for (const task of TASKS) {
    if (definesTask(record.pkg, task)) jobs.push(taskJob(record, task, deps));
  }
}

function compareJobs(a, b) {
  return a.phase.localeCompare(b.phase) || a.name.localeCompare(b.name);
}

// Every discovered job, sorted by phase then name.
export function discoverJobs(packages) {
  const jobs = [];
  for (const record of packages.values()) addJobsFor(record, packages, jobs);
  jobs.sort(compareJobs);
  return jobs;
}

function pickMatrixFields({ name, path, safeName: safe, deps }) {
  return { name, path, safeName: safe, deps };
}

// The `{ include: [...] }` matrix payload for one phase.
export function toMatrix(jobs, phase) {
  const include = jobs.filter((job) => job.phase === phase).map(pickMatrixFields);
  return { include };
}

// ── Script entry point (side effects live here) ─────────────────────────────

function logJobs(jobs) {
  console.log("Discovered CI jobs:");
  for (const job of jobs) console.log(`  - ${job.phase}: ${job.name} (${job.path})`);
}

function writeOutput(key, value) {
  const line = `${key}=${value}\n`;
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, line);
  else console.log(line.trim());
}

function main() {
  const jobs = discoverJobs(collectPackages(WORKSPACE_ROOTS));
  logJobs(jobs);
  for (const task of TASKS) {
    writeOutput(`${task.phase}Jobs`, JSON.stringify(toMatrix(jobs, task.phase)));
  }
}

if (import.meta.url === pathToFileURL(argv[1]).href) main();
