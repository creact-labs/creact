import * as esbuild from "esbuild-wasm";
import wasmURL from "esbuild-wasm/esbuild.wasm?url";

let ready: Promise<void> | undefined;

function init(): Promise<void> {
  if (!ready) ready = esbuild.initialize({ wasmURL });
  return ready;
}

// Transpile a CReact .tsx entry to runnable ESM: strip types, compile JSX
// against the CReact runtime, leave imports for Node to resolve from the
// mounted node_modules.
export async function compileTsx(source: string): Promise<string> {
  await init();
  const result = await esbuild.transform(source, {
    loader: "tsx",
    jsx: "automatic",
    jsxImportSource: "@creact-labs/creact",
    format: "esm",
    target: "esnext",
  });
  return result.code;
}
