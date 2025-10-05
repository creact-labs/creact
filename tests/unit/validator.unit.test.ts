// REQ-07: Validator unit tests - Core validation functionality

import { describe, it, expect, beforeEach } from 'vitest';
import { Validator, ValidationError } from '@/core/Validator';
import { createMockFiber, expectValidationError } from '../helpers';
import { FiberNode } from '@/core/types';

describe('Validator - Core Functionality', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
  });

  describe('Basic Validation', () => {
    it('should validate a simple Fiber tree without errors', () => {
      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
      });

      expect(() => validator.validate(fiber)).not.toThrow();
    });

    it('should throw error for null Fiber tree', () => {
      expect(() => validator.validate(null)).toThrow('Cannot validate null Fiber tree');
    });
  });

  describe('Required Props Validation', () => {
    it('should pass when all required props are present', () => {
      function Service() {}
      Service.requiredProps = ['name', 'image'];

      const fiber = createMockFiber({
        type: Service,
        props: {
          name: 'api',
          image: 'my-image:latest',
        },
        path: ['service'],
      });

      expect(() => validator.validate(fiber)).not.toThrow();
    });

    it('should fail when required prop is missing', () => {
      function Service() {}
      Service.requiredProps = ['name', 'image'];

      const fiber = createMockFiber({
        type: Service,
        props: {
          name: 'api',
          // image is missing
        },
        path: ['service'],
      });

      expectValidationError(
        () => validator.validate(fiber),
        /Missing required prop 'image'/
      );
    });

    it('should fail when required prop is undefined', () => {
      function Service() {}
      Service.requiredProps = ['name'];

      const fiber = createMockFiber({
        type: Service,
        props: {
          name: undefined,
        },
        path: ['service'],
      });

      expectValidationError(
        () => validator.validate(fiber),
        /Missing required prop 'name'/
      );
    });

    it('should include component stack trace in error', () => {
      function Parent() {}
      function Child() {}
      Child.requiredProps = ['value'];

      const fiber = createMockFiber({
        type: Parent,
        path: ['parent'],
        children: [
          createMockFiber({
            type: Child,
            props: {}, // missing 'value'
            path: ['parent', 'child'],
          }),
        ],
      });

      try {
        validator.validate(fiber);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.message).toContain('Component stack:');
        expect(validationError.message).toContain('in Parent');
        expect(validationError.message).toContain('in Child');
      }
    });
  });

  describe('Resource ID Uniqueness', () => {
    it('should pass when all resource IDs are unique', () => {
      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: function ServiceA() {},
            path: ['app', 'service-a'],
            cloudDOMNode: {
              id: 'app.service-a',
              path: ['app', 'service-a'],
              construct: class ServiceConstruct {},
              props: {},
              children: [],
            },
          }),
          createMockFiber({
            type: function ServiceB() {},
            path: ['app', 'service-b'],
            cloudDOMNode: {
              id: 'app.service-b',
              path: ['app', 'service-b'],
              construct: class ServiceConstruct {},
              props: {},
              children: [],
            },
          }),
        ],
      });

      expect(() => validator.validate(fiber)).not.toThrow();
    });

    it('should fail when resource IDs are duplicated', () => {
      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: function ServiceA() {},
            path: ['app', 'service'],
            cloudDOMNode: {
              id: 'app.service',
              path: ['app', 'service'],
              construct: class ServiceConstruct {},
              props: {},
              children: [],
            },
          }),
          createMockFiber({
            type: function ServiceB() {},
            path: ['app', 'service'],
            cloudDOMNode: {
              id: 'app.service', // Duplicate ID
              path: ['app', 'service'],
              construct: class ServiceConstruct {},
              props: {},
              children: [],
            },
          }),
        ],
      });

      expectValidationError(
        () => validator.validate(fiber),
        /Duplicate resource ID: 'app\.service'/
      );
    });
  });

  describe('Context Availability', () => {
    it('should pass when context is available', () => {
      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: function Service() {},
            props: {
              __usesStackContext: true,
              __hasContextProvider: true, // Provider is available
            },
            path: ['app', 'service'],
          }),
        ],
      });

      expect(() => validator.validate(fiber)).not.toThrow();
    });

    it('should fail when useStackContext is called without provider', () => {
      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: function Service() {},
            props: {
              __usesStackContext: true,
              __hasContextProvider: false, // No provider
            },
            path: ['app', 'service'],
          }),
        ],
      });

      expectValidationError(
        () => validator.validate(fiber),
        /useStackContext\(\) called.*but no StackContext\.Provider found/
      );
    });
  });

  describe('Circular Dependencies', () => {
    it('should detect circular dependencies', () => {
      // Create a circular reference
      const childNode = createMockFiber({
        type: function Child() {},
        path: ['app', 'child'],
      });

      // Add circular reference
      childNode.children = [childNode];

      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [childNode],
      });

      expectValidationError(
        () => validator.validate(fiber),
        /Circular dependency detected/
      );
    });

    it('should allow same subpath in different sibling branches', () => {
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
              }),
            ],
          }),
        ],
      });

      // Should not throw - different paths in different branches
      expect(() => validator.validate(fiber)).not.toThrow();
    });
  });

  describe('Error Formatting', () => {
    it('should include file path in error message when available', () => {
      function Service() {}
      Service.requiredProps = ['name'];
      Service.__source = {
        fileName: 'infrastructure.tsx',
        lineNumber: 42,
      };

      const fiber = createMockFiber({
        type: Service,
        props: {},
        path: ['service'],
      });

      try {
        validator.validate(fiber);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.message).toContain('infrastructure.tsx:42');
        expect(validationError.filePath).toBe('infrastructure.tsx');
        expect(validationError.lineNumber).toBe(42);
      }
    });

    it('should provide quick summary for dev tools', () => {
      function Service() {}
      Service.requiredProps = ['name'];
      Service.__source = {
        fileName: 'infrastructure.tsx',
        lineNumber: 42,
      };

      const fiber = createMockFiber({
        type: Service,
        props: {},
        path: ['service'],
      });

      try {
        validator.validate(fiber);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.summary).toBe(
          "Missing required prop 'name' in Service component (infrastructure.tsx)"
        );
      }
    });

    it('should format error with component stack', () => {
      function Registry() {}
      function Service() {}
      Service.requiredProps = ['name'];

      const fiber = createMockFiber({
        type: Registry,
        path: ['registry'],
        children: [
          createMockFiber({
            type: Service,
            props: {},
            path: ['registry', 'service'],
          }),
        ],
      });

      try {
        validator.validate(fiber);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;

        // Check component stack
        expect(validationError.componentStack).toEqual(['Registry', 'Service']);

        // Check formatted message
        expect(validationError.message).toContain('Component stack:');
        expect(validationError.message).toContain('in Registry');
        expect(validationError.message).toContain('in Service');
      }
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('should validate nested component tree', () => {
      function App() {}
      function Registry() {}
      function Service() {}
      Service.requiredProps = ['name'];

      const fiber = createMockFiber({
        type: App,
        path: ['app'],
        children: [
          createMockFiber({
            type: Registry,
            path: ['app', 'registry'],
            children: [
              createMockFiber({
                type: Service,
                props: { name: 'api' },
                path: ['app', 'registry', 'service-api'],
                cloudDOMNode: {
                  id: 'app.registry.service-api',
                  path: ['app', 'registry', 'service-api'],
                  construct: class ServiceConstruct {},
                  props: { name: 'api' },
                  children: [],
                },
              }),
              createMockFiber({
                type: Service,
                props: { name: 'worker' },
                path: ['app', 'registry', 'service-worker'],
                cloudDOMNode: {
                  id: 'app.registry.service-worker',
                  path: ['app', 'registry', 'service-worker'],
                  construct: class ServiceConstruct {},
                  props: { name: 'worker' },
                  children: [],
                },
              }),
            ],
          }),
        ],
      });

      expect(() => validator.validate(fiber)).not.toThrow();
    });

    it('should catch multiple validation errors in order', () => {
      function Service() {}
      Service.requiredProps = ['name'];

      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: Service,
            props: {}, // Missing 'name'
            path: ['app', 'service-1'],
          }),
          createMockFiber({
            type: Service,
            props: {}, // Missing 'name'
            path: ['app', 'service-2'],
          }),
        ],
      });

      // Should fail on first error
      expectValidationError(
        () => validator.validate(fiber),
        /Missing required prop 'name'/
      );
    });
  });

  describe('PropTypes Support', () => {
    it('should validate PropTypes with isRequired', () => {
      function Service() {}
      Service.propTypes = {
        name: { isRequired: true },
        image: { isRequired: true },
        optional: {},
      };

      const fiber = createMockFiber({
        type: Service,
        props: {
          name: 'api',
          // image is missing
          optional: 'value',
        },
        path: ['service'],
      });

      expectValidationError(
        () => validator.validate(fiber),
        /Missing required prop 'image'/
      );
    });

    it('should handle PropTypes with conditional requirements', () => {
      function Service() {}
      Service.propTypes = {
        name: { isRequired: true },
        image: { isRequired: true },
        optional: {}, // Not required
      };

      const fiber = createMockFiber({
        type: Service,
        props: {
          name: 'api',
          image: 'my-image:latest',
          // optional is not provided, but that's fine
        },
        path: ['service'],
      });

      expect(() => validator.validate(fiber)).not.toThrow();
    });
  });
});
