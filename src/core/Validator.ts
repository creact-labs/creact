
/**

 * Licensed under the Apache License, Version 2.0 (the "License");

 * you may not use this file except in compliance with the License.

 * You may obtain a copy of the License at

 *

 *     http://www.apache.org/licenses/LICENSE-2.0

 *

 * Unless required by applicable law or agreed to in writing, software

 * distributed under the License is distributed on an "AS IS" BASIS,

 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

 * See the License for the specific language governing permissions and

 * limitations under the License.

 *

 * Copyright 2025 Daniel Coutinho Ribeiro

 */

// REQ-07: Validator - Fiber tree validation

import { FiberNode } from './types';
import { LoggerFactory } from '../utils/Logger';

const logger = LoggerFactory.getLogger('validator');

/**
 * Validation error with component stack trace
 * REQ-NF-03.1: Enhanced error messages with file and line trace
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public componentStack: string[],
    public filePath?: string,
    public lineNumber?: number
  ) {
    super(message);
    this.name = 'ValidationError';

    // Enhance error message with stack trace
    this.message = this.formatError(message, componentStack, filePath, lineNumber);
  }

  /**
   * Get a quick summary of the error for dev tools
   * REQ-NF-03.1: Enhanced error messages
   */
  get summary(): string {
    return `${this.message.split('\n')[0]} (${this.filePath || 'unknown'})`;
  }

  private formatError(
    message: string,
    componentStack: string[],
    filePath?: string,
    lineNumber?: number
  ): string {
    let formatted = message;

    // Add file location if available
    if (filePath) {
      formatted += `\n  at ${filePath}`;
      if (lineNumber) {
        formatted += `:${lineNumber}`;
      }
    }

    // Add component stack trace
    if (componentStack.length > 0) {
      formatted += '\n\nComponent stack:';
      componentStack.forEach((component, index) => {
        const indent = '  '.repeat(index + 1);
        formatted += `\n${indent}in ${component}`;
      });
    }

    return formatted;
  }
}

/**
 * Validator validates Fiber tree before committing to CloudDOM
 *
 * Validation checks:
 * - Required props are present
 * - Context is available when useStackContext is called
 * - Resource IDs are unique
 * - No circular dependencies
 *
 * No dependencies injected - pure validation logic
 */
export class Validator {
  /**
   * Validate a Fiber tree
   *
   * @param fiber - Root Fiber node to validate
   * @throws ValidationError if validation fails
   */
  validate(fiber: FiberNode | null): void {
    if (!fiber) {
      throw new Error('Cannot validate null Fiber tree');
    }

    // Track resource IDs for uniqueness check
    const resourceIds = new Set<string>();

    // Track visited nodes for circular dependency check
    const visitedPaths = new Set<string>();

    // Validate recursively
    this.validateNode(fiber, [], resourceIds, visitedPaths);
  }

  /**
   * Validate a single Fiber node and its children
   *
   * @param node - Fiber node to validate
   * @param componentStack - Stack of component names for error reporting
   * @param resourceIds - Set of resource IDs seen so far
   * @param visitedPaths - Set of visited paths for circular dependency detection
   */
  private validateNode(
    node: FiberNode,
    componentStack: string[],
    resourceIds: Set<string>,
    visitedPaths: Set<string>
  ): void {
    // Defensive: Handle corrupted nodes
    if (!node) {
      return;
    }

    // Get component name for stack trace
    const componentName = this.getComponentName(node);
    const currentStack = [...componentStack, componentName];

    // Optional debug trace for development introspection
    const pathStr = node.path ? node.path.join('.') : 'unknown';
    logger.debug('Validating', pathStr);

    // REQ-07.4: Circular dependency detection
    const pathKey = node.path ? node.path.join('.') : '';
    if (pathKey && visitedPaths.has(pathKey)) {
      throw new ValidationError(
        `Circular dependency detected: ${pathKey}`,
        currentStack,
        this.getFilePath(node),
        this.getLineNumber(node)
      );
    }
    if (pathKey) {
      visitedPaths.add(pathKey);
    }

    // REQ-07.1: Required props validation
    this.validateRequiredProps(node, currentStack);

    // REQ-07.3: Unique resource IDs - check cloudDOMNodes array
    if (node.cloudDOMNodes && node.cloudDOMNodes.length > 0) {
      for (const cloudNode of node.cloudDOMNodes) {
        const resourceId = cloudNode.id;
        if (resourceIds.has(resourceId)) {
          throw new ValidationError(
            `Duplicate resource ID: '${resourceId}'. Resource IDs must be unique.`,
            currentStack,
            this.getFilePath(node),
            this.getLineNumber(node)
          );
        }
        resourceIds.add(resourceId);
      }
    }

    // REQ-07.2: Context validation
    // Note: This will be implemented when hooks are added
    // For now, we check if the node has a marker indicating context usage
    if (node.props && node.props.__usesStackContext) {
      this.validateContextAvailable(node, currentStack);
    }

    // Recursively validate children
    // Clone visitedPaths for each child to ensure isolation per branch
    // This prevents false circular dependency warnings for sibling nodes
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.validateNode(child, currentStack, resourceIds, new Set(visitedPaths));
      }
    }
  }

  /**
   * Validate that required props are present
   * REQ-07.1: Required props validation
   *
   * @param node - Fiber node to validate
   * @param componentStack - Component stack for error reporting
   */
  private validateRequiredProps(node: FiberNode, componentStack: string[]): void {
    // Get required props from component type
    const requiredProps = this.getRequiredProps(node.type);

    // Check each required prop
    for (const propName of requiredProps) {
      if (!(propName in node.props) || node.props[propName] === undefined) {
        const componentName = this.getComponentName(node);
        throw new ValidationError(
          `Missing required prop '${propName}' in ${componentName} component`,
          componentStack,
          this.getFilePath(node),
          this.getLineNumber(node)
        );
      }
    }
  }

  /**
   * Validate that context is available when useStackContext is called
   * REQ-07.2: Context validation
   *
   * @param node - Fiber node that uses context
   * @param componentStack - Component stack for error reporting
   */
  private validateContextAvailable(node: FiberNode, componentStack: string[]): void {
    // Note: In a real implementation, we would traverse the parent chain
    // For now, we check if there's a provider marker in the tree
    // This will be properly implemented when StackContext is added

    // Check if any ancestor has a provider
    // (This is a simplified check - full implementation will traverse parent references)
    if (node.props.__hasContextProvider === false) {
      const componentName = this.getComponentName(node);
      throw new ValidationError(
        `useStackContext() called in ${componentName} but no StackContext.Provider found in ancestor tree`,
        componentStack,
        this.getFilePath(node),
        this.getLineNumber(node)
      );
    }
  }

  /**
   * Get required props for a component type
   *
   * Checks for:
   * - Static requiredProps property
   * - PropTypes (if available)
   * - TypeScript metadata (future enhancement)
   *
   * @param type - Component type
   * @returns Array of required prop names
   */
  private getRequiredProps(type: any): string[] {
    // Check for static requiredProps property
    if (type && type.requiredProps && Array.isArray(type.requiredProps)) {
      return type.requiredProps;
    }

    // Check for PropTypes (React-style)
    if (type && type.propTypes) {
      const required: string[] = [];
      for (const [propName, propType] of Object.entries(type.propTypes)) {
        // Check if prop is marked as required
        if (propType && typeof propType === 'object' && (propType as any).isRequired) {
          required.push(propName);
        }
      }
      return required;
    }

    // No required props found
    return [];
  }

  /**
   * Get component name for error reporting
   *
   * @param node - Fiber node
   * @returns Component name
   */
  private getComponentName(node: FiberNode): string {
    if (typeof node.type === 'function') {
      return node.type.displayName || node.type.name || 'Anonymous';
    }
    if (typeof node.type === 'string') {
      return node.type;
    }
    return 'Unknown';
  }

  /**
   * Get file path from Fiber node (if available)
   *
   * In a real implementation, this would use source maps or
   * stack trace analysis to determine the file path.
   *
   * @param node - Fiber node
   * @returns File path or undefined
   */
  private getFilePath(node: FiberNode): string | undefined {
    // Check if component has __source metadata (added by Babel/TypeScript)
    if (node.type && node.type.__source) {
      return node.type.__source.fileName;
    }

    // Check props for source metadata
    if (node.props && node.props.__source) {
      return node.props.__source.fileName;
    }

    return undefined;
  }

  /**
   * Get line number from Fiber node (if available)
   *
   * @param node - Fiber node
   * @returns Line number or undefined
   */
  private getLineNumber(node: FiberNode): number | undefined {
    // Check if component has __source metadata
    if (node.type && node.type.__source) {
      return node.type.__source.lineNumber;
    }

    // Check props for source metadata
    if (node.props && node.props.__source) {
      return node.props.__source.lineNumber;
    }

    return undefined;
  }
}
