import { WebContainer } from "@webcontainer/api";

// One WebContainer per tab — booting twice throws. Callers await this.
let bootPromise: Promise<WebContainer> | undefined;

// WebContainers need SharedArrayBuffer, which requires the document to be
// cross-origin isolated (COOP + COEP). Vite sets those headers locally and the
// coi-serviceworker covers static hosting; if a proxy strips them the boot
// would fail with a cryptic error, so surface a clear one instead.
function isolationError(): Error | undefined {
  if (typeof crossOriginIsolated !== "undefined" && !crossOriginIsolated) {
    return new Error(
      "This page is not cross-origin isolated, so the Node runtime cannot start. Reload the page; if it persists, the host is stripping the COOP/COEP headers.",
    );
  }
  return undefined;
}

export function bootWebContainer(): Promise<WebContainer> {
  if (!bootPromise) {
    const blocked = isolationError();
    if (blocked) return Promise.reject(blocked);
    bootPromise = WebContainer.boot();
  }
  return bootPromise;
}

// Pipe a process's combined stdout/stderr to a sink (the terminal).
export function pipeOutput(
  stream: ReadableStream<string>,
  write: (chunk: string) => void,
): void {
  void stream.pipeTo(
    new WritableStream({
      write(chunk) {
        write(chunk);
      },
    }),
  );
}
