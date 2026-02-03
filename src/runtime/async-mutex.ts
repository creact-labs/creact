/**
 * AsyncMutex - Simple async mutex for serializing concurrent operations
 *
 * Ensures only one async operation can hold the lock at a time.
 * Operations waiting for the lock are processed in FIFO order.
 */

export class AsyncMutex {
  private locked = false;
  private waitQueue: Array<() => void> = [];

  /**
   * Check if the mutex is currently locked
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Acquire the mutex lock
   * @returns A release function that must be called when done
   */
  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return this.createRelease();
    }

    // Wait in queue for lock to be released
    return new Promise<() => void>((resolve) => {
      this.waitQueue.push(() => {
        resolve(this.createRelease());
      });
    });
  }

  /**
   * Run a function exclusively with the mutex lock
   * Automatically acquires and releases the lock
   */
  async runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  private createRelease(): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;

      const next = this.waitQueue.shift();
      if (next) {
        // Hand off lock to next waiter
        next();
      } else {
        this.locked = false;
      }
    };
  }
}
