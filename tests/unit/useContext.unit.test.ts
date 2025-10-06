// REQ-02: Unit tests for useContext
// Verify context consumption and Provider lookup

import { describe, it, expect, beforeEach } from 'vitest';
import { createContext } from '../../src/context/createContext';
import {
  useContext,
  setContextRenderContext,
  clearContextRenderContext,
  pushContextValue,
  popContextValue,
} from '../../src/hooks/useContext';
import { FiberNode } from '../../src/core/types';

describe('useContext', () => {
  beforeEach(() => {
    // Clear context before each test
    clearContextRenderContext();
  });

  describe('Error Handling', () => {
    it('should throw error when called outside rendering', () => {
      const TestContext = createContext<string>();

      expect(() => {
        useContext(TestContext);
      }).toThrow('useContext must be called during component rendering');
    });

    it('should throw error when no Provider and no default value', () => {
      const TestContext = createContext<string>();

      // Create minimal fiber tree
      const rootFiber: FiberNode = {
        type: 'Root',
        props: {},
        children: [],
        path: ['root'],
      };

      setContextRenderContext(rootFiber);

      expect(() => {
        useContext(TestContext);
      }).toThrow('useContext called without a Provider');

      clearContextRenderContext();
    });
  });

  describe('Default Values', () => {
    it('should return default value when no Provider exists', () => {
      const defaultValue = 'default-value';
      const TestContext = createContext(defaultValue);

      // Create minimal fiber tree
      const rootFiber: FiberNode = {
        type: 'Root',
        props: {},
        children: [],
        path: ['root'],
      };

      setContextRenderContext(rootFiber);

      const value = useContext(TestContext);
      expect(value).toBe(defaultValue);

      clearContextRenderContext();
    });

    it('should return default value for nested component without Provider', () => {
      const defaultValue = { foo: 'bar' };
      const TestContext = createContext(defaultValue);

      // Create fiber tree with nested components
      const childFiber: FiberNode = {
        type: 'Child',
        props: {},
        children: [],
        path: ['root', 'child'],
      };

      const rootFiber: FiberNode = {
        type: 'Root',
        props: {},
        children: [childFiber],
        path: ['root'],
      };

      setContextRenderContext(childFiber);

      const value = useContext(TestContext);
      expect(value).toEqual(defaultValue);

      clearContextRenderContext();
    });
  });

  describe('Provider Lookup', () => {
    it('should find value from direct parent Provider', () => {
      const TestContext = createContext<string>();
      const providerValue = 'provider-value';

      // Create Provider fiber
      const Provider = TestContext.Provider;
      (Provider as any)._isContextProvider = true;
      (Provider as any)._contextId = TestContext._contextId;

      const childFiber: FiberNode = {
        type: 'Child',
        props: {},
        children: [],
        path: ['root', 'provider', 'child'],
      };

      const providerFiber: FiberNode = {
        type: Provider,
        props: {
          value: providerValue,
          _contextId: TestContext._contextId,
          _contextValue: providerValue,
        },
        children: [childFiber],
        path: ['root', 'provider'],
      };

      const rootFiber: FiberNode = {
        type: 'Root',
        props: {},
        children: [providerFiber],
        path: ['root'],
      };

      // Manually push context value to simulate Renderer behavior
      pushContextValue(TestContext._contextId, providerValue);
      setContextRenderContext(childFiber);

      const value = useContext(TestContext);
      expect(value).toBe(providerValue);

      clearContextRenderContext();
      popContextValue(TestContext._contextId);
    });

    it('should find value from ancestor Provider (depth-first traversal)', () => {
      const TestContext = createContext<string>();
      const providerValue = 'ancestor-value';

      // Create Provider fiber
      const Provider = TestContext.Provider;
      (Provider as any)._isContextProvider = true;
      (Provider as any)._contextId = TestContext._contextId;

      const grandchildFiber: FiberNode = {
        type: 'Grandchild',
        props: {},
        children: [],
        path: ['root', 'provider', 'child', 'grandchild'],
      };

      const childFiber: FiberNode = {
        type: 'Child',
        props: {},
        children: [grandchildFiber],
        path: ['root', 'provider', 'child'],
      };

      const providerFiber: FiberNode = {
        type: Provider,
        props: {
          value: providerValue,
          _contextId: TestContext._contextId,
          _contextValue: providerValue,
        },
        children: [childFiber],
        path: ['root', 'provider'],
      };

      const rootFiber: FiberNode = {
        type: 'Root',
        props: {},
        children: [providerFiber],
        path: ['root'],
      };

      // Manually push context value to simulate Renderer behavior
      pushContextValue(TestContext._contextId, providerValue);
      setContextRenderContext(grandchildFiber);

      const value = useContext(TestContext);
      expect(value).toBe(providerValue);

      clearContextRenderContext();
      popContextValue(TestContext._contextId);
    });

    it('should find nearest Provider when multiple exist', () => {
      const TestContext = createContext<string>();
      const outerValue = 'outer-value';
      const innerValue = 'inner-value';

      // Create Provider fiber
      const Provider = TestContext.Provider;
      (Provider as any)._isContextProvider = true;
      (Provider as any)._contextId = TestContext._contextId;

      const childFiber: FiberNode = {
        type: 'Child',
        props: {},
        children: [],
        path: ['root', 'outer', 'inner', 'child'],
      };

      const innerProviderFiber: FiberNode = {
        type: Provider,
        props: {
          value: innerValue,
          _contextId: TestContext._contextId,
          _contextValue: innerValue,
        },
        children: [childFiber],
        path: ['root', 'outer', 'inner'],
      };

      const outerProviderFiber: FiberNode = {
        type: Provider,
        props: {
          value: outerValue,
          _contextId: TestContext._contextId,
          _contextValue: outerValue,
        },
        children: [innerProviderFiber],
        path: ['root', 'outer'],
      };

      const rootFiber: FiberNode = {
        type: 'Root',
        props: {},
        children: [outerProviderFiber],
        path: ['root'],
      };

      // Manually push context values to simulate Renderer behavior (outer then inner)
      pushContextValue(TestContext._contextId, outerValue);
      pushContextValue(TestContext._contextId, innerValue);
      setContextRenderContext(childFiber);

      const value = useContext(TestContext);
      expect(value).toBe(innerValue); // Should use nearest (inner) Provider

      clearContextRenderContext();
      popContextValue(TestContext._contextId);
      popContextValue(TestContext._contextId);
    });
  });

  describe('Multiple Contexts', () => {
    it('should support multiple independent contexts', () => {
      const Context1 = createContext<string>();
      const Context2 = createContext<number>();

      const value1 = 'context-1-value';
      const value2 = 42;

      // Create Provider fibers
      const Provider1 = Context1.Provider;
      (Provider1 as any)._isContextProvider = true;
      (Provider1 as any)._contextId = Context1._contextId;

      const Provider2 = Context2.Provider;
      (Provider2 as any)._isContextProvider = true;
      (Provider2 as any)._contextId = Context2._contextId;

      const childFiber: FiberNode = {
        type: 'Child',
        props: {},
        children: [],
        path: ['root', 'provider1', 'provider2', 'child'],
      };

      const provider2Fiber: FiberNode = {
        type: Provider2,
        props: {
          value: value2,
          _contextId: Context2._contextId,
          _contextValue: value2,
        },
        children: [childFiber],
        path: ['root', 'provider1', 'provider2'],
      };

      const provider1Fiber: FiberNode = {
        type: Provider1,
        props: {
          value: value1,
          _contextId: Context1._contextId,
          _contextValue: value1,
        },
        children: [provider2Fiber],
        path: ['root', 'provider1'],
      };

      const rootFiber: FiberNode = {
        type: 'Root',
        props: {},
        children: [provider1Fiber],
        path: ['root'],
      };

      // Manually push context values to simulate Renderer behavior
      pushContextValue(Context1._contextId, value1);
      pushContextValue(Context2._contextId, value2);
      setContextRenderContext(childFiber);

      const result1 = useContext(Context1);
      const result2 = useContext(Context2);

      expect(result1).toBe(value1);
      expect(result2).toBe(value2);

      clearContextRenderContext();
      popContextValue(Context2._contextId);
      popContextValue(Context1._contextId);
    });

    it('should not confuse different contexts', () => {
      const Context1 = createContext<string>('default-1');
      const Context2 = createContext<string>('default-2');

      const value1 = 'context-1-value';

      // Only provide Context1, not Context2
      const Provider1 = Context1.Provider;
      (Provider1 as any)._isContextProvider = true;
      (Provider1 as any)._contextId = Context1._contextId;

      const childFiber: FiberNode = {
        type: 'Child',
        props: {},
        children: [],
        path: ['root', 'provider1', 'child'],
      };

      const provider1Fiber: FiberNode = {
        type: Provider1,
        props: {
          value: value1,
          _contextId: Context1._contextId,
          _contextValue: value1,
        },
        children: [childFiber],
        path: ['root', 'provider1'],
      };

      const rootFiber: FiberNode = {
        type: 'Root',
        props: {},
        children: [provider1Fiber],
        path: ['root'],
      };

      // Manually push context value for Context1 only
      pushContextValue(Context1._contextId, value1);
      setContextRenderContext(childFiber);

      const result1 = useContext(Context1);
      const result2 = useContext(Context2);

      expect(result1).toBe(value1); // From Provider
      expect(result2).toBe('default-2'); // From default value

      clearContextRenderContext();
      popContextValue(Context1._contextId);
    });
  });
});
