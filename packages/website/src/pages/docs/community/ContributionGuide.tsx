import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const ContributionGuide: Component = () => {
  return (
    <>
      <h1>Contribution Guide</h1>
      <p class="docs-description">
        CReact is open source under the Apache 2.0 license. Contributions are welcome.
      </p>

      <DocHeading level={2} id="getting-started">Getting Started</DocHeading>
      <DocCodeBlock lang="bash" code={`# Clone the repository
git clone https://github.com/creact-labs/creact.git
cd creact

# Install dependencies
npm install

# Run tests
cd packages/creact
npm test

# Build
npm run build`} filename="Terminal" />

      <DocHeading level={2} id="project-structure">Project Structure</DocHeading>
      <DocCodeBlock lang="bash" code={`creact/
├── packages/
│   ├── creact/          # Main package
│   │   ├── src/         # Core reactive primitives, JSX, context
│   │   ├── flow/        # Show, For, Switch, ErrorBoundary
│   │   ├── runtime/     # render, reconcile, fiber, state machine
│   │   ├── store/       # createStore
│   │   └── test/        # Tests
│   └── website/         # This documentation site
└── docs/                # Tutorial markdown`} filename="Structure" />

      <DocHeading level={2} id="development">Development Workflow</DocHeading>
      <ol>
        <li>Fork the repository</li>
        <li>Create a feature branch: <code>git checkout -b feature/my-feature</code></li>
        <li>Make your changes</li>
        <li>Run tests: <code>npm test</code></li>
        <li>Run type checking: <code>npm run typecheck</code></li>
        <li>Submit a pull request</li>
      </ol>

      <DocHeading level={2} id="testing">Testing</DocHeading>
      <p>
        CReact uses Vitest. Tests mirror the Solid.js test suite structure where applicable.
        Reactive primitives and flow components have full test coverage.
      </p>
      <DocCodeBlock lang="bash" code={`# Run all tests
npm test

# Run specific test file
npx vitest run test/signals.spec.ts

# Watch mode
npx vitest`} filename="Terminal" />

      <DocHeading level={2} id="links">Links</DocHeading>
      <ul>
        <li><a href="https://github.com/creact-labs/creact" target="_blank" rel="noopener">GitHub Repository</a></li>
        <li><a href="https://github.com/creact-labs/creact/issues" target="_blank" rel="noopener">Issue Tracker</a></li>
        <li><a href="https://www.npmjs.com/package/@creact-labs/creact" target="_blank" rel="noopener">npm Package</a></li>
      </ul>

      <Callout type="info">
        <p>
          If you find a bug or have a feature request, please open an issue on GitHub.
        </p>
      </Callout>
    </>
  );
};

export default ContributionGuide;
