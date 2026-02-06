import pc from "picocolors";
import type { TypeCheckResult } from "./cli-typecheck.js";

const _origWrite = process.stdout.write.bind(process.stdout);
const _lines: string[] = [];
let _active = false;

process.on("exit", () => {
  _origWrite("\x1b[?25h");
});

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function render() {
  if (!_active) return;
  const rows = process.stdout.rows || 24;
  const cols = process.stdout.columns || 80;
  const innerW = cols - 4; // 2 borders + 2 inner padding
  const borderW = cols - 2; // inside the corners
  const contentRows = Math.max(1, rows - 2); // minus top + bottom border
  const visible = _lines.slice(-contentRows);

  let buf = "\x1b[H";
  buf += `${pc.dim(`╭${"─".repeat(borderW)}╮`)}\x1b[K\n`;
  for (let i = 0; i < contentRows; i++) {
    const line = i < visible.length ? visible[i]! : "";
    const vis = stripAnsi(line).length;
    const gap = Math.max(0, innerW - vis);
    buf += `${pc.dim("│")} ${line}${" ".repeat(gap)} ${pc.dim("│")}\x1b[K\n`;
  }
  buf += `${pc.dim(`╰${"─".repeat(borderW)}╯`)}\x1b[K`;

  _origWrite(buf);
}

function addLine(content: string) {
  _lines.push(content);
  render();
}

function addBlank() {
  addLine("");
}

function activate() {
  if (_active) return;
  _active = true;

  _origWrite("\x1b[?25l");
  _origWrite("\x1b[2J\x1b[H");

  // Intercept stdout so app output appears inside the frame
  process.stdout.write = ((
    chunk: any,
    encodingOrCb?: any,
    cb?: any,
  ): boolean => {
    if (typeof chunk === "string" && _active) {
      const parts = chunk.split("\n");
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]!;
        if (i === parts.length - 1 && part === "") continue;
        _lines.push(part);
      }
      render();
      const callback = typeof encodingOrCb === "function" ? encodingOrCb : cb;
      if (typeof callback === "function") callback();
      return true;
    }
    return _origWrite(chunk, encodingOrCb, cb);
  }) as any;

  process.stdout.on("resize", render);
  render();
}

// ── Public API ─────────────────────────────────────────

export function openFrame() {
  // noop — kept for API compat
}

export function closeFrame() {
  if (!_active) return;
  render();
  _active = false;
  process.stdout.write = _origWrite;
  process.stdout.removeListener("resize", render);
  _origWrite("\x1b[?25h");
  const rows = process.stdout.rows || 24;
  _origWrite(`\x1b[${rows};1H\n`);
}

export function banner(version: string) {
  activate();
  addLine(`${pc.bold(pc.cyan("creact"))} ${pc.green(`v${version}`)}`);
}

export function typeCheckPassed(fileCount: number, durationMs: number) {
  const secs = (durationMs / 1000).toFixed(1);
  addLine(
    `Type check passed ${pc.dim(`(${fileCount} file${fileCount === 1 ? "" : "s"}, ${secs}s)`)}`,
  );
  addBlank();
}

export function typeCheckFailed(result: TypeCheckResult) {
  const count = result.errors.length;
  _lines.push(pc.red(`${count} type error${count === 1 ? "" : "s"}`));
  _lines.push("");
  for (const err of result.errors) {
    const loc = pc.cyan(`${err.file}:${err.line}:${err.column}`);
    const code = pc.dim(`TS${err.code}`);
    const msgLines = err.message.split("\n");
    const firstLine = msgLines[0] ?? "";
    const prefix = `${code}: `;
    const contPad = " ".repeat(stripAnsi(prefix).length);
    _lines.push(`  ${loc}`);
    _lines.push(`  ${prefix}${firstLine}`);
    for (let i = 1; i < msgLines.length; i++) {
      _lines.push(`  ${contPad}${msgLines[i]}`);
    }
    _lines.push("");
  }
  render();
}

export function typeCheckSkipped(reason: string) {
  addLine(`Type check skipped ${pc.dim(`(${reason})`)}`);
  addBlank();
}

export function appStarted() {
  addBlank();
  addLine("App started");
}

export function appFailed(error: unknown) {
  _lines.push("");
  _lines.push(pc.red("App failed to start"));
  const rawStr =
    error instanceof Error && error.stack ? error.stack : String(error);
  for (const line of rawStr.split("\n")) {
    _lines.push(pc.dim(`  ${line}`));
  }
  render();
}

export function watching() {
  addLine(pc.dim("Watching for changes..."));
}

export function fileChanged(filename: string) {
  _lines.length = 0;
  addLine(`${pc.bold(filename)} changed`);
}

export function restarting() {
  addLine(pc.cyan("Restarting..."));
  addBlank();
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
  console.log(`  ${pc.red("Error:")} ${msg}`);
}
