// REQ-02: Unit tests for createContext
// Verify context creation and Provider/Consumer components

import { describe, it, expect } from 'vitest';
import { createContext } from '../../src/context/createContext';

describe('createContext', () => {
  describe('Context Creation', () => {
    it('should create a context object with Provider and Consumer', () => {
      const TestContext = createContext<string>();

      expect(TestContext).toBeDefined();
      expect(TestContext._contextId).toBeDefined();
      expect(typeof TestContext._contextId).toBe('symbol');
      expect(TestContext.Provider).toBeDefined();
      expect(typeof TestContext.Provider).toBe('function');
      expect(TestContext.Consumer).toBeDefined();
      expect(typeof TestContext.Consumer).toBe('function');
    });

    it('should create context with default value', () => {
      const defaultValue = { foo: 'bar' };
      const TestContext = createContext(defaultValue);

      expect(TestContext.defaultValue).toEqual(defaultValue);
    });

    it('should create context without default value', () => {
      const TestContext = createContext<string>();

      expect(TestContext.defaultValue).toBeUndefined();
    });

    it('should create unique context IDs for different contexts', () => {
      const Context1 = createContext<string>();
      const Context2 = createContext<string>();

      expect(Context1._contextId).not.toBe(Context2._contextId);
    });
  });

  describe('Provider Component', () => {
    it('should be a pass-through component that returns children', () => {
      const TestContext = createContext<string>();
      const value = 'test-value';
      const children = { type: 'div', props: {} };

      const result = TestContext.Provider({ value, children });

      // Provider is a pass-through component - it returns children directly
      expect(result).toBe(children);
    });

    it('should mark Provider with context metadata', () => {
      const TestContext = createContext<string>();

      expect((TestContext.Provider as any)._isContextProvider).toBe(true);
      expect((TestContext.Provider as any)._contextId).toBe(TestContext._contextId);
    });

    it('should handle Provider without children', () => {
      const TestContext = createContext<string>();
      const value = 'test-value';

      const result = TestContext.Provider({ value });

      // Provider returns undefined when no children provided
      expect(result).toBeUndefined();
    });
  });

  describe('Consumer Component', () => {
    it('should be a pass-through component that returns render function', () => {
      const TestContext = createContext<string>();
      const renderFn = (value: string) => ({ type: 'div', props: { text: value } });

      const result = TestContext.Consumer({ children: renderFn });

      // Consumer is a pass-through component - it returns the render function directly
      expect(result).toBe(renderFn);
    });

    it('should mark Consumer with context metadata', () => {
      const TestContext = createContext<string>();

      expect((TestContext.Consumer as any)._isContextConsumer).toBe(true);
      expect((TestContext.Consumer as any)._contextId).toBe(TestContext._contextId);
    });
  });

  describe('Type Safety', () => {
    it('should support typed contexts', () => {
      interface UserContext {
        name: string;
        age: number;
      }

      const UserContext = createContext<UserContext>();

      const value: UserContext = { name: 'Alice', age: 30 };
      const children = { type: 'div', props: {} };
      const result = UserContext.Provider({ value, children });

      // Provider returns children, value is managed by the Renderer
      expect(result).toBe(children);
    });

    it('should support optional types', () => {
      interface OptionalContext {
        value?: string;
      }

      const TestContext = createContext<OptionalContext>({});

      expect(TestContext.defaultValue).toEqual({});
    });
  });
});
