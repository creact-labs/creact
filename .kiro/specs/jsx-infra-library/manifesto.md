# CReact Technical Overview

**Draft for Milestone 2 (Interoperability Edition)**

## I. Current Infrastructure Challenges

Modern infrastructure management involves multiple specialized tools. Terraform manages cloud resources, Helm deploys Kubernetes charts, Docker Compose orchestrates containers, and Pulumi provides programmatic infrastructure definitions. Each tool maintains its own state model and execution semantics.

This separation creates integration challenges:
- Outputs from one tool must be manually passed to another
- Multiple state files require separate management
- Debugging requires correlating information across different systems
- Each tool uses different abstractions and mental models

These tools were designed independently and lack native composition mechanisms. They manage state separately, execute operations independently, and use different semantic models. Nesting a Terraform module within a Helm chart within a Docker Compose file requires custom integration work.

---

## II. Technical Approach

CReact applies declarative programming concepts from UI frameworks to infrastructure management. React demonstrated that declarative component composition, automatic diffing, and reconciliation can simplify complex state management.

**CloudDOM** provides a unified representation model for infrastructure resources. This typed, deterministic structure represents cloud resources, containers, databases, APIs, and other infrastructure components as nodes in a tree. Resources are declared rather than imperatively created.

State reconciliation computes differences between desired and current states, then applies minimal changes. This approach enables:
1. **Deterministic diffing** - Identical inputs produce identical outputs
2. **Dependency injection** - Providers integrate without tight coupling
3. **Compositional semantics** - Resources are represented as graph nodes

---

## III. Design Principles

The system follows these core principles:

1. **Declarative over imperative** - Resources are described rather than procedurally created
2. **Deterministic over dynamic** - Builds are reproducible given the same inputs
3. **Interop before reinvention** - Existing tools are composed rather than replaced
4. **Composability by default** - Resources can be nested and composed
5. **Context instead of configuration** - State propagates through the component tree
6. **Incremental over all-or-nothing** - Changes are applied incrementally when possible
7. **Safety and reversibility** - Rollback capabilities are built into the system

---

## IV. Architecture

### CloudDOM: State Representation

CloudDOM provides a declarative representation of infrastructure. Resources such as Lambda functions, Docker containers, Kubernetes deployments, and Terraform modules are represented as nodes. Each node has an ID, properties, children, and outputs. The structure is deterministic: identical JSX input produces identical CloudDOM output.

### The Reconciler: Difference Computation

The Reconciler compares previous and current CloudDOM states to compute minimal change sets (creates, updates, deletes). It constructs a dependency graph, orders operations topologically, and identifies opportunities for parallel execution.

### Providers: Backend Implementations

Providers implement the actual resource creation and management. For example, `AwsCloudProvider` creates Lambda functions, `DockerCloudProvider` manages containers, and `TerraformCloudProvider` wraps Terraform modules. Providers are injected at runtime through a dependency container using standard interfaces.

### State Machine: Deployment Lifecycle

The State Machine tracks deployment through states: PENDING → APPLYING → DEPLOYED/FAILED/ROLLED_BACK. It creates checkpoints after each resource operation. If a process is interrupted, deployment can resume from the last checkpoint. If deployment fails, the system can rollback to the previous state.

### Incremental Updates

When a resource property changes (e.g., Lambda memory from 512MB to 1024MB), the system detects the difference, validates the change is safe, and applies only that specific modification rather than redeploying the entire stack.

### Dependency Injection

New providers register through the dependency container and declare lifecycle hooks (`onBuild`, `onDeploy`, `onError`). All dependencies resolve at runtime using standard interfaces.

### Runtime Neutrality

CReact's runtime is platform-neutral — it can execute locally, in CI/CD environments, or embedded inside applications. The runtime does not depend on a central service, enabling portability across different execution contexts.

---

## V. Scope

**CReact provides:**
- A declarative runtime for infrastructure and applications
- A composition layer for orchestrating existing tools
- A reconciliation engine for computing minimal changes
- A state machine with transactional guarantees

**CReact does not:**
- Replace Terraform, Helm, or Pulumi (it integrates with them)
- Replace React or Next.js (it deploys them)
- Abstract away cloud-specific details (it orchestrates them declaratively)
- Impose architectural opinions (it provides a runtime)

The system uses a provider-modular architecture. Extensibility is achieved through dependency injection rather than plugin systems.

---

## VI. Interoperability and Extensibility

### Adapters for External Tools

Adapters integrate external IaC tools as CReact components. For example, `TerraformCloudProvider` parses HCL, converts resources to CloudDOM nodes, executes `terraform apply`, and maps outputs to context. Similar adapters exist for Helm, Pulumi, and Docker Compose. Deterministic ID generation and content-based hashing ensure reproducibility.

### Dependency Injection and Provider Registration

CReact uses dependency injection for all extension points. Providers, adapters, and state synchronization targets resolve through the same DI system, eliminating the need for a separate plugin API.

Example provider registration:

```typescript
import { DependencyContainer } from './core/DependencyContainer';
import { ICloudProvider } from './providers/ICloudProvider';

class CustomCloudProvider implements ICloudProvider {
  async create(node: CloudDOMNode): Promise<void> { /* ... */ }
  async update(node: CloudDOMNode): Promise<void> { /* ... */ }
  async delete(node: CloudDOMNode): Promise<void> { /* ... */ }
}

// Register provider
container.register('ICloudProvider', CustomCloudProvider, { lifecycle: 'singleton' });
```

The DI container itself is swappable — CReact does not mandate a specific implementation. Extension points (providers, adapters, state sync targets) all resolve through the same dependency graph.

### Multi-Provider Orchestration

A single CloudDOM tree can include resources from multiple providers (AWS Lambda, Docker containers, Kubernetes deployments, Terraform modules). The ProviderRouter dispatches nodes to appropriate providers based on resource type. Cross-provider dependencies are resolved automatically, and outputs propagate through context.

### State Synchronization API

CloudDOM state can be consumed by external systems through multiple protocols:
- WebSocket for real-time subscriptions
- HTTP for polling
- gRPC for CLI tools

The protocol uses language-agnostic JSON with versioned schemas. This enables frontends to display deployment status, monitoring systems to react to infrastructure changes, and automated systems to observe state.

---

## VII. Use Cases

### Monorepo Deployments
```tsx
function System() {
  return (
    <>
      <CReactApp source="./backend" />
      <CReactApp source="./frontend" />
      <CReactApp source="./worker" />
    </>
  );
}
```
Multiple applications can be deployed together with automatic output propagation. Backend URLs are automatically available to frontend components, and worker services can reference backend endpoints without manual configuration.

### Ephemeral Environments
Preview branches can provision complete environments including database, API, frontend, and monitoring. When a pull request is merged, the associated environment is automatically deprovisioned.

### Integrated Infrastructure Declarations
```tsx
function NextApp() {
  const db = useInstance(PostgresDatabase, { key: 'db' });
  const api = useInstance(AwsLambda, { key: 'api', env: { DB_URL: db.url } });
  
  return <NextJsApp env={{ API_URL: api.url }} />;
}
```
Applications can declare their infrastructure dependencies within the same codebase, eliminating the need for separate infrastructure repositories.

### Multi-Cloud Orchestration
Different resource types (AWS Lambda, Docker containers, Kubernetes jobs, local processes) can be managed within a single declarative tree using consistent semantics and deterministic diffing.

### Composable Infrastructure
Infrastructure components can be nested and composed. For example, a deployment pipeline can be implemented as a CReact application that deploys other CReact applications to staging and production environments.

### Programmatic Infrastructure Management
External systems can observe CloudDOM state, detect changes, and propose modifications through the standard API.

### Applied System Example: Data Processing Pipeline

A machine learning platform declares its complete infrastructure in a single declarative tree:

```tsx
function MLPlatform() {
  const ingestion = useInstance(DockerContainer, {
    key: 'ingestion',
    image: 'data-ingestion:latest',
    ports: [8080]
  });
  
  const preprocessing = useInstance(KubernetesJob, {
    key: 'preprocessing',
    image: 'preprocessing:latest',
    env: { INGESTION_URL: ingestion.url }
  });
  
  const modelApi = useInstance(AwsLambda, {
    key: 'model-api',
    handler: 'index.handler',
    env: { DATA_BUCKET: preprocessing.outputBucket }
  });
  
  return (
    <NextJsApp 
      source="./dashboard"
      env={{ API_URL: modelApi.url }}
    />
  );
}
```

Each component lives in the same declarative tree. Incremental updates can redeploy the model API independently without affecting the ingestion service or preprocessing jobs. Dependencies flow automatically through context, and the reconciler ensures changes are applied in the correct order.

---

## VIII. Future Directions

### Potential Developments

**Composable Infrastructure Patterns**
Infrastructure components could be packaged and distributed similarly to software libraries, enabling import, composition, and deployment with reduced manual integration.

**Simplified Provider Migration**
Declarative and deterministic infrastructure definitions could simplify provider migration by representing changes as diffs between resource types.

**Context-Based Configuration**
Configuration could propagate through the component tree rather than through separate configuration files or environment variables, reducing configuration drift.

**Automated Infrastructure Management**
External systems could propose infrastructure changes that are reviewed and approved by operators before application.

**Distributed State Management**
Future implementations could explore distributed state reconciliation patterns for infrastructure management. In future versions, providers themselves could run as distributed services — enabling decentralized or federated infrastructure orchestration.

---

## IX. Design Commitments

**Open Standards**
The project uses open source licensing, open protocols, and open standards to avoid proprietary lock-in.

**Deterministic Behavior**
The system guarantees reproducible builds through content-based IDs, sorted keys, and exclusion of non-deterministic data (such as timestamps) from CloudDOM.

**Interface-Based Extensibility**
Extension is achieved through standard dependency injection patterns using defined interfaces rather than custom plugin systems.

**Integrated Security**
Security features include state locking to prevent concurrent deployments, encryption for secrets at rest, audit logging, and role-based access control.

**Transparency**
The system prioritizes composability, testability, and inspectability. Implementation details are accessible and understandable.

**Safe Iteration**
Incremental updates include change validation to prevent destructive operations and automatic rollback capabilities.

---

## X. Summary

CReact applies declarative programming patterns to infrastructure management. The system provides:
- Declarative resource definitions
- Composable infrastructure components
- Deterministic state reconciliation
- Incremental updates

The approach integrates existing tools through a unified composition layer rather than replacing them.

---

*Version 1.0 — October 2025*
