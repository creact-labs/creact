// Unit tests for naming system (REQ-01)

import { describe, it, expect } from 'vitest';
import {
  generateResourceId,
  toKebabCase,
  getNodeName,
  validateIdUniqueness,
  normalizePathSegment,
  normalizePath,
  formatPath,
  parseResourceId,
} from '../../src/utils/naming';

describe('Naming System', () => {
  describe('generateResourceId', () => {
    it('should generate ID from simple path', () => {
      const id = generateResourceId(['registry', 'service']);
      expect(id).toBe('registry.service');
    });

    it('should generate ID from nested path', () => {
      const id = generateResourceId(['app', 'database', 'table']);
      expect(id).toBe('app.database.table');
    });

    it('should convert path segments to kebab-case', () => {
      const id = generateResourceId(['RegistryStack', 'ServiceAPI']);
      expect(id).toBe('registry-stack.service-api');
    });

    it('should handle single segment path', () => {
      const id = generateResourceId(['registry']);
      expect(id).toBe('registry');
    });

    it('should throw error for empty path', () => {
      expect(() => generateResourceId([])).toThrow('Cannot generate resource ID from empty path');
    });

    it('should throw error for null path', () => {
      expect(() => generateResourceId(null as any)).toThrow('Cannot generate resource ID from empty path');
    });
  });

  describe('toKebabCase', () => {
    it('should convert PascalCase to kebab-case', () => {
      expect(toKebabCase('RegistryStack')).toBe('registry-stack');
      expect(toKebabCase('ServiceAPI')).toBe('service-api');
      expect(toKebabCase('MyDatabaseTable')).toBe('my-database-table');
    });

    it('should convert camelCase to kebab-case', () => {
      expect(toKebabCase('registryStack')).toBe('registry-stack');
      expect(toKebabCase('serviceAPI')).toBe('service-api');
      expect(toKebabCase('myDatabaseTable')).toBe('my-database-table');
    });

    it('should convert snake_case to kebab-case', () => {
      expect(toKebabCase('registry_stack')).toBe('registry-stack');
      expect(toKebabCase('service_api')).toBe('service-api');
    });

    it('should convert spaces to hyphens', () => {
      expect(toKebabCase('Registry Stack')).toBe('registry-stack');
      expect(toKebabCase('My Service API')).toBe('my-service-api');
    });

    it('should handle already kebab-case strings', () => {
      expect(toKebabCase('registry-stack')).toBe('registry-stack');
      expect(toKebabCase('my-service')).toBe('my-service');
    });

    it('should handle mixed formats', () => {
      expect(toKebabCase('MyService_API Stack')).toBe('my-service-api-stack');
    });

    it('should remove multiple consecutive hyphens', () => {
      expect(toKebabCase('my---service')).toBe('my-service');
      expect(toKebabCase('registry--stack')).toBe('registry-stack');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(toKebabCase('-registry-')).toBe('registry');
      expect(toKebabCase('--service--')).toBe('service');
    });

    it('should handle numbers in names', () => {
      expect(toKebabCase('Service2API')).toBe('service-2-api');
      expect(toKebabCase('database1')).toBe('database-1');
      expect(toKebabCase('v2Service')).toBe('v-2-service');
    });

    it('should handle empty string', () => {
      expect(toKebabCase('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(toKebabCase(null as any)).toBe('');
      expect(toKebabCase(undefined as any)).toBe('');
    });

    it('should handle single character', () => {
      expect(toKebabCase('A')).toBe('a');
      expect(toKebabCase('a')).toBe('a');
    });

    it('should handle lowercase strings', () => {
      expect(toKebabCase('registry')).toBe('registry');
      expect(toKebabCase('service')).toBe('service');
    });
  });

  describe('getNodeName', () => {
    it('should use key prop with highest priority', () => {
      const name = getNodeName(
        function MyComponent() {},
        { name: 'custom-name' },
        'my-key'
      );
      expect(name).toBe('my-key');
    });

    it('should use name prop when key is not provided', () => {
      const name = getNodeName(
        function MyComponent() {},
        { name: 'custom-name' }
      );
      expect(name).toBe('custom-name');
    });

    it('should use function name when key and name are not provided', () => {
      const name = getNodeName(function MyComponent() {}, {});
      expect(name).toBe('my-component');
    });

    it('should use displayName if available', () => {
      const Component = function() {};
      Component.displayName = 'CustomDisplay';
      const name = getNodeName(Component, {});
      expect(name).toBe('custom-display');
    });

    it('should handle string type (intrinsic elements)', () => {
      const name = getNodeName('div', {});
      expect(name).toBe('div');
    });

    it('should convert all names to kebab-case', () => {
      expect(getNodeName(function RegistryStack() {}, {})).toBe('registry-stack');
      expect(getNodeName(() => {}, { name: 'ServiceAPI' })).toBe('service-api');
      expect(getNodeName(() => {}, {}, 'MyKey')).toBe('my-key');
    });

    it('should handle anonymous functions', () => {
      const name = getNodeName(() => {}, {});
      expect(name).toBe('anonymous');
    });

    it('should handle missing props', () => {
      const name = getNodeName(function MyComponent() {});
      expect(name).toBe('my-component');
    });

    it('should handle null props', () => {
      const name = getNodeName(function MyComponent() {}, null as any);
      expect(name).toBe('my-component');
    });

    it('should handle unknown type', () => {
      const name = getNodeName({}, {});
      expect(name).toBe('anonymous');
    });
  });

  describe('validateIdUniqueness', () => {
    it('should not throw for unique ID', () => {
      const existingIds = new Set(['registry.service', 'app.database']);
      expect(() => {
        validateIdUniqueness('registry.bucket', existingIds, []);
      }).not.toThrow();
    });

    it('should throw for duplicate ID', () => {
      const existingIds = new Set(['registry.service', 'app.database']);
      expect(() => {
        validateIdUniqueness('registry.service', existingIds, []);
      }).toThrow(/Duplicate resource ID: 'registry\.service'/);
    });

    it('should include component stack in error message', () => {
      const existingIds = new Set(['registry.service']);
      expect(() => {
        validateIdUniqueness('registry.service', existingIds, ['App', 'Registry', 'Service']);
      }).toThrow(/in App\s+in Registry\s+in Service/);
    });

    it('should suggest using key prop in error message', () => {
      const existingIds = new Set(['registry.service']);
      expect(() => {
        validateIdUniqueness('registry.service', existingIds, []);
      }).toThrow(/Use the 'key' prop to differentiate/);
    });

    it('should handle empty component stack', () => {
      const existingIds = new Set(['registry.service']);
      expect(() => {
        validateIdUniqueness('registry.service', existingIds);
      }).toThrow(/Duplicate resource ID/);
    });
  });

  describe('normalizePathSegment', () => {
    it('should trim whitespace', () => {
      expect(normalizePathSegment('  registry  ')).toBe('registry');
      expect(normalizePathSegment('\tservice\t')).toBe('service');
    });

    it('should convert to lowercase', () => {
      expect(normalizePathSegment('Registry')).toBe('registry');
      expect(normalizePathSegment('SERVICE')).toBe('service');
    });

    it('should replace slashes with hyphens', () => {
      expect(normalizePathSegment('registry/service')).toBe('registry-service');
      expect(normalizePathSegment('app\\database')).toBe('app-database');
    });

    it('should replace spaces with hyphens', () => {
      expect(normalizePathSegment('my service')).toBe('my-service');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(normalizePathSegment('-registry-')).toBe('registry');
      expect(normalizePathSegment('--service--')).toBe('service');
    });

    it('should handle empty string', () => {
      expect(normalizePathSegment('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(normalizePathSegment(null as any)).toBe('');
      expect(normalizePathSegment(undefined as any)).toBe('');
    });
  });

  describe('normalizePath', () => {
    it('should normalize all segments', () => {
      const path = normalizePath(['Registry', '  Service  ', 'my/bucket']);
      expect(path).toEqual(['registry', 'service', 'my-bucket']);
    });

    it('should filter out empty segments', () => {
      const path = normalizePath(['registry', '', 'service', '  ']);
      expect(path).toEqual(['registry', 'service']);
    });

    it('should handle empty array', () => {
      const path = normalizePath([]);
      expect(path).toEqual([]);
    });

    it('should handle mixed case and formats', () => {
      const path = normalizePath(['MyApp', 'database/table', '  Cache  ']);
      expect(path).toEqual(['my-app', 'database-table', 'cache']);
    });
  });

  describe('formatPath', () => {
    it('should format path with > separator', () => {
      expect(formatPath(['registry', 'service'])).toBe('registry > service');
      expect(formatPath(['app', 'database', 'table'])).toBe('app > database > table');
    });

    it('should handle single segment', () => {
      expect(formatPath(['registry'])).toBe('registry');
    });

    it('should handle empty array', () => {
      expect(formatPath([])).toBe('');
    });
  });

  describe('parseResourceId', () => {
    it('should parse simple ID', () => {
      const path = parseResourceId('registry.service');
      expect(path).toEqual(['registry', 'service']);
    });

    it('should parse nested ID', () => {
      const path = parseResourceId('app.database.table');
      expect(path).toEqual(['app', 'database', 'table']);
    });

    it('should parse single segment ID', () => {
      const path = parseResourceId('registry');
      expect(path).toEqual(['registry']);
    });

    it('should handle empty string', () => {
      const path = parseResourceId('');
      expect(path).toEqual([]);
    });

    it('should handle null/undefined', () => {
      expect(parseResourceId(null as any)).toEqual([]);
      expect(parseResourceId(undefined as any)).toEqual([]);
    });

    it('should filter out empty segments', () => {
      const path = parseResourceId('registry..service');
      expect(path).toEqual(['registry', 'service']);
    });

    it('should be inverse of generateResourceId', () => {
      const originalPath = ['registry', 'service', 'bucket'];
      const id = generateResourceId(originalPath);
      const parsedPath = parseResourceId(id);
      expect(parsedPath).toEqual(originalPath);
    });
  });

  describe('Integration: Path → ID → Path', () => {
    it('should round-trip simple paths', () => {
      const paths = [
        ['registry'],
        ['registry', 'service'],
        ['app', 'database', 'table'],
      ];

      for (const path of paths) {
        const id = generateResourceId(path);
        const parsed = parseResourceId(id);
        expect(parsed).toEqual(path);
      }
    });

    it('should round-trip with kebab-case conversion', () => {
      const path = ['RegistryStack', 'ServiceAPI'];
      const id = generateResourceId(path);
      expect(id).toBe('registry-stack.service-api');
      
      const parsed = parseResourceId(id);
      expect(parsed).toEqual(['registry-stack', 'service-api']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long paths', () => {
      const longPath = Array(100).fill('segment');
      const id = generateResourceId(longPath);
      expect(id.split('.').length).toBe(100);
    });

    it('should handle special characters in segments', () => {
      expect(toKebabCase('my@service')).toBe('my@service');
      expect(toKebabCase('service#1')).toBe('service#1');
    });

    it('should handle unicode characters', () => {
      expect(toKebabCase('café')).toBe('café');
      expect(toKebabCase('服务')).toBe('服务');
    });

    it('should handle numeric-only segments', () => {
      expect(toKebabCase('123')).toBe('123');
      expect(generateResourceId(['app', '123', 'service'])).toBe('app.123.service');
    });
  });
});
