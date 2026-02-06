import { createRequire } from "node:module";
import { dirname, relative, resolve } from "node:path";
import type ts from "typescript";

export interface TypeDiagnostic {
  file: string;
  line: number;
  column: number;
  code: number;
  message: string;
}

export interface TypeCheckResult {
  ok: boolean;
  fileCount: number;
  errors: TypeDiagnostic[];
  durationMs: number;
}

export function loadTypeScript(cwd: string): typeof ts | null {
  try {
    const req = createRequire(resolve(cwd, "noop.js"));
    return req("typescript");
  } catch {
    return null;
  }
}

export function typeCheck(
  typescript: typeof ts,
  entrypoint: string,
  cwd: string,
): TypeCheckResult {
  const start = performance.now();

  const configPath = typescript.findConfigFile(
    dirname(entrypoint),
    typescript.sys.fileExists,
    "tsconfig.json",
  );

  let options: ts.CompilerOptions = { noEmit: true };
  if (configPath) {
    const configFile = typescript.readConfigFile(
      configPath,
      typescript.sys.readFile,
    );
    if (!configFile.error) {
      const parsed = typescript.parseJsonConfigFileContent(
        configFile.config,
        typescript.sys,
        dirname(configPath),
      );
      options = { ...parsed.options, noEmit: true };
    }
  }

  const program = typescript.createProgram([entrypoint], options);
  const diagnostics = typescript.getPreEmitDiagnostics(program);
  const sourceFiles = program
    .getSourceFiles()
    .filter((sf) => !sf.fileName.includes("node_modules"));

  const errors: TypeDiagnostic[] = [];
  for (const d of diagnostics) {
    if (d.file && d.start != null) {
      const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
      errors.push({
        file: relative(cwd, d.file.fileName),
        line: line + 1,
        column: character + 1,
        code: d.code,
        message: typescript.flattenDiagnosticMessageText(d.messageText, "\n"),
      });
    }
  }

  return {
    ok: errors.length === 0,
    fileCount: sourceFiles.length,
    errors,
    durationMs: performance.now() - start,
  };
}
