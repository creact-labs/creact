
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

// REQ-02: createContext - React-like context creation
// This function creates a context object with Provider and Consumer components

/**
 * Context object returned by createContext
 * Contains Provider and Consumer components for sharing values down the component tree
 */
export interface Context<T> {
  /** Unique symbol to identify this context */
  _contextId: symbol;

  /** Default value when no Provider is found */
  defaultValue?: T;

  /** Provider component to supply context value */
  Provider: (props: { value: T; children?: any }) => any;

  /** Consumer component to consume context value (alternative to useContext) */
  Consumer: (props: { children: (value: T) => any }) => any;
}

/**
 * Create a typed context object (like React.createContext)
 *
 * Returns a context object with Provider and Consumer components.
 * Use with useContext hook to access values from the nearest Provider.
 *
 * REQ-02: Stack Context (declarative outputs)
 *
 * @param defaultValue - Optional default value when no Provider exists
 * @returns Context object with Provider and Consumer
 *
 * @example
 * ```tsx
 * // Create a typed context
 * interface RegistryOutputs {
 *   repositoryUrl?: string;
 *   repositoryArn?: string;
 * }
 *
 * const RegistryContext = createContext<RegistryOutputs>({});
 *
 * // Provider component
 * function RegistryStack({ children }) {
 *   const repo = useInstance(EcrRepository, { key: 'repo', name: 'my-app' });
 *   const [repositoryUrl, setRepositoryUrl] = useState();
 *   const [repositoryArn, setRepositoryArn] = useState();
 *
 *   const outputs = { repositoryUrl, repositoryArn };
 *   return <RegistryContext.Provider value={outputs}>{children}</RegistryContext.Provider>;
 * }
 *
 * // Consumer component
 * function Service() {
 *   const { repositoryUrl } = useContext(RegistryContext);
 *   const service = useInstance(AppRunnerService, {
 *     image: `${repositoryUrl}:latest`
 *   });
 *   return <></>;
 * }
 * ```
 */
export function createContext<T>(defaultValue?: T): Context<T> {
  // Create unique symbol to identify this context
  const contextId = Symbol('Context');

  /**
   * Provider component - Supplies context value to descendants
   *
   * @param props.value - Value to provide to descendants
   * @param props.children - Child components
   */
  const Provider = (props: { value: T; children?: any }) => {
    // Provider is a pass-through component that just returns its children
    // The Renderer will recognize it by the metadata on the function and store the context value in the Fiber
    // The props will be preserved in the Fiber node, including _contextId and _contextValue
    return props.children;
  };

  // Mark Provider with context metadata for Renderer to recognize
  (Provider as any)._isContextProvider = true;
  (Provider as any)._contextId = contextId;

  /**
   * Consumer component - Consumes context value (alternative to useContext)
   *
   * @param props.children - Render function that receives context value
   */
  const Consumer = (props: { children: (value: T) => any }) => {
    // Consumer is a placeholder - useContext hook will handle the actual lookup
    // The render function will be called by the Renderer with the context value
    return props.children;
  };

  // Mark Consumer with context metadata
  (Consumer as any)._isContextConsumer = true;
  (Consumer as any)._contextId = contextId;

  // Return context object
  const context: Context<T> = {
    _contextId: contextId,
    defaultValue,
    Provider,
    Consumer,
  };

  return context;
}
