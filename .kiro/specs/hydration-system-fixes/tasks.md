# Implementation Plan

- [ ] 1. Fix Critical Hydration Preparation Flow
  - Add loadStateForHydration() call before rendering in hot reload
  - Fix path mapping bug in prepareHydration()
  - Update CReact.build() to call prepareHydration()
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 1.1 Update DevCommand.performHotReload() to call loadStateForHydration()
  - Remove useless serializeReactiveState() and restoreReactiveState() calls
  - Add await result.instance.loadStateForHydration(result.stackName) before building
  - Wrap in try-catch to handle backend failures gracefully
  - Add logging for hydration load success/failure
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3_

- [x] 1.2 Fix CReact.prepareHydration() path mapping bug
  - Change from keying by full node path to component path (parent of node)
  - Handle root nodes correctly (no parent case)
  - Extract component path: node.path.slice(0, -1).join('.')
  - Add validation for empty paths
  - Update logging to show component paths vs node paths
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 1.3 Update CReact.build() to prepare hydration before rendering
  - Call prepareHydration(previousCloudDOM) after loading state
  - Call clearHydration() after rendering completes
  - Ensure hydration is available during render phase
  - Add debug logging for hydration lifecycle
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 1.4 Improve CReact.getHydratedValueForComponent() implementation
  - Search for any child node starting with component path
  - Return first match found (all children have same state outputs)
  - Add logging for search attempts and results
  - Handle edge cases (no matches, multiple matches)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 1.5 Add comprehensive hydration logging
  - Log hydration map contents after preparation
  - Log component paths and hook counts
  - Log lookup attempts in useState with path and index
  - Log success/failure with actual values
  - Log available keys when lookup fails
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 2. Improve Hydration Data Structure and Validation
  - Validate hydration map structure
  - Add helper methods for hydration inspection
  - Improve error messages
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 2.1 Add hydration map validation
  - Validate component paths are non-empty strings
  - Validate hook values are arrays
  - Validate hook indices are within bounds
  - Add warnings for suspicious patterns
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 2.2 Add CReact.getHydrationMapKeys() helper
  - Return array of all component paths in hydration map
  - Useful for debugging and logging
  - Include hook counts per component
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 2.3 Add CReact.getHydrationMapSize() helper
  - Return number of components with hydration data
  - Include total hook count across all components
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 2.4 Improve error messages in useState
  - Show attempted path and hook index
  - Show available hydration keys
  - Suggest possible path mismatches
  - Include component name if available
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 2.5 Add hydration state inspection to CReact
  - Add getHydrationState() method returning full map
  - Add hasHydrationForComponent(path) check
  - Add getHydrationHookCount(path) helper
  - Useful for testing and debugging
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 3. Add Backend State Synchronization Validation
  - Verify state is correctly saved after deployment
  - Verify state is correctly loaded before hydration
  - Add error handling for backend failures
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 3.1 Add validation in StateMachine.saveState()
  - Verify CloudDOM contains state outputs
  - Log warning if no state outputs found
  - Validate state outputs have correct format (state.stateN)
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 3.2 Add validation in StateMachine.getState()
  - Verify loaded state has CloudDOM
  - Verify CloudDOM nodes have outputs
  - Log warning if state appears incomplete
  - _Requirements: 6.4, 6.5_

- [ ] 3.3 Add error handling in loadStateForHydration()
  - Catch backend failures gracefully
  - Log errors but don't block hot reload
  - Continue with empty hydration map on failure
  - Add retry logic for transient failures
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 3.4 Add state sync verification in CReact.deploy()
  - After deployment, verify state was saved
  - Log confirmation of state persistence
  - Warn if state save failed
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 4. Add Integration Tests for Hot Reload Cycle
  - Test state preservation across hot reloads
  - Test initial deployment (no hydration)
  - Test nested components
  - Test multiple useState calls
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 4.1 Add test: Hot reload preserves single useState value
  - Deploy stack with one useState
  - Trigger hot reload
  - Verify state value preserved
  - Verify no false changes detected
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 4.2 Add test: Hot reload preserves multiple useState values
  - Deploy stack with multiple useState calls
  - Trigger hot reload
  - Verify all state values preserved in correct order
  - Verify hook indices match correctly
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 4.3 Add test: Initial deployment has no hydration
  - Deploy stack for first time
  - Verify hydration map is empty
  - Verify useState uses initial values
  - Verify state is saved after deployment
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 4.4 Add test: Nested components hydration
  - Deploy stack with nested components using useState
  - Trigger hot reload
  - Verify each component's state preserved independently
  - Verify path mapping works for nested components
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 4.5 Add test: Backend failure handling
  - Simulate backend failure during loadStateForHydration()
  - Verify hot reload continues with initial values
  - Verify error is logged but not thrown
  - Verify system recovers gracefully
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 5. Add Unit Tests for Hydration Components
  - Test prepareHydration() path mapping
  - Test getHydratedValue() lookup
  - Test hydration map structure
  - Test edge cases
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 5.1 Add test: prepareHydration() extracts state outputs
  - Create CloudDOM with state outputs
  - Call prepareHydration()
  - Verify hydration map populated correctly
  - Verify component paths are correct
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 5.2 Add test: prepareHydration() keys by component path
  - Create CloudDOM node with path ['stack', 'vpc']
  - Verify hydration keyed by 'stack' not 'stack.vpc'
  - Test with multiple nodes from same component
  - Verify all nodes share same state outputs
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5.3 Add test: getHydratedValue() returns correct value
  - Prepare hydration with test data
  - Call getHydratedValue() with various paths and indices
  - Verify correct values returned
  - Verify undefined returned for missing data
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 5.4 Add test: getHydratedValueForComponent() fallback logic
  - Test exact path match
  - Test child node search
  - Test no match case
  - Verify fallback behavior
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 5.5 Add test: Edge cases
  - Empty CloudDOM
  - CloudDOM with no state outputs
  - Root component (no parent)
  - Invalid paths
  - Out of bounds hook indices
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 8.4, 8.5_



- [ ] 6.3 Add CREACT_DEBUG logging for hydration
  - Enable with CREACT_DEBUG=true environment variable
  - Log all hydration operations
  - Log path mappings
  - Log lookup attempts
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 6.4 Add CLI command to inspect hydration state
  - creact debug hydration <stackName>
  - Show hydration map contents
  - Show component paths and hook counts
  - Show backend state
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
