// REQ-01: Renderer unit tests - Core functionality

import { describe, it, expect, beforeEach } from 'vitest';
import { Renderer } from '@/core/Renderer';
import { createMockFiber } from '../helpers';

// Mock JSX factory function
function createElement(type: any, props: any, ...children: any[]): any {
  return {
    type,
    props: {
      ...props,
      children: children.length === 1 ? children[0] : children,
    },
  };
}

describe('Renderer - Core Functionality', () => {
  let renderer: Renderer;

  beforeEach(() => {
    renderer = new Renderer();
  });

  describe('Basic Rendering', () => {
    it('should render a simple component', () => {
      function SimpleComponent() {
        return null;
      }

      const jsx = createElement(SimpleComponent, {});
      const fiber = renderer.render(jsx);

      expect(fiber).toBeDefined();
      expect(fiber.type).toBe(SimpleComponent);
      expect(fiber.path).toEqual(['simple-component']);
      expect(fiber.children).toEqual([]);
    });

    it('should render nested components', () => {
      function Parent({ children }: any) {
        return children;
      }

      function Child() {
        return null;
      }

      const jsx = createElement(Parent, {}, createElement(Child, {}));
      const fiber = renderer.render(jsx);

      expect(fiber.path).toEqual(['parent']);
      expect(fiber.children).toHaveLength(1);
      expect(fiber.children[0].path).toEqual(['parent', 'child']);
    });

    it('should handle components with no children', () => {
      function LeafComponent() {
        return null;
      }

      const jsx = createElement(LeafComponent, {});
      const fiber = renderer.render(jsx);

      expect(fiber.children).toEqual([]);
    });

    it('should handle multiple children', () => {
      function Parent({ children }: any) {
        return children;
      }

      function Child1() {
        return null;
      }

      function Child2() {
        return null;
      }

      const jsx = createElement(
        Parent,
        {},
        createElement(Child1, {}),
        createElement(Child2, {})
      );

      const fiber = renderer.render(jsx);

      expect(fiber.children).toHaveLength(2);
      expect(fiber.children[0].path).toEqual(['parent', 'child1']);
      expect(fiber.children[1].path).toEqual(['parent', 'child2']);
    });
  });

  describe('Naming and Paths', () => {
    it('should use key prop for node name', () => {
      function Component() {
        return null;
      }

      const jsx = {
        type: Component,
        props: {},
        key: 'custom-key',
      };

      const fiber = renderer.render(jsx);

      expect(fiber.path).toEqual(['custom-key']);
    });

    it('should use name prop for node name', () => {
      function Component({ name }: any) {
        return null;
      }

      const jsx = createElement(Component, { name: 'my-service' });
      const fiber = renderer.render(jsx);

      expect(fiber.path).toEqual(['my-service']);
    });

    it('should convert component names to kebab-case', () => {
      function RegistryStack() {
        return null;
      }

      const jsx = createElement(RegistryStack, {});
      const fiber = renderer.render(jsx);

      expect(fiber.path).toEqual(['registry-stack']);
    });

    it('should use displayName for component naming', () => {
      function Component() {
        return null;
      }
      Component.displayName = 'CustomDisplayName';

      const jsx = createElement(Component, {});
      const fiber = renderer.render(jsx);

      expect(fiber.path).toEqual(['custom-display-name']);
    });

    it('should build hierarchical paths', () => {
      function Registry({ children }: any) {
        return children;
      }

      function Service({ children }: any) {
        return children;
      }

      function Container() {
        return null;
      }

      const jsx = createElement(
        Registry,
        {},
        createElement(Service, {}, createElement(Container, {}))
      );

      const fiber = renderer.render(jsx);

      expect(fiber.path).toEqual(['registry']);
      expect(fiber.children[0].path).toEqual(['registry', 'service']);
      expect(fiber.children[0].children[0].path).toEqual([
        'registry',
        'service',
        'container',
      ]);
    });

    it('should differentiate siblings with keys', () => {
      function Parent({ children }: any) {
        return children;
      }

      function Service() {
        return null;
      }

      const jsx = createElement(
        Parent,
        {},
        { type: Service, props: {}, key: 'api' },
        { type: Service, props: {}, key: 'worker' }
      );

      const fiber = renderer.render(jsx);

      expect(fiber.children).toHaveLength(2);
      expect(fiber.children[0].path).toEqual(['parent', 'api']);
      expect(fiber.children[1].path).toEqual(['parent', 'worker']);
    });
  });

  describe('Props Handling', () => {
    it('should preserve props in fiber nodes', () => {
      function Component({ name, value }: any) {
        return null;
      }

      const jsx = createElement(Component, { name: 'test', value: 42 });
      const fiber = renderer.render(jsx);

      expect(fiber.props.name).toBe('test');
      expect(fiber.props.value).toBe(42);
    });

    it('should handle null props', () => {
      function Component() {
        return null;
      }

      const jsx = {
        type: Component,
        props: null,
      };

      const fiber = renderer.render(jsx as any);

      expect(fiber.props).toEqual({});
    });

    it('should handle undefined props', () => {
      function Component() {
        return null;
      }

      const jsx = {
        type: Component,
        props: undefined,
      };

      const fiber = renderer.render(jsx as any);

      expect(fiber.props).toEqual({});
    });
  });

  describe('Children Filtering', () => {
    it('should filter out null and undefined children', () => {
      function Parent({ children }: any) {
        return children;
      }

      function Child() {
        return null;
      }

      const jsx = createElement(
        Parent,
        {},
        null,
        createElement(Child, {}),
        undefined,
        false
      );

      const fiber = renderer.render(jsx);

      expect(fiber.children).toHaveLength(1);
      expect(fiber.children[0].type).toBe(Child);
    });

    it('should ignore string children in infrastructure', () => {
      function Parent({ children }: any) {
        return children;
      }

      const jsx = createElement(
        Parent,
        {},
        'text node',
        createElement(function Child() {
          return null;
        }, {})
      );

      const fiber = renderer.render(jsx);

      // Text nodes should be filtered out
      expect(fiber.children).toHaveLength(1);
      expect(fiber.children[0].type.name).toBe('Child');
    });

    it('should ignore number children in infrastructure', () => {
      function Parent({ children }: any) {
        return children;
      }

      const jsx = createElement(
        Parent,
        {},
        42,
        createElement(function Child() {
          return null;
        }, {})
      );

      const fiber = renderer.render(jsx);

      // Number nodes should be filtered out
      expect(fiber.children).toHaveLength(1);
      expect(fiber.children[0].type.name).toBe('Child');
    });
  });

  describe('State Management', () => {
    it('should store current fiber for validation', () => {
      function Component() {
        return null;
      }

      const jsx = createElement(Component, {});
      const fiber = renderer.render(jsx);

      expect(renderer.getCurrentFiber()).toBe(fiber);
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid JSX (null)', () => {
      expect(() => renderer.render(null as any)).toThrow('Invalid JSX element');
    });

    it('should throw on invalid JSX (empty object)', () => {
      expect(() => renderer.render({} as any)).toThrow('JSX element missing type');
    });

    it('should provide clear error for unknown component type', () => {
      const jsx = {
        type: 123, // Invalid type
        props: {},
      };

      expect(() => renderer.render(jsx as any)).toThrow('Unknown component type');
    });
  });
});
