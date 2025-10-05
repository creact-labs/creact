// Validator performance tests - Benchmarks and stress tests

import { describe, it, expect } from 'vitest';
import { Validator } from '@/core/Validator';
import { createMockFiber, createWideFiberTree, createDeepFiberTree } from '../helpers';

describe('Validator - Performance', () => {
  describe('Large Tree Validation', () => {
    it('should validate 10,000 nodes efficiently', () => {
      const validator = new Validator();

      function Service() {}
      Service.requiredProps = ['name'];

      // Create 10,000 sibling nodes
      const children = Array.from({ length: 10000 }, (_, i) =>
        createMockFiber({
          type: Service,
          props: { name: `service-${i}` },
          path: ['app', `service-${i}`],
          cloudDOMNode: {
            id: `app.service-${i}`,
            path: ['app', `service-${i}`],
            construct: class {},
            props: {},
            children: [],
          },
        })
      );

      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children,
      });

      const startTime = Date.now();
      expect(() => validator.validate(fiber)).not.toThrow();
      const duration = Date.now() - startTime;

      // Should complete in under 1 second for 10k nodes
      expect(duration).toBeLessThan(1000);
    });

    it('should validate wide tree (many siblings) efficiently', () => {
      const validator = new Validator();

      function Parent({ children }: any) {
        return null;
      }
      function Child() {
        return null;
      }

      // Create 1000 sibling nodes
      const children = Array.from({ length: 1000 }, (_, i) =>
        createMockFiber({
          type: Child,
          path: ['parent', `child-${i}`],
          cloudDOMNode: {
            id: `parent.child-${i}`,
            path: ['parent', `child-${i}`],
            construct: class {},
            props: {},
            children: [],
          },
        })
      );

      const fiber = createMockFiber({
        type: Parent,
        path: ['parent'],
        children,
      });

      const startTime = Date.now();
      expect(() => validator.validate(fiber)).not.toThrow();
      const duration = Date.now() - startTime;

      // Should complete quickly
      expect(duration).toBeLessThan(500);
    });

    it('should handle validation of tree with 1000+ unique resource IDs', () => {
      const validator = new Validator();

      const children = Array.from({ length: 1000 }, (_, i) =>
        createMockFiber({
          type: function Service() {},
          path: ['app', `service-${i}`],
          cloudDOMNode: {
            id: `app.service-${i}`,
            path: ['app', `service-${i}`],
            construct: class {},
            props: {},
            children: [],
          },
        })
      );

      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children,
      });

      const startTime = Date.now();
      expect(() => validator.validate(fiber)).not.toThrow();
      const duration = Date.now() - startTime;

      // Should handle 1000 unique IDs efficiently
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Deep Nesting', () => {
    it('should handle validation with 100-level deep nesting', () => {
      const validator = new Validator();

      // Create 100-level deep tree with UNIQUE paths at each level
      let current = createMockFiber({
        type: function Leaf() {},
        path: ['root', 'level100'],
      });

      for (let i = 99; i >= 0; i--) {
        current = createMockFiber({
          type: function Level() {},
          path: ['root', `level${i}`],
          children: [current],
        });
      }

      const startTime = Date.now();
      expect(() => validator.validate(current)).not.toThrow();
      const duration = Date.now() - startTime;

      // Should complete quickly even with deep nesting
      expect(duration).toBeLessThan(100);
    });

    it('should handle component stack depth exceeding 50 levels', () => {
      const validator = new Validator();

      // Create deeply nested tree with UNIQUE paths at each level
      let current = createMockFiber({
        type: function Level50() {},
        path: ['root', 'level50'],
      });

      for (let i = 49; i >= 0; i--) {
        current = createMockFiber({
          type: function Level() {},
          path: ['root', `level${i}`],
          children: [current],
        });
      }

      // Should handle deep stack without issues
      expect(() => validator.validate(current)).not.toThrow();
    });

    it('should validate large tree (6 levels deep) efficiently', () => {
      const validator = new Validator();

      function Level1({ children }: any) {
        return null;
      }
      function Level2({ children }: any) {
        return null;
      }
      function Level3({ children }: any) {
        return null;
      }
      function Level4({ children }: any) {
        return null;
      }
      function Level5({ children }: any) {
        return null;
      }
      function Level6() {
        return null;
      }

      const fiber = createMockFiber({
        type: Level1,
        path: ['l1'],
        children: [
          createMockFiber({
            type: Level2,
            path: ['l1', 'l2'],
            children: [
              createMockFiber({
                type: Level3,
                path: ['l1', 'l2', 'l3'],
                children: [
                  createMockFiber({
                    type: Level4,
                    path: ['l1', 'l2', 'l3', 'l4'],
                    children: [
                      createMockFiber({
                        type: Level5,
                        path: ['l1', 'l2', 'l3', 'l4', 'l5'],
                        children: [
                          createMockFiber({
                            type: Level6,
                            path: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      const startTime = Date.now();
      expect(() => validator.validate(fiber)).not.toThrow();
      const duration = Date.now() - startTime;

      // Should complete quickly (< 100ms for this size)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Parameterized - Tree Depths', () => {
    it.each([
      [1, 'single level'],
      [5, 'shallow'],
      [10, 'medium'],
      [20, 'deep'],
      [50, 'very deep'],
    ])('should validate tree with %d levels (%s)', (depth, description) => {
      const validator = new Validator();

      // Create tree with specified depth
      let current = createMockFiber({
        type: function Leaf() {},
        path: ['root', `level${depth}`],
      });

      for (let i = depth - 1; i >= 0; i--) {
        current = createMockFiber({
          type: function Level() {},
          path: ['root', `level${i}`],
          children: [current],
        });
      }

      const startTime = Date.now();
      expect(() => validator.validate(current)).not.toThrow();
      const duration = Date.now() - startTime;

      // Should complete quickly regardless of depth
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Parameterized - Sibling Counts', () => {
    it.each([
      [1, 'single child'],
      [10, 'few children'],
      [100, 'many children'],
      [1000, 'very many children'],
    ])('should validate node with %d siblings (%s)', (count, description) => {
      const validator = new Validator();

      const children = Array.from({ length: count }, (_, i) =>
        createMockFiber({
          type: function Child() {},
          path: ['parent', `child-${i}`],
          cloudDOMNode: {
            id: `parent.child-${i}`,
            path: ['parent', `child-${i}`],
            construct: class {},
            props: {},
            children: [],
          },
        })
      );

      const fiber = createMockFiber({
        type: function Parent() {},
        path: ['parent'],
        children,
      });

      const startTime = Date.now();
      expect(() => validator.validate(fiber)).not.toThrow();
      const duration = Date.now() - startTime;

      // Performance should scale linearly
      const expectedMax = count * 0.5; // 0.5ms per node
      expect(duration).toBeLessThan(Math.max(expectedMax, 100));
    });
  });

  describe('Concurrent Validation', () => {
    it('should handle concurrent validation of same tree', async () => {
      const validator = new Validator();

      function Service() {}
      Service.requiredProps = ['name'];

      const fiber = createMockFiber({
        type: Service,
        props: { name: 'service' },
        path: ['service'],
        cloudDOMNode: {
          id: 'service',
          path: ['service'],
          construct: class {},
          props: {},
          children: [],
        },
      });

      // Concurrent validations
      const validations = [
        Promise.resolve(validator.validate(fiber)),
        Promise.resolve(validator.validate(fiber)),
        Promise.resolve(validator.validate(fiber)),
      ];

      // All should succeed
      await expect(Promise.all(validations)).resolves.not.toThrow();
    });
  });
});
