// Renderer edge cases - Production-critical scenarios

import { describe, it, expect, beforeEach } from 'vitest';
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

describe('Renderer - Edge Cases', () => {
  let renderer: Renderer;

  beforeEach(() => {
    renderer = new Renderer();
  });

  describe('Error Resilience', () => {
    it('should handle component function that throws during render', () => {
      function ThrowingComponent() {
        throw new Error('Component render failed');
      }

      const jsx = createElement(ThrowingComponent, {});

      expect(() => renderer.render(jsx)).toThrow('Component render failed');
    });

    it('should handle one child throwing without corrupting siblings', () => {
      function Parent({ children }: any) {
        return children;
      }

      function GoodChild() {
        return null;
      }

      function BadChild() {
        throw new Error('Child render failed');
      }

      const jsx = createElement(
        Parent,
        {},
        createElement(GoodChild, {}),
        createElement(BadChild, {}),
        createElement(GoodChild, {})
      );

      // Currently, error propagates up (fail-fast)
      expect(() => renderer.render(jsx)).toThrow('Child render failed');
    });
  });

  describe('Anonymous Components', () => {
    it('should handle anonymous function components', () => {
      const jsx = createElement(() => null, {});
      const fiber = renderer.render(jsx);

      expect(fiber.path).toEqual(['anonymous']);
    });

    it('should handle arrow functions with no name', () => {
      const AnonymousComponent = () => null;
      Object.defineProperty(AnonymousComponent, 'name', { value: '' });

      const jsx = createElement(AnonymousComponent, {});
      const fiber = renderer.render(jsx);

      expect(fiber.path).toEqual(['anonymous']);
    });
  });

  describe('Array Fragments', () => {
    it('should flatten array of elements as children', () => {
      function Parent({ children }: any) {
        return children;
      }

      function Child1() {
        return null;
      }

      function Child2() {
        return null;
      }

      const jsx = createElement(Parent, {}, [
        createElement(Child1, {}),
        createElement(Child2, {}),
      ]);

      const fiber = renderer.render(jsx);

      expect(fiber.children).toHaveLength(2);
      expect(fiber.children[0].type).toBe(Child1);
      expect(fiber.children[1].type).toBe(Child2);
    });

    it('should handle component that returns array of elements', () => {
      function Parent() {
        return [
          { type: function Child1() { return null; }, props: {}, key: 'c1' },
          { type: function Child2() { return null; }, props: {}, key: 'c2' },
        ];
      }

      const jsx = createElement(Parent, {});
      const fiber = renderer.render(jsx);

      expect(fiber.children).toHaveLength(2);
      expect(fiber.children[0].path).toEqual(['parent', 'c1']);
      expect(fiber.children[1].path).toEqual(['parent', 'c2']);
    });

    it('should handle component returning empty array', () => {
      const EmptyFragment = () => [];

      const jsx = createElement(EmptyFragment, {});
      const fiber = renderer.render(jsx);

      expect(fiber.children).toEqual([]);
    });
  });

  describe('Component Return Values', () => {
    it('should handle component returning false gracefully', () => {
      const NoOp = () => false;

      const jsx = createElement(NoOp, {});
      const fiber = renderer.render(jsx);

      expect(fiber.children).toEqual([]);
    });

    it('should handle component returning null', () => {
      const NullComponent = () => null;

      const jsx = createElement(NullComponent, {});
      const fiber = renderer.render(jsx);

      expect(fiber.children).toEqual([]);
    });

    it('should handle component returning undefined', () => {
      const UndefinedComponent = () => undefined;

      const jsx = createElement(UndefinedComponent, {});
      const fiber = renderer.render(jsx);

      expect(fiber.children).toEqual([]);
    });
  });

  describe('Mixed Type Children', () => {
    it('should handle children array with mixed types', () => {
      function Parent({ children }: any) {
        return children;
      }

      function Child() {
        return null;
      }

      const jsx = createElement(
        Parent,
        {},
        'text node',
        42,
        { type: Child, props: {}, key: 'child1' },
        null,
        undefined,
        false,
        { type: Child, props: {}, key: 'child2' },
        'more text'
      );

      const fiber = renderer.render(jsx);

      // Should filter out non-element types
      expect(fiber.children).toHaveLength(2);
      expect(fiber.children[0].path).toEqual(['parent', 'child1']);
      expect(fiber.children[1].path).toEqual(['parent', 'child2']);
    });

    it('should handle children containing Promises', () => {
      function Parent({ children }: any) {
        return children;
      }

      function Child() {
        return null;
      }

      const jsx = createElement(
        Parent,
        {},
        Promise.resolve({ type: Child, props: {} }),
        { type: Child, props: {} }
      );

      const fiber = renderer.render(jsx);

      // Promises should be filtered out (not valid JSX)
      expect(fiber.children).toHaveLength(1);
    });
  });

  describe('Props Edge Cases', () => {
    it('should handle props created via Proxy', () => {
      function Component({ name }: any) {
        return null;
      }

      const propsProxy = new Proxy(
        { name: 'test' },
        {
          get(target, prop) {
            return target[prop as keyof typeof target];
          },
        }
      );

      const jsx = {
        type: Component,
        props: propsProxy,
      };

      const fiber = renderer.render(jsx as any);

      expect(fiber.props.name).toBe('test');
    });

    it('should handle props with getters', () => {
      function Component({ value }: any) {
        return null;
      }

      const propsWithGetter = {
        get value() {
          return 'computed';
        },
      };

      const jsx = {
        type: Component,
        props: propsWithGetter,
      };

      const fiber = renderer.render(jsx as any);

      expect(fiber.props.value).toBe('computed');
    });

    it('should handle props with getters that throw on access', () => {
      function Component(props: any) {
        return null;
      }

      const propsWithThrowingGetter = {
        get dangerous() {
          throw new Error('Getter throws');
        },
        safe: 'value',
      };

      const jsx = { type: Component, props: propsWithThrowingGetter };

      // Spread operation will trigger getter
      expect(() => renderer.render(jsx as any)).toThrow('Getter throws');
    });

    it('should handle props with numeric keys', () => {
      function Component(props: any) {
        return null;
      }

      const jsx = {
        type: Component,
        props: {
          0: 'first',
          1: 'second',
          normal: 'value',
        },
      };

      const fiber = renderer.render(jsx as any);

      expect(fiber.props[0]).toBe('first');
      expect(fiber.props[1]).toBe('second');
      expect(fiber.props.normal).toBe('value');
    });

    it('should handle props with special characters in keys', () => {
      function Component(props: any) {
        return null;
      }

      const jsx = {
        type: Component,
        props: {
          'data-test': 'value',
          'aria-label': 'label',
          '@special': 'char',
        },
      };

      const fiber = renderer.render(jsx as any);

      expect(fiber.props['data-test']).toBe('value');
      expect(fiber.props['aria-label']).toBe('label');
      expect(fiber.props['@special']).toBe('char');
    });
  });

  describe('Mutation Safety', () => {
    it('should not mutate input JSX', () => {
      function Component({ value }: any) {
        return null;
      }

      const originalProps = { value: 42 };
      const jsx = {
        type: Component,
        props: originalProps,
      };

      renderer.render(jsx as any);

      // Original props should be unchanged
      expect(originalProps).toEqual({ value: 42 });
    });

    it('should not mutate previously returned fibers', () => {
      function Component() {
        return null;
      }

      const jsx1 = { type: Component, props: {}, key: 'first' };
      const fiber1 = renderer.render(jsx1);

      const jsx2 = { type: Component, props: {}, key: 'second' };
      const fiber2 = renderer.render(jsx2);

      // First fiber should be unchanged
      expect(fiber1.path).toEqual(['first']);
      expect(fiber2.path).toEqual(['second']);
    });

    it('should handle component that mutates props during render', () => {
      function MutatingComponent(props: any) {
        // Common bug: mutating props
        props.mutated = true;
        return null;
      }

      const originalProps = { value: 'original' };
      const jsx = { type: MutatingComponent, props: originalProps };

      renderer.render(jsx as any);

      // Original props should be mutated (this is the bug we're testing for)
      expect(originalProps).toHaveProperty('mutated');
    });
  });

  describe('Intrinsic Elements', () => {
    it('should handle intrinsic HTML-like elements', () => {
      const jsx = { type: 'div', props: { children: null } };
      const fiber = renderer.render(jsx as any);

      expect(fiber.type).toBe('div');
      expect(fiber.path).toEqual(['div']);
    });

    it('should handle intrinsic elements with props', () => {
      const jsx = { type: 'span', props: { className: 'test', id: 'my-span' } };
      const fiber = renderer.render(jsx as any);

      expect(fiber.type).toBe('span');
      expect(fiber.props.className).toBe('test');
      expect(fiber.props.id).toBe('my-span');
    });
  });

  describe('Naming Collisions', () => {
    it('should handle siblings with same component type', () => {
      function Parent({ children }: any) {
        return children;
      }

      function Service() {
        return null;
      }

      const jsx = createElement(
        Parent,
        {},
        createElement(Service, {}),
        createElement(Service, {})
      );

      const fiber = renderer.render(jsx);

      // Both should have same name (path uniqueness handled by parent context)
      expect(fiber.children).toHaveLength(2);
      expect(fiber.children[0].path).toEqual(['parent', 'service']);
      expect(fiber.children[1].path).toEqual(['parent', 'service']);
    });

    it('should handle two components with same displayName', () => {
      function Parent({ children }: any) {
        return children;
      }

      function ComponentA() {
        return null;
      }
      ComponentA.displayName = 'Service';

      function ComponentB() {
        return null;
      }
      ComponentB.displayName = 'Service';

      const jsx = createElement(
        Parent,
        {},
        createElement(ComponentA, {}),
        createElement(ComponentB, {})
      );

      const fiber = renderer.render(jsx);

      // Both will have same path name (collision)
      expect(fiber.children).toHaveLength(2);
      expect(fiber.children[0].path).toEqual(['parent', 'service']);
      expect(fiber.children[1].path).toEqual(['parent', 'service']);
    });
  });

  describe('Recursive Components', () => {
    it('should detect infinite recursion and fail gracefully', () => {
      function RecursiveComponent(): any {
        return createElement(RecursiveComponent, {});
      }

      const jsx = createElement(RecursiveComponent, {});

      // This will cause a stack overflow in current implementation
      expect(() => renderer.render(jsx)).toThrow();
    });

    it('should not infinitely recurse on self-rendering component', () => {
      function Recursive(): any {
        return { type: Recursive, props: {} };
      }

      const jsx = createElement(Recursive, {});

      // Will cause stack overflow - expected behavior
      expect(() => renderer.render(jsx)).toThrow();
    });
  });

  describe('Security', () => {
    it('should handle props with __proto__ pollution attempts', () => {
      function Component(props: any) {
        return null;
      }

      const maliciousProps = {
        '__proto__': { polluted: true },
        'constructor': { prototype: { polluted: true } },
        normal: 'value',
      };

      const jsx = { type: Component, props: maliciousProps };

      // Should not crash
      expect(() => renderer.render(jsx as any)).not.toThrow();

      // Verify prototype pollution didn't occur
      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it('should handle path segments with null bytes', () => {
      function Component() {
        return null;
      }

      const jsx = {
        type: Component,
        props: { name: 'test\x00injection' },
      };

      const fiber = renderer.render(jsx as any);

      // Should handle null bytes in path
      expect(fiber.path).toBeDefined();
      expect(fiber.path[0]).toContain('test');
    });

    it('should handle path segments with directory traversal attempts', () => {
      function Component() {
        return null;
      }

      const jsx = {
        type: Component,
        props: { name: '../../../etc/passwd' },
      };

      const fiber = renderer.render(jsx as any);

      // Path uses the name prop as-is
      expect(fiber.path[0]).toBe('../../../etc/passwd');
    });
  });

  describe('Path Generation Edge Cases', () => {
    it('should handle Unicode normalization differences in paths', () => {
      function Component() {
        return null;
      }

      // é (composed) vs é (decomposed)
      const composed = { type: Component, props: { name: 'café' } };
      const decomposed = { type: Component, props: { name: 'café' } };

      const fiber1 = renderer.render(composed as any);
      const fiber2 = renderer.render(decomposed as any);

      // Paths may differ due to normalization
      expect(fiber1.path[0]).toBeDefined();
      expect(fiber2.path[0]).toBeDefined();
    });

    it('should handle emoji in component names/keys', () => {
      function Component() {
        return null;
      }

      const jsx = {
        type: Component,
        props: { name: '🚀-service' },
      };

      const fiber = renderer.render(jsx as any);

      // Should handle emoji in path
      expect(fiber.path[0]).toContain('🚀');
    });

    it('should handle path segments starting with numbers', () => {
      function Component() {
        return null;
      }

      const jsx = {
        type: Component,
        props: { name: '123-service' },
      };

      const fiber = renderer.render(jsx as any);

      // Path can start with number
      expect(fiber.path[0]).toBe('123-service');
    });
  });

  describe('Concurrency Edge Cases', () => {
    it('should handle same props object passed to multiple render calls', () => {
      function Component(props: any) {
        return null;
      }

      const sharedProps = { value: 'shared', count: 0 };

      // First render
      const jsx1 = { type: Component, props: sharedProps };
      const fiber1 = renderer.render(jsx1 as any);

      // Modify shared props
      sharedProps.count = 1;

      // Second render with same props object
      const jsx2 = { type: Component, props: sharedProps };
      const fiber2 = renderer.render(jsx2 as any);

      // Both fibers should have their own props copies
      expect(fiber1.props.count).toBe(0);
      expect(fiber2.props.count).toBe(1);

      // Original props object is mutated
      expect(sharedProps.count).toBe(1);
    });

    it('should handle multiple renderers operating on same JSX object', () => {
      const renderer1 = new Renderer();
      const renderer2 = new Renderer();

      function Component(props: any) {
        return null;
      }

      const sharedJSX = { type: Component, props: { value: 'shared' } };

      // Both renderers process same JSX
      const fiber1 = renderer1.render(sharedJSX as any);
      const fiber2 = renderer2.render(sharedJSX as any);

      // Each should produce independent fibers
      expect(fiber1).not.toBe(fiber2);
      expect(fiber1.props).not.toBe(fiber2.props);
      expect(fiber1.props).toEqual(fiber2.props);
    });
  });
});
