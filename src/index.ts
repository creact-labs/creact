// CReact - Infrastructure as Code with JSX
// Main entry point for the library

// Core classes
export { CReact, CReactConfig } from './core/CReact';
export { Renderer } from './core/Renderer';
export { Validator } from './core/Validator';
export { CloudDOMBuilder } from './core/CloudDOMBuilder';

// Types
export { FiberNode, CloudDOMNode, JSXElement } from './core/types';

// Provider interfaces
export { ICloudProvider } from './providers/ICloudProvider';
export { IBackendProvider } from './providers/IBackendProvider';

// Dummy providers (for testing/POC)
export { DummyCloudProvider } from './providers/DummyCloudProvider';
export { DummyBackendProvider } from './providers/DummyBackendProvider';

// Hooks
export { useInstance } from './hooks/useInstance';
