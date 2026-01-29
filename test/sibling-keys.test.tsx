/**
 * Sibling Keys Tests
 *
 * Tests that multiple siblings of the same construct type require unique keys.
 * This ensures proper node ID generation and prevents accidental overwrites.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useInstance, resetRuntime, type OutputAccessors } from '../src/index.js';
import { MockProvider } from './utils/mock-provider.js';
import { TestRuntime } from './utils/test-runtime.js';

// Construct classes
class PolicyAttachment {}
class Server {}

// Resource Components
function PolicyAttachmentResource({ policyArn }: { policyArn: string }) {
  useInstance(PolicyAttachment, { policyArn });
  return null;
}

function ServerResource({ name }: { name: string }) {
  useInstance(Server, { name });
  return null;
}

describe('Sibling Keys Requirement', () => {
  let provider: MockProvider;
  let runtime: TestRuntime;

  beforeEach(() => {
    resetRuntime();
    provider = new MockProvider();
    runtime = new TestRuntime(provider);
  });

  it('should work with unique keys on siblings', async () => {
    const policies = [
      'arn:aws:iam::aws:policy/AWSLambdaBasicExecutionRole',
      'arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess',
      'arn:aws:iam::aws:policy/AmazonSQSFullAccess',
    ];

    function App() {
      return (
        <>
          {policies.map((policyArn) => (
            <PolicyAttachmentResource key={policyArn} policyArn={policyArn} />
          ))}
        </>
      );
    }

    await runtime.run(<App />);

    // All 3 policies should be created as separate nodes
    expect(runtime.nodes.length).toBe(3);

    // Each should have unique ID based on key
    const ids = runtime.nodes.map((n) => n.id);
    expect(ids).toContain('policy-attachment-arn:aws:iam::aws:policy/AWSLambdaBasicExecutionRole');
    expect(ids).toContain('policy-attachment-arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess');
    expect(ids).toContain('policy-attachment-arn:aws:iam::aws:policy/AmazonSQSFullAccess');
  });

  it('should throw error when siblings have no keys', async () => {
    function App() {
      return (
        <>
          <ServerResource name="server-1" />
          <ServerResource name="server-2" />
        </>
      );
    }

    await expect(runtime.run(<App />)).rejects.toThrow(
      /Multiple instances of Server at the same level require unique keys/
    );
  });

  it('should throw error when mapped siblings have no keys', async () => {
    const servers = ['web', 'api', 'worker'];

    function App() {
      return (
        <>
          {servers.map((name) => (
            // Missing key prop!
            <ServerResource name={name} />
          ))}
        </>
      );
    }

    await expect(runtime.run(<App />)).rejects.toThrow(
      /Multiple instances of Server at the same level require unique keys/
    );
  });

  it('should allow same construct type in different parent contexts', async () => {
    function Parent({ name, children }: { name: string; children: any }) {
      useInstance(Server, { name });
      return children;
    }

    function App() {
      return (
        <>
          <Parent key="parent-1" name="parent-1">
            <ServerResource name="child-1" />
          </Parent>
          <Parent key="parent-2" name="parent-2">
            <ServerResource name="child-2" />
          </Parent>
        </>
      );
    }

    await runtime.run(<App />);

    // 4 nodes: 2 parents + 2 children
    expect(runtime.nodes.length).toBe(4);
  });

  it('should allow single instance without key', async () => {
    function App() {
      return <ServerResource name="solo-server" />;
    }

    await runtime.run(<App />);

    expect(runtime.nodes.length).toBe(1);
    expect(runtime.nodes[0].id).toBe('server');
  });
});
