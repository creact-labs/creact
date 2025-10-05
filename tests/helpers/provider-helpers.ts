// Test helpers for creating mock providers

import { vi } from 'vitest';
import { DummyCloudProvider } from '@/providers/DummyCloudProvider';
import { DummyBackendProvider } from '@/providers/DummyBackendProvider';

/**
 * Create a mock cloud provider with console spies
 */
export function createMockCloudProvider() {
  const provider = new DummyCloudProvider();
  const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  
  return {
    provider,
    consoleSpy,
    cleanup: () => consoleSpy.mockRestore(),
  };
}

/**
 * Create a mock backend provider
 */
export function createMockBackendProvider() {
  const provider = new DummyBackendProvider();
  const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  
  return {
    provider,
    consoleSpy,
    cleanup: () => consoleSpy.mockRestore(),
  };
}

/**
 * Setup common provider test environment
 */
export function setupProviderTest() {
  const cloudProvider = new DummyCloudProvider();
  const backendProvider = new DummyBackendProvider();
  const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  
  const cleanup = () => {
    consoleDebugSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  };
  
  return {
    cloudProvider,
    backendProvider,
    consoleDebugSpy,
    consoleLogSpy,
    consoleErrorSpy,
    cleanup,
  };
}
