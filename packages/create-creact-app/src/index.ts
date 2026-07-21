import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import * as clack from "@clack/prompts";
import pc from "picocolors";
import { type MemoryKind, MEMORY_KINDS, projectFiles } from "./templates";

export interface CliArgs {
  targetDir: string;
  memory?: MemoryKind;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { targetDir: "creact-app" };
  let sawDir = false;
  for (const arg of argv) {
    const memory = readMemoryFlag(arg);
    if (memory) {
      args.memory = memory;
    } else if (!arg.startsWith("-") && !sawDir) {
      args.targetDir = arg;
      sawDir = true;
    }
  }
  return args;
}

function readMemoryFlag(arg: string): MemoryKind | undefined {
  const match = /^--memory=(.+)$/.exec(arg);
  const value = match?.[1];
  return value && (MEMORY_KINDS as string[]).includes(value)
    ? (value as MemoryKind)
    : undefined;
}

export function scaffold(targetDir: string, memory: MemoryKind): void {
  const dir = resolve(targetDir);
  if (existsSync(dir) && readdirSync(dir).length > 0) {
    throw new Error(
      `Target directory "${targetDir}" already exists and is not empty. ` +
        `Choose a different directory or empty this one first.`,
    );
  }
  const files = projectFiles(basename(dir), memory);
  mkdirSync(dir, { recursive: true });
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = join(dir, relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents);
  }
}

export function nextSteps(targetDir: string): string {
  return [
    "",
    `Scaffolded a CReact app in ${targetDir}`,
    "",
    "Next steps:",
    `  cd ${targetDir}`,
    "  npm install",
    "  npm run dev",
    "",
  ].join("\n");
}

function nextCommands(targetDir: string): string {
  return [`cd ${targetDir}`, "npm install", "npm run dev"].join("\n");
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ── Interactive TUI (arrow-key select, no typing) — only on a TTY ────────────

const BANNER = `${pc.cyan("◆")} ${pc.bold("create-creact-app")}`;

// Arrow-key options for the memory backend, each with a one-line hint.
const MEMORY_OPTIONS: { value: MemoryKind; label: string; hint: string }[] = [
  { value: "file", label: "File", hint: "JSON under ./.state, persists across restarts (default)" },
  { value: "sqlite", label: "SQLite", hint: "one database file via better-sqlite3" },
  { value: "memory", label: "In-memory", hint: "a Map; nothing survives a restart" },
  { value: "custom", label: "Custom", hint: "runnable skeleton to point at Redis, Postgres, S3…" },
];

// Turn a clack cancel (Ctrl+C / Esc) into a clean exit instead of a thrown symbol.
function orCancel<T>(value: T | symbol): T {
  if (clack.isCancel(value)) {
    clack.cancel("Scaffolding cancelled.");
    process.exit(0);
  }
  return value;
}

async function promptTargetDir(fallback: string): Promise<string> {
  const value = await clack.text({
    message: "Project directory",
    placeholder: fallback,
    defaultValue: fallback,
  });
  return orCancel(value) || fallback;
}

async function promptMemory(): Promise<MemoryKind> {
  const value = await clack.select({
    message: "Which memory backend?",
    options: MEMORY_OPTIONS,
    initialValue: "file" as MemoryKind,
  });
  return orCancel(value);
}

async function resolveTargetDir(
  args: CliArgs,
  interactive: boolean,
  explicit: boolean,
): Promise<string> {
  if (explicit || !interactive) return args.targetDir;
  return promptTargetDir(args.targetDir);
}

async function resolveMemory(
  args: CliArgs,
  interactive: boolean,
): Promise<MemoryKind> {
  if (args.memory) return args.memory;
  if (!interactive) return "file";
  return promptMemory();
}

function finish(targetDir: string, interactive: boolean): void {
  if (!interactive) {
    console.log(nextSteps(targetDir));
    return;
  }
  clack.note(nextCommands(targetDir), "Next steps");
  clack.outro(pc.green(`Scaffolded ${pc.bold(targetDir)} — happy hacking!`));
}

function fail(message: string, interactive: boolean): never {
  if (interactive) clack.cancel(message);
  else console.error(message);
  process.exit(1);
}

async function run(
  args: CliArgs,
  argv: string[],
  interactive: boolean,
): Promise<void> {
  if (interactive) clack.intro(BANNER);
  const explicit = argv.some((arg) => !arg.startsWith("-"));
  const targetDir = await resolveTargetDir(args, interactive, explicit);
  const memory = await resolveMemory(args, interactive);
  scaffold(targetDir, memory);
  finish(targetDir, interactive);
}

export async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const interactive = Boolean(process.stdin.isTTY);
  try {
    await run(parseArgs(argv), argv, interactive);
  } catch (err) {
    fail(errorMessage(err), interactive);
  }
}
