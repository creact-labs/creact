# Product Overview

CReact is a React-inspired infrastructure-as-code library that enables developers to define cloud infrastructure using JSX syntax. It renders JSX components to a CloudDOM (Cloud Document Object Model) representation that can be materialized to actual cloud resources.

## Core Concept

Write infrastructure as declarative JSX components, similar to React, but for cloud resources instead of UI elements. The library handles rendering, validation, reconciliation, and deployment orchestration.

## Key Features

- **JSX-based infrastructure definitions** - Use familiar React patterns for infrastructure
- **CloudDOM abstraction** - Intermediate representation between JSX and cloud resources
- **State management** - Built-in state machine for deployment tracking and rollback
- **Reconciliation** - Diff-based deployment (only deploy what changed)
- **Provider architecture** - Pluggable cloud and backend providers
- **Hooks support** - useState, useContext, useInstance for stateful infrastructure
- **Validation** - Pre-deployment validation to catch errors early
- **Hot reload development** - Change code, see updates in <5 seconds

## Target Use Case

Infrastructure-as-code for teams familiar with React who want to leverage JSX patterns for defining cloud resources. Provides a higher-level abstraction than raw Terraform/CloudFormation while maintaining type safety and composability.

## MVP Focus

The current MVP focuses on:
- Basic CLI commands (build, plan, deploy, dev)
- Hot reload development mode
- JSX infrastructure components with hooks
- Simple provider system for extensibility

For detailed requirements, see: #[[file:.kiro/specs/jsx-infra-library/requirements.md]]
For architecture and design decisions, see: #[[file:.kiro/specs/jsx-infra-library/design.md]]
For implementation tasks, see: #[[file:.kiro/specs/jsx-infra-library/tasks.md]]
