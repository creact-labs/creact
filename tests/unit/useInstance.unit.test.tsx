/** @jsx CReact.createElement */
/** @jsxFrag CReact.Fragment */

/**
 * Unit tests for useInstance hook with React-like API (Task 12 / REQ-04)
 * Tests key extraction, auto-ID generation, and multiple calls with same type
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CReact } from '../../src/jsx';
import { Renderer } from '../../src/core/Renderer';
import { useInstance } from '../../src/hooks/useInstance';

// Mock infrastructure constructs
class EcrRepository {
  constructor(public props: any) {}
}

class RDSInstance {
  constructor(public props: any) {}
}

class S3Bucket {
  constructor(public props: any) {}
}

class AppRunnerService {
  constructor(public props: any) {}
}

describe('useInstance Hook - React-like API', () => {
  let renderer: Renderer;

  beforeEach(() => {
    renderer = new Renderer();
  });

  describe('Key prop extraction', () => {
    it('should use key prop as resource ID', () => {
      function Registry() {
        const repo = useInstance(EcrRepository, { key: 'repo', name: 'my-app' });
        expect(repo.id).toBe('registry.repo');
        return null;
      }

      const element = <Registry />;
      renderer.render(element);
    });

    it('should extract key and remove from props', () => {
      function Registry() {
        const repo = useInstance(EcrRepository, { key: 'repo', name: 'my-app' });
        expect(repo.props.key).toBeUndefined();
        expect(repo.props.name).toBe('my-app');
        return null;
      }

      const element = <Registry />;
      renderer.render(element);
    });

    it('should handle string keys', () => {
      function Registry() {
        const repo = useInstance(EcrRepository, { key: 'my-repo', name: 'app' });
        expect(repo.id).toBe('registry.my-repo');
        return null;
      }

      const element = <Registry />;
      renderer.render(element);
    });

    it('should handle numeric keys', () => {
      function Registry() {
        const repo = useInstance(EcrRepository, { key: 123, name: 'app' });
        expect(repo.id).toBe('registry.123');
        return null;
      }

      const element = <Registry />;
      renderer.render(element);
    });
  });

  describe('Auto-ID generation from construct type', () => {
    it('should auto-generate ID from construct type name', () => {
      function Registry() {
        const repo = useInstance(EcrRepository, { name: 'my-app' });
        expect(repo.id).toBe('registry.ecr-repository');
        return null;
      }

      const element = <Registry />;
      renderer.render(element);
    });

    it('should lowercase construct type name', () => {
      function Database() {
        const db = useInstance(RDSInstance, { name: 'app-db' });
        expect(db.id).toBe('database.rdsinstance');
        return null;
      }

      const element = <Database />;
      renderer.render(element);
    });

    it('should handle single-word construct names', () => {
      function Storage() {
        const bucket = useInstance(S3Bucket, { name: 'assets' });
        expect(bucket.id).toBe('storage.s-3-bucket');
        return null;
      }

      const element = <Storage />;
      renderer.render(element);
    });
  });

  describe('Multiple calls with same construct type', () => {
    it('should append index for multiple calls without keys', () => {
      function MultiDatabase() {
        const db1 = useInstance(RDSInstance, { name: 'db-1' });
        const db2 = useInstance(RDSInstance, { name: 'db-2' });

        expect(db1.id).toBe('multi-database.rdsinstance');
        expect(db2.id).toBe('multi-database.rdsinstance-1');
        return null;
      }

      const element = <MultiDatabase />;
      renderer.render(element);
    });

    it('should handle three or more calls', () => {
      function MultiService() {
        const svc1 = useInstance(AppRunnerService, { name: 'api' });
        const svc2 = useInstance(AppRunnerService, { name: 'worker' });
        const svc3 = useInstance(AppRunnerService, { name: 'scheduler' });

        expect(svc1.id).toBe('multi-service.app-runner-service');
        expect(svc2.id).toBe('multi-service.app-runner-service-1');
        expect(svc3.id).toBe('multi-service.app-runner-service-2');
        return null;
      }

      const element = <MultiService />;
      renderer.render(element);
    });

    it('should not append index when using explicit keys', () => {
      function MultiDatabase() {
        const primary = useInstance(RDSInstance, { key: 'primary', name: 'db-primary' });
        const replica = useInstance(RDSInstance, { key: 'replica', name: 'db-replica' });

        expect(primary.id).toBe('multi-database.primary');
        expect(replica.id).toBe('multi-database.replica');
        return null;
      }

      const element = <MultiDatabase />;
      renderer.render(element);
    });

    it('should handle mix of keyed and auto-generated IDs', () => {
      function MixedDatabase() {
        const primary = useInstance(RDSInstance, { key: 'primary', name: 'db-primary' });
        const auto1 = useInstance(RDSInstance, { name: 'db-auto-1' });
        const auto2 = useInstance(RDSInstance, { name: 'db-auto-2' });

        expect(primary.id).toBe('mixed-database.primary');
        expect(auto1.id).toBe('mixed-database.rdsinstance');
        expect(auto2.id).toBe('mixed-database.rdsinstance-1');
        return null;
      }

      const element = <MixedDatabase />;
      renderer.render(element);
    });
  });

  describe('CloudDOM node creation', () => {
    it('should create node with correct structure', () => {
      function Registry() {
        const repo = useInstance(EcrRepository, { key: 'repo', name: 'my-app' });

        expect(repo).toMatchObject({
          id: 'registry.repo',
          path: ['registry', 'repo'],
          construct: EcrRepository,
          props: { name: 'my-app' },
          children: [],
          outputs: {},
        });
        return null;
      }

      const element = <Registry />;
      renderer.render(element);
    });

    it('should store construct type correctly', () => {
      function Registry() {
        const repo = useInstance(EcrRepository, { key: 'repo', name: 'my-app' });
        expect(repo.construct).toBe(EcrRepository);
        expect(repo.construct.name).toBe('EcrRepository');
        return null;
      }

      const element = <Registry />;
      renderer.render(element);
    });

    it('should clone props without key', () => {
      function Registry() {
        const originalProps = { key: 'repo', name: 'my-app', tags: { env: 'prod' } };
        const repo = useInstance(EcrRepository, originalProps);

        expect(repo.props).toEqual({ name: 'my-app', tags: { env: 'prod' } });
        expect(repo.props.key).toBeUndefined();
        return null;
      }

      const element = <Registry />;
      renderer.render(element);
    });

    it('should handle empty props', () => {
      function Registry() {
        const repo = useInstance(EcrRepository, {});
        expect(repo.props).toEqual({});
        return null;
      }

      const element = <Registry />;
      renderer.render(element);
    });

    it('should handle complex nested props', () => {
      function Storage() {
        const bucket = useInstance(S3Bucket, {
          key: 'assets',
          lifecycle: {
            rules: [
              { id: 'rule1', enabled: true },
              { id: 'rule2', enabled: false },
            ],
          },
          cors: {
            allowedOrigins: ['*'],
            allowedMethods: ['GET', 'POST'],
          },
        });

        expect(bucket.props.lifecycle).toBeDefined();
        expect(bucket.props.cors).toBeDefined();
        return null;
      }

      const element = <Storage />;
      renderer.render(element);
    });
  });

  describe('Hierarchical path generation', () => {
    it('should generate full path from component hierarchy', () => {
      function Service() {
        const svc = useInstance(AppRunnerService, { key: 'api', name: 'api' });
        expect(svc.path).toEqual(['registry-stack', 'service', 'api']);
        expect(svc.id).toBe('registry-stack.service.api');
        return null;
      }

      function RegistryStack() {
        return <Service />;
      }

      const element = <RegistryStack />;
      renderer.render(element);
    });

    it('should handle deeply nested components', () => {
      function Database() {
        const db = useInstance(RDSInstance, { key: 'db', name: 'app-db' });
        expect(db.path).toEqual(['app', 'region', 'vpc', 'database', 'db']);
        return null;
      }

      function VPC() {
        return <Database />;
      }

      function Region() {
        return <VPC />;
      }

      function App() {
        return <Region />;
      }

      const element = <App />;
      renderer.render(element);
    });
  });

  describe('Node attachment to Fiber', () => {
    it('should attach node to Fiber cloudDOMNodes', () => {
      function Registry() {
        useInstance(EcrRepository, { key: 'repo', name: 'my-app' });
        return null;
      }

      const element = <Registry />;
      const fiber = renderer.render(element);

      expect(fiber.cloudDOMNodes).toBeDefined();
      expect(fiber.cloudDOMNodes?.length).toBe(1);
      expect(fiber.cloudDOMNodes?.[0].id).toBe('registry.repo');
    });

    it('should attach multiple nodes to same Fiber', () => {
      function Infrastructure() {
        useInstance(EcrRepository, { key: 'repo', name: 'my-app' });
        useInstance(S3Bucket, { key: 'assets', name: 'assets' });
        useInstance(RDSInstance, { key: 'db', name: 'app-db' });
        return null;
      }

      const element = <Infrastructure />;
      const fiber = renderer.render(element);

      expect(fiber.cloudDOMNodes?.length).toBe(3);
    });
  });

  describe('Reference return', () => {
    it('should return reference that can be used for dependencies', () => {
      function Infrastructure() {
        const bucket = useInstance(S3Bucket, { key: 'assets', name: 'assets' });
        const service = useInstance(AppRunnerService, {
          key: 'api',
          name: 'api',
          environment: {
            BUCKET_NAME: bucket.id,
          },
        });

        expect(service.props.environment.BUCKET_NAME).toBe('infrastructure.assets');
        return null;
      }

      const element = <Infrastructure />;
      renderer.render(element);
    });
  });

  describe('Error handling', () => {
    it('should throw error when called outside rendering context', () => {
      expect(() => {
        useInstance(EcrRepository, { key: 'repo', name: 'my-app' });
      }).toThrow('useInstance must be called during component rendering');
    });

    it('should throw helpful error message', () => {
      expect(() => {
        useInstance(EcrRepository, { key: 'repo', name: 'my-app' });
      }).toThrow('Make sure you are calling it inside a component function');
    });
  });

  describe('Different construct types', () => {
    it('should handle multiple different construct types', () => {
      function Infrastructure() {
        const repo = useInstance(EcrRepository, { key: 'repo', name: 'app' });
        const bucket = useInstance(S3Bucket, { key: 'assets', name: 'assets' });
        const db = useInstance(RDSInstance, { key: 'db', name: 'app-db' });
        const service = useInstance(AppRunnerService, { key: 'api', name: 'api' });

        expect(repo.construct).toBe(EcrRepository);
        expect(bucket.construct).toBe(S3Bucket);
        expect(db.construct).toBe(RDSInstance);
        expect(service.construct).toBe(AppRunnerService);
        return null;
      }

      const element = <Infrastructure />;
      renderer.render(element);
    });
  });

  describe('Construct call count reset per component', () => {
    it('should reset counts for each component render', () => {
      function Component1() {
        const db1 = useInstance(RDSInstance, { name: 'db-1' });
        const db2 = useInstance(RDSInstance, { name: 'db-2' });

        expect(db1.id).toBe('app.anonymous.component-1.rdsinstance');
        expect(db2.id).toBe('app.anonymous.component-1.rdsinstance-1');
        return null;
      }

      function Component2() {
        const db1 = useInstance(RDSInstance, { name: 'db-1' });
        const db2 = useInstance(RDSInstance, { name: 'db-2' });

        // Counts should reset for new component
        expect(db1.id).toBe('app.anonymous.component-2.rdsinstance');
        expect(db2.id).toBe('app.anonymous.component-2.rdsinstance-1');
        return null;
      }

      function App() {
        return (
          <>
            <Component1 />
            <Component2 />
          </>
        );
      }

      const element = <App />;
      renderer.render(element);
    });
  });
});
