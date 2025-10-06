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
  return path.map(segment => toKebabCase(segment)).join('.');
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
  
  return str
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
    .replace(/^-|-$/g, '');
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
  key?: string
): string {
  // Priority 1: Use key if provided
  if (key) {
    return toKebabCase(key);
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
    const stackTrace = componentStack.length > 0
      ? `\n  in ${componentStack.join('\n  in ')}`
      : '';
    
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
  return path.map(normalizePathSegment).filter(segment => segment.length > 0);
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
  
  return id.split('.').filter(segment => segment.length > 0);
}
