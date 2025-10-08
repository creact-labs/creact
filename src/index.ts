// CReact - Infrastructure as Code with JSX
// Main entry point for the library

// JSX support
export { CReact, JSXElement } from './jsx';
export type { FC, PropsWithChildren } from './jsx.d';

// Core classes
import { CReact as CReactClass } from './core/CReact';
export { CReact as CReactCore, CReactConfig } from './core/CReact';

export const renderCloudDOM = CReactClass.renderCloudDOM;
export { Renderer } from './core/Renderer';
export { Validator } from './core/Validator';
export { CloudDOMBuilder } from './core/CloudDOMBuilder';

// Types
export { FiberNode, CloudDOMNode } from './core/types';

// Provider interfaces
export { ICloudProvider } from './providers/ICloudProvider';
export { IBackendProvider } from './providers/IBackendProvider';

// Hooks
export { useInstance } from './hooks/useInstance';
export { useState } from './hooks/useState';
export { useContext } from './hooks/useContext';
export { useEffect } from './hooks/useEffect';

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
