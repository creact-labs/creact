# Implementation Plan

- [x] 1. Fix Hook Context Consolidation
  - Create consolidated hook context interface and implementation
  - Replace separate context management with single source of truth
  - Update all hooks to use consolidated context
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 1.1 Create ConsolidatedHookContext interface
  - Define interface with currentFiber, hook indices, context stacks, and access tracking
  - Implement requireHookContext() function with proper validation
  - _Requirements: 8.1, 8.2_

- [x] 1.2 Update hook context storage implementation
  - Replace separate context functions with consolidated implementation
  - Ensure thread safety with AsyncLocalStorage
  - Add proper error handling for invalid hook calls
  - _Requirements: 8.1, 8.3_

- [x] 1.3 Update all hooks to use consolidated context
  - Modify useState, useEffect, useContext, useInstance to use requireHookContext()
  - Update hook index management to use separate counters per hook type
  - Ensure consistent error messages across all hooks
  - _Requirements: 8.2, 8.4, 8.5_

- [x] 2. Fix Output Timing and Synchronization
  - Implement proper phase ordering in CloudDOMBuilder
  - Sync outputs to original nodes before executing effects
  - Separate useState outputs from provider outputs
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2.1 Implement syncCloudDOMOutputsToOriginalNodes method
  - Create method to sync deployed outputs to original node references
  - Walk fiber tree and update cloudDOMNodes with deployed outputs
  - Ensure proxy targets are updated with real values
  - _Requirements: 1.1, 1.4_

- [x] 2.2 Fix integrateWithPostDeploymentEffects phase ordering
  - Reorder steps: sync outputs BEFORE executing effects
  - Add proper error handling and logging for each phase
  - Ensure effects have access to current outputs
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 2.3 Separate useState outputs from provider outputs
  - Modify extractOutputsFromFiber to use 'state.' prefix for useState outputs
  - Update output merging logic to keep provider and state outputs separate
  - Ensure provider outputs take precedence for same keys
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [X] 3. Enhance useInstance Hook with Proper Proxy Logic
  - Fix proxy to always read live values from target.outputs
  - Implement output read tracking for automatic binding creation
  - Remove stale output references
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3.1 Implement enhanced createEnhancedNode proxy
  - Create proxy that always reads from current target.outputs
  - Add output read tracking when values are accessed
  - Remove dependency on stale outputReferences
  - _Requirements: 2.1, 2.4, 2.5_

- [x] 3.2 Add output read tracking to ProviderOutputTracker
  - Implement trackOutputRead method to record when outputs are accessed
  - Add access tracking sessions for dependency analysis
  - Integrate with binding creation system
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 3.3 Update useInstance to use enhanced proxy
  - Remove outputReferences creation during render
  - Use enhanced proxy that reads live values
  - Ensure proper cleanup and memory management
  - _Requirements: 2.2, 2.3, 6.1_

- [x] 4. Fix useState Hook Circular Dependencies
  - Prevent infinite binding loops with internal update mechanism
  - Separate user setState calls from internal binding updates
  - Implement proper binding validation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.1 Implement internal setState mechanism
  - Add isInternalUpdate parameter to setState function
  - Store setState callbacks in fiber for internal updates
  - Prevent binding creation during internal updates
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4.2 Add binding existence check
  - Implement isStateBoundToOutput method in StateBindingManager
  - Check for existing bindings before creating new ones
  - Prevent duplicate binding creation
  - _Requirements: 4.1, 4.3, 4.5_

- [x] 4.3 Update StateBindingManager to use internal setState
  - Modify updateBoundState to use stored setState callbacks
  - Add fallback to direct hook update if callback not available
  - Ensure proper error handling and recovery
  - _Requirements: 4.2, 4.4, 4.5_

- [x] 5. Enhance useEffect Hook Dependency Tracking
  - Remove wildcard bindings and implement precise tracking
  - Track only actually accessed outputs during dependency evaluation
  - Implement proper dependency comparison for provider outputs
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5.1 Implement access tracking during dependency evaluation
  - Start access tracking session before evaluating dependencies
  - Track which outputs are read during dependency access
  - End session and collect tracked outputs for binding
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 5.2 Remove wildcard bindings
  - Remove generateBindingKey(nodeId, '*') pattern
  - Use only specific output bindings based on actual access
  - Update effect execution to check specific bindings only
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 5.3 Implement enhanced dependency comparison
  - Add hasDepChanged method to EffectHook interface
  - Handle provider output comparison specially
  - Store actual dependency values for comparison
  - _Requirements: 5.1, 5.5_

- [x] 5.4 Add effect dependency validation
  - Validate that effect dependencies are properly tracked
  - Add warnings for untracked dependencies
  - Implement dependency cleanup on effect removal
  - _Requirements: 5.4, 5.5_

- [ ] 6. Fix Initial Binding Creation
  - Create bindings when outputs are first available
  - Implement automatic binding on output restoration
  - Ensure bindings work from first deployment
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6.1 Implement binding creation on output restoration
  - Modify setPreviousOutputs to create bindings for restored outputs
  - Track which components access restored outputs
  - Ensure bindings are ready for first effect execution
  - _Requirements: 6.1, 6.4_

- [x] 6.2 Add automatic binding on first output access
  - Integrate binding creation with proxy read tracking
  - Create bindings immediately when outputs are first accessed
  - Ensure proper cleanup and validation
  - _Requirements: 6.2, 6.3, 6.5_

- [x] 6.3 Update effect execution to create bindings
  - Ensure effects that access outputs create appropriate bindings
  - Track effect-to-output relationships for future changes
  - Implement proper binding lifecycle management
  - _Requirements: 6.3, 6.4, 6.5_

- [x] 7. Fix Re-render Trigger Logic
  - Allow re-renders on initial deployment when outputs change
  - Implement proper change detection for undefined → value transitions
  - Ensure appropriate re-render scheduling and batching
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 7.1 Implement proper output change detection
  - Check if outputs actually changed, including undefined → value
  - Compare previous and current values correctly
  - Handle initial deployment as valid change scenario
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 7.2 Update re-render trigger logic in CReact.deploy
  - Remove isInitialDeployment check that skips re-renders
  - Use hasActualChanges logic instead
  - Ensure effects can trigger re-renders on first deployment
  - _Requirements: 7.1, 7.3, 7.4_

- [x] 7.3 Implement proper re-render scheduling
  - Ensure re-renders are batched and deduplicated
  - Handle both initial and subsequent deployment scenarios
  - Add proper error handling for re-render failures
  - _Requirements: 7.4, 7.5_

- [x] 8. Implement Enhanced Output Change Detection
  - Build proper comparison between previous and current CloudDOM
  - Detect specific output changes with affected fiber tracking
  - Integrate with StateBindingManager for reactive updates
  - _Requirements: 1.4, 1.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 8.1 Implement buildNodeMap helper method
  - Create efficient map building for CloudDOM comparison
  - Handle nested node structures properly
  - Ensure consistent node identification
  - _Requirements: 1.4, 9.1_

- [x] 8.2 Enhance detectOutputChanges method
  - Compare previous and current CloudDOM states
  - Identify specific output keys that changed
  - Track affected fibers for each change
  - _Requirements: 1.5, 9.2, 9.3_

- [x] 8.3 Implement applyOutputChangesToState method
  - Apply detected changes to bound state via StateBindingManager
  - Handle binding updates without creating loops
  - Return affected fibers for re-rendering
  - _Requirements: 9.4, 9.5_

- [-] 9. Implement Non-Reactive useState Behavior
  - Ensure setState does not trigger immediate re-renders
  - Implement proper state persistence across deployment cycles
  - Ensure re-renders are triggered by output changes only
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 9.1 Validate useState non-reactivity
  - Ensure setState calls do not trigger immediate re-renders
  - Verify state updates are persisted for next cycle
  - Test that multiple setState calls work without render loops
  - _Requirements: 10.1, 10.2, 10.4_

- [ ] 9.2 Implement proper state persistence
  - Ensure state values persist across build/deploy cycles
  - Integrate with backend state storage
  - Handle state restoration correctly
  - _Requirements: 10.2, 10.5_

- [ ] 9.3 Validate output-driven reactivity
  - Ensure re-renders only occur when bound outputs change
  - Test that setState with provider outputs creates bindings
  - Verify reactive updates work correctly
  - _Requirements: 10.3, 10.5_
