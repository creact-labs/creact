// Test helper for cleaning up .creact directory
import * as fs from 'fs';
import * as path from 'path';

/**
 * Safely remove .creact directory with retry logic
 * Handles timing issues and file locks
 */
export function cleanupCreactDir(): void {
  const creactDir = '.creact';

  if (!fs.existsSync(creactDir)) {
    return;
  }

  try {
    // Try to remove with force flag
    fs.rmSync(creactDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  } catch (error) {
    // If that fails, try manual cleanup
    try {
      const files = fs.readdirSync(creactDir);
      for (const file of files) {
        const filePath = path.join(creactDir, file);
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          // Ignore individual file errors
        }
      }
      fs.rmdirSync(creactDir);
    } catch (e) {
      // If all else fails, just log and continue
      console.warn(`Could not clean up .creact directory: ${e}`);
    }
  }
}
