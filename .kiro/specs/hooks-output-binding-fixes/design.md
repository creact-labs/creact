# Design Document

## Overview

This design addresses critical issues in the CReact hooks system, output binding mechanism, and re-render logic. The current implementation has fundamental timing problems, circular dependencies, and incorrect phase separation that prevent proper reactive behavior. This design provides a comprehensive solution that maintains the non-reactive nature of CReact hooks while enabling proper output synchronization and selective re-rendering.

## Architecture

### Core Principles

1. **Phase Separation**: Clear separation between render, deployment, effects, and reactivity phases
2. **Non-Reactive useState**: useState updates state but does not trigger re-renders directly
3. **Output-Driven Reactivity**: Re-renders are triggered only when provider outputs change
4. **Precise Dependency Tracking**: Effects track only the outputs they actually access
5. **Timing Correctness**: Outputs are available before effects run

### Phase Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: RENDER                                             │
├─────────────────────────────────────────────────────────────┤
│ - useState() registers state slots                          │
│ - useInstance() creates CloudDOM nodes (outputs = {})       │
│ - useEffect() registers effect callbacks                    │
│ - useContext() reads context values                         │
│                                                              │
│ Output: Fiber tree + CloudDOM tree (no outputs yet)         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: DEPLOYMENT                                         │
├─────────────────────────────────────────────────────────────┤
│ - Provider materializes resources                           │
│ - Outputs are populated (db.outputs.connectionUrl = "...")  │
│ - State machine tracks progress                             │
│                                                              │
│ Output: CloudDOM with populated outputs                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: OUTPUT SYNC (NEW)                                 │
├─────────────────────────────────────────────────────────────┤
│ - Sync deployed outputs to original node references        │
│ - Update proxy targets with real values                    │
│ - Detect which outputs changed from previous deployment     │
│                                                              │
│ Output: Original nodes have current outputs                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: EFFECTS                                            │
├─────────────────────────────────────────────────────────────┤
│ - useEffect callbacks run with real outputs                 │
│ - setState() calls update fiber.hooks[]                     │
│ - Automatic binding detection happens here                  │
│                                                              │
│ Output: Updated state in Fiber                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 5: STATE SYNC                                         │
├─────────────────────────────────────────────────────────────┤
│ - Fiber hooks[] synced back to CloudDOM.outputs             │
│ - State saved to backend                                    │
│                                                              │
│ Output: Persisted state for next cycle                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 6: REACTIVITY (including initial deployment)          │
├─────────────────────────────────────────────────────────────┤
│ - Output changes detected (including undefined → value)     │
│ - Bound state updated automatically                         │
│ - Affected components re-rendered                           │
│ - Effects re-run if dependencies changed                    │
│                                                              │
│ Output: Updated infrastructure reflecting changes           │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced CloudDOMBuilder

**Purpose**: Fix timing issues and separate output types

**Key Changes**:
- Sync outputs to original nodes BEFORE executing effects
- Separate useState outputs from provider outputs
- Proper output change detection

```typescript
interface CloudDOMBuilder {
  // New method: Sync outputs before effects
  syncCloudDOMOutputsToOriginalNodes(fiber: FiberNode, cloudDOM: CloudDOMNode[]): void;
  
  // Enhanced method: Detect actual output changes
  detectOutputChanges(previous: CloudDOMNode[], current: CloudDOMNode[]): OutputChange[];
  
  // Fixed method: Proper phase ordering
  integrateWithPostDeploymentEffects(
    fiber: FiberNode, 
    cloudDOM: CloudDOMNode[], 
    previousCloudDOM?: CloudDOMNode[]
  ): Promise<FiberNode[]>;
}
```

**Implementation Strategy**:
```typescript
async integrateWithPostDeploymentEffects(
  fiber: FiberNode,
  cloudDOM: CloudDOMNode[],
  previousCloudDOM?: CloudDOMNode[]
): Promise<FiberNode[]> {
  // STEP 1: Sync outputs to original nodes FIRST
  this.syncCloudDOMOutputsToOriginalNodes(fiber, cloudDOM);
  
  // STEP 2: Execute effects (now outputs are available)
  await this.executePostDeploymentEffects(fiber);
  
  // STEP 3: Detect output changes for reactivity
  const outputChanges = this.detectOutputChanges(previousCloudDOM || [], cloudDOM);
  
  // STEP 4: Apply changes to bound state
  const affectedFibers = this.applyOutputChangesToState(outputChanges);
  
  // STEP 5: Sync state changes back to CloudDOM
  this.syncFiberStateToCloudDOM(fiber, cloudDOM);
  
  return affectedFibers;
}
```

### 2. Enhanced useInstance Hook

**Purpose**: Fix proxy logic and binding creation timing

**Key Changes**:
- Proxy always reads live values from target.outputs
- Create bindings when outputs are READ, not when setState is called
- Remove stale output references

```typescript
interface EnhancedUseInstance {
  // Enhanced proxy that tracks reads
  createEnhancedNode(node: CloudDOMNode, fiber: FiberNode): CloudDOMNode;
  
  // Track output access for binding creation
  trackOutputRead(nodeId: string, outputKey: string, fiber: FiberNode): void;
}
```

**Implementation Strategy**:
```typescript
function createEnhancedNode(node: CloudDOMNode, fiber: FiberNode): CloudDOMNode {
  return new Proxy(node, {
    get(target, prop, receiver) {
      if (prop === 'outputs') {
        return new Proxy(target.outputs || {}, {
          get(outputsTarget, outputKey) {
            if (typeof outputKey === 'string') {
              // Always read from current target.outputs
              const currentValue = target.outputs?.[outputKey];
              
              // Track this output read for binding creation
              if (currentValue !== undefined) {
                const tracker = getProviderOutputTracker();
                tracker.trackOutputRead(target.id, outputKey, fiber);
              }
              
              return currentValue;
            }
            return Reflect.get(outputsTarget, outputKey);
          }
        });
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}
```

### 3. Enhanced useState Hook

**Purpose**: Fix circular dependencies and binding logic

**Key Changes**:
- Prevent infinite binding loops
- Separate internal updates from user updates
- Create bindings based on tracked reads, not setState calls

```typescript
interface EnhancedUseState {
  // Enhanced setState with loop prevention
  setState(value: T | ((prev: T) => T), isInternalUpdate?: boolean): void;
  
  // Store setState callbacks for internal updates
  storeSetStateCallback(fiber: FiberNode, hookIndex: number, callback: Function): void;
}
```

**Implementation Strategy**:
```typescript
const setState = (value: T | ((prev: T) => T), isInternalUpdate = false): void => {
  const newValue = typeof value === 'function' 
    ? (value as (prev: T) => T)(fiber.hooks[hookIdx]) 
    : value;
  
  // Skip if no change
  if (fiber.hooks[hookIdx] === newValue) return;
  
  // Update hook value
  fiber.hooks[hookIdx] = newValue;
  
  // Only create bindings for user updates, not internal ones
  if (!isInternalUpdate) {
    const bindingManager = getStateBindingManager();
    const outputInfo = bindingManager.isProviderOutput(newValue);
    
    if (outputInfo && !bindingManager.isStateBoundToOutput(fiber, hookIdx)) {
      bindingManager.bindStateToOutput(
        fiber, hookIdx, outputInfo.nodeId, outputInfo.outputKey, newValue
      );
    }
  }
};

// Store callback for internal updates
(fiber as any).setStateCallbacks = (fiber as any).setStateCallbacks || [];
(fiber as any).setStateCallbacks[hookIdx] = setState;
```

### 4. Enhanced useEffect Hook

**Purpose**: Fix dependency tracking and wildcard bindings

**Key Changes**:
- Track only actually accessed outputs
- Remove wildcard bindings
- Precise dependency analysis

```typescript
interface EnhancedUseEffect {
  // Track output access during dependency evaluation
  trackDependencyAccess(deps: DependencyList, fiber: FiberNode): Set<string>;
  
  // Enhanced effect execution with precise change detection
  executeEffectsOnOutputChange(fiber: FiberNode, changedOutputs: Set<string>): void;
}
```

**Implementation Strategy**:
```typescript
function useEffect(effect: EffectCallback, deps?: DependencyList): void {
  const context = getStateContext();
  const { currentFiber } = context;
  
  const boundOutputs = new Set<string>();
  
  if (deps && deps.length > 0) {
    // Start tracking output reads
    const tracker = getProviderOutputTracker();
    tracker.startAccessTracking(currentFiber);
    
    // Access dependencies (triggers proxy tracking)
    deps.forEach(dep => void dep);
    
    // Get tracked outputs
    const accessedOutputs = tracker.endAccessTracking(currentFiber);
    accessedOutputs.forEach(output => boundOutputs.add(output));
  }
  
  const effectHook: EffectHook = {
    callback: effect,
    deps,
    hasRun: false,
    boundOutputs: boundOutputs.size > 0 ? boundOutputs : undefined,
    lastDepsValues: deps ? [...deps] : undefined,
    isReactive: boundOutputs.size > 0
  };
  
  currentFiber.effects[currentHookIndex] = effectHook;
}
```

### 5. Enhanced StateBindingManager

**Purpose**: Fix binding updates and prevent loops

**Key Changes**:
- Use internal setState callbacks to prevent loops
- Proper binding validation
- Efficient change detection

```typescript
interface EnhancedStateBindingManager {
  // Update bound state without creating new bindings
  updateBoundState(nodeId: string, outputKey: string, newValue: any): FiberNode[];
  
  // Check if binding already exists
  isStateBoundToOutput(fiber: FiberNode, hookIndex: number): boolean;
  
  // Validate binding integrity
  validateBindings(validNodes: Set<string>): void;
}
```

**Implementation Strategy**:
```typescript
updateBoundState(nodeId: string, outputKey: string, newValue: any): FiberNode[] {
  const bindingKey = generateBindingKey(nodeId, outputKey);
  const bindings = this.outputToBindings.get(bindingKey);
  
  if (!bindings) return [];
  
  const affectedFibers: FiberNode[] = [];
  
  Array.from(bindings).forEach(({ fiber, hookIndex }) => {
    const binding = this.stateBindings.get(fiber)?.get(hookIndex);
    if (!binding || binding.lastValue === newValue) return;
    
    // Use internal setState to avoid re-creating bindings
    const setStateCallbacks = (fiber as any).setStateCallbacks;
    if (setStateCallbacks?.[hookIndex]) {
      setStateCallbacks[hookIndex](newValue, true); // isInternalUpdate = true
    } else {
      // Fallback: direct hook update
      if (fiber.hooks) {
        fiber.hooks[hookIndex] = newValue;
      }
    }
    
    binding.lastValue = newValue;
    binding.lastUpdate = Date.now();
    affectedFibers.push(fiber);
  });
  
  return affectedFibers;
}
```

### 6. Enhanced ProviderOutputTracker

**Purpose**: Track output reads and manage bindings

**Key Changes**:
- Track when outputs are read via proxy
- Manage access tracking sessions
- Precise binding creation

```typescript
interface EnhancedProviderOutputTracker {
  // Active tracking sessions (keyed by fiber)
  private activeSessions: Map<FiberNode, AccessTrackingSession>;
  
  // Track output reads for binding creation
  trackOutputRead(nodeId: string, outputKey: string, fiber: FiberNode): void;
  
  // Start/end access tracking sessions
  startAccessTracking(fiber: FiberNode): void;
  endAccessTracking(fiber: FiberNode): Set<string>;
  
  // Update outputs and detect changes
  updateInstanceOutputs(nodeId: string, newOutputs: Record<string, any>): OutputChange[];
}
```

**Implementation Strategy**:
```typescript
class ProviderOutputTracker {
  private activeSessions = new Map<FiberNode, AccessTrackingSession>();
  
  startAccessTracking(fiber: FiberNode): void {
    this.activeSessions.set(fiber, {
      fiber,
      startTime: Date.now(),
      trackedOutputs: new Set(),
      isActive: true
    });
  }
  
  endAccessTracking(fiber: FiberNode): Set<string> {
    const session = this.activeSessions.get(fiber);
    if (!session) return new Set();
    
    session.isActive = false;
    this.activeSessions.delete(fiber);
    
    return session.trackedOutputs;
  }
  
  trackOutputRead(nodeId: string, outputKey: string, fiber: FiberNode): void {
    const session = this.activeSessions.get(fiber);
    if (session?.isActive) {
      const bindingKey = generateBindingKey(nodeId, outputKey);
      session.trackedOutputs.add(bindingKey);
    }
  }
}
```

### 7. Consolidated Hook Context

**Purpose**: Fix hook context isolation problems

**Key Changes**:
- Single source of truth for all hook contexts
- Separate indices per hook type
- Integrated access tracking

```typescript
interface ConsolidatedHookContext {
  // Single context for all hooks
  currentFiber: FiberNode | null;
  
  // Separate indices per hook type
  stateHookIndex: number;
  effectHookIndex: number;
  contextHookIndex: number;
  instanceHookIndex: number;
  
  // Context stacks
  contextStacks: Map<symbol, any[]>;
  
  // Access tracking
  accessTrackingSessions: Map<FiberNode, AccessTrackingSession>;
}
```

**Implementation Strategy**:
```typescript
// Single getter with validation
function requireHookContext(): ConsolidatedHookContext {
  const context = hookContextStorage.getStore();
  if (!context) {
    throw new Error(
      'Hook called outside of rendering context. ' +
      'Hooks must be called inside component functions during render.'
    );
  }
  return context;
}

// All hooks use the same context getter
export function useState<T>(initialValue?: T): [T, (value: T) => void] {
  const context = requireHookContext();
  const fiber = context.currentFiber;
  const hookIndex = context.stateHookIndex++;
  
  // ... rest of implementation
}

export function useEffect(effect: EffectCallback, deps?: DependencyList): void {
  const context = requireHookContext();
  const fiber = context.currentFiber;
  const hookIndex = context.effectHookIndex++;
  
  // ... rest of implementation
}
```
```

## Data Models

### Enhanced Output Structure

```typescript
interface SeparatedOutputs {
  // Provider outputs (from deployment)
  provider: Record<string, any>;
  
  // State outputs (from useState)
  state: Record<string, any>;
  
  // Combined view for backward compatibility
  combined: Record<string, any>;
}

interface CloudDOMNode {
  id: string;
  path: string[];
  construct: any;
  props: Record<string, any>;
  children: CloudDOMNode[];
  
  // Enhanced outputs with separation
  outputs?: SeparatedOutputs;
  
  eventCallbacks?: CloudDOMEventCallbacks;
}
```

### Enhanced Binding Tracking

```typescript
interface OutputBinding {
  nodeId: string;
  outputKey: string;
  lastValue: any;
  bindTime: number;
  lastUpdate?: number;
  
  // New: Track how binding was created
  createdBy: 'read' | 'setState';
  
  // New: Track access patterns
  accessCount: number;
  lastAccess: number;
}

interface AccessTrackingSession {
  fiber: FiberNode;
  startTime: number;
  trackedOutputs: Set<string>;
  isActive: boolean;
}
```

### Enhanced Effect Tracking

```typescript
interface EffectHook {
  callback: EffectCallback;
  deps: DependencyList | undefined;
  cleanup?: () => void;
  hasRun: boolean;
  
  // Enhanced dependency tracking
  boundOutputs?: Set<string>; // Specific binding keys
  lastDepsValues?: any[]; // Actual values for comparison
  lastDepsHash?: string; // Hash for quick comparison
  
  // Metadata
  isReactive: boolean;
  effectId: string;
  createdAt: number;
  
  // Access tracking
  accessedOutputs?: Map<string, number>; // output -> access count
  
  // Enhanced dependency comparison
  hasDepChanged(newDeps: any[]): boolean;
}
```

**Enhanced Dependency Comparison**:
```typescript
interface EffectHook {
  hasDepChanged(newDeps: any[]): boolean {
    if (!this.lastDepsValues) return true;
    if (this.lastDepsValues.length !== newDeps.length) return true;
    
    return this.lastDepsValues.some((prev, i) => {
      const curr = newDeps[i];
      
      // Handle provider outputs specially
      if (isProviderOutput(prev) && isProviderOutput(curr)) {
        return prev.__providerOutput.nodeId !== curr.__providerOutput.nodeId ||
               prev.__providerOutput.outputKey !== curr.__providerOutput.outputKey;
      }
      
      return prev !== curr;
    });
  }
}

function isProviderOutput(value: any): boolean {
  return value && 
         typeof value === 'object' && 
         (value.__providerOutput || value.__cloudDOMOutput);
}
```

### 8. Initial Deployment Re-render Logic

**Purpose**: Fix incorrect skipping of initial deployment re-renders

**Key Changes**:
- Check if outputs actually changed, not just if it's initial deployment
- Treat undefined → value as a change that should trigger re-renders
- Proper change detection for all deployment scenarios

```typescript
interface InitialDeploymentHandler {
  // Check if outputs actually changed (including undefined → value)
  hasActualOutputChanges(outputChanges: OutputChange[]): boolean;
  
  // Determine if re-renders should be triggered
  shouldTriggerReRenders(
    affectedFibers: FiberNode[], 
    isInitialDeployment: boolean,
    outputChanges: OutputChange[]
  ): boolean;
}
```

**Implementation Strategy**:
```typescript
// In Phase 6: Reactivity
// Don't skip initial deployment - check if outputs actually changed
const hasActualChanges = outputChanges.some(change => 
  change.previousValue !== change.newValue // undefined → value IS a change
);

// Trigger re-renders for any actual changes, including initial deployment
if (affectedFibers.length > 0 && hasActualChanges) {
  console.log(`[CReact] Triggering re-renders for ${affectedFibers.length} affected components`);
  
  affectedFibers.forEach(fiber => {
    this.scheduleReRender(fiber, 'output-update');
  });
  
  const updatedFiber = this.renderer.reRenderComponents(affectedFibers, 'output-update');
  this.lastFiberTree = updatedFiber;
}
```

## Error Handling

### Binding Loop Prevention

```typescript
interface BindingLoopDetector {
  // Track setState call chains
  trackSetStateCall(fiber: FiberNode, hookIndex: number, source: 'user' | 'binding'): void;
  
  // Detect potential loops
  detectLoop(fiber: FiberNode, hookIndex: number): boolean;
  
  // Break loops by skipping updates
  shouldSkipUpdate(fiber: FiberNode, hookIndex: number): boolean;
}
```

### Output Sync Validation

```typescript
interface OutputSyncValidator {
  // Validate output sync timing
  validateSyncTiming(phase: 'before-effects' | 'after-effects'): boolean;
  
  // Validate output consistency
  validateOutputConsistency(node: CloudDOMNode): ValidationResult;
  
  // Recover from sync failures
  recoverFromSyncFailure(error: Error, fiber: FiberNode): RecoveryResult;
}
