// Proper hook tests using JSX components and Renderer
import { describe, it, expect, beforeEach } from 'vitest';
import { CReact } from '../../src/jsx';
import { Renderer } from '../../src/core/Renderer';
import { useState } from '../../src/hooks/useState';
import { useContext } from '../../src/hooks/useContext';
import { useInstance } from '../../src/hooks/useInstance';
import { createContext } from '../../src/context/createContext';

// Mock infrastructure constructs
class MockBucket {
  constructor(public props: any) {}
}

class MockDatabase {
  constructor(public props: any) {}
}

describe('Hooks - Unit Tests (Proper JSX Usage)', () => {
  let renderer: Renderer;

  beforeEach(() => {
    renderer = new Renderer();
  });

  describe('useState Hook', () => {
    it('should work in JSX component with initial value', () => {
      function TestComponent() {
        const [value, setValue] = useState('initial');
        
        // Simulate setting value during render
        setValue('updated');
        
        return null;
      }

      const jsx = <TestComponent />;
      const fiber = renderer.render(jsx);

      // Check that the hook state was stored in the fiber
      expect(fiber.hooks).toBeDefined();
      expect(fiber.hooks[0]).toBe('updated');
    });

    it('should support multiple useState calls', () => {
      function TestComponent() {
        const [first, setFirst] = useState('first');
        const [second, setSecond] = useState('second');
        const [third, setThird] = useState('third');
        
        setFirst('updated-first');
        setSecond('updated-second');
        
        return null;
      }

      const jsx = <TestComponent />;
      const fiber = renderer.render(jsx);

      expect(fiber.hooks).toBeDefined();
      expect(fiber.hooks[0]).toBe('updated-first');
      expect(fiber.hooks[1]).toBe('updated-second');
      expect(fiber.hooks[2]).toBe('third'); // Not updated
    });

    it('should support updater function form', () => {
      function TestComponent() {
        const [count, setCount] = useState(0);
        
        setCount(prev => prev + 1);
        setCount(prev => prev + 5);
        
        return null;
      }

      const jsx = <TestComponent />;
      const fiber = renderer.render(jsx);

      expect(fiber.hooks[0]).toBe(6); // 0 + 1 + 5
    });

    it('should throw error when called outside component', () => {
      expect(() => {
        useState('value');
      }).toThrow('Hook called outside of rendering context');
    });
  });

  describe('useContext Hook', () => {
    it('should return default value when no Provider', () => {
      const TestContext = createContext('default');
      let contextValue: any;

      function TestComponent() {
        contextValue = useContext(TestContext);
        return null;
      }

      const jsx = <TestComponent />;
      renderer.render(jsx);

      expect(contextValue).toBe('default');
    });

    it('should return Provider value when available', () => {
      const TestContext = createContext({ defaultValue: 'default' });
      let contextValue: any;

      function TestComponent() {
        contextValue = useContext(TestContext);
        return null;
      }

      function App() {
        return (
          <TestContext.Provider value="provided">
            <TestComponent />
          </TestContext.Provider>
        );
      }

      const jsx = <App />;
      renderer.render(jsx);

      expect(contextValue).toBe('provided');
    });

    it('should find nearest Provider in nested structure', () => {
      const TestContext = createContext({ defaultValue: 'default' });
      let outerValue: any;
      let innerValue: any;

      function OuterComponent() {
        outerValue = useContext(TestContext);
        return <InnerComponent />;
      }

      function InnerComponent() {
        innerValue = useContext(TestContext);
        return null;
      }

      function App() {
        return (
          <TestContext.Provider value="outer">
            <OuterComponent />
            <TestContext.Provider value="inner">
              <InnerComponent />
            </TestContext.Provider>
          </TestContext.Provider>
        );
      }

      const jsx = <App />;
      renderer.render(jsx);

      expect(outerValue).toBe('outer');
      expect(innerValue).toBe('inner');
    });

    it('should throw error when called outside component', () => {
      const TestContext = createContext({});
      
      expect(() => {
        useContext(TestContext);
      }).toThrow('Hook called outside of rendering context');
    });

    it('should throw error when no Provider and no default', () => {
      const TestContext = createContext(); // No default value
      
      function TestComponent() {
        useContext(TestContext);
        return null;
      }

      expect(() => {
        const jsx = <TestComponent />;
        renderer.render(jsx);
      }).toThrow('useContext called without a Provider');
    });
  });

  describe('useInstance Hook', () => {
    it('should create CloudDOM node with explicit key', () => {
      function TestComponent() {
        const bucket = useInstance(MockBucket, {
          key: 'my-bucket',
          name: 'test-bucket'
        });
        
        return null;
      }

      const jsx = <TestComponent />;
      const fiber = renderer.render(jsx);

      expect(fiber.cloudDOMNodes).toBeDefined();
      expect(fiber.cloudDOMNodes).toHaveLength(1);
      
      const node = fiber.cloudDOMNodes[0];
      expect(node.id).toBe('test-component.my-bucket');
      expect(node.construct).toBe(MockBucket);
      expect(node.props).toEqual({ name: 'test-bucket' });
    });

    it('should auto-generate ID from construct name', () => {
      function TestComponent() {
        const bucket = useInstance(MockBucket, {
          name: 'test-bucket'
        });
        
        return null;
      }

      const jsx = <TestComponent />;
      const fiber = renderer.render(jsx);

      const node = fiber.cloudDOMNodes[0];
      expect(node.id).toBe('test-component.mock-bucket');
    });

    it('should handle multiple instances with auto-indexing', () => {
      function TestComponent() {
        const bucket1 = useInstance(MockBucket, { name: 'bucket1' });
        const bucket2 = useInstance(MockBucket, { name: 'bucket2' });
        const db = useInstance(MockDatabase, { name: 'db' });
        
        return null;
      }

      const jsx = <TestComponent />;
      const fiber = renderer.render(jsx);

      expect(fiber.cloudDOMNodes).toHaveLength(3);
      expect(fiber.cloudDOMNodes[0].id).toBe('test-component.mock-bucket');
      expect(fiber.cloudDOMNodes[1].id).toBe('test-component.mock-bucket-1');
      expect(fiber.cloudDOMNodes[2].id).toBe('test-component.mock-database');
    });

    it('should work in nested components with proper paths', () => {
      function DatabaseComponent() {
        const db = useInstance(MockDatabase, {
          key: 'main-db',
          host: 'localhost'
        });
        return null;
      }

      function StorageComponent() {
        const bucket = useInstance(MockBucket, {
          key: 'assets',
          region: 'us-east-1'
        });
        return <DatabaseComponent />;
      }

      const jsx = <StorageComponent />;
      const fiber = renderer.render(jsx);

      // Check parent component
      expect(fiber.cloudDOMNodes).toHaveLength(1);
      expect(fiber.cloudDOMNodes[0].id).toBe('storage-component.assets');
      expect(fiber.cloudDOMNodes[0].path).toEqual(['storage-component', 'assets']);

      // Check child component
      const childFiber = fiber.children[0];
      expect(childFiber.cloudDOMNodes).toHaveLength(1);
      expect(childFiber.cloudDOMNodes[0].id).toBe('storage-component.database-component.main-db');
      expect(childFiber.cloudDOMNodes[0].path).toEqual(['storage-component', 'database-component', 'main-db']);
    });

    it('should throw error when called outside component', () => {
      expect(() => {
        useInstance(MockBucket, { name: 'test' });
      }).toThrow('Hook called outside of rendering context');
    });
  });

  describe('Combined Hook Usage', () => {
    it('should support all hooks together in one component', () => {
      const ConfigContext = createContext({ region: 'us-west-2' });
      let capturedContext: any;

      function TestComponent() {
        const [bucketName, setBucketName] = useState('initial-bucket');
        const config = useContext(ConfigContext);
        
        // setState updates the hook state but doesn't change the current value in this render
        setBucketName('updated-bucket');
        
        const bucket = useInstance(MockBucket, {
          key: 'main-bucket',
          name: bucketName, // This will be 'initial-bucket' during this render
          region: config.region
        });

        capturedContext = config;

        return null;
      }

      function App() {
        return (
          <ConfigContext.Provider value={{ region: 'eu-west-1' }}>
            <TestComponent />
          </ConfigContext.Provider>
        );
      }

      const jsx = <App />;
      const fiber = renderer.render(jsx);

      // The TestComponent is inside the Provider, so it's the child of the Provider fiber
      // App -> ConfigContext.Provider -> TestComponent
      const providerFiber = fiber.children[0]; // ConfigContext.Provider
      const testFiber = providerFiber.children[0]; // TestComponent
      
      // Check useState - the hook state should be updated even though the component variable wasn't
      expect(testFiber.hooks).toBeDefined();
      expect(testFiber.hooks[0]).toBe('updated-bucket');

      // Check useContext
      expect(capturedContext).toEqual({ region: 'eu-west-1' });

      // Check useInstance - the props should use the initial value since setState doesn't affect current render
      expect(testFiber.cloudDOMNodes).toHaveLength(1);
      expect(testFiber.cloudDOMNodes[0].props).toEqual({
        name: 'initial-bucket', // This is the value during render, before setState takes effect
        region: 'eu-west-1'
      });
    });
  });
});