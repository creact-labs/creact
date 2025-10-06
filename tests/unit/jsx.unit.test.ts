/**
 * Unit tests for JSX factory (createElement)
 * 
 * Tests verify:
 * - createElement transforms JSX correctly
 * - Children normalization (single vs array)
 * - Key extraction from props
 * - Fragment support
 */

import { describe, it, expect } from 'vitest';
import { CReact, JSXElement } from '../../src/jsx';

describe('CReact.createElement', () => {
  describe('Basic transformation', () => {
    it('should create element with type and props', () => {
      const Component = () => null;
      const element = CReact.createElement(Component, { name: 'test' });
      
      expect(element).toEqual({
        type: Component,
        props: { name: 'test' },
        key: undefined,
      });
    });
    
    it('should handle null props', () => {
      const Component = () => null;
      const element = CReact.createElement(Component, null);
      
      expect(element).toEqual({
        type: Component,
        props: {},
        key: undefined,
      });
    });
    
    it('should handle empty props', () => {
      const Component = () => null;
      const element = CReact.createElement(Component, {});
      
      expect(element).toEqual({
        type: Component,
        props: {},
        key: undefined,
      });
    });
  });
  
  describe('Key extraction', () => {
    it('should extract key from props', () => {
      const Component = () => null;
      const element = CReact.createElement(Component, { key: 'my-key', name: 'test' });
      
      expect(element.key).toBe('my-key');
      expect(element.props).toEqual({ name: 'test' });
      expect(element.props.key).toBeUndefined();
    });
    
    it('should handle numeric keys', () => {
      const Component = () => null;
      const element = CReact.createElement(Component, { key: 123, name: 'test' });
      
      expect(element.key).toBe(123);
      expect(element.props).toEqual({ name: 'test' });
    });
    
    it('should handle missing key', () => {
      const Component = () => null;
      const element = CReact.createElement(Component, { name: 'test' });
      
      expect(element.key).toBeUndefined();
      expect(element.props).toEqual({ name: 'test' });
    });
  });
  
  describe('Children normalization', () => {
    it('should handle single child', () => {
      const Parent = () => null;
      const Child = () => null;
      
      const childElement = CReact.createElement(Child, null);
      const element = CReact.createElement(Parent, null, childElement);
      
      expect(element.props.children).toBe(childElement);
      expect(Array.isArray(element.props.children)).toBe(false);
    });
    
    it('should handle multiple children as array', () => {
      const Parent = () => null;
      const Child = () => null;
      
      const child1 = CReact.createElement(Child, { key: '1' });
      const child2 = CReact.createElement(Child, { key: '2' });
      const element = CReact.createElement(Parent, null, child1, child2);
      
      expect(Array.isArray(element.props.children)).toBe(true);
      expect(element.props.children).toHaveLength(2);
      expect(element.props.children[0]).toBe(child1);
      expect(element.props.children[1]).toBe(child2);
    });
    
    it('should handle no children', () => {
      const Component = () => null;
      const element = CReact.createElement(Component, { name: 'test' });
      
      expect(element.props.children).toBeUndefined();
    });
    
    it('should filter out null children', () => {
      const Parent = () => null;
      const Child = () => null;
      
      const child = CReact.createElement(Child, null);
      const element = CReact.createElement(Parent, null, child, null, undefined);
      
      expect(element.props.children).toBe(child);
      expect(Array.isArray(element.props.children)).toBe(false);
    });
    
    it('should flatten nested arrays', () => {
      const Parent = () => null;
      const Child = () => null;
      
      const child1 = CReact.createElement(Child, { key: '1' });
      const child2 = CReact.createElement(Child, { key: '2' });
      const element = CReact.createElement(Parent, null, [child1, child2]);
      
      expect(Array.isArray(element.props.children)).toBe(true);
      expect(element.props.children).toHaveLength(2);
    });
    
    it('should handle text children', () => {
      const Component = () => null;
      const element = CReact.createElement(Component, null, 'Hello World');
      
      expect(element.props.children).toBe('Hello World');
    });
    
    it('should handle mixed children types', () => {
      const Parent = () => null;
      const Child = () => null;
      
      const childElement = CReact.createElement(Child, null);
      const element = CReact.createElement(Parent, null, 'Text', childElement, 123);
      
      expect(Array.isArray(element.props.children)).toBe(true);
      expect(element.props.children).toHaveLength(3);
      expect(element.props.children[0]).toBe('Text');
      expect(element.props.children[1]).toBe(childElement);
      expect(element.props.children[2]).toBe(123);
    });
  });
  
  describe('Fragment support', () => {
    it('should export Fragment symbol', () => {
      expect(CReact.Fragment).toBeDefined();
      expect(typeof CReact.Fragment).toBe('symbol');
    });
    
    it('should create element with Fragment type', () => {
      const Child = () => null;
      const child1 = CReact.createElement(Child, { key: '1' });
      const child2 = CReact.createElement(Child, { key: '2' });
      
      const element = CReact.createElement(CReact.Fragment, null, child1, child2);
      
      expect(element.type).toBe(CReact.Fragment);
      expect(Array.isArray(element.props.children)).toBe(true);
      expect(element.props.children).toHaveLength(2);
    });
    
    it('should use consistent symbol for Fragment', () => {
      const fragment1 = Symbol.for('CReact.Fragment');
      const fragment2 = Symbol.for('CReact.Fragment');
      
      expect(CReact.Fragment).toBe(fragment1);
      expect(CReact.Fragment).toBe(fragment2);
    });
  });
  
  describe('Props immutability', () => {
    it('should not mutate original props object', () => {
      const Component = () => null;
      const originalProps = { key: 'test', name: 'value' };
      const element = CReact.createElement(Component, originalProps);
      
      expect(originalProps.key).toBe('test');
      expect(element.props.key).toBeUndefined();
    });
  });
  
  describe('Complex scenarios', () => {
    it('should handle nested component hierarchy', () => {
      const App = () => null;
      const Container = () => null;
      const Item = () => null;
      
      const item1 = CReact.createElement(Item, { key: '1', value: 'a' });
      const item2 = CReact.createElement(Item, { key: '2', value: 'b' });
      const container = CReact.createElement(Container, null, item1, item2);
      const app = CReact.createElement(App, null, container);
      
      expect(app.type).toBe(App);
      expect(app.props.children).toBe(container);
      expect(container.props.children).toHaveLength(2);
    });
    
    it('should preserve all props except key', () => {
      const Component = () => null;
      const element = CReact.createElement(Component, {
        key: 'my-key',
        name: 'test',
        value: 123,
        enabled: true,
        config: { nested: 'object' },
      });
      
      expect(element.key).toBe('my-key');
      expect(element.props).toEqual({
        name: 'test',
        value: 123,
        enabled: true,
        config: { nested: 'object' },
      });
    });
  });
});
