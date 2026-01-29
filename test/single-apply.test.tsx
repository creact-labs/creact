/**
 * Single Apply Tests
 *
 * Verifies that the fix for moving flushSync() after the apply loop works correctly.
 * Each resource should be applied exactly ONCE, not re-applied due to mid-loop re-renders.
 *
 * This tests the fix for: "Move flushSync() After Apply Loop Completes"
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useInstance, resetRuntime, type OutputAccessors } from '../src/index.js';
import { MockProvider } from './utils/mock-provider.js';
import { TestRuntime } from './utils/test-runtime.js';

// ============================================================================
// Construct Classes (matching the demo scenario)
// ============================================================================

class IAMRoleConstruct {}
class IAMRolePolicyAttachmentConstruct {}
class LambdaFunctionConstruct {}
class LambdaFunctionUrlConstruct {}
class S3ObjectConstruct {}

// ============================================================================
// Type Definitions
// ============================================================================

type IAMRoleOutputs = { arn: string; name: string };
type PolicyAttachmentOutputs = { id: string };
type LambdaOutputs = { arn: string; functionName: string };
type LambdaUrlOutputs = { functionUrl: string };
type S3ObjectOutputs = { objectKey: string; etag: string };

// ============================================================================
// Resource Components - Simulating the demo app structure
// ============================================================================

function IAMRole({ name, assumeRolePolicy, children }: {
  name: string;
  assumeRolePolicy: object;
  children: (outputs: OutputAccessors<IAMRoleOutputs>) => any;
}) {
  const outputs = useInstance<IAMRoleOutputs>(IAMRoleConstruct, { name, assumeRolePolicy });
  return children(outputs);
}

function IAMRolePolicyAttachment({ name, role, policyArn }: {
  name: string;
  role: string | undefined;
  policyArn: string;
}) {
  useInstance<PolicyAttachmentOutputs>(IAMRolePolicyAttachmentConstruct, { name, role, policyArn });
  return null;
}

function LambdaFunction({ name, role, handler, runtime, children }: {
  name: string;
  role: string | undefined;
  handler: string;
  runtime: string;
  children?: (outputs: OutputAccessors<LambdaOutputs>) => any;
}) {
  const outputs = useInstance<LambdaOutputs>(LambdaFunctionConstruct, { name, role, handler, runtime });
  return children?.(outputs) ?? null;
}

function LambdaFunctionUrl({ functionName, authorizationType, children }: {
  functionName: string | undefined;
  authorizationType: string;
  children?: (outputs: OutputAccessors<LambdaUrlOutputs>) => any;
}) {
  const outputs = useInstance<LambdaUrlOutputs>(LambdaFunctionUrlConstruct, { functionName, authorizationType });
  return children?.(outputs) ?? null;
}

function S3Object({ bucket, objectKey, content }: {
  bucket: string;
  objectKey: string;
  content: string | undefined;
}) {
  useInstance<S3ObjectOutputs>(S3ObjectConstruct, { bucket, objectKey, content });
  return null;
}

// ============================================================================
// App - Simulates the demo dependency chain
// ============================================================================

function DemoApp() {
  return (
    <IAMRole name="lambda-role" assumeRolePolicy={{ service: 'lambda.amazonaws.com' }}>
      {(role) => (
        <>
          <IAMRolePolicyAttachment
            name="lambda-basic-execution"
            role={role.name()}
            policyArn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
          />
          <LambdaFunction name="my-function" role={role.arn()} handler="index.handler" runtime="nodejs18.x">
            {(lambda) => (
              <LambdaFunctionUrl functionName={lambda.functionName()} authorizationType="NONE">
                {(url) => (
                  <S3Object bucket="my-bucket" objectKey="api-url.txt" content={url.functionUrl()} />
                )}
              </LambdaFunctionUrl>
            )}
          </LambdaFunction>
        </>
      )}
    </IAMRole>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('Single Apply - No Duplicate Applies', () => {
  let provider: MockProvider;
  let runtime: TestRuntime;

  beforeEach(() => {
    resetRuntime();
    provider = new MockProvider();
    runtime = new TestRuntime(provider);

    // Configure outputs that will flow through the dependency chain
    provider
      .setOutputs('IAMRoleConstruct', { arn: 'arn:aws:iam::123:role/lambda-role', name: 'lambda-role' })
      .setOutputs('IAMRolePolicyAttachmentConstruct', { id: 'attachment-123' })
      .setOutputs('LambdaFunctionConstruct', { arn: 'arn:aws:lambda::123:function:my-function', functionName: 'my-function' })
      .setOutputs('LambdaFunctionUrlConstruct', { functionUrl: 'https://abc123.lambda-url.us-east-1.on.aws/' })
      .setOutputs('S3ObjectConstruct', { objectKey: 'api-url.txt', etag: 'abc123' });
  });

  it('applies each resource exactly once in dependency order', async () => {
    await runtime.run(<DemoApp />);

    // Count applies per type
    const countByType = (type: string) =>
      provider.applyCalls.filter(c => c.node.constructType === type).length;

    // Each resource should be applied exactly ONCE
    expect(countByType('IAMRoleConstruct')).toBe(1);
    expect(countByType('IAMRolePolicyAttachmentConstruct')).toBe(1);
    expect(countByType('LambdaFunctionConstruct')).toBe(1);
    expect(countByType('LambdaFunctionUrlConstruct')).toBe(1);
    expect(countByType('S3ObjectConstruct')).toBe(1);

    // Total applies should be exactly 5
    expect(provider.applyCalls.length).toBe(5);
  });

  it('applies resources in correct dependency order', async () => {
    await runtime.run(<DemoApp />);

    const appliedTypes = provider.getAppliedTypes();

    // IAMRole must come first (everything depends on it)
    expect(appliedTypes.indexOf('IAMRoleConstruct')).toBe(0);

    // PolicyAttachment and Lambda both depend on IAMRole
    // They can be in either order relative to each other, but both after IAMRole
    expect(appliedTypes.indexOf('IAMRolePolicyAttachmentConstruct')).toBeGreaterThan(
      appliedTypes.indexOf('IAMRoleConstruct')
    );
    expect(appliedTypes.indexOf('LambdaFunctionConstruct')).toBeGreaterThan(
      appliedTypes.indexOf('IAMRoleConstruct')
    );

    // LambdaFunctionUrl must come after Lambda
    expect(appliedTypes.indexOf('LambdaFunctionUrlConstruct')).toBeGreaterThan(
      appliedTypes.indexOf('LambdaFunctionConstruct')
    );

    // S3Object must come after LambdaFunctionUrl (depends on the URL)
    expect(appliedTypes.indexOf('S3ObjectConstruct')).toBeGreaterThan(
      appliedTypes.indexOf('LambdaFunctionUrlConstruct')
    );
  });

  it('all dependent resources receive proper output values', async () => {
    await runtime.run(<DemoApp />);

    // Check that PolicyAttachment received the role name
    const policyAttachCall = provider.applyCalls.find(
      c => c.node.constructType === 'IAMRolePolicyAttachmentConstruct'
    );
    expect(policyAttachCall?.node.props.role).toBe('lambda-role');

    // Check that Lambda received the role ARN
    const lambdaCall = provider.applyCalls.find(
      c => c.node.constructType === 'LambdaFunctionConstruct'
    );
    expect(lambdaCall?.node.props.role).toBe('arn:aws:iam::123:role/lambda-role');

    // Check that LambdaFunctionUrl received the function name
    const urlCall = provider.applyCalls.find(
      c => c.node.constructType === 'LambdaFunctionUrlConstruct'
    );
    expect(urlCall?.node.props.functionName).toBe('my-function');

    // Check that S3Object received the function URL
    const s3Call = provider.applyCalls.find(
      c => c.node.constructType === 'S3ObjectConstruct'
    );
    expect(s3Call?.node.props.content).toBe('https://abc123.lambda-url.us-east-1.on.aws/');
  });
});

describe('Single Apply - Deep Chain', () => {
  let provider: MockProvider;
  let runtime: TestRuntime;

  // Deep chain: A -> B -> C -> D -> E -> F (proper component structure)
  class ResourceA {}
  class ResourceB {}
  class ResourceC {}
  class ResourceD {}
  class ResourceE {}
  class ResourceF {}

  function CompA({ children }: { children: (out: OutputAccessors<{ value: string }>) => any }) {
    const out = useInstance<{ value: string }>(ResourceA, { name: 'a' });
    return children(out);
  }

  function CompB({ aValue, children }: { aValue: string | undefined; children: (out: OutputAccessors<{ value: string }>) => any }) {
    const out = useInstance<{ value: string }>(ResourceB, { name: 'b', aValue });
    return children(out);
  }

  function CompC({ bValue, children }: { bValue: string | undefined; children: (out: OutputAccessors<{ value: string }>) => any }) {
    const out = useInstance<{ value: string }>(ResourceC, { name: 'c', bValue });
    return children(out);
  }

  function CompD({ cValue, children }: { cValue: string | undefined; children: (out: OutputAccessors<{ value: string }>) => any }) {
    const out = useInstance<{ value: string }>(ResourceD, { name: 'd', cValue });
    return children(out);
  }

  function CompE({ dValue, children }: { dValue: string | undefined; children: (out: OutputAccessors<{ value: string }>) => any }) {
    const out = useInstance<{ value: string }>(ResourceE, { name: 'e', dValue });
    return children(out);
  }

  function CompF({ eValue }: { eValue: string | undefined }) {
    useInstance<{ value: string }>(ResourceF, { name: 'f', eValue });
    return null;
  }

  function DeepChainApp() {
    return (
      <CompA>
        {(a) => (
          <CompB aValue={a.value()}>
            {(b) => (
              <CompC bValue={b.value()}>
                {(c) => (
                  <CompD cValue={c.value()}>
                    {(d) => (
                      <CompE dValue={d.value()}>
                        {(e) => <CompF eValue={e.value()} />}
                      </CompE>
                    )}
                  </CompD>
                )}
              </CompC>
            )}
          </CompB>
        )}
      </CompA>
    );
  }

  beforeEach(() => {
    resetRuntime();
    provider = new MockProvider();
    runtime = new TestRuntime(provider);

    provider
      .setOutputs('ResourceA', { value: 'a-output' })
      .setOutputs('ResourceB', { value: 'b-output' })
      .setOutputs('ResourceC', { value: 'c-output' })
      .setOutputs('ResourceD', { value: 'd-output' })
      .setOutputs('ResourceE', { value: 'e-output' })
      .setOutputs('ResourceF', { value: 'f-output' });
  });

  it('applies each resource in deep chain exactly once', async () => {
    await runtime.run(<DeepChainApp />);

    const countByType = (type: string) =>
      provider.applyCalls.filter(c => c.node.constructType === type).length;

    // Each resource in the chain should be applied exactly once
    expect(countByType('ResourceA')).toBe(1);
    expect(countByType('ResourceB')).toBe(1);
    expect(countByType('ResourceC')).toBe(1);
    expect(countByType('ResourceD')).toBe(1);
    expect(countByType('ResourceE')).toBe(1);
    expect(countByType('ResourceF')).toBe(1);

    // Total should be exactly 6
    expect(provider.applyCalls.length).toBe(6);
  });

  it('maintains correct output flow through deep chain', async () => {
    await runtime.run(<DeepChainApp />);

    const getApplyProps = (type: string) =>
      provider.applyCalls.find(c => c.node.constructType === type)?.node.props;

    expect(getApplyProps('ResourceB')?.aValue).toBe('a-output');
    expect(getApplyProps('ResourceC')?.bValue).toBe('b-output');
    expect(getApplyProps('ResourceD')?.cValue).toBe('c-output');
    expect(getApplyProps('ResourceE')?.dValue).toBe('d-output');
    expect(getApplyProps('ResourceF')?.eValue).toBe('e-output');
  });
});

describe('Single Apply - Multiple Dependents', () => {
  let provider: MockProvider;
  let runtime: TestRuntime;

  // Diamond pattern: Parent -> Child1, Parent -> Child2, both -> Grandchild
  class ParentResource {}
  class ChildResource1 {}
  class ChildResource2 {}
  class GrandchildResource {}

  function Parent({ children }: { children: (out: OutputAccessors<{ id: string }>) => any }) {
    const out = useInstance<{ id: string }>(ParentResource, { name: 'parent' });
    return children(out);
  }

  function Child1({ parentId, children }: { parentId: string | undefined; children: (out: OutputAccessors<{ id: string }>) => any }) {
    const out = useInstance<{ id: string }>(ChildResource1, { name: 'child1', parentId });
    return children(out);
  }

  function Child2({ parentId, children }: { parentId: string | undefined; children: (out: OutputAccessors<{ id: string }>) => any }) {
    const out = useInstance<{ id: string }>(ChildResource2, { name: 'child2', parentId });
    return children(out);
  }

  function Grandchild({ child1Id, child2Id }: { child1Id: string | undefined; child2Id: string | undefined }) {
    useInstance<{ id: string }>(GrandchildResource, { name: 'grandchild', child1Id, child2Id });
    return null;
  }

  function DiamondApp() {
    return (
      <Parent>
        {(parent) => (
          <Child1 parentId={parent.id()}>
            {(child1) => (
              <Child2 parentId={parent.id()}>
                {(child2) => (
                  <Grandchild child1Id={child1.id()} child2Id={child2.id()} />
                )}
              </Child2>
            )}
          </Child1>
        )}
      </Parent>
    );
  }

  beforeEach(() => {
    resetRuntime();
    provider = new MockProvider();
    runtime = new TestRuntime(provider);

    provider
      .setOutputs('ParentResource', { id: 'parent-123' })
      .setOutputs('ChildResource1', { id: 'child1-456' })
      .setOutputs('ChildResource2', { id: 'child2-789' })
      .setOutputs('GrandchildResource', { id: 'grandchild-abc' });
  });

  it('applies each resource in diamond pattern exactly once', async () => {
    await runtime.run(<DiamondApp />);

    const countByType = (type: string) =>
      provider.applyCalls.filter(c => c.node.constructType === type).length;

    expect(countByType('ParentResource')).toBe(1);
    expect(countByType('ChildResource1')).toBe(1);
    expect(countByType('ChildResource2')).toBe(1);
    expect(countByType('GrandchildResource')).toBe(1);

    expect(provider.applyCalls.length).toBe(4);
  });

  it('grandchild receives outputs from both children', async () => {
    await runtime.run(<DiamondApp />);

    const grandchildCall = provider.applyCalls.find(
      c => c.node.constructType === 'GrandchildResource'
    );

    expect(grandchildCall?.node.props.child1Id).toBe('child1-456');
    expect(grandchildCall?.node.props.child2Id).toBe('child2-789');
  });
});
