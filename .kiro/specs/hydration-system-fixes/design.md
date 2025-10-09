# Design Document

## Overview

This design provides a comprehensive analysis of the hot reload → hydration → backend sync cycle in CReact's development mode. Through systematic examination of every file involved in state persistence, we identify all gaps, disconnects, and issues preventing proper state restoration during hot reloads.

The goal is to make `creact dev` work correctly: when files change, component state should be preserved, preventing unnecessary re-deployments and maintaining infrastructure state across code changes.

## Complete Hot Reload Cycle Flow

### Current Implementation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. FILE CHANGE DETECTED (DevCommand.ts)                            │
├─────────────────────────────────────────────────────────────────────┤
│ - fs.watch() detects file change                                   │
│ - Debounced trigger (300ms)                                        │
│ - Calls performHotReload()                                         │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. PRESERVE REACTIVE STATE (DevCommand.ts)                         │
├─────────────────────────────────────────────────────────────────────┤
│ - serializeReactiveState() called                                  │
│ - Returns: { timestamp: Date.now() }                               │
│ - ❌ GAP: No actual state is serialized!                           │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. CREATE NEW INSTANCE (CLIContextManager)                         │
├─────────────────────────────────────────────────────────────────────┤
│ - Recompiles entry file                                            │
│ - Creates new CReact instance                                      │
│ - ❌ GAP: No hydration preparation before rendering!               │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. RESTORE REACTIVE STATE (CReact.ts)                              │
├─────────────────────────────────────────────────────────────────────┤
│ - restoreReactiveState() called                                    │
│ - Clears pending renders                                           │
│ - ❌ GAP: No actual state restoration!                             │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. BUILD (CReact.build())                                          │
├─────────────────────────────────────────────────────────────────────┤
│ - Loads previous state from backend                                │
│ - ✅ setPreviousOutputs() for provider outputs                     │
│ - ❌ GAP: No prepareHydration() for useState values!               │
│ - Renders JSX → Fiber                                              │
│ - useState looks for hydration but finds nothing                   │
│ - Uses initial values instead (state lost!)                        │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 6. RECONCILIATION (Reconciler.reconcile())                         │
├─────────────────────────────────────────────────────────────────────┤
│ - Compares previous CloudDOM with current                          │
│ - ❌ ISSUE: State outputs differ because useState used initial     │
│   values instead of hydrated values                                │
│ - Detects false changes (state.state1: "value" → undefined)        │
│ - Generates unnecessary update operations                          │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 7. DEPLOYMENT (if approved)                                        │
├─────────────────────────────────────────────────────────────────────┤
│ - Deploys "changes" that are actually just state loss              │
│ - Wastes time and resources                                        │
│ - User experience is broken                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Expected Flow (What Should Happen)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. FILE CHANGE DETECTED                                            │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. LOAD STATE FROM BACKEND                                         │
├─────────────────────────────────────────────────────────────────────┤
│ - StateMachine.getState(stackName)                                 │
│ - Returns: { cloudDOM: [...], status: 'DEPLOYED', ... }            │
│ - CloudDOM contains both provider outputs AND state outputs        │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. PREPARE HYDRATION                                               │
├─────────────────────────────────────────────────────────────────────┤
│ - CReact.prepareHydration(previousCloudDOM)                        │
│ - Extracts state.state1, state.state2, etc. from CloudDOM nodes    │
│ - Builds hydration map: Map<componentPath, hookValues[]>           │
│ - ✅ CRITICAL: Must key by COMPONENT path, not CloudDOM node path  │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. RENDER WITH HYDRATION                                           │
├─────────────────────────────────────────────────────────────────────┤
│ - Renderer.render(jsx)                                             │
│ - Component executes, calls useState()                             │
│ - useState checks CReact.getHydratedValue(componentPath, hookIdx)  │
│ - ✅ Finds hydrated value, uses it instead of initial value        │
│ - State is restored!                                               │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. RECONCILIATION                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ - Compares previous CloudDOM with current                          │
│ - ✅ State outputs match (hydration worked!)                       │
│ - ✅ No false changes detected                                     │
│ - Only real infrastructure changes trigger deployment              │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 6. NO DEPLOYMENT NEEDED (or minimal changes only)                  │
├─────────────────────────────────────────────────────────────────────┤
│ - Hot reload completes quickly                                     │
│ - State preserved                                                  │
│ - User experience is smooth                                        │
└─────────────────────────────────────────────────────────────────────┘
```

## File-by-File Analysis

### 1. DevCommand.ts (CLI Hot Reload Entry Point)

**Current Implementation:**
```typescript
private async performHotReload(entryPath: string, spinner: Spinner): Promise<void> {
  // Preserve reactive state before recompilation
  const preservedState = this.state.instance?.serializeReactiveState();
  
  // Create new instance - it will automatically load state from backend
  const result = await CLIContextManager.createCLIInstance(entryPath, this.verbose);
  
  // Restore reactive state after recompilation
  if (preservedState) {
    result.instance.restoreReactiveState(preservedState);
  }
  
  // ... reconciliation and deployment
}
```

**Issues Identified:**
1. ❌ `serializeReactiveState()` returns empty object `{ timestamp: Date.now() }`
2. ❌ No call to `loadStateForHydration()` before rendering
3. ❌ Comment says "automatically load state" but hydration is never prepared
4. ❌ `restoreReactiveState()` does nothing useful

**Required Changes:**
```typescript
private async performHotReload(entryPath: string, spinner: Spinner): Promise<void> {
  // Create new instance
  const result = await CLIContextManager.createCLIInstance(entryPath, this.verbose);
  
  // CRITICAL: Load state and prepare hydration BEFORE rendering
  await result.instance.loadStateForHydration(result.stackName);
  
  // Now build with hydration available
  const cloudDOM = await result.instance.build(result.jsx, result.stackName);
  
  // ... reconciliation and deployment
}
```

### 2. CReact.ts (Main Orchestrator)

**Current Implementation:**
```typescript
async build(jsx: JSXElement, stackName: string = 'default'): Promise<CloudDOMNode[]> {
  // Step 1: Load previous state
  const previousState = await this.stateMachine.getState(stackName);
  
  // Step 2: Inject outputs into useInstance hook
  if (previousState?.cloudDOM) {
    setPreviousOutputs(this.buildOutputsMap(previousState.cloudDOM));
  }
  
  // Step 3: Render JSX → Fiber (with outputs available)
  const fiber = this.renderer.render(jsx);
  
  // ❌ GAP: No hydration preparation for useState!
}
```

**Issues Identified:**
1. ❌ `setPreviousOutputs()` only handles provider outputs (for useInstance)
2. ❌ No `prepareHydration()` call for useState values
3. ❌ `loadStateForHydration()` exists but is never called
4. ❌ `prepareHydration()` exists but has path mapping bug

**Path Mapping Bug in prepareHydration():**
```typescript
prepareHydration(previousCloudDOM: CloudDOMNode[]): void {
  const extractStateOutputs = (nodes: CloudDOMNode[]) => {
    for (const node of nodes) {
      // ❌ BUG: Uses node.path (e.g., 'web-app-stack.vpc')
      const fiberPath = node.path.join('.');
      
      // But useState is called in parent component (e.g., 'web-app-stack')
      // So lookup will fail!
    }
  };
}
```

**Required Changes:**
```typescript
async build(jsx: JSXElement, stackName: string = 'default'): Promise<CloudDOMNode[]> {
  // Step 1: Load previous state
  const previousState = await this.stateMachine.getState(stackName);
  
  // Step 2: Prepare hydration for useState (BEFORE rendering)
  if (previousState?.cloudDOM) {
    this.prepareHydration(previousState.cloudDOM);
    setPreviousOutputs(this.buildOutputsMap(previousState.cloudDOM));
  }
  
  // Step 3: Render JSX → Fiber (with hydration available)
  const fiber = this.renderer.render(jsx);
  
  // Step 4: Clear hydration after render
  this.clearHydration();
  
  // ... rest of build
}

// Fix prepareHydration to key by component path
prepareHydration(previousCloudDOM: CloudDOMNode[]): void {
  const extractStateOutputs = (nodes: CloudDOMNode[]) => {
    for (const node of nodes) {
      // ✅ FIX: Extract component path (parent of CloudDOM node)
      // node.path = ['web-app-stack', 'vpc']
      // componentPath = 'web-app-stack' (where useState was called)
      const componentPath = node.path.slice(0, -1).join('.');
      
      if (node.outputs) {
        const stateValues: any[] = [];
        let index = 1;
        while (`state.state${index}` in node.outputs) {
          stateValues.push(node.outputs[`state.state${index}`]);
          index++;
        }
        if (stateValues.length > 0) {
          this.hydrationMap.set(componentPath, stateValues);
        }
      }
    }
  };
  extractStateOutputs(previousCloudDOM);
}
```

### 3. useState.ts (Hook Implementation)

**Current Implementation:**
```typescript
export function useState<T = undefined>(initialValue?: T): [T, (value: T) => void] {
  // ... hook setup
  
  if (currentFiber.hooks[currentHookIndex] === undefined) {
    // Try to get hydrated value
    const creactInstance = getCReactInstance?.();
    if (creactInstance && creactInstance.hasHydrationData()) {
      const fiberPath = currentFiber.path?.join('.') || '';
      hydratedValue = creactInstance.getHydratedValueForComponent(fiberPath, currentHookIndex);
    }
    
    // Use hydrated value if available
    currentFiber.hooks[currentHookIndex] = hydratedValue !== undefined ? hydratedValue : initialValue;
  }
}
```

**Issues Identified:**
1. ✅ Correctly uses `currentFiber.path` for lookup
2. ✅ Has fallback logic with `getHydratedValueForComponent()`
3. ❌ But hydration map is never populated, so lookup always fails
4. ✅ Logging is good for debugging

**Required Changes:**
- No changes needed in useState.ts itself
- The fix is in CReact.prepareHydration() to populate the map correctly

### 4. CloudDOMBuilder.ts (State Extraction)

**Current Implementation:**
```typescript
private extractOutputsFromFiber(fiber: FiberNode): Record<string, any> {
  const outputs: Record<string, any> = {};
  
  if (fiber.hooks && Array.isArray(fiber.hooks) && fiber.hooks.length > 0) {
    fiber.hooks.forEach((hookValue, index) => {
      const outputKey = generateStateOutputKey(index); // 'state.state1', 'state.state2', etc.
      outputs[outputKey] = hookValue;
    });
  }
  
  return outputs;
}
```

**Issues Identified:**
1. ✅ Correctly extracts useState values from fiber.hooks
2. ✅ Uses 'state.' prefix to separate from provider outputs
3. ✅ Properly merges into CloudDOM node outputs
4. ✅ This part is working correctly

**No Changes Needed:**
- CloudDOMBuilder correctly extracts and stores state outputs
- The issue is in hydration preparation, not extraction

### 5. StateMachine.ts (Backend Persistence)

**Current Implementation:**
```typescript
async saveState(stackName: string, state: DeploymentState): Promise<void> {
  // Saves entire DeploymentState including cloudDOM
  await this.backendProvider.saveState(stackName, state);
}

async getState(stackName: string): Promise<DeploymentState | undefined> {
  return await this.backendProvider.getState(stackName);
}
```

**Issues Identified:**
1. ✅ Correctly saves CloudDOM with all outputs (provider + state)
2. ✅ Correctly loads CloudDOM from backend
3. ✅ State persistence is working
4. ❌ But the loaded state is never used for hydration preparation

**No Changes Needed:**
- StateMachine is working correctly
- The issue is that CReact.build() doesn't call prepareHydration()

### 6. SQLiteBackendProvider.ts (Storage Implementation)

**Current Implementation:**
```typescript
async getState(stackName: string): Promise<any | undefined> {
  const stmt = this.db.prepare('SELECT state_data FROM state WHERE stack_name = ?');
  const row = stmt.get(stackName);
  return row ? JSON.parse(row.state_data) : undefined;
}

async saveState(stackName: string, state: any): Promise<void> {
  const stateData = JSON.stringify(state);
  const stmt = this.db.prepare(`
    INSERT INTO state (stack_name, state_data, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(stack_name) DO UPDATE SET state_data = excluded.state_data
  `);
  stmt.run(stackName, stateData, Date.now());
}
```

**Issues Identified:**
1. ✅ Correctly serializes/deserializes state
2. ✅ Handles upsert properly
3. ✅ Backend storage is working

**No Changes Needed:**
- Backend provider is working correctly

## Root Cause Analysis

### Primary Issue: Hydration Never Prepared

The root cause is a **missing function call** in the hot reload flow:

```typescript
// DevCommand.performHotReload() creates new instance
const result = await CLIContextManager.createCLIInstance(entryPath, this.verbose);

// ❌ MISSING: Should call loadStateForHydration() here
// await result.instance.loadStateForHydration(result.stackName);

// Then build is called, but hydration map is empty
const cloudDOM = await result.instance.build(result.jsx, result.stackName);
```

### Secondary Issue: Path Mapping Bug

Even if hydration were prepared, there's a path mapping bug:

```typescript
// CloudDOM node path: ['web-app-stack', 'vpc']
// useState called in: 'web-app-stack' component

// ❌ Current: Keys hydration by full node path
this.hydrationMap.set('web-app-stack.vpc', stateValues);

// ✅ Should: Key by component path (parent of node)
this.hydrationMap.set('web-app-stack', stateValues);
```

### Tertiary Issue: Reference Integrity

There's also a reference integrity issue mentioned in your analysis:

```typescript
// CloudDOMBuilder.buildHierarchy() creates deep copies
const rootNodes = this.buildHierarchy(cloudDOMNodes);

// ❌ This breaks proxy references
// Enhanced proxies reference original nodes
// But we're working with copies
// So output updates don't reach proxies
```

However, this is a **separate issue** from hydration and should be addressed in the existing `hooks-output-binding-fixes` spec.

## Architecture Components

### Hydration System Components

```
┌─────────────────────────────────────────────────────────────────┐
│ CReact Instance                                                 │
├─────────────────────────────────────────────────────────────────┤
│ - hydrationMap: Map<componentPath, hookValues[]>               │
│ - prepareHydration(cloudDOM): void                              │
│ - getHydratedValue(path, index): any                            │
│ - hasHydrationData(): boolean                                   │
│ - clearHydration(): void                                        │
│ - loadStateForHydration(stackName): Promise<void>               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ useState Hook                                                   │
├─────────────────────────────────────────────────────────────────┤
│ - Checks CReact.hasHydrationData()                              │
│ - Calls CReact.getHydratedValue(componentPath, hookIndex)      │
│ - Uses hydrated value if found, else initial value             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ CloudDOMBuilder                                                 │
├─────────────────────────────────────────────────────────────────┤
│ - extractOutputsFromFiber(fiber): Record<string, any>          │
│ - Extracts useState values from fiber.hooks                     │
│ - Prefixes with 'state.' to separate from provider outputs     │
│ - Merges into CloudDOM node outputs                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ StateMachine + BackendProvider                                  │
├─────────────────────────────────────────────────────────────────┤
│ - Persists CloudDOM with all outputs to backend                │
│ - Loads CloudDOM from backend on hot reload                     │
│ - State survives process restarts                               │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ DEPLOYMENT CYCLE (State Creation)                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Component renders                                                │
│   ↓                                                              │
│ useState() called → fiber.hooks[0] = value                       │
│   ↓                                                              │
│ CloudDOMBuilder.extractOutputsFromFiber()                        │
│   ↓                                                              │
│ CloudDOM node.outputs['state.state1'] = value                    │
│   ↓                                                              │
│ StateMachine.saveState() → Backend                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ HOT RELOAD CYCLE (State Restoration)                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ File change detected                                             │
│   ↓                                                              │
│ StateMachine.getState() ← Backend                                │
│   ↓                                                              │
│ CReact.prepareHydration(cloudDOM)                                │
│   ↓                                                              │
│ Extract state.state1, state.state2 from CloudDOM                 │
│   ↓                                                              │
│ Build hydrationMap: Map<componentPath, [value1, value2]>         │
│   ↓                                                              │
│ Component renders                                                │
│   ↓                                                              │
│ useState() checks hydrationMap                                   │
│   ↓                                                              │
│ Uses hydrated value → fiber.hooks[0] = hydratedValue            │
│   ↓                                                              │
│ State restored! ✅                                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Data Models

### Hydration Map Structure

```typescript
// Map of component path to array of hook values
type HydrationMap = Map<string, any[]>;

// Example:
{
  'web-app-stack' => [
    'postgres://localhost:5432/web-app-db',  // state.state1 (dbUrl)
    'https://api.example.com',                // state.state2 (apiEndpoint)
    'http://bucket.s3.amazonaws.com',         // state.state3 (bucketUrl)
    'lb-dns.amazonaws.com',                   // state.state4 (lbDns)
    '2025-10-09T03:05:50.565Z'                // state.state5 (lastDeploy)
  ],
  'web-app-stack.nested-component' => [
    'some-value'                              // state.state1
  ]
}
```

### CloudDOM Output Structure

```typescript
interface CloudDOMNode {
  id: string;
  path: string[];  // e.g., ['web-app-stack', 'vpc']
  outputs?: {
    // Provider outputs (from deployment)
    vpcId?: string;
    cidrBlock?: string;
    
    // State outputs (from useState)
    'state.state1'?: any;
    'state.state2'?: any;
    // ...
  };
}
```

### Component Path vs Node Path

```typescript
// Component renders and calls useState
function WebAppStack() {
  const [dbUrl, setDbUrl] = useState();  // Hook index 0
  const [apiUrl, setApiUrl] = useState(); // Hook index 1
  
  const vpc = useInstance(VPC, { ... });     // Creates node: ['web-app-stack', 'vpc']
  const db = useInstance(Database, { ... }); // Creates node: ['web-app-stack', 'database']
  
  // State belongs to component, not individual nodes
  // All nodes created by this component share the same state outputs
}

// Hydration mapping:
// Component path: 'web-app-stack'
// Node paths: 'web-app-stack.vpc', 'web-app-stack.database', etc.
// 
// ✅ Correct: Key hydration by component path
// hydrationMap.set('web-app-stack', [dbUrl, apiUrl])
//
// ❌ Wrong: Key by node path
// hydrationMap.set('web-app-stack.vpc', [dbUrl, apiUrl])
```

## Implementation Strategy

### Phase 1: Fix Hydration Preparation (Critical)

1. **Update DevCommand.performHotReload()**
   - Add call to `loadStateForHydration()` before building
   - Remove useless `serializeReactiveState()` / `restoreReactiveState()` calls

2. **Fix CReact.prepareHydration()**
   - Change path mapping to use component path (parent of node)
   - Handle root nodes correctly (no parent)
   - Add comprehensive logging

3. **Update CReact.build()**
   - Call `prepareHydration()` before rendering
   - Call `clearHydration()` after rendering

### Phase 2: Improve Hydration Lookup (Enhancement)

1. **Add getHydratedValueForComponent() helper**
   - Already exists but needs better implementation
   - Should search for any child node starting with component path
   - Fallback logic for edge cases

2. **Improve logging**
   - Log hydration map contents
   - Log lookup attempts and results
   - Help developers debug hydration issues

### Phase 3: Testing and Validation

1. **Add integration tests**
   - Test hot reload with state preservation
   - Test initial deployment (no hydration)
   - Test nested components
   - Test multiple useState calls

2. **Add debugging tools**
   - CLI command to inspect hydration state
   - Better error messages
   - Validation warnings

## Error Handling

### Hydration Failures

```typescript
// Graceful degradation: If hydration fails, use initial values
try {
  hydratedValue = creactInstance.getHydratedValue(path, index);
} catch (error) {
  console.warn('[useState] Hydration failed, using initial value:', error);
  hydratedValue = undefined;
}

// Always fall back to initial value
currentFiber.hooks[hookIndex] = hydratedValue !== undefined ? hydratedValue : initialValue;
```

### Path Mapping Errors

```typescript
// Handle edge cases in path extraction
const componentPath = node.path.length > 1 
  ? node.path.slice(0, -1).join('.')  // Normal case: parent component
  : node.path.join('.');               // Edge case: root node

// Validate path before using
if (!componentPath) {
  console.warn('[CReact] Invalid component path for hydration:', node.path);
  continue;
}
```

### Backend Failures

```typescript
// Don't block hot reload if backend fails
try {
  await result.instance.loadStateForHydration(result.stackName);
} catch (error) {
  console.warn('[DevCommand] Failed to load state for hydration:', error);
  // Continue without hydration - better than crashing
}
```

## Testing Strategy

### Unit Tests

```typescript
describe('CReact.prepareHydration', () => {
  it('should extract state outputs from CloudDOM nodes', () => {
    const cloudDOM = [{
      id: 'stack.vpc',
      path: ['stack', 'vpc'],
      outputs: {
        'state.state1': 'value1',
        'state.state2': 'value2',
        vpcId: 'vpc-123'  // Provider output
      }
    }];
    
    creact.prepareHydration(cloudDOM);
    
    expect(creact.getHydratedValue('stack', 0)).toBe('value1');
    expect(creact.getHydratedValue('stack', 1)).toBe('value2');
  });
  
  it('should key by component path, not node path', () => {
    // Component: 'web-app-stack'
    // Node: 'web-app-stack.vpc'
    // Hydration should be keyed by 'web-app-stack'
  });
});
```

### Integration Tests

```typescript
describe('Hot Reload State Preservation', () => {
  it('should preserve useState values across hot reloads', async () => {
    // 1. Initial deployment
    const result1 = await deploy();
    expect(result1.state.dbUrl).toBe('postgres://...');
    
    // 2. Simulate file change
    await hotReload();
    
    // 3. Verify state preserved
    const result2 = await getCurrentState();
    expect(result2.state.dbUrl).toBe('postgres://...');
  });
});
```

## Success Criteria

1. ✅ Hot reload preserves useState values
2. ✅ No false changes detected during reconciliation
3. ✅ Hydration map correctly keyed by component path
4. ✅ Graceful fallback to initial values if hydration fails
5. ✅ Comprehensive logging for debugging
6. ✅ Integration tests pass
7. ✅ User experience is smooth (no unnecessary deployments)

## Summary

The hydration system is **90% implemented** but has **two critical gaps**:

1. **Missing function call**: `loadStateForHydration()` is never called before rendering
2. **Path mapping bug**: Hydration keyed by node path instead of component path

Fixing these two issues will make hot reload work correctly. The rest of the infrastructure (state extraction, backend persistence, useState lookup) is already in place and working.
