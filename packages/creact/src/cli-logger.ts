import ora, { type Ora } from "ora";
import pc from "picocolors";
import type { TypeCheckResult } from "./cli-typecheck.js";

// ── Semantic theme (mirrors React's scripts/release/theme.js) ────

const theme = {
  error: (s: string) => pc.bold(pc.red(s)),
  success: (s: string) => pc.green(s),
  warning: (s: string) => pc.yellow(s),
  info: (s: string) => pc.cyan(s),
  dimmed: (s: string) => pc.dim(s),
  path: (s: string) => pc.italic(pc.dim(s)),
  command: (s: string) => pc.dim(s),
  version: (s: string) => pc.green(s),
  header: (s: string) => pc.bold(pc.green(s)),
};

// ── Spinner state ────────────────────────────────────────────────

let spinner: Ora | null = null;

function stopSpinner() {
  if (spinner) {
    spinner.stop();
    spinner = null;
  }
}

/** Stop any active spinner — exported so the SIGINT handler can call it */
export { stopSpinner };

// ── Public API ───────────────────────────────────────────────────

export function banner(version: string) {
  console.log();
  console.log(
    `  ${pc.bold(pc.cyan("creact"))} ${theme.version(`v${version}`)}`,
  );
  console.log();
}

export function typeCheckStart() {
  spinner = ora({ text: "Type checking…", indent: 2, discardStdin: false }).start();
}

export function typeCheckPassed(fileCount: number, durationMs: number) {
  const secs = (durationMs / 1000).toFixed(1);
  const detail = theme.dimmed(
    `(${fileCount} file${fileCount === 1 ? "" : "s"}, ${secs}s)`,
  );
  if (spinner) {
    spinner.succeed(`Type check passed ${detail}`);
    spinner = null;
  } else {
    console.log(`  ${theme.success("✔")} Type check passed ${detail}`);
  }
}

export function typeCheckFailed(result: TypeCheckResult) {
  const count = result.errors.length;
  const label = `${count} type error${count === 1 ? "" : "s"}`;

  if (spinner) {
    spinner.fail(label);
    spinner = null;
  } else {
    console.log(`  ${theme.error("✖")} ${theme.error(label)}`);
  }

  console.log();

  for (const err of result.errors) {
    const loc = theme.info(`${err.file}:${err.line}:${err.column}`);
    const code = theme.dimmed(`TS${err.code}`);
    const msgLines = err.message.split("\n");
    const firstLine = msgLines[0] ?? "";
    const prefix = `${code}: `;
    const contPad = " ".repeat(stripAnsi(prefix).length);

    console.log(`  ${loc}`);
    console.log(`  ${prefix}${firstLine}`);
    for (let i = 1; i < msgLines.length; i++) {
      console.log(`  ${contPad}${msgLines[i]}`);
    }
    console.log();
  }
}

export function typeCheckSkipped(reason: string) {
  if (spinner) {
    spinner.info(`Type check skipped ${theme.dimmed(`(${reason})`)}`);
    spinner = null;
  } else {
    console.log(
      `  ${theme.info("ℹ")} Type check skipped ${theme.dimmed(`(${reason})`)}`,
    );
  }
}

export function appStarting() {
  spinner = ora({ text: "Starting app…", indent: 2, discardStdin: false }).start();
}

export function appStarted() {
  if (spinner) {
    spinner.succeed("App started");
    spinner = null;
  } else {
    console.log(`  ${theme.success("✔")} App started`);
  }
}

export function appFailed(error: unknown) {
  // Separate message from stack trace (React pattern)
  const message =
    error instanceof Error
      ? error.message.trim().replace(/\n +/g, "\n")
      : String(error);
  const stack =
    error instanceof Error && error.stack
      ? error.stack.replace(error.message, "").trim()
      : "";

  if (spinner) {
    spinner.fail("App failed to start");
    spinner = null;
  } else {
    console.log(`  ${theme.error("✖")} ${theme.error("App failed to start")}`);
  }

  console.log();
  console.log(`  ${theme.error(message)}`);
  if (stack) {
    console.log();
    for (const line of stack.split("\n")) {
      console.log(`  ${theme.path(line)}`);
    }
  }
  console.log();
}

export function watching() {
  console.log(`  ${theme.dimmed("Watching for changes…")}`);
}

export function fileChanged(filename: string) {
  console.clear();
  console.log();
  console.log(`  ${pc.bold(filename)} changed`);
  console.log();
}

export function restarting() {
  spinner = ora({ text: "Restarting…", indent: 2, discardStdin: false }).start();
}

export function help() {
  const PAD = "  ";
  console.log(`
${PAD}${pc.bold(pc.cyan("creact"))} - Run a CReact application

${PAD}${pc.bold("Usage:")}
${PAD}  creact <entrypoint>           Run a CReact application
${PAD}  creact --watch <entrypoint>   Run with hot reload on file changes
${PAD}  creact -w <entrypoint>        Short form of --watch
${PAD}  creact --help                 Show this help message

${PAD}${pc.bold("Examples:")}
${PAD}  creact ./app.tsx              Run app.tsx
${PAD}  creact -w ./app.tsx           Run with hot reload
${PAD}  creact --watch src/index.tsx  Run src/index.tsx with hot reload

${PAD}${pc.bold("Entrypoint:")}
${PAD}  The entrypoint file should configure your memory provider
${PAD}  and export a default async function that calls render().
`);
}

export function error(msg: string) {
  stopSpinner();
  console.log(`  ${theme.error("Error:")} ${msg}`);
}

// ── Helpers ──────────────────────────────────────────────────────

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}
