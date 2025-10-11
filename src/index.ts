
/**

 * Licensed under the Apache License, Version 2.0 (the "License");

 * you may not use this file except in compliance with the License.

 * You may obtain a copy of the License at

 *

 *     http://www.apache.org/licenses/LICENSE-2.0

 *

 * Unless required by applicable law or agreed to in writing, software

 * distributed under the License is distributed on an "AS IS" BASIS,

 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

 * See the License for the specific language governing permissions and

 * limitations under the License.

 *

 * Copyright 2025 Daniel Coutinho Ribeiro

 */

/// <reference path="./jsx.d.ts" />

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
