// REQ-01: Naming system for resource ID generation
// This module provides utilities for generating resource IDs from Fiber paths

/**
 * Generate a resource ID from a Fiber path
 *
 * Converts a hierarchical path array into a dot-separated resource ID.
 * Each path segment is converted to kebab-case for consistency.
 *
 * Examples:
 * - ['registry', 'service'] → 'registry.service'
 * - ['Registry', 'ServiceAPI'] → 'registry.service-api'
 * - ['my-app', 'database'] → 'my-app.database'
 *
 * REQ-01: Resource ID generation from component hierarchy
 *
 * @param path - Hierarchical path segments
 * @returns Dot-separated resource ID
 */
export function generateResourceId(path: string[]): string {
  if (!path || path.length === 0) {
    throw new Error('Cannot generate resource ID from empty path');
  }

  // Convert each segment to kebab-case and join with dots
  return path.map((segment) => toKebabCase(segment)).join('.');
}

/**
 * Convert a string to kebab-case
 *
 * Handles various input formats:
 * - PascalCase: 'RegistryStack' → 'registry-stack'
 * - camelCase: 'serviceAPI' → 'service-api'
 * - snake_case: 'my_service' → 'my-service'
 * - spaces: 'My Service' → 'my-service'
 * - Already kebab: 'my-service' → 'my-service'
 *
 * REQ-01: Kebab-case formatting for multi-word names
 *
 * @param str - String to convert
 * @returns Kebab-case string
 */
export function toKebabCase(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return (
    str
      // Insert hyphen before uppercase letters (PascalCase/camelCase)
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      // Insert hyphen between letters and numbers
      .replace(/([a-zA-Z])(\d)/g, '$1-$2')
      .replace(/(\d)([a-zA-Z])/g, '$1-$2')
      // Convert to lowercase
      .toLowerCase()
      // Replace spaces, underscores, slashes, and backslashes with hyphens
      .replace(/[\s_\/\\]+/g, '-')
      // Remove multiple consecutive hyphens
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-|-$/g, '')
  );
}

/**
 * Generate a node name from component type, props, and key
 *
 * Priority order:
 * 1. Custom key prop (highest priority)
 * 2. Name prop
 * 3. Component function name or displayName
 * 4. Type string (for intrinsic elements)
 * 5. 'anonymous' (fallback)
 *
 * REQ-01: Support custom keys via key prop
 *
 * @param type - Component type (function, class, or string)
 * @param props - Component props
 * @param key - Optional key prop
 * @returns Node name in kebab-case
 */
export function getNodeName(
  type: any,
  props: Record<string, any> = {},
  key?: string | number
): string {
  // Priority 1: Use key if provided
  if (key !== undefined) {
    return toKebabCase(String(key));
  }

  // Priority 2: Use name prop if provided
  if (props && props.name) {
    return toKebabCase(props.name);
  }

  // Priority 3: Use component function name or displayName
  if (typeof type === 'function') {
    const name = type.displayName || type.name || 'anonymous';
    return toKebabCase(name);
  }

  // Priority 4: Use string type as-is (intrinsic elements)
  if (typeof type === 'string') {
    return toKebabCase(type);
  }

  // Priority 5: Handle Fragment (Symbol type)
  if (typeof type === 'symbol') {
    return 'fragment';
  }

  // Fallback
  return 'anonymous';
}

/**
 * Validate resource ID uniqueness within a scope
 *
 * Checks if a resource ID already exists in the given set.
 * Throws an error if duplicate is found.
 *
 * REQ-01: Ensure IDs are unique within scope
 *
 * @param id - Resource ID to validate
 * @param existingIds - Set of existing IDs in scope
 * @param componentStack - Component stack for error reporting
 * @throws Error if ID is not unique
 */
export function validateIdUniqueness(
  id: string,
  existingIds: Set<string>,
  componentStack: string[] = []
): void {
  if (existingIds.has(id)) {
    const stackTrace = componentStack.length > 0 ? `\n  in ${componentStack.join('\n  in ')}` : '';

    throw new Error(
      `Duplicate resource ID: '${id}'. ` +
      `Each resource must have a unique ID within its scope. ` +
      `Use the 'key' prop to differentiate components with the same name.${stackTrace}`
    );
  }
}

/**
 * Normalize a path segment for consistent resource addressing
 *
 * Applies full kebab-case conversion for consistency:
 * - Converts PascalCase/camelCase to kebab-case
 * - Handles underscores, spaces, numbers
 * - Trims whitespace
 * - Removes leading/trailing hyphens
 *
 * @param segment - Path segment to normalize
 * @returns Normalized segment in kebab-case
 */
export function normalizePathSegment(segment: string): string {
  if (!segment || typeof segment !== 'string') {
    return '';
  }

  // Use toKebabCase for full normalization
  return toKebabCase(segment);
}

/**
 * Normalize an entire path for consistent resource addressing
 *
 * Converts all path segments to kebab-case for consistency.
 *
 * @param path - Path segments to normalize
 * @returns Normalized path segments in kebab-case
 */
export function normalizePath(path: string[]): string[] {
  return path.map(normalizePathSegment).filter((segment) => segment.length > 0);
}

/**
 * Format a path for human-readable display
 *
 * Examples:
 * - ['registry', 'service'] → 'registry > service'
 * - ['app', 'database', 'table'] → 'app > database > table'
 *
 * @param path - Path segments
 * @returns Formatted path string
 */
export function formatPath(path: string[]): string {
  return path.join(' > ');
}

/**
 * Parse a resource ID back into path segments
 *
 * Inverse of generateResourceId.
 *
 * Examples:
 * - 'registry.service' → ['registry', 'service']
 * - 'app.database.table' → ['app', 'database', 'table']
 *
 * @param id - Resource ID
 * @returns Path segments
 */
export function parseResourceId(id: string): string[] {
  if (!id || typeof id !== 'string') {
    return [];
  }

  return id.split('.').filter((segment) => segment.length > 0);
}

/**
 * Generate a binding key for state-output binding tracking
 *
 * Creates a consistent key format for tracking bindings between
 * component state and provider outputs.
 *
 * Examples:
 * - ('registry.service', 'url') → 'registry.service.url'
 * - ('app.database', 'connectionString') → 'app.database.connection-string'
 *
 * @param nodeId - CloudDOM node ID
 * @param outputKey - Output key name
 * @returns Binding key
 */
export function generateBindingKey(nodeId: string, outputKey: string): string {
  if (!nodeId || !outputKey) {
    throw new Error('Cannot generate binding key from empty nodeId or outputKey');
  }

  // Normalize the output key to kebab-case for consistency
  const normalizedOutputKey = toKebabCase(outputKey);

  return `${nodeId}.${normalizedOutputKey}`;
}

/**
 * Parse a binding key back into nodeId and outputKey
 *
 * Inverse of generateBindingKey.
 *
 * Examples:
 * - 'registry.service.url' → { nodeId: 'registry.service', outputKey: 'url' }
 * - 'app.database.connection-string' → { nodeId: 'app.database', outputKey: 'connection-string' }
 *
 * @param bindingKey - Binding key
 * @returns Object with nodeId and outputKey
 */
export function parseBindingKey(bindingKey: string): { nodeId: string; outputKey: string } {
  if (!bindingKey || typeof bindingKey !== 'string') {
    throw new Error('Cannot parse empty binding key');
  }

  const parts = bindingKey.split('.');
  if (parts.length < 2) {
    throw new Error(`Invalid binding key format: ${bindingKey}`);
  }

  // The last part is the output key, everything else is the node ID
  const outputKey = parts.pop()!;
  const nodeId = parts.join('.');

  return { nodeId, outputKey };
}

/**
 * Generate a state output key for useState hooks
 *
 * REQ-3.1: Use 'state.' prefix to separate useState outputs from provider outputs
 *
 * Creates a namespaced key for useState outputs to prevent conflicts with
 * provider outputs. Uses 1-based indexing for consistency.
 *
 * Examples:
 * - generateStateOutputKey(0) → 'state.state1'
 * - generateStateOutputKey(1) → 'state.state2'
 * - generateStateOutputKey(2) → 'state.state3'
 *
 * @param hookIndex - Zero-based hook index
 * @returns State output key with 'state.' prefix
 */
export function generateStateOutputKey(hookIndex: number): string {
  if (hookIndex < 0 || !Number.isInteger(hookIndex)) {
    throw new Error(`Invalid hook index: ${hookIndex}. Must be a non-negative integer.`);
  }

  // Use 1-based indexing for user-friendly naming (state1, state2, state3)
  return `state.state${hookIndex + 1}`;
}

/**
 * Check if an output key is a state output (has 'state.' prefix)
 *
 * REQ-3.1: Identify useState outputs by their 'state.' prefix
 *
 * Examples:
 * - isStateOutputKey('state.state1') → true
 * - isStateOutputKey('state.state2') → true
 * - isStateOutputKey('connectionUrl') → false
 * - isStateOutputKey('vaultUrl') → false
 *
 * @param outputKey - Output key to check
 * @returns True if the key is a state output
 */
export function isStateOutputKey(outputKey: string): boolean {
  return typeof outputKey === 'string' && outputKey.startsWith('state.');
}

/**
 * Check if an output key is a provider output (no 'state.' prefix)
 *
 * REQ-3.1: Identify provider outputs by absence of 'state.' prefix
 *
 * Examples:
 * - isProviderOutputKey('connectionUrl') → true
 * - isProviderOutputKey('vaultUrl') → true
 * - isProviderOutputKey('state.state1') → false
 * - isProviderOutputKey('state.state2') → false
 *
 * @param outputKey - Output key to check
 * @returns True if the key is a provider output
 */
export function isProviderOutputKey(outputKey: string): boolean {
  return typeof outputKey === 'string' && !outputKey.startsWith('state.');
}

/**
 * Parse a state output key to extract the hook index
 *
 * Inverse of generateStateOutputKey.
 *
 * Examples:
 * - parseStateOutputKey('state.state1') → 0
 * - parseStateOutputKey('state.state2') → 1
 * - parseStateOutputKey('state.state3') → 2
 *
 * @param stateOutputKey - State output key
 * @returns Zero-based hook index
 * @throws Error if the key is not a valid state output key
 */
export function parseStateOutputKey(stateOutputKey: string): number {
  if (!isStateOutputKey(stateOutputKey)) {
    throw new Error(`Invalid state output key: ${stateOutputKey}. Must start with 'state.'`);
  }

  // Extract the numeric part after 'state.state'
  const match = stateOutputKey.match(/^state\.state(\d+)$/);
  if (!match) {
    throw new Error(`Invalid state output key format: ${stateOutputKey}. Expected format: 'state.state{N}'`);
  }

  // Convert from 1-based to 0-based indexing
  const hookIndex = parseInt(match[1], 10) - 1;
  
  if (hookIndex < 0) {
    throw new Error(`Invalid state output key: ${stateOutputKey}. Index must be positive.`);
  }

  return hookIndex;
}
