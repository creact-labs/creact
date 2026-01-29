/**
 * InMemoryBackend - In-memory state storage for testing
 *
 * All state is stored in memory and lost when the process exits.
 * Useful for testing and development.
 */

import type { Backend, DeploymentState, AuditLogEntry } from '../../src/provider/backend.js';

export class InMemoryBackend implements Backend {
  private states = new Map<string, DeploymentState>();
  private locks = new Map<string, { holder: string; expiresAt: number }>();
  private auditLogs = new Map<string, AuditLogEntry[]>();

  async getState(stackName: string): Promise<DeploymentState | null> {
    const state = this.states.get(stackName);
    // Return deep clone to prevent accidental mutation
    return state ? JSON.parse(JSON.stringify(state)) : null;
  }

  async saveState(stackName: string, state: DeploymentState): Promise<void> {
    // Store deep clone to prevent external mutation
    this.states.set(stackName, JSON.parse(JSON.stringify(state)));
  }

  async acquireLock(stackName: string, holder: string, ttlSeconds: number): Promise<boolean> {
    const existing = this.locks.get(stackName);
    const now = Date.now();

    // Lock exists and not expired
    if (existing && existing.expiresAt > now && existing.holder !== holder) {
      return false;
    }

    // Acquire or renew lock
    this.locks.set(stackName, {
      holder,
      expiresAt: now + ttlSeconds * 1000,
    });

    return true;
  }

  async releaseLock(stackName: string): Promise<void> {
    this.locks.delete(stackName);
  }

  async appendAuditLog(stackName: string, entry: AuditLogEntry): Promise<void> {
    const logs = this.auditLogs.get(stackName) ?? [];
    logs.push(entry);
    this.auditLogs.set(stackName, logs);
  }

  async getAuditLog(stackName: string, limit?: number): Promise<AuditLogEntry[]> {
    const logs = this.auditLogs.get(stackName) ?? [];
    if (limit) {
      return logs.slice(-limit);
    }
    return [...logs];
  }

  /**
   * Clear all state (for testing)
   */
  clear(): void {
    this.states.clear();
    this.locks.clear();
    this.auditLogs.clear();
  }

  /**
   * Get all stack names (for debugging)
   */
  getStackNames(): string[] {
    return Array.from(this.states.keys());
  }

  /**
   * Check if a stack has state (for debugging)
   */
  hasState(stackName: string): boolean {
    return this.states.has(stackName);
  }
}
