// Custom error classes for CReact
// Provides typed errors for better error handling and debugging

/**
 * Base error class for all CReact errors
 */
export class CReactError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'CReactError';
    
    // Maintain proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Validation error - thrown when CloudDOM validation fails
 * 
 * Used for:
 * - Circular dependencies
 * - Invalid node structure
 * - Schema validation failures
 */
export class ValidationError extends CReactError {
  constructor(message: string, public readonly details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/**
 * Reconciliation error - thrown when diff computation fails
 * 
 * Used for:
 * - Circular dependencies in dependency graph
 * - Invalid change detection
 */
export class ReconciliationError extends CReactError {
  constructor(message: string, public readonly details?: Record<string, any>) {
    super(message, 'RECONCILIATION_ERROR');
    this.name = 'ReconciliationError';
    
    // Maintain proper stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ReconciliationError);
    }
  }
}

/**
 * Deployment error - thrown when deployment fails
 * 
 * Used for:
 * - Provider failures
 * - Resource creation failures
 * - State persistence failures
 */
export class DeploymentError extends CReactError {
  constructor(message: string, public readonly details?: Record<string, any>) {
    super(message, 'DEPLOYMENT_ERROR');
    this.name = 'DeploymentError';
  }
}

/**
 * Provider error - thrown when provider operations fail
 * 
 * Used for:
 * - Provider initialization failures
 * - Materialization failures
 * - Backend state operations
 */
export class ProviderError extends CReactError {
  constructor(message: string, public readonly details?: Record<string, any>) {
    super(message, 'PROVIDER_ERROR');
    this.name = 'ProviderError';
  }
}
