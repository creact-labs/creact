import {
  render,
  type Memory,
  type RenderOptions,
  type RenderResult,
} from "@creact-labs/creact";
import { NoopMemory } from "./memory";

interface TestRenderOptions extends RenderOptions {
  memory?: Memory;
  id?: string;
}

export function renderTest(
  fn: () => any,
  options?: TestRenderOptions,
): RenderResult {
  const memory = options?.memory ?? new NoopMemory();
  const id = options?.id ?? "test";
  return render(fn, memory, id, options);
}
