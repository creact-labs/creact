// Integration Pipeline Tests - Full workflow scenarios

import { describe, it, expect, vi } from 'vitest';
import { Renderer } from '@/core/Renderer';
import { Validator } from '@/core/Validator';
import { DummyCloudProvider } from '@/providers/DummyCloudProvider';
import { DummyBackendProvider } from '@/providers/DummyBackendProvider';
import { CloudDOMNode } from '@/core/types';
import { createMockFiber } from '../helpers';

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

describe('Integration Pipeline', () => {
  describe('Full Pipeline: Render → Validate → Materialize → Save State', () => {
    it('should complete full pipeline successfully', async () => {
      const renderer = new Renderer();
      const validator = new Validator();
      const cloudProvider = new DummyCloudProvider();
      const backendProvider = new DummyBackendProvider();

      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Initialize providers
      await cloudProvider.initialize();
      await backendProvider.initialize();

      // Define infrastructure
      function App({ children }: any) {
        return children;
      }

      function Service({ name }: any) {
        return null;
      }
      Service.requiredProps = ['name'];

      // Step 1: Render JSX to Fiber
      const jsx = createElement(
        App,
        {},
        createElement(Service, { name: 'api' }),
        createElement(Service, { name: 'worker' })
      );

      const fiber = renderer.render(jsx);
      expect(fiber).toBeDefined();
      expect(fiber.children).toHaveLength(2);

      // Step 2: Validate Fiber
      expect(() => validator.validate(fiber)).not.toThrow();

      // Step 3: Attach CloudDOM nodes (simulated)
      fiber.children[0].cloudDOMNode = {
        id: 'app.api',
        path: ['app', 'api'],
        construct: class ServiceConstruct {},
        props: { name: 'api' },
        children: [],
        outputs: { url: 'https://api.example.com' },
      };

      fiber.children[1].cloudDOMNode = {
        id: 'app.worker',
        path: ['app', 'worker'],
        construct: class ServiceConstruct {},
        props: { name: 'worker' },
        children: [],
        outputs: { url: 'https://worker.example.com' },
      };

      // Step 4: Extract CloudDOM
      const cloudDOM: CloudDOMNode[] = [
        fiber.children[0].cloudDOMNode!,
        fiber.children[1].cloudDOMNode!,
      ];

      // Step 5: Run lifecycle hooks
      await cloudProvider.preDeploy!(cloudDOM);
      cloudProvider.materialize(cloudDOM);
      await cloudProvider.postDeploy!(cloudDOM, {
        'app.api.url': 'https://api.example.com',
        'app.worker.url': 'https://worker.example.com',
      });

      // Step 6: Save state
      await backendProvider.saveState('app', {
        resources: cloudDOM.map((n) => n.id),
        outputs: {
          'app.api.url': 'https://api.example.com',
          'app.worker.url': 'https://worker.example.com',
        },
      });

      // Step 7: Verify state
      const state = await backendProvider.getState('app');
      expect(state).toEqual({
        resources: ['app.api', 'app.worker'],
        outputs: {
          'app.api.url': 'https://api.example.com',
          'app.worker.url': 'https://worker.example.com',
        },
      });

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should handle error in middle of pipeline with partial state', async () => {
      const renderer = new Renderer();
      const validator = new Validator();
      const cloudProvider = new DummyCloudProvider();
      const backendProvider = new DummyBackendProvider();

      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await cloudProvider.initialize();
      await backendProvider.initialize();

      // Save initial state
      await backendProvider.saveState('app', { version: 1 });

      function Service({ name }: any) {
        return null;
      }
      Service.requiredProps = ['name'];

      // Render with missing required prop (will fail validation)
      const jsx = createElement(Service, {}); // Missing 'name'

      const fiber = renderer.render(jsx);

      // Validation fails
      expect(() => validator.validate(fiber)).toThrow();

      // State should remain unchanged
      const state = await backendProvider.getState('app');
      expect(state).toEqual({ version: 1 });

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle rollback scenario on deployment failure', async () => {
      const cloudProvider = new DummyCloudProvider();
      const backendProvider = new DummyBackendProvider();

      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await cloudProvider.initialize();
      await backendProvider.initialize();

      // Save initial state
      await backendProvider.saveState('app', { deployed: false });

      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'app.service',
          path: ['app', 'service'],
          construct: class {},
          props: {},
          children: [],
        },
      ];

      // Simulate deployment failure
      const error = new Error('Deployment failed');
      await cloudProvider.onError!(error, cloudDOM);

      // State should remain unchanged (rollback)
      const state = await backendProvider.getState('app');
      expect(state).toEqual({ deployed: false });

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('State Consistency Across Pipeline', () => {
    it('should maintain state consistency when validation passes but materialization fails', async () => {
      const renderer = new Renderer();
      const validator = new Validator();
      const backendProvider = new DummyBackendProvider();

      await backendProvider.initialize();

      // Save initial state
      await backendProvider.saveState('app', { status: 'initial' });

      function Service({ name }: any) {
        return null;
      }
      Service.requiredProps = ['name'];

      const jsx = createElement(Service, { name: 'api' });
      const fiber = renderer.render(jsx);

      // Validation passes
      expect(() => validator.validate(fiber)).not.toThrow();

      // Simulate materialization failure (not actually calling materialize)
      // State should remain unchanged
      const state = await backendProvider.getState('app');
      expect(state).toEqual({ status: 'initial' });
    });

    it('should handle concurrent pipeline executions', async () => {
      const renderer1 = new Renderer();
      const renderer2 = new Renderer();
      const validator = new Validator();
      const backendProvider = new DummyBackendProvider();

      await backendProvider.initialize();

      function Service({ name }: any) {
        return null;
      }

      // Execute two pipelines concurrently
      const pipeline1 = (async () => {
        const jsx = createElement(Service, { name: 'service1' });
        const fiber = renderer1.render(jsx);
        validator.validate(fiber);
        await backendProvider.saveState('stack1', { service: 'service1' });
      })();

      const pipeline2 = (async () => {
        const jsx = createElement(Service, { name: 'service2' });
        const fiber = renderer2.render(jsx);
        validator.validate(fiber);
        await backendProvider.saveState('stack2', { service: 'service2' });
      })();

      await Promise.all([pipeline1, pipeline2]);

      // Both should succeed independently
      const state1 = await backendProvider.getState('stack1');
      const state2 = await backendProvider.getState('stack2');

      expect(state1).toEqual({ service: 'service1' });
      expect(state2).toEqual({ service: 'service2' });
    });
  });
});
