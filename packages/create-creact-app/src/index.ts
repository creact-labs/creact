import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { type MemoryKind, MEMORY_KINDS, projectFiles } from "./templates.js";

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

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function promptMemory(): Promise<MemoryKind> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      "Memory backend — file (default), sqlite, memory, or custom? ",
    );
    const choice = answer.trim();
    return (MEMORY_KINDS as string[]).includes(choice)
      ? (choice as MemoryKind)
      : "file";
  } finally {
    rl.close();
  }
}

async function resolveMemory(args: CliArgs): Promise<MemoryKind> {
  if (args.memory) return args.memory;
  if (process.stdin.isTTY) return promptMemory();
  return "file";
}

export async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  try {
    scaffold(args.targetDir, await resolveMemory(args));
    console.log(nextSteps(args.targetDir));
  } catch (err) {
    console.error(errorMessage(err));
    process.exit(1);
  }
}
