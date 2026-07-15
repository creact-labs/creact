/**
 * Test data factories — faker-randomized, override what matters per test.
 * Naming follows the generate-* convention for data factories.
 */

import { faker } from "@faker-js/faker";
import type { InstanceNode } from "../instance";
import type {
  DeploymentState,
  SerializedNode,
} from "../memory";

/** A unique kebab-case resource id segment */
function generateNodeId(): string {
  return `${faker.word.sample()}-${faker.string.alphanumeric(6)}`.toLowerCase();
}

export function generateSerializedNode(
  overrides: Partial<SerializedNode> = {},
): SerializedNode {
  const id = generateNodeId();
  return {
    id,
    path: [id],
    props: { name: faker.word.noun() },
    ...overrides,
  };
}

/**
 * Minimal InstanceNode for reconciler/graph tests.
 * Reconciliation only reads id/path/props — lifecycle fields are inert stubs.
 */
export function generateInstanceNode(
  overrides: Partial<InstanceNode> = {},
): InstanceNode {
  const id = overrides.path ? overrides.path.join(".") : generateNodeId();
  return {
    id,
    path: [id],
    props: { name: faker.word.noun() },
    handler: async () => {},
    outputSignals: new Map(),
    children: [],
    setOutputs: () => {},
    ...overrides,
  };
}

/** An InstanceNode at a specific tree position, e.g. child(["app", "db"]) */
export function generateNodeAtPath(
  path: string[],
  overrides: Partial<InstanceNode> = {},
): InstanceNode {
  return generateInstanceNode({ id: path.join("."), path, ...overrides });
}

export function generateDeploymentState(
  overrides: Partial<DeploymentState> = {},
): DeploymentState {
  return {
    nodes: [generateSerializedNode()],
    status: "deployed",
    stackName: faker.word.sample().toLowerCase(),
    lastDeployedAt: faker.date.recent().getTime(),
    ...overrides,
  };
}
