# Requirements Document

## Introduction

This specification addresses the broken hot reload → hydration → backend sync cycle in CReact's development mode. Currently, when files change during `creact dev`, component state is not properly preserved, causing unnecessary re-deployments and loss of infrastructure state. The requirement is to conduct a comprehensive analysis of the entire codebase to identify all gaps and disconnects in the state persistence flow, then fix the cycle end-to-end.

## Requirements

### Requirement 1: Complete Hot Reload Cycle Analysis

**User Story:** As a developer, I need to understand the complete hot reload cycle from file change to state restoration, so that I can identify all gaps and fix the broken flow.

#### Acceptance Criteria

1. WHEN analyzing the codebase THEN all files involved in hot reload SHALL be identified and documented
2. WHEN analyzing state flow THEN every step from file change to state restoration SHALL be mapped
3. WHEN analyzing data structures THEN all state storage locations SHALL be identified (fiber hooks, CloudDOM outputs, backend storage, hydration map)
4. WHEN analyzing code paths THEN all functions involved in state preparation, storage, retrieval, and restoration SHALL be documented
5. WHEN analysis is complete THEN a comprehensive flow diagram SHALL show the complete cycle with all components and their interactions

### Requirement 2: Identify State Persistence Gaps

**User Story:** As a developer, I need to identify where state is being lost or incorrectly transformed, so that I can fix the persistence issues.

#### Acceptance Criteria

1. WHEN state is created via useState THEN the analysis SHALL verify it's stored in fiber.hooks correctly
2. WHEN deployment completes THEN the analysis SHALL verify state is synced to CloudDOM.outputs correctly
3. WHEN state is persisted THEN the analysis SHALL verify it's saved to backend storage correctly
4. WHEN hot reload occurs THEN the analysis SHALL verify state is loaded from backend correctly
5. WHEN hydration is prepared THEN the analysis SHALL verify state is extracted and keyed correctly

### Requirement 3: Identify Path and Key Mismatches

**User Story:** As a developer, I need to identify all places where paths or keys don't match between state preparation and lookup, so that I can fix the mapping issues.

#### Acceptance Criteria

1. WHEN hydration data is prepared THEN the analysis SHALL document what paths/keys are used
2. WHEN useState looks up hydration THEN the analysis SHALL document what paths/keys are used
3. WHEN paths don't match THEN the analysis SHALL identify the root cause of the mismatch
4. WHEN keys are generated THEN the analysis SHALL verify they're consistent across all operations
5. WHEN path comparison occurs THEN the analysis SHALL verify the comparison logic is correct

### Requirement 4: Identify Reference Integrity Issues

**User Story:** As a developer, I need to identify where object references are being broken, so that I can fix proxy and binding issues.

#### Acceptance Criteria

1. WHEN CloudDOM nodes are created THEN the analysis SHALL verify they maintain reference integrity
2. WHEN nodes are copied or transformed THEN the analysis SHALL identify where references break
3. WHEN proxies are created THEN the analysis SHALL verify they reference the correct objects
4. WHEN outputs are updated THEN the analysis SHALL verify the updates reach all references
5. WHEN effects access outputs THEN the analysis SHALL verify they read from the correct objects

### Requirement 5: Fix Hot Reload State Restoration

**User Story:** As a developer using `creact dev`, I want file changes to preserve my deployed infrastructure state, so that I don't trigger unnecessary re-deployments.

#### Acceptance Criteria

1. WHEN a file changes THEN previous state SHALL be loaded from backend storage
2. WHEN hydration is prepared THEN state SHALL be correctly extracted and keyed
3. WHEN components render THEN useState SHALL successfully restore values from hydration
4. WHEN render completes THEN reconciliation SHALL detect no changes (if code didn't change infrastructure)
5. WHEN hot reload finishes THEN all component state SHALL match pre-reload state

### Requirement 6: Fix Backend State Synchronization

**User Story:** As a developer, I want component state to be properly persisted to backend storage, so that it survives hot reloads and process restarts.

#### Acceptance Criteria

1. WHEN deployment completes THEN all useState values SHALL be synced to backend
2. WHEN state is synced THEN it SHALL be keyed correctly for retrieval
3. WHEN backend is queried THEN it SHALL return the complete state for the stack
4. WHEN state is loaded THEN it SHALL be in the correct format for hydration preparation
5. WHEN sync fails THEN errors SHALL be logged but deployment SHALL not be blocked

### Requirement 7: Fix Hydration Data Preparation

**User Story:** As a developer, I want hydration data to be correctly prepared from previous state, so that useState can restore values.

#### Acceptance Criteria

1. WHEN preparing hydration THEN state SHALL be extracted from the correct source (fiber hooks, not CloudDOM nodes)
2. WHEN multiple useState calls exist THEN all hook values SHALL be included in hydration data
3. WHEN hydration map is built THEN keys SHALL match what useState will use for lookup
4. WHEN hydration data is stored THEN it SHALL be in the correct structure (Map<path, hookValues[]>)
5. WHEN hydration is complete THEN the map SHALL contain entries for all components with useState

### Requirement 8: Fix useState Hydration Lookup

**User Story:** As a developer, I want useState to successfully find and restore hydrated values, so that component state persists across hot reloads.

#### Acceptance Criteria

1. WHEN useState is called THEN it SHALL use the correct path for hydration lookup
2. WHEN hydration data exists THEN useState SHALL retrieve the value at the correct hook index
3. WHEN hydration succeeds THEN the restored value SHALL be used instead of initial value
4. WHEN hydration fails THEN useState SHALL fall back to initial value and log the reason
5. WHEN lookup occurs THEN paths SHALL match exactly between preparation and lookup

### Requirement 9: Implement Comprehensive Debugging

**User Story:** As a developer debugging hydration issues, I want detailed logging at every step, so that I can identify where the cycle breaks.

#### Acceptance Criteria

1. WHEN hydration is prepared THEN it SHALL log component paths, hook counts, and values
2. WHEN useState looks up hydration THEN it SHALL log the path, hook index, and result
3. WHEN lookup fails THEN it SHALL log the attempted path and all available keys
4. WHEN state is synced THEN it SHALL log what was saved and where
5. WHEN state is loaded THEN it SHALL log what was retrieved and from where

### Requirement 10: Validate End-to-End Cycle

**User Story:** As a developer, I want the complete hot reload cycle to work end-to-end, so that state persists correctly across file changes.

#### Acceptance Criteria

1. WHEN initial deployment completes THEN state SHALL be persisted to backend
2. WHEN file changes THEN previous state SHALL be loaded and prepared for hydration
3. WHEN components re-render THEN useState SHALL restore all values from hydration
4. WHEN reconciliation runs THEN it SHALL detect no changes (if infrastructure didn't change)
5. WHEN hot reload completes THEN component state SHALL be identical to pre-reload state
