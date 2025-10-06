// REQ-02: Integration tests for createContext and useContext
// Verify context propagation in component trees with full rendering

/** @jsxRuntime classic */
/** @jsx CReact.createElement */

import { describe, it, expect, beforeEach } from 'vitest';
import { CReact } from '../../src/jsx';
import { Renderer } from '../../src/core/Renderer';
import { createContext } from '../../src/context/createContext';
import { useContext } from '../../src/hooks/useContext';
import { useInstance } from '../../src/hooks/useInstance';
import { useState } from '../../src/hooks/useState';

// Mock construct for testing
class MockConstruct {
  constructor(public props: any) {}
}

describe('Context Integration Tests', () => {
  let renderer: Renderer;
  
  beforeEach(() => {
    renderer = new Renderer();
  });
  
  describe('Basic Context Propagation', () => {
    it('should propagate context value from Provider to child', () => {
      interface TestContextType {
        value: string;
      }
      
      const TestContext = createContext<TestContextType>();
      
      let capturedValue: TestContextType | undefined;
      
      function Child() {
        capturedValue = useContext(TestContext);
        return null;
      }
      
      function Parent() {
        const contextValue = { value: 'test-value' };
        return <TestContext.Provider value={contextValue}><Child /></TestContext.Provider>;
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValue).toBeDefined();
      expect(capturedValue?.value).toBe('test-value');
    });
    
    it('should propagate context through multiple levels', () => {
      const TestContext = createContext<string>();
      
      let capturedValue: string | undefined;
      
      function Grandchild() {
        capturedValue = useContext(TestContext);
        return null;
      }
      
      function Child() {
        return <Grandchild />;
      }
      
      function Parent() {
        return <TestContext.Provider value="deep-value"><Child /></TestContext.Provider>;
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValue).toBe('deep-value');
    });
    
    it('should use default value when no Provider exists', () => {
      const defaultValue = 'default-value';
      const TestContext = createContext(defaultValue);
      
      let capturedValue: string | undefined;
      
      function Child() {
        capturedValue = useContext(TestContext);
        return null;
      }
      
      function Parent() {
        return <Child />;
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValue).toBe(defaultValue);
    });
  });
  
  describe('Nested Providers', () => {
    it('should use nearest Provider value', () => {
      const TestContext = createContext<string>();
      
      let outerValue: string | undefined;
      let innerValue: string | undefined;
      
      function InnerChild() {
        innerValue = useContext(TestContext);
        return null;
      }
      
      function OuterChild() {
        outerValue = useContext(TestContext);
        return <TestContext.Provider value="inner"><InnerChild /></TestContext.Provider>;
      }
      
      function Root() {
        return <TestContext.Provider value="outer"><OuterChild /></TestContext.Provider>;
      }
      
      const fiber = renderer.render(<Root />);
      
      expect(outerValue).toBe('outer');
      expect(innerValue).toBe('inner');
    });
    
    it('should override parent Provider with nested Provider', () => {
      const TestContext = createContext<number>();
      
      const capturedValues: number[] = [];
      
      function Child({ id }: { id: number }) {
        const value = useContext(TestContext);
        capturedValues.push(value);
        return null;
      }
      
      function Root() {
        return (
          <TestContext.Provider value={1}>
            <Child id={1} />
            <TestContext.Provider value={2}>
              <Child id={2} />
              <TestContext.Provider value={3}>
                <Child id={3} />
              </TestContext.Provider>
            </TestContext.Provider>
          </TestContext.Provider>
        );
      }
      
      const fiber = renderer.render(<Root />);
      
      expect(capturedValues).toEqual([1, 2, 3]);
    });
  });
  
  describe('Multiple Independent Contexts', () => {
    it('should support multiple contexts independently', () => {
      const Context1 = createContext<string>();
      const Context2 = createContext<number>();
      
      let value1: string | undefined;
      let value2: number | undefined;
      
      function Child() {
        value1 = useContext(Context1);
        value2 = useContext(Context2);
        return null;
      }
      
      function Parent() {
        return (
          <Context1.Provider value="string-value">
            <Context2.Provider value={42}>
              <Child />
            </Context2.Provider>
          </Context1.Provider>
        );
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(value1).toBe('string-value');
      expect(value2).toBe(42);
    });
    
    it('should not confuse different contexts', () => {
      const UserContext = createContext<{ name: string }>();
      const ThemeContext = createContext<{ color: string }>();
      
      let userName: string | undefined;
      let themeColor: string | undefined;
      
      function Child() {
        const user = useContext(UserContext);
        const theme = useContext(ThemeContext);
        userName = user?.name;
        themeColor = theme?.color;
        return null;
      }
      
      function Parent() {
        return (
          <UserContext.Provider value={{ name: 'Alice' }}>
            <ThemeContext.Provider value={{ color: 'blue' }}>
              <Child />
            </ThemeContext.Provider>
          </UserContext.Provider>
        );
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(userName).toBe('Alice');
      expect(themeColor).toBe('blue');
    });
  });
  
  describe('Context with useState', () => {
    it('should share useState outputs via context', () => {
      interface RegistryOutputs {
        repositoryUrl?: string;
        repositoryArn?: string;
      }
      
      const RegistryContext = createContext<RegistryOutputs>({});
      
      let capturedUrl: string | undefined;
      
      function Service() {
        const { repositoryUrl } = useContext(RegistryContext);
        capturedUrl = repositoryUrl;
        
        const service = useInstance(MockConstruct, {
          key: 'service',
          image: `${repositoryUrl}:latest`,
        });
        
        return null;
      }
      
      function RegistryStack({ children }: { children: any }) {
        const repo = useInstance(MockConstruct, {
          key: 'repo',
          name: 'my-app',
        });
        
        // Use initial values instead of setting them synchronously
        const [repositoryUrl] = useState<string>('https://registry.example.com/my-app');
        const [repositoryArn] = useState<string>('arn:aws:ecr:us-east-1:123456789012:repository/my-app');
        
        const outputs = { repositoryUrl, repositoryArn };
        return <RegistryContext.Provider value={outputs}>{children}</RegistryContext.Provider>;
      }
      
      function Root() {
        return (
          <RegistryStack>
            <Service />
          </RegistryStack>
        );
      }
      
      const fiber = renderer.render(<Root />);
      
      expect(capturedUrl).toBe('https://registry.example.com/my-app');
    });
    
    it('should support multiple useState outputs in context', () => {
      interface CDNOutputs {
        distributionId?: string;
        distributionDomain?: string;
        distributionArn?: string;
      }
      
      const CDNContext = createContext<CDNOutputs>({});
      
      let capturedOutputs: CDNOutputs | undefined;
      
      function Consumer() {
        capturedOutputs = useContext(CDNContext);
        return null;
      }
      
      function CDNStack({ children }: { children: any }) {
        const distribution = useInstance(MockConstruct, {
          key: 'cdn',
          name: 'my-cdn',
        });
        
        // Use initial values instead of setting them synchronously
        const [distributionId] = useState<string>('E1234567890ABC');
        const [distributionDomain] = useState<string>('d111111abcdef8.cloudfront.net');
        const [distributionArn] = useState<string>('arn:aws:cloudfront::123456789012:distribution/E1234567890ABC');
        
        const outputs = { distributionId, distributionDomain, distributionArn };
        return <CDNContext.Provider value={outputs}>{children}</CDNContext.Provider>;
      }
      
      function Root() {
        return (
          <CDNStack>
            <Consumer />
          </CDNStack>
        );
      }
      
      const fiber = renderer.render(<Root />);
      
      expect(capturedOutputs).toEqual({
        distributionId: 'E1234567890ABC',
        distributionDomain: 'd111111abcdef8.cloudfront.net',
        distributionArn: 'arn:aws:cloudfront::123456789012:distribution/E1234567890ABC',
      });
    });
  });
  
  describe('Error Cases', () => {
    it('should throw error when useContext called without Provider and no default', () => {
      const TestContext = createContext<string>();
      
      function Child() {
        useContext(TestContext); // Should throw
        return null;
      }
      
      function Parent() {
        return <Child />;
      }
      
      expect(() => {
        renderer.render(<Parent />);
      }).toThrow('useContext called without a Provider');
    });
    
    it('should not throw when default value is provided', () => {
      const TestContext = createContext<string>('default');
      
      let capturedValue: string | undefined;
      
      function Child() {
        capturedValue = useContext(TestContext);
        return null;
      }
      
      function Parent() {
        return <Child />;
      }
      
      expect(() => {
        renderer.render(<Parent />);
      }).not.toThrow();
      
      expect(capturedValue).toBe('default');
    });
  });
  
  describe('Complex Scenarios', () => {
    it('should support context in sibling components', () => {
      const TestContext = createContext<string>();
      
      const capturedValues: string[] = [];
      
      function Child1() {
        const value = useContext(TestContext);
        capturedValues.push(value);
        return null;
      }
      
      function Child2() {
        const value = useContext(TestContext);
        capturedValues.push(value);
        return null;
      }
      
      function Parent() {
        return (
          <TestContext.Provider value="shared-value">
            <Child1 />
            <Child2 />
          </TestContext.Provider>
        );
      }
      
      const fiber = renderer.render(<Parent />);
      
      expect(capturedValues).toEqual(['shared-value', 'shared-value']);
    });
    
    it('should support context updates in nested structure', () => {
      const TestContext = createContext<string>();
      
      const capturedValues: string[] = [];
      
      function DeepChild() {
        const value = useContext(TestContext);
        capturedValues.push(value);
        return null;
      }
      
      function MiddleChild() {
        const value = useContext(TestContext);
        capturedValues.push(value);
        return <DeepChild />;
      }
      
      function Root() {
        return (
          <TestContext.Provider value="level-1">
            <MiddleChild />
            <TestContext.Provider value="level-2">
              <MiddleChild />
            </TestContext.Provider>
          </TestContext.Provider>
        );
      }
      
      const fiber = renderer.render(<Root />);
      
      expect(capturedValues).toEqual(['level-1', 'level-1', 'level-2', 'level-2']);
    });
  });
});
