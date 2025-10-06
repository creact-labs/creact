// Validator edge cases - Production-critical scenarios

import { describe, it, expect, beforeEach } from 'vitest';
import { Validator, ValidationError } from '@/core/Validator';
import { createMockFiber, expectValidationError } from '../helpers';

describe('Validator - Edge Cases', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
  });

  describe('Nested Required Props Validation', () => {
    it('should validate required props in deeply nested components', () => {
      function Database({ children }: any) {
        return null;
      }
      Database.requiredProps = ['name'];

      function Engine() {
        return null;
      }
      Engine.requiredProps = ['type'];

      function Credentials() {
        return null;
      }
      Credentials.requiredProps = ['username', 'password'];

      const fiber = createMockFiber({
        type: Database,
        props: { name: 'mydb' },
        path: ['database'],
        children: [
          createMockFiber({
            type: Engine,
            props: { type: 'postgres' },
            path: ['database', 'engine'],
            children: [
              createMockFiber({
                type: Credentials,
                props: {
                  username: 'admin',
                  // password is missing
                },
                path: ['database', 'engine', 'credentials'],
              }),
            ],
          }),
        ],
      });

      expectValidationError(() => validator.validate(fiber), /Missing required prop 'password'/);
    });

    it('should report first missing prop when multiple are missing', () => {
      function Service() {}
      Service.requiredProps = ['name', 'image', 'port', 'cpu'];

      const fiber = createMockFiber({
        type: Service,
        props: {
          name: 'api',
          // image, port, cpu all missing
        },
        path: ['service'],
      });

      // Should fail on first missing prop
      expectValidationError(() => validator.validate(fiber), /Missing required prop/);
    });
  });

  describe('Duplicate IDs Across Branches', () => {
    it('should detect duplicate resource IDs in different subtrees', () => {
      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: function BranchA() {},
            path: ['app', 'branch-a'],
            children: [
              createMockFiber({
                type: function Service() {},
                path: ['app', 'branch-a', 'service'],
                cloudDOMNode: {
                  id: 'duplicate-id',
                  path: ['app', 'branch-a', 'service'],
                  construct: class ServiceConstruct {},
                  props: {},
                  children: [],
                },
              }),
            ],
          }),
          createMockFiber({
            type: function BranchB() {},
            path: ['app', 'branch-b'],
            children: [
              createMockFiber({
                type: function Service() {},
                path: ['app', 'branch-b', 'service'],
                cloudDOMNode: {
                  id: 'duplicate-id', // Same ID in different branch
                  path: ['app', 'branch-b', 'service'],
                  construct: class ServiceConstruct {},
                  props: {},
                  children: [],
                },
              }),
            ],
          }),
        ],
      });

      expectValidationError(
        () => validator.validate(fiber),
        /Duplicate resource ID: 'duplicate-id'/
      );
    });

    it('should detect resource ID collision due to path normalization', () => {
      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: function Service() {},
            path: ['app', 'My_Service'],
            cloudDOMNode: {
              id: 'app.my-service', // Normalized
              path: ['app', 'My_Service'],
              construct: class {},
              props: {},
              children: [],
            },
          }),
          createMockFiber({
            type: function Service() {},
            path: ['app', 'my-service'],
            cloudDOMNode: {
              id: 'app.my-service', // Same after normalization!
              path: ['app', 'my-service'],
              construct: class {},
              props: {},
              children: [],
            },
          }),
        ],
      });

      // Should detect duplicate ID
      expectValidationError(() => validator.validate(fiber), /Duplicate resource ID/);
    });
  });

  describe('Self-Referential Structures', () => {
    it('should detect when a node appears as its own child', () => {
      const selfRefNode = createMockFiber({
        type: function SelfRef() {},
        path: ['self-ref'],
      });

      // Create self-reference
      selfRefNode.children = [selfRefNode];

      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [selfRefNode],
      });

      expectValidationError(() => validator.validate(fiber), /Circular dependency detected/);
    });

    it('should detect circular dependency through cloudDOMNode references', () => {
      const node1 = createMockFiber({
        type: function Node1() {},
        path: ['app', 'node1'],
        cloudDOMNode: {
          id: 'app.node1',
          path: ['app', 'node1'],
          construct: class {},
          props: {},
          children: [],
        },
      });

      const node2 = createMockFiber({
        type: function Node2() {},
        path: ['app', 'node2'],
        children: [node1], // References node1
        cloudDOMNode: {
          id: 'app.node2',
          path: ['app', 'node2'],
          construct: class {},
          props: {},
          children: [node1.cloudDOMNode!], // Circular through cloudDOM
        },
      });

      // Add circular reference
      node1.children.push(node2);

      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [node1, node2],
      });

      // Should detect circular dependency
      expectValidationError(() => validator.validate(fiber));
    });

    it('should detect node referencing ancestor multiple levels up', () => {
      const grandchild = createMockFiber({
        type: function Grandchild() {},
        path: ['app', 'parent', 'child', 'grandchild'],
      });

      const child = createMockFiber({
        type: function Child() {},
        path: ['app', 'parent', 'child'],
        children: [grandchild],
      });

      const parent = createMockFiber({
        type: function Parent() {},
        path: ['app', 'parent'],
        children: [child],
      });

      // Grandchild references ancestor (parent)
      grandchild.children.push(parent);

      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [parent],
      });

      // Should detect circular dependency
      expectValidationError(() => validator.validate(fiber));
    });
  });

  describe('Invalid Path Data', () => {
    it('should handle empty path array gracefully', () => {
      const fiber = createMockFiber({
        type: function Component() {},
        path: [], // Empty path
      });

      // Should not crash
      expect(() => validator.validate(fiber)).not.toThrow();
    });

    it('should handle path with special characters', () => {
      const fiber = createMockFiber({
        type: function Component() {},
        path: ['app', 'service-name', 'sub.component'],
      });

      expect(() => validator.validate(fiber)).not.toThrow();
    });
  });

  describe('Partial Context Availability', () => {
    it('should identify which subtree failed context inheritance', () => {
      function Parent({ children }: any) {
        return null;
      }

      function ChildWithContext() {
        return null;
      }

      function ChildWithoutContext() {
        return null;
      }

      const fiber = createMockFiber({
        type: Parent,
        path: ['parent'],
        children: [
          createMockFiber({
            type: ChildWithContext,
            props: {
              __usesStackContext: true,
              __hasContextProvider: true, // Has context
            },
            path: ['parent', 'child-with-context'],
          }),
          createMockFiber({
            type: ChildWithoutContext,
            props: {
              __usesStackContext: true,
              __hasContextProvider: false, // Missing context
            },
            path: ['parent', 'child-without-context'],
          }),
        ],
      });

      try {
        validator.validate(fiber);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.message).toContain('ChildWithoutContext');
        expect(validationError.componentStack).toContain('ChildWithoutContext');
      }
    });
  });

  describe('Edge Case Props Values', () => {
    it('should handle required prop with NaN value', () => {
      function Component() {}
      Component.requiredProps = ['count'];

      const fiber = createMockFiber({
        type: Component,
        props: {
          count: NaN, // Technically defined but invalid
        },
        path: ['component'],
      });

      // NaN is present (not undefined), so validation passes
      expect(() => validator.validate(fiber)).not.toThrow();
    });

    it('should handle required prop with Infinity value', () => {
      function Component() {}
      Component.requiredProps = ['value'];

      const fiber = createMockFiber({
        type: Component,
        props: {
          value: Infinity,
        },
        path: ['component'],
      });

      // Infinity is a valid number value
      expect(() => validator.validate(fiber)).not.toThrow();
    });

    it('should handle required prop with -0 value', () => {
      function Component() {}
      Component.requiredProps = ['value'];

      const fiber = createMockFiber({
        type: Component,
        props: {
          value: -0,
        },
        path: ['component'],
      });

      // -0 is present (not undefined)
      expect(() => validator.validate(fiber)).not.toThrow();
    });

    it('should handle required prop with empty object', () => {
      function Component() {}
      Component.requiredProps = ['config'];

      const fiber = createMockFiber({
        type: Component,
        props: {
          config: {}, // Empty object - is this "present"?
        },
        path: ['component'],
      });

      // Empty object is present (not undefined)
      expect(() => validator.validate(fiber)).not.toThrow();
    });

    it('should handle required prop with deeply nested undefined', () => {
      function Component() {}
      Component.requiredProps = ['config'];

      const fiber = createMockFiber({
        type: Component,
        props: {
          config: {
            nested: {
              value: undefined,
            },
          },
        },
        path: ['component'],
      });

      // config is present (object exists), nested undefined is fine
      expect(() => validator.validate(fiber)).not.toThrow();
    });
  });

  describe('Resource ID Edge Cases', () => {
    it('should handle empty string resource ID', () => {
      const fiber = createMockFiber({
        type: function Component() {},
        path: ['component'],
        cloudDOMNode: {
          id: '', // Empty string
          path: ['component'],
          construct: class {},
          props: {},
          children: [],
        },
      });

      // Empty string is tracked (edge case)
      expect(() => validator.validate(fiber)).not.toThrow();
    });

    it('should handle resource IDs differing only by Unicode normalization', () => {
      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: function Service() {},
            path: ['app', 'café'], // Composed é
            cloudDOMNode: {
              id: 'app.café', // U+00E9
              path: ['app', 'café'],
              construct: class {},
              props: {},
              children: [],
            },
          }),
          createMockFiber({
            type: function Service() {},
            path: ['app', 'café'], // Decomposed é
            cloudDOMNode: {
              id: 'app.café', // U+0065 U+0301
              path: ['app', 'café'],
              construct: class {},
              props: {},
              children: [],
            },
          }),
        ],
      });

      // In Node.js, these are treated as the same string (duplicate detected)
      expectValidationError(() => validator.validate(fiber), /Duplicate resource ID/);
    });

    it('should handle resource ID exceeding 256 characters', () => {
      const longId = 'app.' + 'very-long-resource-name-'.repeat(20); // ~500 chars

      const fiber = createMockFiber({
        type: function Component() {},
        path: ['app', 'long-name'],
        cloudDOMNode: {
          id: longId,
          path: ['app', 'long-name'],
          construct: class {},
          props: {},
          children: [],
        },
      });

      // Should handle long IDs (validation doesn't enforce length limits)
      expect(() => validator.validate(fiber)).not.toThrow();
      expect(longId.length).toBeGreaterThan(256);
    });
  });

  describe('Validation State Issues', () => {
    it('should handle validator reused across multiple validation calls', () => {
      function Service() {}
      Service.requiredProps = ['name'];

      const fiber1 = createMockFiber({
        type: Service,
        props: { name: 'service1' },
        path: ['service1'],
        cloudDOMNode: {
          id: 'service1',
          path: ['service1'],
          construct: class {},
          props: {},
          children: [],
        },
      });

      const fiber2 = createMockFiber({
        type: Service,
        props: { name: 'service2' },
        path: ['service2'],
        cloudDOMNode: {
          id: 'service2',
          path: ['service2'],
          construct: class {},
          props: {},
          children: [],
        },
      });

      // First validation
      expect(() => validator.validate(fiber1)).not.toThrow();

      // Second validation should not be affected by first
      expect(() => validator.validate(fiber2)).not.toThrow();

      // Validate same tree again
      expect(() => validator.validate(fiber1)).not.toThrow();
    });

    it('should handle validation failure mid-way without corrupting state', () => {
      function Service() {}
      Service.requiredProps = ['name'];

      // First validation that fails
      const failingFiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: Service,
            props: {}, // Missing name - will fail
            path: ['app', 'service1'],
          }),
        ],
      });

      // Validation fails
      expectValidationError(() => validator.validate(failingFiber));

      // Second validation should work independently
      const passingFiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: Service,
            props: { name: 'service2' },
            path: ['app', 'service2'],
            cloudDOMNode: {
              id: 'app.service2',
              path: ['app', 'service2'],
              construct: class {},
              props: {},
              children: [],
            },
          }),
        ],
      });

      // Should pass - no state pollution from previous failure
      expect(() => validator.validate(passingFiber)).not.toThrow();
    });

    it('should handle validation with duplicate IDs not polluting next validation', () => {
      // First validation with duplicate IDs
      const duplicateFiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: function Service() {},
            path: ['app', 'service'],
            cloudDOMNode: {
              id: 'app.service',
              path: ['app', 'service'],
              construct: class {},
              props: {},
              children: [],
            },
          }),
          createMockFiber({
            type: function Service() {},
            path: ['app', 'service'],
            cloudDOMNode: {
              id: 'app.service', // Duplicate!
              path: ['app', 'service'],
              construct: class {},
              props: {},
              children: [],
            },
          }),
        ],
      });

      // Validation fails on duplicate
      expectValidationError(() => validator.validate(duplicateFiber));

      // Second validation with same ID should work (no pollution)
      const validFiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: function Service() {},
            path: ['app', 'service'],
            cloudDOMNode: {
              id: 'app.service', // Same ID, but only one instance
              path: ['app', 'service'],
              construct: class {},
              props: {},
              children: [],
            },
          }),
        ],
      });

      // Should pass - resourceIds Set was fresh
      expect(() => validator.validate(validFiber)).not.toThrow();
    });
  });

  describe('Error Quality', () => {
    it('should fail fast on first error (not collect all)', () => {
      function Service() {}
      Service.requiredProps = ['name', 'image'];

      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: Service,
            props: {}, // Missing both name and image
            path: ['app', 'service1'],
          }),
          createMockFiber({
            type: Service,
            props: {}, // Also missing both
            path: ['app', 'service2'],
          }),
        ],
      });

      // Should fail on first error
      try {
        validator.validate(fiber);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const message = (error as Error).message;
        expect(message).toContain('Missing required prop');
        expect(message).toContain('Service');
      }
    });
  });

  describe('Parameterized - Falsy Values', () => {
    it.each([
      [null, 'null', true],
      [undefined, 'undefined', false],
      [false, 'false', true],
      [0, 'zero', true],
      ['', 'empty string', true],
      [NaN, 'NaN', true],
      [-0, 'negative zero', true],
      [Infinity, 'Infinity', true],
      [-Infinity, 'negative Infinity', true],
    ])('should handle required prop with %s value (%s)', (value, description, shouldPass) => {
      function Component() {}
      Component.requiredProps = ['value'];

      const fiber = createMockFiber({
        type: Component,
        props: {
          value,
        },
        path: ['component'],
      });

      if (shouldPass) {
        // Value is present (not undefined)
        expect(() => validator.validate(fiber)).not.toThrow();
      } else {
        // undefined is missing
        expect(() => validator.validate(fiber)).toThrow();
      }
    });
  });

  describe('Parameterized - Special Characters in Paths', () => {
    it.each([
      ['service-name', 'hyphen'],
      ['service_name', 'underscore'],
      ['service.name', 'dot'],
      ['service/name', 'slash'],
      ['service:name', 'colon'],
      ['service@name', 'at sign'],
      ['service#name', 'hash'],
      ['service$name', 'dollar'],
      ['service%name', 'percent'],
      ['service&name', 'ampersand'],
      ['123-service', 'starts with number'],
      ['🚀-service', 'emoji'],
      ['café', 'unicode'],
    ])('should handle path segment: %s (%s)', (pathSegment, description) => {
      const fiber = createMockFiber({
        type: function Component() {},
        path: ['app', pathSegment],
      });

      // Should handle any path segment
      expect(() => validator.validate(fiber)).not.toThrow();
    });
  });

  describe('Parameterized - Resource ID Lengths', () => {
    it.each([
      [1, 'single character'],
      [10, 'short'],
      [50, 'medium'],
      [100, 'long'],
      [256, 'cloud provider limit'],
      [500, 'very long'],
      [1000, 'extremely long'],
    ])('should handle resource ID with %d characters (%s)', (length, description) => {
      const longId = 'a'.repeat(length);

      const fiber = createMockFiber({
        type: function Component() {},
        path: ['component'],
        cloudDOMNode: {
          id: longId,
          path: ['component'],
          construct: class {},
          props: {},
          children: [],
        },
      });

      // Should handle any length (no enforced limit)
      expect(() => validator.validate(fiber)).not.toThrow();
    });
  });
});
