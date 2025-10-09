/**
 * SQLite Backend Provider for Testing
 * 
 * Simple in-memory SQLite backend for integration tests
 */

import Database from 'better-sqlite3';
import { IBackendProvider, LockInfo } from '../../src/providers/IBackendProvider';

export class SQLiteBackendProvider implements IBackendProvider {
  private db: Database.Database;
  
  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initializeTables();
  }
  
  private initializeTables(): void {
    // State table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS state (
        stack_name TEXT PRIMARY KEY,
        state_data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    
    // Locks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS locks (
        stack_name TEXT PRIMARY KEY,
        holder TEXT NOT NULL,
        acquired_at INTEGER NOT NULL,
        ttl INTEGER NOT NULL
      )
    `);
    
    // Audit log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stack_name TEXT NOT NULL,
        entry_data TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
  }
  
  async getState(stackName: string): Promise<any | undefined> {
    const stmt = this.db.prepare('SELECT state_data FROM state WHERE stack_name = ?');
    const row = stmt.get(stackName) as { state_data: string } | undefined;
    
    if (!row) {
      return undefined;
    }
    
    try {
      return JSON.parse(row.state_data);
    } catch (error) {
      console.error(`[SQLiteBackend] Failed to parse state for ${stackName}:`, error);
      return undefined;
    }
  }
  
  async saveState(stackName: string, state: any): Promise<void> {
    const stateData = JSON.stringify(state);
    const updatedAt = Date.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO state (stack_name, state_data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(stack_name) DO UPDATE SET
        state_data = excluded.state_data,
        updated_at = excluded.updated_at
    `);
    
    stmt.run(stackName, stateData, updatedAt);
  }
  
  async acquireLock(stackName: string, holder: string, ttl: number): Promise<void> {
    // Check for existing lock
    const existingLock = await this.checkLock(stackName);
    
    if (existingLock) {
      const now = Date.now();
      const lockAge = now - existingLock.acquiredAt;
      const ttlMs = existingLock.ttl * 1000;
      
      if (lockAge < ttlMs) {
        throw new Error(
          `Lock already held by ${existingLock.holder} ` +
          `(acquired ${Math.floor(lockAge / 1000)}s ago, TTL: ${existingLock.ttl}s)`
        );
      }
      
      // Lock expired, remove it
      await this.releaseLock(stackName);
    }
    
    // Acquire new lock
    const acquiredAt = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO locks (stack_name, holder, acquired_at, ttl)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(stackName, holder, acquiredAt, ttl);
  }
  
  async releaseLock(stackName: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM locks WHERE stack_name = ?');
    stmt.run(stackName);
  }
  
  async checkLock(stackName: string): Promise<LockInfo | null> {
    const stmt = this.db.prepare('SELECT holder, acquired_at, ttl FROM locks WHERE stack_name = ?');
    const row = stmt.get(stackName) as { holder: string; acquired_at: number; ttl: number } | undefined;
    
    if (!row) {
      return null;
    }
    
    return {
      holder: row.holder,
      acquiredAt: row.acquired_at,
      ttl: row.ttl,
    };
  }
  
  async appendAuditLog(stackName: string, entry: any): Promise<void> {
    const entryData = JSON.stringify(entry);
    const createdAt = Date.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO audit_log (stack_name, entry_data, created_at)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(stackName, entryData, createdAt);
  }
  
  /**
   * Get audit log entries for a stack
   */
  async getAuditLog(stackName: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT entry_data, created_at
      FROM audit_log
      WHERE stack_name = ?
      ORDER BY created_at DESC
    `);
    
    const rows = stmt.all(stackName) as Array<{ entry_data: string; created_at: number }>;
    
    return rows.map(row => ({
      ...JSON.parse(row.entry_data),
      timestamp: row.created_at,
    }));
  }
  
  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.db.exec('DELETE FROM state');
    this.db.exec('DELETE FROM locks');
    this.db.exec('DELETE FROM audit_log');
  }
  
  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}
