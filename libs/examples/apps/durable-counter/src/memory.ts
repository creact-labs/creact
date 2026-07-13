/**
 * FileMemory sample from the state-and-memory page — the tutorial project's
 * persistence backend, saving deployment state as JSON files on disk.
 */
// #region file-memory
import type { DeploymentState, Memory } from "@creact-labs/creact";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

export class FileMemory implements Memory {
  constructor(private dir: string) {}

  async getState(stackName: string): Promise<DeploymentState | null> {
    try {
      const data = await readFile(join(this.dir, `${stackName}.json`), "utf-8");
      return JSON.parse(data);
    } catch {
      return null; // First run, no state yet
    }
  }

  async saveState(stackName: string, state: DeploymentState): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(
      join(this.dir, `${stackName}.json`),
      JSON.stringify(state, null, 2),
    );
  }
}
// #endregion file-memory
