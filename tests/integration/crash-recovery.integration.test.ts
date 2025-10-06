// REQ-O01: Crash recovery integration tests
// Tests for end-to-end crash recovery flow with StateMachine and CReact

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CReact } from '@/core/CReact';
import { DummyCloudProvider } from '@/providers/DummyCloudProvider';
import { DummyBackendProvider } from '@/providers/DummyBackendProvider';
import { CloudDOMNode } from '@/core/types';
import { DeploymentError } from '@/core/errors';

describe('Crash Recovery - Integration Tests', () => {
  let cloudProvider: DummyCloudProvider;
  let backendProvider: DummyBackendProvider;
  let creact: CReact;

  const stackName = 'test-stack';
  const user = 'test-user@example.com';

  beforeEach(() => {
    cloudProvider = new DummyCloudProvider();
    backendProvider = new DummyBackendProvider();

    creact = new CReact({
      cloudProvider,
      backendProvider,
    });
  });

  afterEach(() => {
    backendProvider.clearAll();
  });

  describe('resumeDeployment', () => {
    it('should resume deployment from checkpoint after crash', async () => {
      // Arrange: Create CloudDOM with multiple resources
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource1',
          path: ['resource1'],
          construct: class Resource1 {},
          props: { name: 'resource1' },
          children: [],
        },
        {
          id: 'resource2',
          path: ['resource2'],
          construct: class Resource2 {},
          props: { name: 'resource2' },
          children: [],
        },
        {
          id: 'resource3',
          path: ['resource3'],
          construct: class Resource3 {},
          props: { name: 'resource3' },
          children: [],
        },
      ];

      // Start deployment and simulate crash after first resource
      const stateMachine = creact.getStateMachine();
      const changeSet = {
        creates: cloudDOM,
        updates: [],
        deletes: [],
        replacements: [],
        moves: [],
        deploymentOrder: ['resource1', 'resource2', 'resource3'],
        parallelBatches: [['resource1'], ['resource2'], ['resource3']],
      };

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);
      await stateMachine.updateCheckpoint(stackName, 0);

      // Simulate crash: release lock (simulating TTL expiry or force-unlock)
      await backendProvider.releaseLock(stackName);

      // Act: Resume deployment
      const resumeData = await stateMachine.resumeDeployment(stackName);

      // Assert: Resume data contains correct information
      expect(resumeData.changeSet).toEqual(changeSet);
      expect(resumeData.checkpoint).toBe(0);
      expect(resumeData.cloudDOM).toEqual(cloudDOM);

      // Verify state is still APPLYING
      const state = await stateMachine.getState(stackName);
      expect(state?.status).toBe('APPLYING');
    });

    it('should detect incomplete deployment on startup', async () => {
      // Arrange: Create incomplete deployment
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource1',
          path: ['resource1'],
          construct: class Resource1 {},
          props: { name: 'resource1' },
          children: [],
        },
      ];

      const stateMachine = creact.getStateMachine();
      const changeSet = {
        creates: cloudDOM,
        updates: [],
        deletes: [],
        replacements: [],
        moves: [],
        deploymentOrder: ['resource1'],
        parallelBatches: [['resource1']],
      };

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);

      // Act: Check for incomplete deployment
      const hasIncomplete = await stateMachine.hasIncompleteDeployment(stackName);

      // Assert: Should detect incomplete deployment
      expect(hasIncomplete).toBe(true);
    });

    it('should provide checkpoint info for CLI display', async () => {
      // Arrange: Create deployment with checkpoint
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource1',
          path: ['resource1'],
          construct: class Resource1 {},
          props: { name: 'resource1' },
          children: [],
        },
        {
          id: 'resource2',
          path: ['resource2'],
          construct: class Resource2 {},
          props: { name: 'resource2' },
          children: [],
        },
      ];

      const stateMachine = creact.getStateMachine();
      const changeSet = {
        creates: cloudDOM,
        updates: [],
        deletes: [],
        replacements: [],
        moves: [],
        deploymentOrder: ['resource1', 'resource2'],
        parallelBatches: [['resource1'], ['resource2']],
      };

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);
      await stateMachine.updateCheckpoint(stackName, 0);

      // Act: Get checkpoint info
      const info = await stateMachine.getCheckpointInfo(stackName);

      // Assert: Info contains correct data
      expect(info).toBeDefined();
      expect(info!.checkpoint).toBe(0);
      expect(info!.resourceId).toBe('resource1');
      expect(info!.totalResources).toBe(2);
      expect(info!.percentComplete).toBe(50);
    });

    it('should fail to resume if state is not APPLYING', async () => {
      // Arrange: Create completed deployment
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource1',
          path: ['resource1'],
          construct: class Resource1 {},
          props: { name: 'resource1' },
          children: [],
        },
      ];

      const stateMachine = creact.getStateMachine();
      const changeSet = {
        creates: cloudDOM,
        updates: [],
        deletes: [],
        replacements: [],
        moves: [],
        deploymentOrder: ['resource1'],
        parallelBatches: [['resource1']],
      };

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);
      await stateMachine.completeDeployment(stackName);

      // Act & Assert: Should fail to resume
      await expect(stateMachine.resumeDeployment(stackName)).rejects.toThrow(DeploymentError);
    });

    it('should fail to resume if no deployment state found', async () => {
      // Act & Assert: Should fail to resume non-existent stack
      const stateMachine = creact.getStateMachine();
      await expect(stateMachine.resumeDeployment('non-existent')).rejects.toThrow(
        DeploymentError
      );
    });
  });

  describe('autoRecover', () => {
    it('should auto-resume deployment', async () => {
      // Arrange: Create incomplete deployment
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource1',
          path: ['resource1'],
          construct: class Resource1 {},
          props: { name: 'resource1' },
          children: [],
        },
      ];

      const stateMachine = creact.getStateMachine();
      const changeSet = {
        creates: cloudDOM,
        updates: [],
        deletes: [],
        replacements: [],
        moves: [],
        deploymentOrder: ['resource1'],
        parallelBatches: [['resource1']],
      };

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);
      await stateMachine.updateCheckpoint(stackName, 0);

      // Simulate crash: release lock (simulating TTL expiry or force-unlock)
      await backendProvider.releaseLock(stackName);

      // Act: Auto-recover with resume strategy
      const result = await stateMachine.autoRecover(stackName, 'resume');

      // Assert: Should resume
      expect(result.action).toBe('resumed');
      expect(result.checkpoint).toBe(0);
      expect(result.changeSet).toEqual(changeSet);
    });

    it('should auto-rollback deployment', async () => {
      // Arrange: Create incomplete deployment
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource1',
          path: ['resource1'],
          construct: class Resource1 {},
          props: { name: 'resource1' },
          children: [],
        },
      ];

      const stateMachine = creact.getStateMachine();
      const changeSet = {
        creates: cloudDOM,
        updates: [],
        deletes: [],
        replacements: [],
        moves: [],
        deploymentOrder: ['resource1'],
        parallelBatches: [['resource1']],
      };

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);

      // Act: Auto-recover with rollback strategy
      const result = await stateMachine.autoRecover(stackName, 'rollback');

      // Assert: Should rollback
      expect(result.action).toBe('rolled_back');

      const state = await stateMachine.getState(stackName);
      expect(state?.status).toBe('ROLLED_BACK');
    });

    it('should return none if no incomplete deployment', async () => {
      // Act: Auto-recover on non-existent stack
      const stateMachine = creact.getStateMachine();
      const result = await stateMachine.autoRecover(stackName, 'resume');

      // Assert: Should return none
      expect(result.action).toBe('none');
    });
  });

  describe('crash recovery with lock checking', () => {
    it('should allow resume when lock has expired', async () => {
      // Arrange: Create incomplete deployment
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource1',
          path: ['resource1'],
          construct: class Resource1 {},
          props: { name: 'resource1' },
          children: [],
        },
      ];

      const stateMachine = creact.getStateMachine();
      const changeSet = {
        creates: cloudDOM,
        updates: [],
        deletes: [],
        replacements: [],
        moves: [],
        deploymentOrder: ['resource1'],
        parallelBatches: [['resource1']],
      };

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);

      // Manually release lock to simulate expired lock
      await backendProvider.releaseLock(stackName);

      // Act: Resume should succeed when lock is released/expired
      const resumeData = await stateMachine.resumeDeployment(stackName);

      // Assert: Should successfully resume
      expect(resumeData.changeSet).toEqual(changeSet);
      expect(resumeData.checkpoint).toBe(-1);
    });

    it('should fail to resume when lock is held by another process', async () => {
      // Arrange: Create incomplete deployment
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource1',
          path: ['resource1'],
          construct: class Resource1 {},
          props: { name: 'resource1' },
          children: [],
        },
      ];

      const stateMachine = creact.getStateMachine();
      const changeSet = {
        creates: cloudDOM,
        updates: [],
        deletes: [],
        replacements: [],
        moves: [],
        deploymentOrder: ['resource1'],
        parallelBatches: [['resource1']],
      };

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);

      // Lock is still held by the original deployment
      // Act & Assert: Should fail to resume due to active lock
      await expect(stateMachine.resumeDeployment(stackName)).rejects.toThrow(DeploymentError);
    });
  });
});
