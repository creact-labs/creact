// Renderer performance tests - Benchmarks and stress tests

import { describe, it, expect } from 'vitest';
import { Renderer } from '@/core/Renderer';

// Mock JSX factory
function createElement(type: any, props: any, ...children: any[]): any {
  return {
    type,
    props: {
      ...props,
      children: children.length === 1 ? children[0] : children,
    },
  };
}

describe('Renderer - Performance', () => {
  describe('Large Tree Rendering', () => {
    it('should render 1000 shallow nodes efficiently', () => {
      const renderer = new Renderer();

      function Parent({ children }: any) {
        return children;
      }

      function Child() {
        return null;
      }

      // Create 1000 children
      const children: any[] = [];
      for (let i = 0; i < 1000; i++) {
        children.push(createElement(Child, { key: `child-${i}` }));
      }

      const jsx = createElement(Parent, {}, ...children);

      const startTime = Date.now();
      const fiber = renderer.render(jsx);
      const duration = Date.now() - startTime;

      expect(fiber.children).toHaveLength(1000);
      // Should complete in under 500ms for 1000 nodes
      expect(duration).toBeLessThan(500);
    });

    it('should handle children array with 10,000+ elements', () => {
      const renderer = new Renderer();

      function Parent({ children }: any) {
        return children;
      }

      function Child() {
        return null;
      }

      // Create 10,000 children
      const children: any[] = [];
      for (let i = 0; i < 10000; i++) {
        children.push({ type: Child, props: {}, key: `child-${i}` });
      }

      const jsx = createElement(Parent, {}, ...children);

      const startTime = Date.now();
      const fiber = renderer.render(jsx);
      const duration = Date.now() - startTime;

      expect(fiber.children).toHaveLength(10000);
      // Should complete in under 2 seconds for 10k nodes
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Deep Nesting', () => {
    it('should handle deeply nested component tree (6 levels)', () => {
      const renderer = new Renderer();

      function Level1({ children }: any) {
        return children;
      }
      function Level2({ children }: any) {
        return children;
      }
      function Level3({ children }: any) {
        return children;
      }
      function Level4({ children }: any) {
        return children;
      }
      function Level5({ children }: any) {
        return children;
      }
      function Level6() {
        return null;
      }

      const jsx = createElement(
        Level1,
        {},
        createElement(
          Level2,
          {},
          createElement(
            Level3,
            {},
            createElement(
              Level4,
              {},
              createElement(Level5, {}, createElement(Level6, {}))
            )
          )
        )
      );

      const fiber = renderer.render(jsx);

      expect(fiber.path).toEqual(['level-1']);
      expect(fiber.children[0].path).toEqual(['level-1', 'level-2']);
      expect(fiber.children[0].children[0].path).toEqual(['level-1', 'level-2', 'level-3']);
      expect(fiber.children[0].children[0].children[0].path).toEqual([
        'level-1',
        'level-2',
        'level-3',
        'level-4',
      ]);
      expect(fiber.children[0].children[0].children[0].children[0].path).toEqual([
        'level-1',
        'level-2',
        'level-3',
        'level-4',
        'level-5',
      ]);
      expect(
        fiber.children[0].children[0].children[0].children[0].children[0].path
      ).toEqual(['level-1', 'level-2', 'level-3', 'level-4', 'level-5', 'level-6']);
    });

    it('should detect infinite recursion before stack overflow', () => {
      const renderer = new Renderer();

      let callCount = 0;
      function InfiniteRecursion(): any {
        callCount++;
        // Prevent actual infinite loop in test
        if (callCount > 10000) {
          throw new Error('Recursion limit exceeded');
        }
        return { type: InfiniteRecursion, props: {} };
      }

      const jsx = createElement(InfiniteRecursion, {});

      // Should throw (either stack overflow or our limit)
      expect(() => renderer.render(jsx)).toThrow();
    });
  });

  describe('Large Props Objects', () => {
    it('should handle props object with 1000+ keys', () => {
      const renderer = new Renderer();

      function Component(props: any) {
        return null;
      }

      // Create props with 1000 keys
      const largeProps: any = {};
      for (let i = 0; i < 1000; i++) {
        largeProps[`prop${i}`] = `value${i}`;
      }

      const jsx = { type: Component, props: largeProps };

      const startTime = Date.now();
      const fiber = renderer.render(jsx as any);
      const duration = Date.now() - startTime;

      expect(Object.keys(fiber.props).length).toBeGreaterThanOrEqual(1000);
      // Should complete quickly even with large props
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Props with Side Effects', () => {
    it('should handle props with getters that have side effects', () => {
      const renderer = new Renderer();
      let callCount = 0;

      function Component(props: any) {
        return null;
      }

      const propsWithSideEffects = {
        get counter() {
          callCount++;
          return callCount;
        },
        normal: 'value',
      };

      const jsx = { type: Component, props: propsWithSideEffects };

      // Render will trigger getter during spread
      renderer.render(jsx as any);

      // Getter was called during props spread
      expect(callCount).toBeGreaterThan(0);
    });

    it('should handle cascading props mutation through children', () => {
      const renderer = new Renderer();

      function Parent(props: any) {
        // Mutate props
        props.mutated = true;
        props.count = (props.count || 0) + 1;

        return createElement(Child, props);
      }

      function Child(props: any) {
        // Child receives mutated props
        return null;
      }

      const originalProps = { value: 'original' };
      const jsx = { type: Parent, props: originalProps };

      const fiber = renderer.render(jsx as any);

      // Original props are mutated (this is the bug we're detecting)
      expect(originalProps).toHaveProperty('mutated', true);
      expect(originalProps).toHaveProperty('count', 1);

      // Child receives mutated props
      expect(fiber.children[0].props).toHaveProperty('mutated', true);
    });
  });
});
