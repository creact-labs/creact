# Requirements Document

## Introduction

This specification addresses critical issues with hooks behavior, output binding, and re-render logic in the CReact infrastructure-as-code library. The current implementation has several fundamental problems that prevent proper reactive behavior and cause timing issues with output population and state synchronization.

## Requirements

### Requirement 1: Fix Output Timing and Synchronization

**User Story:** As a developer using CReact, I want provider outputs to be available to effects immediately after deployment, so that my useEffect callbacks can access real resource outputs.

#### Acceptance Criteria

1. WHEN deployment completes THEN outputs SHALL be synced to original nodes BEFORE executing effects
2. WHEN effects execute THEN they SHALL have access to current provider outputs from deployed resources
3. WHEN setState is called with provider outputs THEN automatic binding SHALL be created immediately
4. WHEN output syncing occurs THEN it SHALL update both CloudDOM nodes and original fiber node references
5. WHEN effects run THEN they SHALL see the most up-to-date outputs from the deployment

### Requirement 2: Fix Output Reference Proxy Logic

**User Story:** As a developer using useInstance, I want to access node outputs reliably, so that my components can read deployed resource properties.

#### Acceptance Criteria

1. WHEN accessing node.outputs.someKey THEN the proxy SHALL return the current value from target.outputs
2. WHEN outputs are not yet populated THEN the proxy SHALL return undefined gracefully
3. WHEN output references are created THEN they SHALL be bound to the actual node outputs
4. WHEN outputs are updated after deployment THEN the proxy SHALL reflect the new values immediately
5. WHEN multiple output accesses occur THEN they SHALL be consistent within the same render cycle

### Requirement 3: Separate useState Outputs from Provider Outputs

**User Story:** As a developer, I want useState outputs and provider outputs to be clearly separated, so that they don't overwrite each other during synchronization.

#### Acceptance Criteria

1. WHEN CloudDOM nodes are built THEN useState outputs SHALL be stored separately from provider outputs
2. WHEN provider outputs are populated THEN they SHALL NOT overwrite useState outputs
3. WHEN useState outputs are updated THEN they SHALL NOT overwrite provider outputs
4. WHEN outputs are merged THEN provider outputs SHALL take precedence for the same key
5. WHEN outputs are synced THEN both types SHALL be preserved in their respective namespaces

### Requirement 4: Fix Circular Dependencies in State Binding

**User Story:** As a developer, I want setState calls to work without creating infinite loops, so that my components behave predictably.

#### Acceptance Criteria

1. WHEN setState is called with a provider output THEN it SHALL create a binding only if one doesn't exist
2. WHEN a binding updates state THEN it SHALL NOT trigger another binding check
3. WHEN setState is called multiple times THEN it SHALL NOT create duplicate bindings
4. WHEN bindings are updated THEN they SHALL NOT cause recursive setState calls
5. WHEN state changes occur THEN they SHALL be processed in a single update cycle

### Requirement 5: Improve Effect Dependency Tracking

**User Story:** As a developer using useEffect, I want effects to run only when their actual dependencies change, so that unnecessary re-renders are avoided.

#### Acceptance Criteria

1. WHEN useEffect dependencies include node outputs THEN only those specific outputs SHALL be tracked
2. WHEN wildcard bindings are created THEN they SHALL only match actually accessed outputs
3. WHEN effects reference CloudDOM nodes THEN bindings SHALL be created for accessed properties only
4. WHEN output changes occur THEN only effects with matching dependencies SHALL re-run
5. WHEN dependency analysis occurs THEN it SHALL be precise and avoid over-broad matching

### Requirement 6: Fix Initial Binding Creation

**User Story:** As a developer, I want automatic bindings to be created when outputs are first available, so that reactive updates work from the start.

#### Acceptance Criteria

1. WHEN outputs are restored from previous deployment THEN bindings SHALL be created immediately
2. WHEN useInstance returns enhanced nodes THEN output access SHALL create bindings automatically
3. WHEN effects access outputs THEN bindings SHALL be registered for future changes
4. WHEN components first render THEN they SHALL have access to previously deployed outputs
5. WHEN bindings are created THEN they SHALL be tracked for cleanup and validation

### Requirement 7: Fix Re-render Trigger Logic

**User Story:** As a developer, I want re-renders to be triggered appropriately for both initial and subsequent deployments, so that my components stay in sync with infrastructure state.

#### Acceptance Criteria

1. WHEN effects set state based on outputs THEN re-renders SHALL be triggered even on initial deployment
2. WHEN output changes are detected THEN affected components SHALL be re-rendered
3. WHEN initial deployment completes THEN effects SHALL run and may trigger re-renders
4. WHEN subsequent deployments occur THEN only actual changes SHALL trigger re-renders
5. WHEN re-renders are scheduled THEN they SHALL be batched and deduplicated

### Requirement 8: Implement Proper Phase Separation

**User Story:** As a developer, I want hooks to work in clearly defined phases, so that the behavior is predictable and follows infrastructure lifecycle patterns.

#### Acceptance Criteria

1. WHEN components render THEN hooks SHALL register state slots and effects
2. WHEN deployment occurs THEN resources SHALL be materialized and outputs populated
3. WHEN effects execute THEN they SHALL have access to real outputs and can update state
4. WHEN state sync occurs THEN updated values SHALL be persisted for next cycle
5. WHEN reactivity triggers THEN affected components SHALL be re-rendered with new state

### Requirement 9: Fix Output Binding Detection

**User Story:** As a developer, I want automatic binding detection to work reliably, so that my state stays synchronized with provider outputs.

#### Acceptance Criteria

1. WHEN setState receives a provider output value THEN binding SHALL be detected and created
2. WHEN binding detection occurs THEN it SHALL check for output metadata correctly
3. WHEN bindings are created THEN they SHALL use consistent binding keys
4. WHEN output values change THEN bound state SHALL be updated automatically
5. WHEN binding updates occur THEN they SHALL trigger appropriate re-renders

### Requirement 10: Ensure Non-Reactive useState Behavior

**User Story:** As a developer familiar with CReact's design, I want useState to be declarative and non-reactive, so that it follows infrastructure patterns rather than UI patterns.

#### Acceptance Criteria

1. WHEN setState is called THEN it SHALL NOT trigger immediate re-renders
2. WHEN state values are updated THEN they SHALL be persisted for next deployment cycle
3. WHEN re-renders occur THEN they SHALL be triggered by output changes, not setState calls
4. WHEN multiple setState calls happen THEN they SHALL update state without causing render loops
5. WHEN state is bound to outputs THEN re-renders SHALL occur when outputs change, not when state is set