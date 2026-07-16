import { vi } from "vitest";

export function createScriptedFetch(statuses: number[]) {
  let call = 0;
  return vi.fn(async () => {
    const status = statuses[Math.min(call, statuses.length - 1)];
    call += 1;
    if (status === 0) throw new Error("connection refused");
    return new Response("ok", { status });
  });
}
