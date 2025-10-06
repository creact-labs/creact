// CReact - Infrastructure as Code with JSX
// Main entry point for the library

// JSX support
export { CReact, JSXElement } from './jsx';
export type { FC, PropsWithChildren } from './jsx.d';

// Core classes
export { CReact as CReactCore, CReactConfig } from './core/CReact';
export { Renderer } from './core/Renderer';
export { Validator } from './core/Validator';
export { CloudDOMBuilder } from './core/CloudDOMBuilder';

// Types
export { FiberNode, CloudDOMNode } from './core/types';

// Provider interfaces
export { ICloudProvider } from './providers/ICloudProvider';
export { IBackendProvider } from './providers/IBackendProvider';

// Dummy providers (for testing/POC)
export { DummyCloudProvider } from './providers/DummyCloudProvider';
export { DummyBackendProvider } from './providers/DummyBackendProvider';

// Hooks
export { useInstance } from './hooks/useInstance';
export { useState } from './hooks/useState';
export { useContext } from './hooks/useContext';

// Context API
export { createContext, Context } from './context';

// Utilities
export {
  generateResourceId,
  toKebabCase,
  getNodeName,
  validateIdUniqueness,
  normalizePathSegment,
  normalizePath,
  formatPath,
  parseResourceId,
} from './utils/naming';
