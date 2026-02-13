import type {
  Memory,
  DeploymentState,
  AuditLogEntry,
} from "@creact-labs/creact";

/** No-op memory — getState always returns null, saveState is a no-op */
export class NoopMemory implements Memory {
  async getState(): Promise<null> {
    return null;
  }
  async saveState(): Promise<void> {}
}

/** In-memory memory for tests that need to inspect saved state */
export class InMemoryMemory implements Memory {
  private states = new Map<string, DeploymentState>();
  private auditLogs = new Map<string, AuditLogEntry[]>();
  private locks = new Map<string, { holder: string; expiry: number }>();

  async getState(stackName: string): Promise<DeploymentState | null> {
    return this.states.get(stackName) ?? null;
  }

  async saveState(stackName: string, state: DeploymentState): Promise<void> {
    this.states.set(stackName, structuredClone(state));
  }

  async acquireLock(
    stackName: string,
    holder: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const existing = this.locks.get(stackName);
    if (existing && existing.expiry > Date.now()) {
      return false;
    }
    this.locks.set(stackName, {
      holder,
      expiry: Date.now() + ttlSeconds * 1000,
    });
    return true;
  }

  async releaseLock(stackName: string): Promise<void> {
    this.locks.delete(stackName);
  }

  async appendAuditLog(
    stackName: string,
    entry: AuditLogEntry,
  ): Promise<void> {
    if (!this.auditLogs.has(stackName)) {
      this.auditLogs.set(stackName, []);
    }
    this.auditLogs.get(stackName)!.push(structuredClone(entry));
  }

  async getAuditLog(
    stackName: string,
    limit?: number,
  ): Promise<AuditLogEntry[]> {
    const logs = this.auditLogs.get(stackName) ?? [];
    return limit ? logs.slice(-limit) : logs;
  }

  clear(): void {
    this.states.clear();
    this.auditLogs.clear();
    this.locks.clear();
  }
}
