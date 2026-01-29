/**
 * Undefined Props Handling Tests
 *
 * Tests for the bug where resources with undefined props were failing
 * instead of being skipped and retried after dependencies resolved.
 *
 * Root cause: Props were being "cleaned" (undefined values removed),
 * making it impossible for providers to detect incomplete props.
 *
 * These tests ensure:
 * 1. Undefined props are preserved (not stripped)
 * 2. Provider can skip resources with undefined props
 * 3. When dependencies resolve, resources are applied with defined props
 * 4. The reactive flow works: dependency outputs → signal → re-render → apply
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useInstance, resetRuntime, type OutputAccessors } from '../src/index.js';
import { MockProvider } from './utils/mock-provider.js';
import { TestRuntime } from './utils/test-runtime.js';

// Construct classes (markers)
class IAMRole {}
class IAMRolePolicyAttachment {}
class LambdaFunction {}

// Output types
type RoleOutputs = { name: string; arn: string };
type LambdaOutputs = { name: string; arn: string };

/**
 * Role component - creates an IAM role
 */
function Role({
  name,
  children,
}: {
  name: string;
  children: (outputs: OutputAccessors<RoleOutputs>) => any;
}) {
  const outputs = useInstance<RoleOutputs>(IAMRole, { name });
  return children(outputs);
}

/**
 * PolicyAttachment - attaches a policy to a role
 * The `role` prop may be undefined if the role hasn't been created yet
 */
function PolicyAttachment({
  role,
  policyArn,
}: {
  role: string | undefined;
  policyArn: string;
}) {
  useInstance(IAMRolePolicyAttachment, { role, policyArn });
  return null;
}

/**
 * Lambda - creates a Lambda function with a role
 * The `role` prop may be undefined if the role hasn't been created yet
 */
function Lambda({
  name,
  role,
  children,
}: {
  name: string;
  role: string | undefined;
  children?: (outputs: OutputAccessors<LambdaOutputs>) => any;
}) {
  const outputs = useInstance<LambdaOutputs>(LambdaFunction, { name, role });
  return children ? children(outputs) : null;
}

/**
 * App that composes Role → PolicyAttachment and Role → Lambda
 * This mirrors the real IAMRolePolicyAttachment failure scenario
 */
function LambdaWithRoleApp({ lambdaName }: { lambdaName: string }) {
  return (
    <Role name="api-role">
      {(role) => (
        <>
          <PolicyAttachment
            role={role.name()}
            policyArn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
          />
          <Lambda name={lambdaName} role={role.arn()} />
        </>
      )}
    </Role>
  );
}

describe('Undefined Props Handling', () => {
  let provider: MockProvider;
  let runtime: TestRuntime;

  beforeEach(() => {
    resetRuntime();
    provider = new MockProvider();
    runtime = new TestRuntime(provider);
  });

  describe('Props preservation', () => {
    it('should preserve undefined values in props (not strip them)', async () => {
      // Configure provider to track props
      let capturedProps: Record<string, any> | null = null;
      provider.setOutputsFn((node) => {
        if (node.constructType === 'IAMRolePolicyAttachment') {
          capturedProps = { ...node.props };
        }
        // Return empty for policy attachment (skip it)
        if (node.constructType === 'IAMRolePolicyAttachment') {
          return {};
        }
        if (node.constructType === 'IAMRole') {
          return { name: 'api-role', arn: 'arn:aws:iam::123:role/api-role' };
        }
        return {};
      });

      await runtime.run(<LambdaWithRoleApp lambdaName="api" />);

      // The policy attachment should have been called with role prop present
      // Even if undefined, the key should exist
      expect(capturedProps).not.toBeNull();
      expect('role' in capturedProps!).toBe(true);
    });

    it('should skip resources with undefined props (placeholder proxy behavior)', async () => {
      // With the placeholder proxy fix, resources with undefined props don't create
      // nodes at all - they return a placeholder proxy that returns undefined for
      // all outputs. This allows children to also be skipped, and everything is
      // retried when the dependency chain resolves.

      function OrphanPolicyAttachment() {
        // This component receives undefined role because there's no parent to provide it
        useInstance(IAMRolePolicyAttachment, {
          role: undefined, // Explicitly undefined
          policyArn: 'arn:aws:iam::aws:policy/TestPolicy',
        });
        return null;
      }

      let providerCalled = false;

      provider.setOutputsFn((node) => {
        if (node.constructType === 'IAMRolePolicyAttachment') {
          providerCalled = true;
        }
        return {};
      });

      await runtime.run(<OrphanPolicyAttachment />);

      // Provider should NOT be called because the resource was skipped (placeholder)
      expect(providerCalled).toBe(false);
    });
  });

  describe('Dependency resolution', () => {
    it('should apply resources after their dependencies resolve', async () => {
      const appliedTypes: string[] = [];

      provider.setOutputsFn((node) => {
        appliedTypes.push(node.constructType);

        // Skip resources with undefined props
        const hasUndefined = Object.values(node.props).some((v) => v === undefined);
        if (hasUndefined) {
          return {};
        }

        if (node.constructType === 'IAMRole') {
          return { name: 'api-role', arn: 'arn:aws:iam::123:role/api-role' };
        }
        if (node.constructType === 'IAMRolePolicyAttachment') {
          return { attached: true };
        }
        if (node.constructType === 'LambdaFunction') {
          return { name: 'api', arn: 'arn:aws:lambda:us-east-1:123:function:api' };
        }
        return {};
      });

      await runtime.run(<LambdaWithRoleApp lambdaName="api" />);

      // Role should be applied first
      expect(appliedTypes[0]).toBe('IAMRole');

      // Policy attachment and Lambda should eventually be applied
      // (they may be skipped first, then applied after role outputs are available)
      expect(appliedTypes).toContain('IAMRolePolicyAttachment');
      expect(appliedTypes).toContain('LambdaFunction');
    });

    it('should apply skipped resources when props become defined', async () => {
      const appliedWithDefinedProps: { type: string; props: Record<string, any> }[] = [];

      provider.setOutputsFn((node) => {
        const hasUndefined = Object.values(node.props).some((v) => v === undefined);

        if (!hasUndefined) {
          appliedWithDefinedProps.push({
            type: node.constructType,
            props: { ...node.props },
          });
        }

        if (hasUndefined) {
          return {};
        }

        if (node.constructType === 'IAMRole') {
          return { name: 'api-role', arn: 'arn:aws:iam::123:role/api-role' };
        }
        if (node.constructType === 'IAMRolePolicyAttachment') {
          return { attached: true };
        }
        if (node.constructType === 'LambdaFunction') {
          return { name: 'api', arn: 'arn:aws:lambda:us-east-1:123:function:api' };
        }
        return {};
      });

      await runtime.run(<LambdaWithRoleApp lambdaName="api" />);

      // All resources should eventually be applied with defined props
      const types = appliedWithDefinedProps.map((a) => a.type);
      expect(types).toContain('IAMRole');
      expect(types).toContain('IAMRolePolicyAttachment');
      expect(types).toContain('LambdaFunction');

      // Check that the dependent resources have the resolved values
      const policyAttachment = appliedWithDefinedProps.find(
        (a) => a.type === 'IAMRolePolicyAttachment'
      );
      expect(policyAttachment?.props.role).toBe('api-role');

      const lambda = appliedWithDefinedProps.find((a) => a.type === 'LambdaFunction');
      expect(lambda?.props.role).toBe('arn:aws:iam::123:role/api-role');
    });
  });

  describe('No errors on undefined props', () => {
    it('should not throw when resources have undefined props', async () => {
      provider.setOutputsFn((node) => {
        // Simulate real provider behavior: skip undefined props
        const hasUndefined = Object.values(node.props).some((v) => v === undefined);
        if (hasUndefined) {
          return {};
        }

        if (node.constructType === 'IAMRole') {
          return { name: 'api-role', arn: 'arn:aws:iam::123:role/api-role' };
        }
        return {};
      });

      // This should NOT throw
      await expect(runtime.run(<LambdaWithRoleApp lambdaName="api" />)).resolves.not.toThrow();
    });
  });

  describe('Reactive signal propagation', () => {
    it('should re-render children when parent outputs change', async () => {
      let renderCount = 0;

      function CountingPolicyAttachment({
        role,
        policyArn,
      }: {
        role: string | undefined;
        policyArn: string;
      }) {
        renderCount++;
        useInstance(IAMRolePolicyAttachment, { role, policyArn });
        return null;
      }

      function TestApp() {
        return (
          <Role name="test-role">
            {(role) => (
              <CountingPolicyAttachment
                role={role.name()}
                policyArn="arn:aws:iam::aws:policy/TestPolicy"
              />
            )}
          </Role>
        );
      }

      provider.setOutputsFn((node) => {
        const hasUndefined = Object.values(node.props).some((v) => v === undefined);
        if (hasUndefined) return {};

        if (node.constructType === 'IAMRole') {
          return { name: 'test-role', arn: 'arn:aws:iam::123:role/test-role' };
        }
        return { attached: true };
      });

      await runtime.run(<TestApp />);

      // Should have rendered at least twice:
      // 1. Initial render (role.name() is undefined)
      // 2. Re-render after role outputs are filled (role.name() is defined)
      expect(renderCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Complex dependency chains', () => {
    /**
     * Tests a chain: Role → PolicyAttachment
     *                    → Lambda (depends on role.arn)
     *
     * Both PolicyAttachment and Lambda depend on Role outputs
     */
    it('should handle multiple resources depending on the same parent', async () => {
      const appliedWithDefinedProps: string[] = [];

      provider.setOutputsFn((node) => {
        const hasUndefined = Object.values(node.props).some((v) => v === undefined);

        if (!hasUndefined) {
          appliedWithDefinedProps.push(node.constructType);
        }

        if (hasUndefined) return {};

        if (node.constructType === 'IAMRole') {
          return { name: 'shared-role', arn: 'arn:aws:iam::123:role/shared-role' };
        }
        if (node.constructType === 'IAMRolePolicyAttachment') {
          return { attached: true };
        }
        if (node.constructType === 'LambdaFunction') {
          return { name: 'fn', arn: 'arn:aws:lambda:us-east-1:123:function:fn' };
        }
        return {};
      });

      await runtime.run(<LambdaWithRoleApp lambdaName="fn" />);

      // All three should be applied with defined props
      expect(appliedWithDefinedProps).toContain('IAMRole');
      expect(appliedWithDefinedProps).toContain('IAMRolePolicyAttachment');
      expect(appliedWithDefinedProps).toContain('LambdaFunction');
    });
  });
});
