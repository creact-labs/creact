// REQ-02: Edge case tests for createContext and useContext
// Test boundary conditions, error scenarios, and unusual usage patterns

/** @jsxRuntime classic */
/** @jsx CReact.createElement */

import { describe, it, expect, beforeEach } from 'vitest';
import { CReact } from '../../src/jsx';
import { Renderer } from '../../src/core/Renderer';
import { createContext } from '../../src/context/createContext';
import { useContext } from '../../src/hooks/useContext';
import { FiberNode } from '../../src/core/types';
import { setContextRenderContext, clearContextRenderContext } from '../../src/hooks/useContext';

describe('Context Edge Cases', () => {
  let renderer: Renderer;
  
  beforeEach(() => {
    renderer = new Renderer();
    clearContextRenderContext();
  });
  
  describe('Null and Undefined Values', () => {
    it('should handle null as context value', () => {
      const TestContext = createContext<string | null>();
      
      let capturedValue: string | null | undefined;
      
      function Child() {
        capturedValue = useContext(TestContext);
        return null;
      }
      
      function Parent() {
        return <TestContext.Provider value={null}><Child /></TestContext.Provider>;
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValue).toBeNull();
    });
    
    it('should handle undefined as context value', () => {
      const TestContext = createContext<string | undefined>();
      
      let capturedValue: string | undefined;
      
      function Child() {
        capturedValue = useContext(TestContext);
        return null;
      }
      
      function Parent() {
        return <TestContext.Provider value={undefined}><Child /></TestContext.Provider>;
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValue).toBeUndefined();
    });
    
    it('should distinguish between undefined value and no Provider', () => {
      const TestContext = createContext<string | undefined>('default');
      
      let valueWithProvider: string | undefined;
      let valueWithoutProvider: string | undefined;
      
      function ChildWithProvider() {
        valueWithProvider = useContext(TestContext);
        return null;
      }
      
      function ChildWithoutProvider() {
        valueWithoutProvider = useContext(TestContext);
        return null;
      }
      
      function Root() {
        return (
          <>
            <TestContext.Provider value={undefined}>
              <ChildWithProvider />
            </TestContext.Provider>
            <ChildWithoutProvider />
          </>
        );
      }
      
      const fiber = renderer.render(<Root />);
      
      expect(valueWithProvider).toBeUndefined(); // From Provider
      expect(valueWithoutProvider).toBe('default'); // From default value
    });
    
    it('should handle empty object as default value', () => {
      const TestContext = createContext<Record<string, any>>({});
      
      let capturedValue: Record<string, any> | undefined;
      
      function Child() {
        capturedValue = useContext(TestContext);
        return null;
      }
      
      const fiber = renderer.render(<Child />);
      
      expect(capturedValue).toEqual({});
    });
    
    it('should handle null as default value', () => {
      const TestContext = createContext<string | null>(null);
      
      let capturedValue: string | null | undefined;
      
      function Child() {
        capturedValue = useContext(TestContext);
        return null;
      }
      
      const fiber = renderer.render(<Child />);
      
      expect(capturedValue).toBeNull();
    });
  });
  
  describe('Complex Data Types', () => {
    it('should handle deeply nested objects', () => {
      interface DeepObject {
        level1: {
          level2: {
            level3: {
              value: string;
            };
          };
        };
      }
      
      const TestContext = createContext<DeepObject>();
      
      const deepValue: DeepObject = {
        level1: {
          level2: {
            level3: {
              value: 'deep-value',
            },
          },
        },
      };
      
      let capturedValue: DeepObject | undefined;
      
      function Child() {
        capturedValue = useContext(TestContext);
        return null;
      }
      
      function Parent() {
        return <TestContext.Provider value={deepValue}><Child /></TestContext.Provider>;
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValue).toEqual(deepValue);
      expect(capturedValue?.level1.level2.level3.value).toBe('deep-value');
    });
    
    it('should handle arrays as context values', () => {
      const TestContext = createContext<string[]>();
      
      const arrayValue = ['a', 'b', 'c'];
      
      let capturedValue: string[] | undefined;
      
      function Child() {
        capturedValue = useContext(TestContext);
        return null;
      }
      
      function Parent() {
        return <TestContext.Provider value={arrayValue}><Child /></TestContext.Provider>;
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValue).toEqual(arrayValue);
    });
    
    it('should handle functions as context values', () => {
      type ContextFunction = (x: number) => number;
      const TestContext = createContext<ContextFunction>();
      
      const fn: ContextFunction = (x) => x * 2;
      
      let capturedValue: ContextFunction | undefined;
      
      function Child() {
        capturedValue = useContext(TestContext);
        return null;
      }
      
      function Parent() {
        return <TestContext.Provider value={fn}><Child /></TestContext.Provider>;
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValue).toBe(fn);
      expect(capturedValue?.(5)).toBe(10);
    });
    
    it('should handle Map as context value', () => {
      const TestContext = createContext<Map<string, number>>();
      
      const mapValue = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      
      let capturedValue: Map<string, number> | undefined;
      
      function Child() {
        capturedValue = useContext(TestContext);
        return null;
      }
      
      function Parent() {
        return <TestContext.Provider value={mapValue}><Child /></TestContext.Provider>;
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValue).toBe(mapValue);
      expect(capturedValue?.get('a')).toBe(1);
    });
    
    it('should handle Set as context value', () => {
      const TestContext = createContext<Set<string>>();
      
      const setValue = new Set(['a', 'b', 'c']);
      
      let capturedValue: Set<string> | undefined;
      
      function Child() {
        capturedValue = useContext(TestContext);
        return null;
      }
      
      function Parent() {
        return <TestContext.Provider value={setValue}><Child /></TestContext.Provider>;
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValue).toBe(setValue);
      expect(capturedValue?.has('a')).toBe(true);
    });
  });
  
  describe('Provider Without Children', () => {
    it('should handle Provider with no children', () => {
      const TestContext = createContext<string>();
      
      function Parent() {
        return <TestContext.Provider value="value" />;
      }
      
      expect(() => {
        renderer.render(<Parent />);
      }).not.toThrow();
    });
    
    it('should handle Provider with null children', () => {
      const TestContext = createContext<string>();
      
      function Parent() {
        return <TestContext.Provider value="value">{null}</TestContext.Provider>;
      }
      
      expect(() => {
        renderer.render(<Parent />);
      }).not.toThrow();
    });
    
    it('should handle Provider with undefined children', () => {
      const TestContext = createContext<string>();
      
      function Parent() {
        return <TestContext.Provider value="value">{undefined}</TestContext.Provider>;
      }
      
      expect(() => {
        renderer.render(<Parent />);
      }).not.toThrow();
    });
  });
  
  describe('Many Contexts', () => {
    it('should handle many independent contexts (stress test)', () => {
      const contexts = Array.from({ length: 10 }, (_, i) => 
        createContext<number>(i)
      );
      
      const capturedValues: number[] = [];
      
      function Child() {
        contexts.forEach((ctx) => {
          capturedValues.push(useContext(ctx));
        });
        return null;
      }
      
      function Parent() {
        let element: any = <Child />;
        
        // Wrap in all providers
        for (let i = contexts.length - 1; i >= 0; i--) {
          const Provider = contexts[i].Provider;
          element = <Provider value={i * 10}>{element}</Provider>;
        }
        
        return element;
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValues).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    });
    
    it('should handle deeply nested Providers (stress test)', () => {
      const TestContext = createContext<number>();
      
      const capturedValues: number[] = [];
      
      function Child() {
        capturedValues.push(useContext(TestContext));
        return null;
      }
      
      function createNestedProviders(depth: number, value: number): any {
        if (depth === 0) {
          return <Child />;
        }
        
        return (
          <TestContext.Provider value={value}>
            {createNestedProviders(depth - 1, value + 1)}
          </TestContext.Provider>
        );
      }
      
      function Parent() {
        return createNestedProviders(20, 0);
      }
      
      const fiber = renderer.render(<Parent />);
      
      // Should use innermost Provider (value 19)
      expect(capturedValues).toEqual([19]);
    });
  });
  
  describe('Context with Same Values', () => {
    it('should handle multiple Providers with same value', () => {
      const TestContext = createContext<string>();
      
      const capturedValues: string[] = [];
      
      function Child() {
        capturedValues.push(useContext(TestContext));
        return null;
      }
      
      function Parent() {
        return (
          <TestContext.Provider value="same">
            <Child />
            <TestContext.Provider value="same">
              <Child />
            </TestContext.Provider>
          </TestContext.Provider>
        );
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValues).toEqual(['same', 'same']);
    });
    
    it('should handle Provider value changes in nested structure', () => {
      const TestContext = createContext<string>();
      
      const capturedValues: string[] = [];
      
      function Child() {
        capturedValues.push(useContext(TestContext));
        return null;
      }
      
      function Parent() {
        return (
          <TestContext.Provider value="a">
            <Child />
            <TestContext.Provider value="b">
              <Child />
              <TestContext.Provider value="a">
                <Child />
              </TestContext.Provider>
            </TestContext.Provider>
          </TestContext.Provider>
        );
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValues).toEqual(['a', 'b', 'a']);
    });
  });
  
  describe('Error Recovery', () => {
    it('should provide clear error when context is undefined', () => {
      const TestContext = createContext<string>();
      
      function Child() {
        useContext(TestContext);
        return null;
      }
      
      expect(() => {
        renderer.render(<Child />);
      }).toThrow('useContext called without a Provider');
    });
    
    it('should handle useContext called multiple times in same component', () => {
      const TestContext = createContext<string>();
      
      const capturedValues: string[] = [];
      
      function Child() {
        capturedValues.push(useContext(TestContext));
        capturedValues.push(useContext(TestContext));
        capturedValues.push(useContext(TestContext));
        return null;
      }
      
      function Parent() {
        return <TestContext.Provider value="value"><Child /></TestContext.Provider>;
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValues).toEqual(['value', 'value', 'value']);
    });
  });
  
  describe('Context Identity', () => {
    it('should maintain context identity across renders', () => {
      const TestContext = createContext<string>();
      
      expect(TestContext._contextId).toBe(TestContext._contextId);
      expect(TestContext.Provider).toBe(TestContext.Provider);
      expect(TestContext.Consumer).toBe(TestContext.Consumer);
    });
    
    it('should create unique contexts even with same type', () => {
      const Context1 = createContext<string>();
      const Context2 = createContext<string>();
      
      expect(Context1._contextId).not.toBe(Context2._contextId);
      expect(Context1.Provider).not.toBe(Context2.Provider);
    });
  });
  
  describe('Fragment Support', () => {
    it('should work with fragments', () => {
      const TestContext = createContext<string>();
      
      const capturedValues: string[] = [];
      
      function Child() {
        capturedValues.push(useContext(TestContext));
        return null;
      }
      
      function Parent() {
        return (
          <TestContext.Provider value="fragment-value">
            <>
              <Child />
              <Child />
            </>
          </TestContext.Provider>
        );
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValues).toEqual(['fragment-value', 'fragment-value']);
    });
  });
  
  describe('Type Safety Edge Cases', () => {
    it('should handle union types', () => {
      type UnionType = string | number | boolean;
      const TestContext = createContext<UnionType>();
      
      let capturedValue: UnionType | undefined;
      
      function Child() {
        capturedValue = useContext(TestContext);
        return null;
      }
      
      function Parent() {
        return <TestContext.Provider value={42}><Child /></TestContext.Provider>;
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValue).toBe(42);
    });
    
    it('should handle optional properties', () => {
      interface OptionalProps {
        required: string;
        optional?: number;
      }
      
      const TestContext = createContext<OptionalProps>();
      
      let capturedValue: OptionalProps | undefined;
      
      function Child() {
        capturedValue = useContext(TestContext);
        return null;
      }
      
      function Parent() {
        return (
          <TestContext.Provider value={{ required: 'value' }}>
            <Child />
          </TestContext.Provider>
        );
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValue).toEqual({ required: 'value' });
      expect(capturedValue?.optional).toBeUndefined();
    });
  });
  
  describe('Performance Edge Cases', () => {
    it('should handle wide component tree (many siblings)', () => {
      const TestContext = createContext<string>();
      
      const capturedValues: string[] = [];
      
      function Child({ id }: { id: number }) {
        capturedValues.push(useContext(TestContext));
        return null;
      }
      
      function Parent() {
        return (
          <TestContext.Provider value="shared">
            {Array.from({ length: 50 }, (_, i) => (
              <Child key={i} id={i} />
            ))}
          </TestContext.Provider>
        );
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValues.length).toBe(50);
      expect(capturedValues.every(v => v === 'shared')).toBe(true);
    });
  });
});
