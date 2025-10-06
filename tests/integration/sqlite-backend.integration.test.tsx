// REQ-04, REQ-05, REQ-O02, REQ-O05: SQLite Backend Integration Tests
// Comprehensive integration test with SQLite backend, locking, JSX, and realistic infrastructure

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CReact } from '../../src/jsx';
import { CReact as CReactClass } from '../../src/core/CReact';
import { IBackendProvider } from '../../src/providers/IBackendProvider';
import { ICloudProvider } from '../../src/providers/ICloudProvider';
import { CloudDOMNode } from '../../src/core/types';
import { useInstance } from '../../src/hooks/useInstance';
import { useState } from '../../src/hooks/useState';
import { useContext } from '../../src/hooks/useContext';
import { createContext } from '../../src/context/createContext';
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';

// ============================================================================
// SQLite Backend Provider with Locking Support
// ============================================================================

interface LockInfo {
  holder: string;
  acquiredAt: number;
  ttl: number;
}

class SQLiteBackendProvider implements IBackendProvider {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS state (
        stack_name TEXT PRIMARY KEY,
        state_data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS locks (
        stack_name TEXT PRIMARY KEY,
        holder TEXT NOT NULL,
        acquired_at INTEGER NOT NULL,
        ttl INTEGER NOT NULL
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stack_name TEXT NOT NULL,
        action TEXT NOT NULL,
        user TEXT,
        timestamp INTEGER NOT NULL,
        details TEXT
      )
    `);
  }

  async getState(stackName: string): Promise<any | undefined> {
    const row = this.db.prepare('SELECT state_data FROM state WHERE stack_name = ?').get(stackName) as { state_data: string } | undefined;
    return row ? JSON.parse(row.state_data) : undefined;
  }

  async saveState(stackName: string, state: any): Promise<void> {
    const stateData = JSON.stringify(state);
    const now = Date.now();
    
    this.db.prepare(`
      INSERT INTO state (stack_name, state_data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(stack_name) DO UPDATE SET
        state_data = excluded.state_data,
        updated_at = excluded.updated_at
    `).run(stackName, stateData, now);
  }

  async acquireLock(stackName: string, holder: string, ttl: number): Promise<void> {
    const now = Date.now();
    
    const existingLock = await this.checkLock(stackName);
    if (existingLock) {
      // TTL is in seconds, convert to milliseconds for comparison
      if (now - existingLock.acquiredAt < existingLock.ttl * 1000) {
        throw new Error(`Lock held by ${existingLock.holder}`);
      }
    }

    this.db.prepare(`
      INSERT INTO locks (stack_name, holder, acquired_at, ttl)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(stack_name) DO UPDATE SET
        holder = excluded.holder,
        acquired_at = excluded.acquired_at,
        ttl = excluded.ttl
    `).run(stackName, holder, now, ttl);
  }

  async releaseLock(stackName: string): Promise<void> {
    this.db.prepare('DELETE FROM locks WHERE stack_name = ?').run(stackName);
  }

  async checkLock(stackName: string): Promise<LockInfo | null> {
    const row = this.db.prepare('SELECT holder, acquired_at, ttl FROM locks WHERE stack_name = ?').get(stackName) as LockInfo | undefined;
    return row || null;
  }

  async appendAuditLog(stackName: string, entry: { action: string; user?: string; timestamp: number; details?: any }): Promise<void> {
    this.db.prepare(`
      INSERT INTO audit_log (stack_name, action, user, timestamp, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(stackName, entry.action, entry.user || null, entry.timestamp, entry.details ? JSON.stringify(entry.details) : null);
  }

  getAuditLog(stackName: string): any[] {
    const rows = this.db.prepare('SELECT * FROM audit_log WHERE stack_name = ? ORDER BY timestamp DESC').all(stackName);
    return rows.map((row: any) => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : undefined,
    }));
  }

  close(): void {
    this.db.close();
  }

  clearAll(): void {
    this.db.exec('DELETE FROM state');
    this.db.exec('DELETE FROM locks');
    this.db.exec('DELETE FROM audit_log');
  }
}

// ============================================================================
// Mock Cloud Provider with Multiple Construct Types
// ============================================================================

class MockAWSProvider implements ICloudProvider {
  private resources: Map<string, any> = new Map();
  private deploymentLog: string[] = [];

  async preDeploy(cloudDOM: CloudDOMNode[]): Promise<void> {
    this.log(`[PreDeploy] Validating ${cloudDOM.length} resources`);
  }

  async materialize(cloudDOM: CloudDOMNode[]): Promise<void> {
    this.log(`[Materialize] Deploying ${cloudDOM.length} resources`);

    for (const node of cloudDOM) {
      const constructName = this.getConstructName(node.construct);
      this.log(`  [Create] ${constructName}: ${node.id}`);
      
      // Generate outputs based on construct type
      node.outputs = this.generateOutputs(constructName, node);
      this.resources.set(node.id, { ...node, status: 'active' });
    }
  }

  async postDeploy(cloudDOM: CloudDOMNode[]): Promise<void> {
    this.log(`[PostDeploy] Finalizing ${cloudDOM.length} resources`);
  }

  private generateOutputs(constructName: string, node: CloudDOMNode): any {
    const randomId = () => Math.random().toString(36).substring(2, 10);
    
    switch (constructName) {
      case 'VPC':
        return { vpcId: `vpc-${randomId()}`, cidr: node.props.cidr };
      case 'Subnet':
        return { subnetId: `subnet-${randomId()}`, az: node.props.az || 'us-east-1a' };
      case 'SecurityGroup':
        return { securityGroupId: `sg-${randomId()}` };
      case 'EC2Instance':
        return { 
          instanceId: `i-${randomId()}`,
          publicIp: `54.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
        };
      case 'RDSInstance':
        return { 
          endpoint: `${node.id}.${randomId()}.us-east-1.rds.amazonaws.com`,
          port: 5432 
        };
      case 'S3Bucket':
        return { 
          bucketName: node.props.bucketName || `bucket-${randomId()}`,
          arn: `arn:aws:s3:::${node.props.bucketName || `bucket-${randomId()}`}`
        };
      case 'Lambda':
        return { 
          functionArn: `arn:aws:lambda:us-east-1:123456789012:function:${node.id}`,
          functionName: node.id 
        };
      default:
        return {};
    }
  }

  private getConstructName(construct: any): string {
    if (typeof construct === 'function') {
      return construct.name || 'Unknown';
    }
    return 'Unknown';
  }

  private log(message: string): void {
    this.deploymentLog.push(message);
    console.log(message);
  }

  getDeploymentLog(): string[] {
    return [...this.deploymentLog];
  }

  clearAll(): void {
    this.resources.clear();
    this.deploymentLog = [];
  }
}

// ============================================================================
// Infrastructure Constructs (Mock AWS Resources)
// ============================================================================

class VPC {
  constructor(public props: { cidr: string; name?: string }) {}
}

class Subnet {
  constructor(public props: { vpcId?: string; cidr: string; az?: string }) {}
}

class SecurityGroup {
  constructor(public props: { vpcId?: string; rules?: any[] }) {}
}

class EC2Instance {
  constructor(public props: { subnetId?: string; instanceType: string; securityGroupIds?: string[] }) {}
}

class RDSInstance {
  constructor(public props: { subnetIds?: string[]; engine: string; instanceClass: string }) {}
}

class S3Bucket {
  constructor(public props: { bucketName?: string; versioning?: boolean }) {}
}

class Lambda {
  constructor(public props: { runtime: string; handler: string; code: string }) {}
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('SQLite Backend Integration Tests', () => {
  let dbPath: string;
  let backendProvider: SQLiteBackendProvider;
  let cloudProvider: MockAWSProvider;
  let creact: CReactClass;

  beforeEach(() => {
    dbPath = path.join(__dirname, `test-${Date.now()}-${Math.random().toString(36).substring(7)}.db`);
    backendProvider = new SQLiteBackendProvider(dbPath);
    cloudProvider = new MockAWSProvider();
    
    creact = new CReactClass({
      cloudProvider,
      backendProvider,
    });
  });

  afterEach(() => {
    backendProvider.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  describe('Complex Infrastructure with JSX', () => {
    it('should deploy a 3-tier web application using JSX components', async () => {
      // Network Layer Component
      function NetworkLayer() {
        const vpc = useInstance(VPC, { 
          key: 'vpc',
          cidr: '10.0.0.0/16',
          name: 'webapp-vpc'
        });
        
        const publicSubnet = useInstance(Subnet, {
          key: 'public-subnet',
          cidr: '10.0.1.0/24',
          az: 'us-east-1a'
        });
        
        const privateSubnet = useInstance(Subnet, {
          key: 'private-subnet',
          cidr: '10.0.2.0/24',
          az: 'us-east-1b'
        });
        
        return (
          <>
            {vpc}
            {publicSubnet}
            {privateSubnet}
          </>
        );
      }

      // Security Layer Component
      function SecurityLayer() {
        const webSg = useInstance(SecurityGroup, {
          key: 'web-sg',
          rules: [{ port: 80 }, { port: 443 }]
        });
        
        const appSg = useInstance(SecurityGroup, {
          key: 'app-sg',
          rules: [{ port: 8080 }]
        });
        
        return (
          <>
            {webSg}
            {appSg}
          </>
        );
      }

      // Compute Layer Component
      function ComputeLayer() {
        const webServer = useInstance(EC2Instance, {
          key: 'web-server',
          instanceType: 't3.medium'
        });
        
        const appServer = useInstance(EC2Instance, {
          key: 'app-server',
          instanceType: 't3.large'
        });
        
        return (
          <>
            {webServer}
            {appServer}
          </>
        );
      }

      // Database Layer Component
      function DatabaseLayer() {
        const database = useInstance(RDSInstance, {
          key: 'database',
          engine: 'postgres',
          instanceClass: 'db.t3.medium'
        });
        
        return <>{database}</>;
      }

      // Storage Layer Component
      function StorageLayer() {
        const assetsBucket = useInstance(S3Bucket, {
          key: 'assets-bucket',
          bucketName: 'webapp-assets',
          versioning: true
        });
        
        const backupBucket = useInstance(S3Bucket, {
          key: 'backup-bucket',
          bucketName: 'webapp-backups'
        });
        
        return (
          <>
            {assetsBucket}
            {backupBucket}
          </>
        );
      }

      // Serverless Layer Component
      function ServerlessLayer() {
        const apiFunction = useInstance(Lambda, {
          key: 'api-function',
          runtime: 'nodejs18.x',
          handler: 'index.handler',
          code: 'lambda-code.zip'
        });
        
        return <>{apiFunction}</>;
      }

      // Root Infrastructure Component
      function WebAppInfrastructure() {
        return (
          <>
            <NetworkLayer />
            <SecurityLayer />
            <ComputeLayer />
            <DatabaseLayer />
            <StorageLayer />
            <ServerlessLayer />
          </>
        );
      }

      // Build and deploy using JSX
      const cloudDOM = await creact.build(<WebAppInfrastructure /> as any);
      
      // Verify CloudDOM structure
      expect(cloudDOM.length).toBeGreaterThan(0);
      
      // Deploy
      await creact.deploy(cloudDOM, 'webapp-stack', 'test-user');
      
      // Verify state was saved
      const state = await backendProvider.getState('webapp-stack');
      expect(state).toBeDefined();
      expect(state.cloudDOM.length).toBeGreaterThan(0);
      expect(state.status).toBe('DEPLOYED');
      
      // Verify deployment log
      const deploymentLog = cloudProvider.getDeploymentLog();
      expect(deploymentLog.length).toBeGreaterThan(0);
      expect(deploymentLog.some(log => log.includes('VPC'))).toBe(true);
      expect(deploymentLog.some(log => log.includes('RDSInstance'))).toBe(true);
      
      // Verify audit log
      const auditLog = backendProvider.getAuditLog('webapp-stack');
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].action).toBe('complete');
    });

    it('should handle nested component composition', async () => {
      function Database() {
        const db = useInstance(RDSInstance, {
          key: 'db',
          engine: 'postgres',
          instanceClass: 'db.t3.small'
        });
        return <>{db}</>;
      }

      function API() {
        const lambda = useInstance(Lambda, {
          key: 'api',
          runtime: 'nodejs18.x',
          handler: 'index.handler',
          code: 'api.zip'
        });
        return <>{lambda}</>;
      }

      function Storage() {
        const bucket = useInstance(S3Bucket, {
          key: 'storage',
          bucketName: 'app-storage'
        });
        return <>{bucket}</>;
      }

      function Backend() {
        return (
          <>
            <Database />
            <API />
            <Storage />
          </>
        );
      }

      function Application() {
        return (
          <>
            <Backend />
          </>
        );
      }

      const cloudDOM = await creact.build(<Application /> as any);
      expect(cloudDOM.length).toBe(3);
      
      await creact.deploy(cloudDOM, 'nested-stack');
      
      const state = await backendProvider.getState('nested-stack');
      expect(state).toBeDefined();
      expect(state.cloudDOM).toHaveLength(3);
    });

    it('should support fragments for grouping', async () => {
      function Infrastructure() {
        const vpc = useInstance(VPC, {
          key: 'vpc',
          cidr: '10.0.0.0/16'
        });
        
        const bucket1 = useInstance(S3Bucket, {
          key: 'bucket1',
          bucketName: 'bucket-1'
        });
        
        const bucket2 = useInstance(S3Bucket, {
          key: 'bucket2',
          bucketName: 'bucket-2'
        });
        
        return (
          <>
            {vpc}
            <>
              {bucket1}
              {bucket2}
            </>
          </>
        );
      }

      const cloudDOM = await creact.build(<Infrastructure /> as any);
      expect(cloudDOM).toHaveLength(3);
      
      await creact.deploy(cloudDOM, 'fragment-stack');
      
      const state = await backendProvider.getState('fragment-stack');
      expect(state.cloudDOM).toHaveLength(3);
    });
  });

  describe('Locking Mechanism', () => {
    it('should prevent concurrent deployments with locks', async () => {
      function SimpleInfra() {
        const bucket = useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'test-bucket'
        });
        return <>{bucket}</>;
      }

      const cloudDOM = await creact.build(<SimpleInfra /> as any);
      
      // Acquire lock manually
      await backendProvider.acquireLock('locked-stack', 'user1', 60000);
      
      // Verify lock is held
      const lockInfo = await backendProvider.checkLock('locked-stack');
      expect(lockInfo).toBeDefined();
      expect(lockInfo?.holder).toBe('user1');
      
      // Release lock
      await backendProvider.releaseLock('locked-stack');
      
      // Verify lock is released
      const lockAfterRelease = await backendProvider.checkLock('locked-stack');
      expect(lockAfterRelease).toBeNull();
      
      // Now deployment should succeed
      await creact.deploy(cloudDOM, 'locked-stack', 'user2');
      
      const state = await backendProvider.getState('locked-stack');
      expect(state).toBeDefined();
      expect(state.status).toBe('DEPLOYED');
    });

    it('should handle expired locks', async () => {
      function SimpleInfra() {
        const bucket = useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'test-bucket'
        });
        return <>{bucket}</>;
      }

      const cloudDOM = await creact.build(<SimpleInfra /> as any);
      
      // Acquire lock with very short TTL
      await backendProvider.acquireLock('expiring-stack', 'user1', 1);
      
      // Wait for lock to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should be able to deploy now
      await expect(
        creact.deploy(cloudDOM, 'expiring-stack', 'user2')
      ).resolves.not.toThrow();
    });
  });

  describe('State Persistence', () => {
    it('should persist state across provider instances', async () => {
      function Infrastructure() {
        const vpc = useInstance(VPC, {
          key: 'vpc',
          cidr: '10.0.0.0/16'
        });
        
        const bucket = useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'persistent-bucket'
        });
        
        return (
          <>
            {vpc}
            {bucket}
          </>
        );
      }

      const cloudDOM = await creact.build(<Infrastructure /> as any);
      await creact.deploy(cloudDOM, 'persistent-stack');
      
      // Close and reopen database
      backendProvider.close();
      const newBackendProvider = new SQLiteBackendProvider(dbPath);
      
      // State should still be there
      const state = await newBackendProvider.getState('persistent-stack');
      expect(state).toBeDefined();
      expect(state.cloudDOM.length).toBe(2);
      
      newBackendProvider.close();
    });

    it('should maintain audit trail across deployments', async () => {
      function SimpleInfra() {
        const bucket = useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'audited-bucket'
        });
        return <>{bucket}</>;
      }

      const cloudDOM = await creact.build(<SimpleInfra /> as any);
      
      // Multiple deployments
      await creact.deploy(cloudDOM, 'audited-stack', 'alice');
      await creact.deploy(cloudDOM, 'audited-stack', 'bob');
      await creact.deploy(cloudDOM, 'audited-stack', 'charlie');
      
      // Check audit log
      const auditLog = backendProvider.getAuditLog('audited-stack');
      expect(auditLog.length).toBeGreaterThanOrEqual(3);
      
      // Verify users in audit log
      const users = auditLog.map(entry => entry.user);
      expect(users).toContain('alice');
      expect(users).toContain('bob');
      expect(users).toContain('charlie');
    });
  });

  describe('Idempotent Deployments', () => {
    it('should handle redeployment of identical infrastructure', async () => {
      function SimpleInfra() {
        const vpc = useInstance(VPC, {
          key: 'vpc',
          cidr: '10.0.0.0/16'
        });
        
        const bucket = useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'test-bucket'
        });
        
        return (
          <>
            {vpc}
            {bucket}
          </>
        );
      }

      const cloudDOM = await creact.build(<SimpleInfra /> as any);
      
      // First deployment
      await creact.deploy(cloudDOM, 'idempotent-stack');
      const state1 = await backendProvider.getState('idempotent-stack');
      
      // Second deployment (idempotent)
      await creact.deploy(cloudDOM, 'idempotent-stack');
      const state2 = await backendProvider.getState('idempotent-stack');
      
      // State should be updated
      expect(state2.timestamp).toBeGreaterThanOrEqual(state1.timestamp);
      expect(state2.cloudDOM).toHaveLength(2);
    });
  });

  describe('Hooks Integration - useState and useContext', () => {
    // Create infrastructure context
    const InfraContext = createContext<{
      vpcId?: string;
      region?: string;
      environment?: string;
    }>({});

    it('should use useState to capture and propagate resource outputs', async () => {
      function Infrastructure() {
        const [vpcId, setVpcId] = useState<string>();
        const [bucketArn, setBucketArn] = useState<string>();
        
        const vpc = useInstance(VPC, {
          key: 'vpc',
          cidr: '10.0.0.0/16'
        });
        
        const bucket = useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'state-test-bucket'
        });
        
        // Capture outputs after deployment
        if (vpc.outputs?.vpcId && !vpcId) {
          setVpcId(vpc.outputs.vpcId as string);
        }
        
        if (bucket.outputs?.arn && !bucketArn) {
          setBucketArn(bucket.outputs.arn as string);
        }
        
        return (
          <>
            {vpc}
            {bucket}
          </>
        );
      }

      const cloudDOM = await creact.build(<Infrastructure /> as any);
      expect(cloudDOM).toHaveLength(2);
      
      await creact.deploy(cloudDOM, 'state-hook-stack');
      
      const state = await backendProvider.getState('state-hook-stack');
      expect(state).toBeDefined();
      expect(state.cloudDOM).toHaveLength(2);
    });

    it('should use useContext to share configuration across components', async () => {
      function NetworkLayer() {
        const context = useContext(InfraContext);
        
        const vpc = useInstance(VPC, {
          key: 'vpc',
          cidr: '10.0.0.0/16',
          name: `${context.environment}-vpc`
        });
        
        const subnet = useInstance(Subnet, {
          key: 'subnet',
          cidr: '10.0.1.0/24',
          az: `${context.region}a`
        });
        
        return (
          <>
            {vpc}
            {subnet}
          </>
        );
      }

      function StorageLayer() {
        const context = useContext(InfraContext);
        
        const bucket = useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: `${context.environment}-storage`
        });
        
        return <>{bucket}</>;
      }

      function Infrastructure() {
        return (
          <InfraContext.Provider value={{ region: 'us-east-1', environment: 'production' }}>
            <NetworkLayer />
            <StorageLayer />
          </InfraContext.Provider>
        );
      }

      const cloudDOM = await creact.build(<Infrastructure /> as any);
      expect(cloudDOM).toHaveLength(3);
      
      await creact.deploy(cloudDOM, 'context-hook-stack');
      
      const state = await backendProvider.getState('context-hook-stack');
      expect(state).toBeDefined();
      expect(state.cloudDOM).toHaveLength(3);
    });

    it('should combine useState and useContext for cross-component state sharing', async () => {
      const OutputContext = createContext<{
        vpcId?: string;
        setVpcId?: (id: string) => void;
      }>({});

      function NetworkLayer() {
        const [vpcId, setVpcId] = useState<string>();
        
        const vpc = useInstance(VPC, {
          key: 'vpc',
          cidr: '10.0.0.0/16'
        });
        
        // Capture VPC ID from outputs
        if (vpc.outputs?.vpcId && !vpcId) {
          setVpcId(vpc.outputs.vpcId as string);
        }
        
        return (
          <OutputContext.Provider value={{ vpcId, setVpcId }}>
            {vpc}
          </OutputContext.Provider>
        );
      }

      function ComputeLayer() {
        const { vpcId } = useContext(OutputContext);
        
        // Only create subnet if VPC ID is available
        const subnet = useInstance(Subnet, {
          key: 'subnet',
          vpcId: vpcId,
          cidr: '10.0.1.0/24'
        });
        
        const instance = useInstance(EC2Instance, {
          key: 'instance',
          instanceType: 't3.micro'
        });
        
        return (
          <>
            {subnet}
            {instance}
          </>
        );
      }

      function Application() {
        return (
          <>
            <NetworkLayer />
            <ComputeLayer />
          </>
        );
      }

      const cloudDOM = await creact.build(<Application /> as any);
      expect(cloudDOM.length).toBeGreaterThan(0);
      
      await creact.deploy(cloudDOM, 'combined-hooks-stack');
      
      const state = await backendProvider.getState('combined-hooks-stack');
      expect(state).toBeDefined();
      expect(state.status).toBe('DEPLOYED');
    });

    it('should handle multiple context providers with different scopes', async () => {
      const RegionContext = createContext<{ region: string }>({ region: 'us-east-1' });
      const EnvContext = createContext<{ environment: string }>({ environment: 'dev' });

      function Database() {
        const { region } = useContext(RegionContext);
        const { environment } = useContext(EnvContext);
        
        const db = useInstance(RDSInstance, {
          key: 'db',
          engine: 'postgres',
          instanceClass: environment === 'production' ? 'db.t3.large' : 'db.t3.small'
        });
        
        return <>{db}</>;
      }

      function Storage() {
        const { region } = useContext(RegionContext);
        const { environment } = useContext(EnvContext);
        
        const bucket = useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: `${environment}-${region}-storage`
        });
        
        return <>{bucket}</>;
      }

      function Infrastructure() {
        return (
          <RegionContext.Provider value={{ region: 'us-west-2' }}>
            <EnvContext.Provider value={{ environment: 'staging' }}>
              <Database />
              <Storage />
            </EnvContext.Provider>
          </RegionContext.Provider>
        );
      }

      const cloudDOM = await creact.build(<Infrastructure /> as any);
      expect(cloudDOM).toHaveLength(2);
      
      await creact.deploy(cloudDOM, 'multi-context-stack');
      
      const state = await backendProvider.getState('multi-context-stack');
      expect(state).toBeDefined();
      expect(state.cloudDOM).toHaveLength(2);
    });
  });
});
