# Technology Stack

## Language & Runtime

- **TypeScript 5.0+** - Primary language with strict mode enabled
- **Node.js** - Runtime environment (ES2020 target)
- **CommonJS** - Module system for distribution

## Build System

- **TypeScript Compiler (tsc)** - Compilation and type checking
- **Vitest** - Testing framework with globals enabled
- **ESLint 9** - Linting with TypeScript plugin
- **Prettier** - Code formatting

## Key Dependencies

- **React 18** (peer dependency) - JSX type definitions
- **better-sqlite3** - SQLite backend for state management (dev/test)

## Common Commands

```bash
# Development
npm run dev              # Watch mode compilation
npm run build            # Production build
npm run typecheck        # Type checking without emit

# Testing
npm test                 # Run all tests once
npm run test:watch       # Watch mode (not recommended in CI)

# Code Quality
npm run lint             # Check linting
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format all files
npm run format:check     # Check formatting without changes
```

## JSX Configuration

- **jsxFactory**: `CReact.createElement`
- **jsxFragmentFactory**: `CReact.Fragment`
- Custom JSX runtime that transforms JSX to internal representation

## Path Aliases

- `@/*` maps to `src/*` for cleaner imports

## Output

- Compiled output: `dist/`
- Type declarations: `dist/**/*.d.ts`
- Entry point: `dist/index.js`

## CLI Commands (MVP)

```bash
# CReact CLI commands
creact build             # Compile JSX to CloudDOM
creact plan              # Show diff preview without deploying
creact deploy            # Apply changes to infrastructure
creact dev               # Hot reload development mode
```

## Development Priorities

Current MVP implementation focuses on:
1. **Critical safety fixes** - Async hook context, memory leaks, lock renewal
2. **CLI completion** - Finish build, plan, deploy, dev commands
3. **Hot reload** - File watching and incremental updates
4. **Architecture cleanup** - Remove ProviderRouter, simplify interfaces

## Implementation Guidelines

- **One task at a time** - Complete each task fully before moving to next
- **Test after changes** - Maintain 696+ test coverage
- **Safety first** - Fix critical issues before adding features
- **MVP focus** - Defer advanced features to post-MVP

For detailed requirements, see: #[[file:.kiro/specs/jsx-infra-library/requirements.md]]
For implementation tasks and priorities, see: #[[file:.kiro/specs/jsx-infra-library/tasks.md]]
For architecture and design context, see: #[[file:.kiro/specs/jsx-infra-library/design.md]]
