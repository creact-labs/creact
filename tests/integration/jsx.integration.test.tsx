/**
 * Integration tests for JSX syntax with CReact components
 * 
 * Tests verify:
 * - JSX syntax works with infrastructure components
 * - TypeScript type checking validates props
 * - JSX integrates with Renderer and CloudDOM pipeline
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CReact } from '../../src/jsx';
import { Renderer } from '../../src/core/Renderer';
import { useInstance } from '../../src/hooks/useInstance';

// Mock infrastructure constructs
class EcrRepository {
  constructor(public props: any) {}
}

class AppRunnerService {
  constructor(public props: any) {}
}

class RDSInstance {
  constructor(public props: any) {}
}

describe('JSX Integration with CReact', () => {
  let renderer: Renderer;

  beforeEach(() => {
    renderer = new Renderer();
  });

  describe('Infrastructure components with JSX', () => {
    it('should render simple infrastructure component', () => {
      function Registry() {
        const repo = useInstance(EcrRepository, { key: 'repo', name: 'my-app' });
        return null;
      }

      // Using JSX syntax
      const element = <Registry />;
      
      expect(element.type).toBe(Registry);
      expect(element.props).toEqual({});
    });

    it('should render component with props', () => {
      interface ServiceProps {
        name: string;
        port?: number;
      }

      function Service({ name, port }: ServiceProps) {
        const service = useInstance(AppRunnerService, { 
          key: 'service',
          name,
          port: port || 8080
        });
        return null;
      }

      // Using JSX syntax with props
      const element = <Service name="api" port={3000} />;
      
      expect(element.type).toBe(Service);
      expect(element.props).toEqual({ name: 'api', port: 3000 });
    });

    it('should render nested infrastructure components', () => {
      function Service({ name }: { name: string }) {
        const service = useInstance(AppRunnerService, { key: 'service', name });
        return null;
      }

      function RegistryStack({ children }: { children?: any }) {
        const repo = useInstance(EcrRepository, { key: 'repo', name: 'my-app' });
        return children;
      }

      // Using JSX syntax with nesting
      const element = (
        <RegistryStack>
          <Service name="api" />
          <Service name="worker" />
        </RegistryStack>
      );
      
      expect(element.type).toBe(RegistryStack);
      expect(Array.isArray(element.props.children)).toBe(true);
      expect(element.props.children).toHaveLength(2);
      expect(element.props.children[0].type).toBe(Service);
      expect(element.props.children[1].type).toBe(Service);
    });

    it('should handle key prop for resource identity', () => {
      function Database({ name }: { name: string }) {
        const db = useInstance(RDSInstance, { key: 'db', name });
        return null;
      }

      // Using JSX with key prop
      const element = <Database key="primary" name="app-db" />;
      
      expect(element.key).toBe('primary');
      expect(element.props).toEqual({ name: 'app-db' });
      expect(element.props.key).toBeUndefined();
    });

    it('should support Fragment for grouping', () => {
      function Service({ name }: { name: string }) {
        const service = useInstance(AppRunnerService, { key: 'service', name });
        return null;
      }

      // Using Fragment syntax
      const element = (
        <>
          <Service name="api" />
          <Service name="worker" />
        </>
      );
      
      expect(element.type).toBe(CReact.Fragment);
      expect(Array.isArray(element.props.children)).toBe(true);
      expect(element.props.children).toHaveLength(2);
    });
  });

  describe('JSX with Renderer integration', () => {
    it('should render JSX to Fiber tree', () => {
      function Registry() {
        const repo = useInstance(EcrRepository, { key: 'repo', name: 'my-app' });
        return null;
      }

      const element = <Registry />;
      const fiber = renderer.render(element);
      
      expect(fiber).toBeDefined();
      expect(fiber.type).toBe(Registry);
    });

    it('should render nested JSX to Fiber tree', () => {
      function Service({ name }: { name: string }) {
        const service = useInstance(AppRunnerService, { key: 'service', name });
        return null;
      }

      function Infrastructure() {
        return (
          <>
            <Service name="api" />
            <Service name="worker" />
          </>
        );
      }

      const element = <Infrastructure />;
      const fiber = renderer.render(element);
      
      expect(fiber).toBeDefined();
      expect(fiber.type).toBe(Infrastructure);
    });
  });

  describe('Complex infrastructure scenarios', () => {
    it('should handle multi-tier infrastructure', () => {
      function Database({ name }: { name: string }) {
        const db = useInstance(RDSInstance, { key: 'db', name });
        return null;
      }

      function Service({ name }: { name: string }) {
        const service = useInstance(AppRunnerService, { key: 'service', name });
        return null;
      }

      function Registry({ children }: { children?: any }) {
        const repo = useInstance(EcrRepository, { key: 'repo', name: 'my-app' });
        return children;
      }

      function Infrastructure() {
        return (
          <Registry>
            <Database name="app-db" />
            <Service name="api" />
            <Service name="worker" />
          </Registry>
        );
      }

      const element = <Infrastructure />;
      
      expect(element.type).toBe(Infrastructure);
      expect(element.props).toEqual({});
    });

    it('should handle conditional rendering', () => {
      function Service({ name }: { name: string }) {
        const service = useInstance(AppRunnerService, { key: 'service', name });
        return null;
      }

      function Infrastructure({ includeWorker }: { includeWorker: boolean }) {
        return (
          <>
            <Service name="api" />
            {includeWorker && <Service name="worker" />}
          </>
        );
      }

      const withWorker = <Infrastructure includeWorker={true} />;
      const withoutWorker = <Infrastructure includeWorker={false} />;
      
      expect(withWorker.props.includeWorker).toBe(true);
      expect(withoutWorker.props.includeWorker).toBe(false);
    });

    it('should handle mapped components', () => {
      function Service({ name }: { name: string }) {
        const service = useInstance(AppRunnerService, { key: 'service', name });
        return null;
      }

      function Infrastructure() {
        const services = ['api', 'worker', 'scheduler'];
        return (
          <>
            {services.map(name => <Service key={name} name={name} />)}
          </>
        );
      }

      const element = <Infrastructure />;
      
      expect(element.type).toBe(Infrastructure);
    });
  });
});
