# CReact Alpha Launch Tasks

Essential tasks to get CReact ready for its first public alpha release. Focus: make it work, make it usable, make it publishable.

## Alpha Release Goals
- Make it installable via npm
- Provide working examples
- Clean, usable API
- Basic documentation

## Essential Tasks

- [ ] 0. Fix Component Return Values and Type Inference
  - Remove `return null` from all components - must return Fragment `<></>` instead
  - Fix `useState('')` to `useState()` for proper type inference (let TypeScript infer from usage)
  - Update all examples in docs and code to use proper patterns
  - Ensure components return `<></>` or meaningful JSX, never `null`
  - Search codebase for `useState('')`, `useState("")`, `useState(0)` and remove explicit initial types
  - _Requirements: 2.2, 5.3_

- [ ] 1. Add Component CloudDOM Event Props
  - Add onDeploy, onError, onDestroy props to components (like DOM events in React)
  - Extract these props in useInstance hook and attach to CloudDOM nodes
  - Trigger callbacks during deployment lifecycle in CloudDOMBuilder/StateMachine
  - Pass resource context, outputs, and error details to callbacks
  - Events are component props, NOT hook parameters: `<Database onDeploy={...} onError={...} />`
  - useInstance extracts event props from component props automatically
  - _Requirements: 2.3, 3.2_

- [ ] 2. Code Cleanup and File Headers
  - **Add author signature**: Add "Created By: Daniel Coutinho Ribeiro (dcoutinho.96@gmail.com)" header to every file
  - Remove duplicate CloudDOMNode interface from ICloudProvider.ts (import from core/types instead)
  - Clean up unused imports across all files (run linter and fix)
  - Remove commented-out code and debug console.logs
  - Fix inconsistent error message formatting (standardize format)
  - Remove any experimental/incomplete features that aren't working
  - **Standardize file headers**: Consistent format across all source files
  - _Requirements: 2.1, 6.3_

- [ ] 3. Basic Documentation
  - Write README with installation instructions (`npm install @escambo/creact`)
  - Add one complete working example showing Database -> API pattern with Context
  - Document core API: CReact, useInstance, useState, useContext, useEffect
  - Include CloudDOM event examples (onDeploy, onError, onDestroy as component props)
  - Add simple troubleshooting section for common errors
  - Include example project structure and provider implementation
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 4. Type Safety Fixes
  - Remove remaining `any` types from public interfaces (ICloudProvider, IBackendProvider)
  - Fix useInstance to return properly typed CloudDOMNode with generic constraints
  - Add proper typing for CloudDOM event callbacks (onDeploy, onError, onDestroy)
  - Improve useState type inference - should infer from first setState call, not initial value
  - Add proper generic constraints to CloudDOMNode interface
  - Ensure all hook return types are properly typed
  - _Requirements: 2.1, 2.2, 2.4_

- [ ] 5. CLI Polish and Improvements
  - Add colored output for better UX (green for success, red for errors, yellow for warnings)
  - Implement basic plan command to preview changes without deploying
  - **Reduce verbosity**: Make output concise by default, add --verbose flag for detailed output
  - **Git-like diff formatting**: Show changes in familiar git diff style with +/- indicators
  - **Clear change summaries**: Show "3 to create, 1 to update, 0 to delete" style summaries
  - Fix error messages to be more helpful (include suggestions and context)
  - Add proper exit codes (0 for success, 1 for errors, 2 for warnings)
  - Improve argument parsing to handle edge cases and provide better validation
  - Add progress indicators for long-running operations (spinners, progress bars)
  - **Quiet mode**: Add --quiet flag for CI/CD environments
  - **Better resource display**: Show resource types and names clearly in output
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 6. Package Preparation
  - Update package.json with proper description, keywords, repository URL
  - Add MIT license file with proper copyright
  - Create .npmignore to exclude unnecessary files (tests, examples, .kiro, etc.)
  - Test `npm pack` and installation in clean directory
  - Add basic CHANGELOG.md with version 0.1.0-alpha.1
  - Verify all exports work correctly from published package
  - Test CLI binary works after npm install -g
  - _Requirements: Publication readiness_

## Nice-to-Have (Post-Alpha)

- [ ] Better error messages with component stack traces
- [ ] Configuration file support (.creactrc.json)
- [ ] More CLI commands (logs, destroy, status)
- [ ] Performance optimizations for large CloudDOM trees
- [ ] Additional provider examples beyond DummyProvider

## Success Criteria

✅ **Installable**: `npm install @escambo/creact` works without errors  
✅ **Runnable**: Basic example from README works without errors  
✅ **Typeable**: Good TypeScript support with IntelliSense in VS Code  
✅ **Usable**: CLI provides helpful feedback and error messages  
✅ **Documented**: Users can understand how to get started within 5 minutes  
✅ **Extensible**: Users can implement their own providers easily  

## Implementation Notes

- Focus on core functionality, not advanced features
- Prioritize developer experience over feature completeness
- Keep examples simple but realistic
- Users can implement their own providers (that's the point!)
- Alpha means "works but may have rough edges"

## Functionality Checklist

### Core Engine ✅
- [x] JSX → Fiber rendering (Renderer)
- [x] Fiber → CloudDOM transformation (CloudDOMBuilder)
- [x] CloudDOM reconciliation and diffing (Reconciler)
- [x] Deployment state machine with crash recovery (StateMachine)
- [x] Provider architecture with dependency injection

### Hook System ✅
- [x] useState for declarative outputs (non-reactive)
- [x] useInstance for resource creation
- [x] useContext for sharing infrastructure resources
- [x] useEffect for component lifecycle management

### Missing/Incomplete ❌
- [ ] CloudDOM events (onDeploy, onError, onDestroy) - **Task 1**
- [ ] Type safety improvements - **Task 4**
- [ ] Component return value fixes - **Task 0**
- [ ] CLI plan command - **Task 5**
- [ ] Comprehensive documentation - **Task 3**

### CLI Commands
- [x] `creact build` - Build CloudDOM from entry file
- [x] `creact deploy` - Deploy CloudDOM to providers
- [x] `creact dev` - Hot reload development mode
- [ ] `creact plan` - Preview changes without deploying - **Task 5**

### Provider System ✅
- [x] ICloudProvider interface
- [x] IBackendProvider interface
- [x] DummyCloudProvider for testing
- [x] DummyBackendProvider for testing
- [x] Provider lifecycle hooks (preDeploy, postDeploy, onError)

### Testing ✅
- [x] 696+ tests passing
- [x] Unit tests for core components
- [x] Integration tests for full workflows
- [x] Test helpers and utilities

### Package Quality
- [x] TypeScript compilation works
- [x] ESLint configuration
- [x] Prettier formatting
- [ ] Package.json metadata - **Task 6**
- [ ] License file - **Task 6**
- [ ] .npmignore configuration - **Task 6**
- [ ] README documentation - **Task 3**

### Developer Experience
- [x] Hot reload development mode
- [x] Debug logging with CREACT_DEBUG
- [ ] Colored CLI output - **Task 5**
- [ ] Git-like diff formatting - **Task 5**
- [ ] Concise output by default - **Task 5**
- [ ] Better error messages - **Task 2, 4**
- [ ] Type inference improvements - **Task 0, 4**
- [ ] Author signatures in all files - **Task 2**

## Alpha Readiness Score: 75%

**Ready**: Core engine, hooks, CLI basics, testing  
**Needs Work**: Documentation, type safety, CloudDOM events, package preparation  
**Estimated Time**: 2-3 weeks for alpha release