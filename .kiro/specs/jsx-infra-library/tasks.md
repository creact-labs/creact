# CReact Implementation Tasks

**Last Updated:** 2025-10-06  
**Status:** MVP Implementation

---

## Overview

CReact is a JSX-based infrastructure library that brings React-style developer experience to infrastructure-as-code. Write infrastructure components using familiar JSX syntax and get instant feedback with hot reload.

**Current Status:** Core engine is complete (696 tests passing). Need to finish CLI, hot reload, and critical safety fixes.

---

## 🎯 MVP Implementation Plan

### Phase 1: Critical Safety Fixes (MUST FIX FIRST)

- [ ] 1. Fix hook context async safety
  - Implement AsyncLocalStorage for currentFiber and contextStacks
  - Ensure thread-safe hook execution in concurrent deployments
  - _Requirements: REQ-CORE-01_

- [ ] 2. Fix memory leak in context stacks
  - Add clearContextStacks() in Renderer's finally block
  - Prevent unbounded growth of contextStacks Map
  - _Requirements: REQ-CORE-01_

- [ ] 3. Implement lock auto-renewal (for backends that support locking)
  - Add setInterval to renew locks at 50% TTL
  - Clean up renewal timers on deployment completion
  - _Requirements: REQ-PROVIDER-01_

### Phase 2: Complete CLI Commands

- [ ] 4. Implement `creact build` command
  - Create CLI wrapper around existing build functionality
  - Add proper error handling and user-friendly output
  - Support `index.ts` as default entry point
  - _Requirements: REQ-CLI-01_

- [ ] 5. Implement `creact plan` command
  - Create CLI wrapper around existing reconciler diff
  - Add colored output (green=create, yellow=update, red=delete)
  - Support JSON output with `--json` flag
  - _Requirements: REQ-CLI-01_

- [ ] 6. Implement `creact deploy` command
  - Create CLI wrapper around existing deployment functionality
  - Add progress indicators and deployment status
  - Handle deployment errors gracefully
  - _Requirements: REQ-CLI-01_

- [ ] 7. Implement `creact dev` command (hot reload)
  - Set up file watcher for `index.ts` and imported files
  - Implement incremental rebuild on file changes
  - Apply minimal change sets via reconciler
  - Add rollback on failed hot reload
  - Target < 5 seconds for small changes
  - _Requirements: REQ-HOT-01_

### Phase 3: Architecture Cleanup

- [ ] 8. Remove ProviderRouter complexity
  - Simplify to single CloudProvider per app
  - Remove regex-based provider routing
  - Update existing code to use single provider pattern
  - _Requirements: REQ-PROVIDER-01_

- [ ] 9. Simplify IBackendProvider interface
  - Remove secrets-related methods (getSecret, setSecret, listSecrets)
  - Keep locking methods as optional
  - Update existing backend implementations
  - _Requirements: REQ-PROVIDER-01_

- [ ] 10. Remove escambo references
  - Update all import statements to use 'creact' instead of '@escambo/creact'
  - Update package.json and build configuration
  - Update documentation and examples
  - _Requirements: REQ-CORE-01_

### Phase 4: Performance & Reliability Improvements

- [ ] 11. Fix deep copy implementation
  - Replace shallow copy with proper deep copy using structuredClone()
  - Add fallback for environments without structuredClone
  - Prevent mutation bugs in CloudDOM building
  - _Requirements: REQ-CORE-01_

- [ ] 12. Improve hash function robustness
  - Replace JSON.stringify-based hashing with recursive type-aware function
  - Handle edge cases and prevent hash collisions
  - Ensure deterministic change detection
  - _Requirements: REQ-CORE-01_

- [ ] 13. Better error messages
  - Add context to validation errors (actual vs expected values)
  - Include suggestions for common mistakes
  - Improve circular dependency error reporting
  - _Requirements: REQ-CORE-01_

### Phase 5: Developer Experience Polish

- [ ] 14. Improve TypeScript types
  - Replace `any` types with proper interfaces
  - Add discriminated unions for hook states
  - Improve type inference for component props
  - _Requirements: REQ-CORE-01_

- [ ] 15. Add deployment timeout protection
  - Wrap materialize() calls in Promise.race() with timeout
  - Make timeout configurable per provider
  - Prevent hanging deployments
  - _Requirements: REQ-PROVIDER-01_

- [ ] 16. Improve module cache clearing for hot reload
  - Clear entire dependency tree, not just entry file
  - Prevent stale code issues in development mode
  - _Requirements: REQ-HOT-01_

---

## 🧪 Testing Strategy

### Unit Tests (Maintain Current Coverage)
- [ ]* 17. Update tests for simplified interfaces
  - Modify tests to work with simplified IBackendProvider
  - Remove tests for removed ProviderRouter functionality
  - Ensure 696+ tests still pass after changes
  - _Requirements: REQ-CORE-01_

### Integration Tests
- [ ]* 18. Add CLI integration tests
  - Test `creact build`, `plan`, `deploy` commands end-to-end
  - Verify proper exit codes and error handling
  - Test with various provider configurations
  - _Requirements: REQ-CLI-01_

- [ ]* 19. Add hot reload integration tests
  - Test file watching and incremental updates
  - Verify rollback behavior on failed reloads
  - Test with complex component hierarchies
  - _Requirements: REQ-HOT-01_

### Performance Tests
- [ ]* 20. Add hot reload performance benchmarks
  - Measure time from file save to deployment completion
  - Verify < 5 second target for small changes
  - Test with various CloudDOM sizes
  - _Requirements: REQ-HOT-01_

---

## 📋 Acceptance Criteria Verification

### REQ-CLI-01: Basic CLI Commands
- [ ] `creact build` compiles JSX to CloudDOM
- [ ] `creact plan` shows diff preview without deploying
- [ ] `creact deploy` applies changes to infrastructure
- [ ] All commands show help with `--help` flag
- [ ] Commands return proper exit codes (0 for success, non-zero for failure)

### REQ-HOT-01: Hot Reload Development Mode
- [ ] `creact dev` watches source files for changes and auto-applies
- [ ] File changes trigger rebuild and apply only affected CloudDOM subtree
- [ ] Hot reload shows "Δ applied" and updated resource count
- [ ] Failed reloads rollback to last stable CloudDOM
- [ ] Hot reload completes in under 5 seconds for small changes

### REQ-CORE-01: JSX Infrastructure Components
- [ ] JSX infrastructure components render to CloudDOM
- [ ] Hooks (useState, useContext, useInstance) work in infrastructure components
- [ ] Component composition builds coherent CloudDOM tree
- [ ] CloudDOM builds are deterministic (same input = same output)

### REQ-PROVIDER-01: Basic Provider System
- [ ] ICloudProvider implementations handle resource materialization
- [ ] IBackendProvider implementations handle state persistence
- [ ] Providers are configurable and used during deployment
- [ ] Provider failures provide clear error messages

---

## 🚀 Implementation Notes

### Development Workflow
1. **Start with Phase 1** - Critical safety fixes must be done first
2. **One task at a time** - Complete each task fully before moving to next
3. **Test after each task** - Ensure no regressions
4. **Update documentation** - Keep examples and README current

### Key Files to Modify
- `src/cli/` - New CLI command implementations
- `src/hooks/` - Async safety fixes
- `src/core/Renderer.ts` - Memory leak fixes
- `src/core/StateMachine.ts` - Lock auto-renewal
- `src/providers/IBackendProvider.ts` - Interface simplification
- `package.json` - Remove escambo references

### Testing Approach
- Run full test suite after each change
- Add new tests for CLI functionality
- Use DummyCloudProvider and FileBackendProvider for testing
- Test hot reload with real file changes

---

## 📊 Success Metrics

**MVP Complete When:**
- [ ] All Phase 1-3 tasks completed
- [ ] All acceptance criteria verified
- [ ] CLI commands work end-to-end
- [ ] Hot reload works reliably
- [ ] No escambo references remain
- [ ] Test suite passes (696+ tests)

**Production Ready When:**
- [ ] All phases completed
- [ ] Performance benchmarks met
- [ ] Error messages are developer-friendly
- [ ] TypeScript types are comprehensive
- [ ] Documentation is complete

---

**End of Implementation Tasks**