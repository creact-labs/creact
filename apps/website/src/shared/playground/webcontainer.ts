import { WebContainer } from "@webcontainer/api";

// One WebContainer per tab — booting twice throws. Callers await this.
let bootPromise: Promise<WebContainer> | undefined;

export function bootWebContainer(): Promise<WebContainer> {
  if (!bootPromise) bootPromise = WebContainer.boot();
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
