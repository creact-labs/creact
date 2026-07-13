#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { projectFiles } from "./templates.js";

export function scaffold(targetDir: string): void {
  const dir = resolve(targetDir);

  if (existsSync(dir) && readdirSync(dir).length > 0) {
    throw new Error(
      `Target directory "${targetDir}" already exists and is not empty. ` +
        `Choose a different directory or empty this one first.`,
    );
  }

  const name = basename(dir);
  const files = projectFiles(name);

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

function main(): void {
  const targetDir = process.argv[2] ?? "creact-app";
  try {
    scaffold(targetDir);
    console.log(nextSteps(targetDir));
  } catch (err) {
    console.error(errorMessage(err));
    process.exit(1);
  }
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === `file://${resolve(process.argv[1])}`;
if (isMain) {
  main();
}
