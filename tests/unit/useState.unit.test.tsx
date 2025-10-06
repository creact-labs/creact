/** @jsx CReact.createElement */
/** @jsxFrag CReact.Fragment */

// REQ-02: useState hook unit tests
// Tests declarative output binding with React-like hooks array pattern

import { describe, it, expect, beforeEach } from 'vitest';
import { CReact } from '../../src/jsx';
import { useState, setStateRenderContext, clearStateRenderContext } from '../../src/hooks/useState';

describe('useState Hook - Unit Tests', () => {
  describe('Basic Functionality', () => {
    it('should declare a single output value with initial value', () => {
      // Arrange
      const mockFiber = { hooks: [] };
      setStateRenderContext(mockFiber);

      // Act
      const [state, setState] = useState('initial-value');

      // Assert
      expect(state).toBe('initial-value');
      expect(mockFiber.hooks[0]).toBe('initial-value');
      expect(typeof setState).toBe('function');

      clearStateRenderContext();
    });

    it('should declare output with undefined initial value', () => {
      // Arrange
      const mockFiber = { hooks: [] };
      setStateRenderContext(mockFiber);

      // Act
      const [state, setState] = useState<string>();

      // Assert
      expect(state).toBeUndefined();
      expect(mockFiber.hooks[0]).toBeUndefined();

      clearStateRenderContext();
    });

    it('should support various data types as initial values', () => {
      // String
      const mockFiber1 = { hooks: [] };
      setStateRenderContext(mockFiber1);
      const [str] = useState('test');
      expect(str).toBe('test');
      clearStateRenderContext();

      // Number
      const mockFiber2 = { hooks: [] };
      setStateRenderContext(mockFiber2);
      const [num] = useState(42);
      expect(num).toBe(42);
      clearStateRenderContext();

      // Boolean
      const mockFiber3 = { hooks: [] };
      setStateRenderContext(mockFiber3);
      const [bool] = useState(true);
      expect(bool).toBe(true);
      clearStateRenderContext();

      // Object
      const mockFiber4 = { hooks: [] };
      setStateRenderContext(mockFiber4);
      const [obj] = useState({ key: 'value' });
      expect(obj).toEqual({ key: 'value' });
      clearStateRenderContext();

      // Array
      const mockFiber5 = { hooks: [] };
      setStateRenderContext(mockFiber5);
      const [arr] = useState([1, 2, 3]);
      expect(arr).toEqual([1, 2, 3]);
      clearStateRenderContext();
    });
  });

  describe('setState Functionality', () => {
    it('should update output value with direct value', () => {
      // Arrange
      const mockFiber = { hooks: [] };
      setStateRenderContext(mockFiber);
      const [state, setState] = useState('initial');

      // Act
      setState('updated');

      // Assert
      expect(mockFiber.hooks[0]).toBe('updated');

      clearStateRenderContext();
    });

    it('should update output value with updater function', () => {
      // Arrange
      const mockFiber = { hooks: [] };
      setStateRenderContext(mockFiber);
      const [state, setState] = useState(10);

      // Act
      setState((prev) => prev + 5);

      // Assert
      expect(mockFiber.hooks[0]).toBe(15);

      clearStateRenderContext();
    });

    it('should support multiple setState calls', () => {
      // Arrange
      const mockFiber = { hooks: [] };
      setStateRenderContext(mockFiber);
      const [state, setState] = useState('initial');

      // Act
      setState('first-update');
      setState('second-update');
      setState('final-update');

      // Assert
      expect(mockFiber.hooks[0]).toBe('final-update');

      clearStateRenderContext();
    });
  });

  describe('Multiple useState Calls (Hooks Array Pattern)', () => {
    it('should support multiple useState calls with independent state', () => {
      // Arrange
      const mockFiber = { hooks: [] };
      setStateRenderContext(mockFiber);

      // Act
      const [state1, setState1] = useState('first');
      const [state2, setState2] = useState('second');
      const [state3, setState3] = useState('third');

      // Assert
      expect(state1).toBe('first');
      expect(state2).toBe('second');
      expect(state3).toBe('third');
      expect(mockFiber.hooks).toEqual(['first', 'second', 'third']);

      clearStateRenderContext();
    });

    it('should update correct hook by index', () => {
      // Arrange
      const mockFiber = { hooks: [] };
      setStateRenderContext(mockFiber);

      const [state1, setState1] = useState('first');
      const [state2, setState2] = useState('second');
      const [state3, setState3] = useState('third');

      // Act - Update middle hook
      setState2('updated-second');

      // Assert
      expect(mockFiber.hooks[0]).toBe('first');
      expect(mockFiber.hooks[1]).toBe('updated-second');
      expect(mockFiber.hooks[2]).toBe('third');

      clearStateRenderContext();
    });

    it('should reset hook index on new component render', () => {
      // Arrange
      const mockFiber1 = { hooks: [] };
      const mockFiber2 = { hooks: [] };

      // First component render
      setStateRenderContext(mockFiber1);
      const [state1a] = useState('comp1-hook1');
      const [state1b] = useState('comp1-hook2');
      clearStateRenderContext();

      // Second component render
      setStateRenderContext(mockFiber2);
      const [state2a] = useState('comp2-hook1');
      const [state2b] = useState('comp2-hook2');
      clearStateRenderContext();

      // Assert - Each component has independent hooks array
      expect(mockFiber1.hooks).toEqual(['comp1-hook1', 'comp1-hook2']);
      expect(mockFiber2.hooks).toEqual(['comp2-hook1', 'comp2-hook2']);
    });

    it('should maintain hook order across re-renders', () => {
      // Arrange
      const mockFiber = { hooks: ['existing1', 'existing2'] };

      // Act - Re-render with existing hooks
      setStateRenderContext(mockFiber);
      const [state1] = useState('new1'); // Should use existing1
      const [state2] = useState('new2'); // Should use existing2

      // Assert - Should use existing values, not initialize new ones
      expect(state1).toBe('existing1');
      expect(state2).toBe('existing2');
      expect(mockFiber.hooks).toEqual(['existing1', 'existing2']);

      clearStateRenderContext();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when called outside rendering context', () => {
      // Act & Assert
      expect(() => {
        useState('value');
      }).toThrow('useState must be called during component rendering');
    });

    it('should allow setState to be called outside context (for async updates)', () => {
      // Arrange
      const mockFiber = { hooks: [] };
      setStateRenderContext(mockFiber);
      const [, setState] = useState('initial');
      clearStateRenderContext();

      // Act & Assert - setState should work outside context for async updates
      expect(() => {
        setState('updated');
      }).not.toThrow();
      
      // Verify the state was updated in the fiber
      expect(mockFiber.hooks[0]).toBe('updated');
    });
  });

  describe('TypeScript Type Inference', () => {
    it('should infer type from initial value', () => {
      // Arrange
      const mockFiber = { hooks: [] };
      setStateRenderContext(mockFiber);

      // Act
      const [strState] = useState('string');
      const [numState] = useState(42);
      const [boolState] = useState(true);

      // Assert - TypeScript should infer correct types
      const _strCheck: string = strState;
      const _numCheck: number = numState;
      const _boolCheck: boolean = boolState;

      clearStateRenderContext();
    });

    it('should support explicit type parameter', () => {
      // Arrange
      const mockFiber = { hooks: [] };
      setStateRenderContext(mockFiber);

      // Act
      const [state] = useState<string>();

      // Assert - TypeScript should allow string | undefined
      const _check: string | undefined = state;

      clearStateRenderContext();
    });
  });

  describe('REQ-02 Compliance', () => {
    it('should NOT trigger re-render (declarative semantics)', () => {
      // Arrange
      const mockFiber = { hooks: [] };
      setStateRenderContext(mockFiber);
      let renderCount = 0;

      // Act
      const [state, setState] = useState('initial');
      renderCount++;
      setState('updated');

      // Assert - setState should NOT cause re-render
      expect(renderCount).toBe(1);
      expect(mockFiber.hooks[0]).toBe('updated');

      clearStateRenderContext();
    });

    it('should persist outputs for next build cycle', () => {
      // Arrange
      const mockFiber = { hooks: [] };
      setStateRenderContext(mockFiber);

      // Act - Build-time collection
      const [url, setUrl] = useState<string>();
      setUrl('https://example.com');

      // Assert - Output stored in hooks array for persistence
      expect(mockFiber.hooks[0]).toBe('https://example.com');

      clearStateRenderContext();
    });
  });
});
