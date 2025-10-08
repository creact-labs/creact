// Custom error classes for CReact
// Provides typed errors for better error handling and debugging

/**
 * Base error class for all CReact errors
 */
export class CReactError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
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
  constructor(
    message: string,
    public readonly details?: Record<string, any>
  ) {
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
  constructor(
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(message, 'RECONCILIATION_ERROR');
    this.name = 'ReconciliationError';

    // Maintain proper stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ReconciliationError);
    }
  }
}

/**
 * Deployment error data structure
 *
 * Provides structured error information for audit logs and debugging.
 */
export interface DeploymentErrorData {
  /** Error code for categorization */
  code?: string;

  /** Error message */
  message: string;

  /** Stack trace */
  stack?: string;

  /** Root cause description */
  cause?: string;

  /** Additional context */
  details?: Record<string, any>;
}

/**
 * Deployment error - thrown when deployment fails
 *
 * Used for:
 * - Provider failures
 * - Resource creation failures
 * - State persistence failures
 * - State machine transition errors
 *
 * Provides structured error data for audit logs and telemetry.
 */
export class DeploymentError extends CReactError {
  constructor(
    message: string,
    public readonly data: DeploymentErrorData = { message }
  ) {
    super(message, data.code || 'DEPLOYMENT_ERROR');
    this.name = 'DeploymentError';

    // Ensure message is in data
    if (!this.data.message) {
      this.data.message = message;
    }

    // Maintain proper stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DeploymentError);
    }
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
  constructor(
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(message, 'PROVIDER_ERROR');
    this.name = 'ProviderError';
  }
}

/**
 * Reactive system error - thrown when reactive operations fail
 *
 * Used for:
 * - Re-render failures
 * - Circular dependency detection
 * - State update failures
 * - Context propagation failures
 */
export class ReactiveError extends CReactError {
  constructor(
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(message, 'REACTIVE_ERROR');
    this.name = 'ReactiveError';
  }
}

/**
 * Circular dependency error - thrown when circular dependencies are detected
 */
export class CircularDependencyError extends ReactiveError {
  constructor(
    message: string,
    public readonly cyclePath: string[],
    public readonly details?: Record<string, any>
  ) {
    super(message, { ...details, cyclePath });
    this.name = 'CircularDependencyError';
  }
}

/**
 * Re-render error - thrown when component re-rendering fails
 */
export class ReRenderError extends ReactiveError {
  constructor(
    message: string,
    public readonly fiberPath: string[],
    public readonly cause?: Error,
    public readonly details?: Record<string, any>
  ) {
    super(message, { ...details, fiberPath, cause: cause?.message });
    this.name = 'ReRenderError';
  }
}

/**
 * State update error - thrown when state updates fail
 */
export class StateUpdateError extends ReactiveError {
  constructor(
    message: string,
    public readonly fiberPath: string[],
    public readonly hookIndex: number,
    public readonly cause?: Error,
    public readonly details?: Record<string, any>
  ) {
    super(message, { ...details, fiberPath, hookIndex, cause: cause?.message });
    this.name = 'StateUpdateError';
  }
}

/**
 * Context propagation error - thrown when context updates fail
 */
export class ContextPropagationError extends ReactiveError {
  constructor(
    message: string,
    public readonly contextId: symbol,
    public readonly affectedFibers: string[][],
    public readonly cause?: Error,
    public readonly details?: Record<string, any>
  ) {
    super(message, { ...details, contextId: contextId.toString(), affectedFibers, cause: cause?.message });
    this.name = 'ContextPropagationError';
  }
}
