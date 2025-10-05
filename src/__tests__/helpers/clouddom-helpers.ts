// Test helpers for creating CloudDOM nodes

import { CloudDOMNode } from '../../providers/ICloudProvider';

/**
 * Create a mock CloudDOM node with sensible defaults
 */
export function createMockCloudDOM(overrides: Partial<CloudDOMNode> = {}): CloudDOMNode {
  return {
    id: overrides.id || 'mock-resource',
    path: overrides.path || ['mock-resource'],
    construct: overrides.construct || class MockConstruct {},
    props: overrides.props || {},
    children: overrides.children || [],
    outputs: overrides.outputs,
    ...overrides,
  };
}

/**
 * Create a CloudDOM tree with parent and children
 */
export function createCloudDOMTree(
  parent: Partial<CloudDOMNode>,
  children: Partial<CloudDOMNode>[] = []
): CloudDOMNode {
  const parentPath = parent.path || ['parent'];
  const parentId = parent.id || parentPath.join('.');

  const childNodes = children.map((child, index) => {
    const childPath = child.path || [...parentPath, `child-${index}`];
    const childId = child.id || childPath.join('.');

    return createMockCloudDOM({
      ...child,
      id: childId,
      path: childPath,
    });
  });

  return createMockCloudDOM({
    ...parent,
    id: parentId,
    path: parentPath,
    children: childNodes,
  });
}

/**
 * Create a deep CloudDOM tree with specified depth
 */
export function createDeepCloudDOMTree(depth: number, basePath: string[] = ['root']): CloudDOMNode {
  if (depth === 0) {
    return createMockCloudDOM({
      id: basePath.join('.'),
      path: basePath,
      construct: class Leaf {},
    });
  }

  const childPath = [...basePath, `level-${depth}`];
  return createMockCloudDOM({
    id: basePath.join('.'),
    path: basePath,
    construct: class Level {},
    children: [createDeepCloudDOMTree(depth - 1, childPath)],
  });
}

/**
 * Create a CloudDOM tree with many siblings
 */
export function createWideCloudDOMTree(
  siblingCount: number,
  basePath: string[] = ['parent']
): CloudDOMNode {
  const children = Array.from({ length: siblingCount }, (_, i) => {
    const childPath = [...basePath, `child-${i}`];
    return createMockCloudDOM({
      id: childPath.join('.'),
      path: childPath,
      construct: class Child {},
    });
  });

  return createMockCloudDOM({
    id: basePath.join('.'),
    path: basePath,
    construct: class Parent {},
    children,
  });
}
