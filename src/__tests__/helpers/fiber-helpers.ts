// Test helpers for creating Fiber nodes

import { FiberNode } from '../../core/types';

/**
 * Create a mock Fiber node with sensible defaults
 */
export function createMockFiber(overrides: Partial<FiberNode> = {}): FiberNode {
  return {
    type: overrides.type || function MockComponent() {},
    props: overrides.props || {},
    children: overrides.children || [],
    path: overrides.path || ['mock-component'],
    cloudDOMNode: overrides.cloudDOMNode,
    ...overrides,
  };
}

/**
 * Create a Fiber tree with parent and children
 */
export function createFiberTree(
  parent: Partial<FiberNode>,
  children: Partial<FiberNode>[] = []
): FiberNode {
  const childFibers = children.map((child, index) =>
    createMockFiber({
      ...child,
      path: child.path || [...(parent.path || ['parent']), `child-${index}`],
    })
  );

  return createMockFiber({
    ...parent,
    children: childFibers,
  });
}

/**
 * Create a deep Fiber tree with specified depth
 */
export function createDeepFiberTree(depth: number, basePath: string[] = ['root']): FiberNode {
  if (depth === 0) {
    return createMockFiber({
      type: function Leaf() {},
      path: basePath,
    });
  }

  return createMockFiber({
    type: function Level() {},
    path: basePath,
    children: [createDeepFiberTree(depth - 1, [...basePath, `level-${depth}`])],
  });
}

/**
 * Create a Fiber tree with many siblings
 */
export function createWideFiberTree(siblingCount: number, basePath: string[] = ['parent']): FiberNode {
  const children = Array.from({ length: siblingCount }, (_, i) =>
    createMockFiber({
      type: function Child() {},
      path: [...basePath, `child-${i}`],
    })
  );

  return createMockFiber({
    type: function Parent() {},
    path: basePath,
    children,
  });
}
