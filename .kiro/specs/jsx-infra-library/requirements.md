# CReact Requirements — MVP Infrastructure Library

**Product:** CReact – JSX Infrastructure Library  
**Version:** 1.0 MVP  
**Date:** 2025-10-06

> **"React-style JSX for infrastructure with hot reload developer experience."**

**The Problem CReact Solves:**

- ❌ Infrastructure-as-code lacks the developer experience of modern frontend tools
- ❌ No hot reload for infrastructure changes - slow feedback loops
- ❌ Complex infrastructure tools are hard to compose and test

**The CReact MVP Solution:**

- ✅ **JSX for infrastructure** - Familiar React patterns for defining cloud resources
- ✅ **Hot reload for infrastructure** - Change code, see updates in <5 seconds  
- ✅ **Simple CLI** - Build, plan, deploy with familiar commands
- ✅ **Extensible foundation** - Other features can be built as CReact components

---

## 1. Vision

CReact is a **JSX-based infrastructure library** that brings React-style developer experience to infrastructure-as-code. Write infrastructure components using familiar JSX syntax and get instant feedback with hot reload.

**Critical Understanding:** CReact hooks are **declarative, not reactive** - they declare persistent outputs rather than triggering re-renders. This is by design for infrastructure use cases.

**CloudDOM:** The intermediate representation between JSX and cloud resources — analogous to React's Virtual DOM, but for infrastructure.

**Goal:** Make infrastructure development as fast and intuitive as frontend development, while maintaining infrastructure-appropriate behavior patterns.

**Developer Experience:** Focus on the core developer loop: edit JSX → hot reload → see changes applied incrementally.

---

## 2. Core Foundation (Already Built)

- JSX to CloudDOM rendering pipeline
- Basic hooks: useState, useContext, useInstance
- Provider interfaces: ICloudProvider, IBackendProvider  
- CloudDOM validation and persistence
- State machine for deployment tracking

---

## 3. MVP Requirements

### REQ-CLI-01 Basic CLI Commands

**User Story:** As a developer, I want essential CLI commands to build, plan, and deploy infrastructure, so that I have a familiar workflow.

#### Acceptance Criteria

1. WHEN I run `creact build` THEN it SHALL compile JSX to CloudDOM
2. WHEN I run `creact plan` THEN it SHALL show a diff preview without deploying
3. WHEN I run `creact deploy` THEN it SHALL apply changes to infrastructure
4. WHEN I run any command with `--help` THEN it SHALL display usage information
5. WHEN command succeeds THEN exit code SHALL be 0
6. WHEN command fails THEN exit code SHALL be non-zero with error context

---

### REQ-HOT-01 Hot Reload Development Mode

**User Story:** As a developer, I want hot reload for infrastructure changes, so that I can iterate quickly without full redeploys.

#### Acceptance Criteria

1. WHEN I run `creact dev` THEN it SHALL watch source files for changes and auto-apply
2. WHEN a watched file changes THEN it SHALL rebuild and apply only affected CloudDOM subtree
3. WHEN hot reload completes THEN it SHALL show "Δ applied" and updated resource count
4. WHEN a reload fails THEN it SHALL rollback to the last stable CloudDOM
5. WHEN hot reload applies changes THEN target time SHALL be under 5 seconds for small changes

---

### REQ-CORE-01 JSX Infrastructure Components

**User Story:** As a developer, I want to define infrastructure using JSX components with non-reactive hooks, so that I can use familiar React patterns while maintaining infrastructure-appropriate behavior.

#### Acceptance Criteria

1. WHEN I write JSX infrastructure components THEN they SHALL render to CloudDOM
2. WHEN I use hooks like useState and useContext THEN they SHALL work as declarative output mechanisms (NOT reactive state)
3. WHEN I call setState during render THEN it SHALL update persisted output without triggering re-render
4. WHEN I use useContext THEN it SHALL return static values for the current render cycle
5. WHEN I compose components THEN they SHALL build a coherent CloudDOM tree
6. WHEN CloudDOM is built THEN it SHALL be deterministic (same input = same output)

---

### REQ-HOOKS-01 Non-Reactive Hook Behavior

**User Story:** As a developer, I want CReact hooks to behave as declarative output mechanisms rather than reactive state, so that infrastructure changes are predictable and controlled.

#### Acceptance Criteria

1. WHEN I call useState THEN it SHALL return current persisted value and a setter function
2. WHEN I call setState during render THEN it SHALL update persisted output without causing re-render
3. WHEN I call setState multiple times in one render THEN all updates SHALL be applied to persisted state
4. WHEN I call useContext THEN it SHALL return static value from nearest Provider for current render
5. WHEN Provider value changes THEN it SHALL NOT cause child components to re-render
6. WHEN I deploy after state changes THEN new state values SHALL be available in next build cycle
7. WHEN hooks are called outside render context THEN they SHALL throw clear error messages

---

### REQ-PROVIDER-01 Basic Provider System

**User Story:** As a developer, I want a simple provider system for different cloud platforms, so that I can extend CReact to work with various infrastructure targets.

#### Acceptance Criteria

1. WHEN I implement ICloudProvider THEN it SHALL handle resource materialization
2. WHEN I implement IBackendProvider THEN it SHALL handle state persistence
3. WHEN providers are configured THEN they SHALL be used during deployment
4. WHEN deployment runs THEN providers SHALL receive CloudDOM nodes to materialize
5. WHEN providers fail THEN they SHALL provide clear error messages

---

## 4. Future Enhancements (Not MVP)

These features can be built as CReact components or extensions later:

- **Multi-provider routing** - Route different resource types to different providers
- **State sync server** - Expose CloudDOM state to React/Vue apps  
- **Nested app deployment** - CReact apps deploying other CReact apps
- **Advanced CLI features** - Audit logs, secrets management, RBAC
- **External adapters** - Terraform, Helm, Pulumi integration
- **Advanced error handling** - Retry logic, rollback strategies

---

## 5. Traceability Matrix

| ID      | Title                           | 
| ------- | ------------------------------- |
| CLI-01  | Basic CLI Commands              |
| HOT-01  | Hot Reload Development Mode     |
| CORE-01 | JSX Infrastructure Components   |
| HOOKS-01 | Non-Reactive Hook Behavior     |
| PROVIDER-01 | Basic Provider System       |

---

## 6. Document History

| Version | Date       | Changes                                    |
| ------- | ---------- | ------------------------------------------ |
| 1.0     | 2025-10-06 | MVP requirements - lean and focused        |

---

**End of Requirements Specification**
