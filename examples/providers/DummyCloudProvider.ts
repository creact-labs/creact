// REQ-04: Dummy provider implementation for POC and testing
// REQ-09: Lifecycle hooks implementation

import { ICloudProvider } from '../../src/providers/ICloudProvider';
import { CloudDOMNode } from '../../src/core/types';

/**
 * DummyCloudProvider is a POC implementation that logs CloudDOM structure
 * instead of deploying actual infrastructure.
 *
 * Use cases:
 * - POC demonstrations
 * - Testing without cloud credentials
 * - Development and debugging
 * - CI/CD validation
 *
 * This is a standalone implementation, NOT a base class.
 *
 * @example
 * ```typescript
 * const provider = new DummyCloudProvider();
 * await provider.initialize();
 * provider.materialize(cloudDOM);
 * ```
 */
export class DummyCloudProvider implements ICloudProvider {
  private initialized = false;

  /**
   * Optional initialization (simulates async setup)
   * REQ-04.4: Support async initialization
   */
  async initialize(): Promise<void> {
    console.log('[DummyCloudProvider] Initializing...');
    this.initialized = true;
  }

  /**
   * Check if provider is initialized
   * Useful for integration testing
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Materialize CloudDOM by logging structure and populating mock outputs
   * REQ-04: Core provider interface implementation
   *
   * @param cloudDOM - Array of CloudDOM nodes to materialize
   */
  materialize(cloudDOM: CloudDOMNode[]): void {
    console.debug('\n=== DummyCloudProvider: Materializing CloudDOM ===\n');

    cloudDOM.forEach((node) => {
      this.materializeNode(node, 0);
    });

    console.debug('\n=== Materialization Complete ===\n');
  }

  /**
   * Materialize a single node and populate mock outputs
   */
  private materializeNode(node: CloudDOMNode, depth: number, visited: Set<any> = new Set()): void {
    // Prevent infinite recursion from circular references
    if (visited.has(node)) {
      const indent = '  '.repeat(depth);
      console.debug(`${indent}[Circular reference to ${node.id}]`);
      return;
    }
    visited.add(node);

    // Limit depth to prevent stack overflow
    if (depth > 50) {
      const indent = '  '.repeat(depth);
      console.debug(`${indent}[Max depth reached]`);
      return;
    }

    const indent = '  '.repeat(depth);

    // Log resource
    console.debug(`${indent}Deploying: ${node.id} (${node.construct?.name || 'Unknown'})`);

    // Populate mock outputs based on construct type and props
    if (!node.outputs) {
      node.outputs = {};
    }

    // Add mock outputs based on construct type
    if (node.construct?.name === 'Database') {
      node.outputs = {
        ...node.outputs,
        connectionUrl: `postgres://localhost:5432/${node.props.name}`,
        status: 'ready',
        port: 5432,
        host: 'localhost'
      };
    } else if (node.construct?.name === 'LoadBalancer') {
      node.outputs = {
        ...node.outputs,
        endpoint: `https://${node.props.name}.elb.amazonaws.com`,
        healthStatus: 'healthy',
        dnsName: `${node.props.name}.elb.amazonaws.com`
      };
    } else if (node.construct?.name === 'ApiGateway') {
      node.outputs = {
        ...node.outputs,
        apiUrl: `https://${node.props.name}.execute-api.us-east-1.amazonaws.com/prod`,
        apiKey: `api-key-${Math.random().toString(36).substr(2, 9)}`,
        stage: 'prod'
      };
    } else if (node.construct?.name === 'VaultCluster') {
      node.outputs = {
        ...node.outputs,
        vaultUrl: `https://${node.props.name}.vault.example.com:8200`,
        status: 'active',
        nodes: node.props.nodes || 3,
        version: '1.15.0'
      };
    } else if (node.construct?.name === 'CertificateManager') {
      node.outputs = {
        ...node.outputs,
        certificateArn: `arn:aws:acm:us-east-1:123456789012:certificate/${Math.random().toString(36).substr(2, 9)}`,
        domain: node.props.domain,
        status: 'issued',
        validationStatus: 'success'
      };
    } else if (node.construct?.name === 'PostgresDatabase') {
      node.outputs = {
        ...node.outputs,
        connectionUrl: `postgres://${node.props.name}.rds.amazonaws.com:5432/${node.props.name}`,
        endpoint: `${node.props.name}.rds.amazonaws.com`,
        port: 5432,
        status: 'available'
      };
    } else if (node.construct?.name === 'RedisCluster') {
      node.outputs = {
        ...node.outputs,
        endpoint: `${node.props.name}.cache.amazonaws.com:6379`,
        port: 6379,
        status: 'available'
      };
    } else if (node.construct?.name === 'ElasticsearchCluster') {
      node.outputs = {
        ...node.outputs,
        endpoint: `https://${node.props.name}.es.amazonaws.com`,
        kibanaUrl: `https://${node.props.name}.es.amazonaws.com/_plugin/kibana/`,
        status: 'active'
      };
    } else if (node.construct?.name === 'SQSQueue') {
      node.outputs = {
        ...node.outputs,
        queueUrl: `https://sqs.us-east-1.amazonaws.com/123456789012/${node.props.name}`,
        queueArn: `arn:aws:sqs:us-east-1:123456789012:${node.props.name}`,
        status: 'available'
      };
    } else if (node.construct?.name === 'KafkaCluster') {
      node.outputs = {
        ...node.outputs,
        brokers: [`${node.props.name}-1.kafka.amazonaws.com:9092`, `${node.props.name}-2.kafka.amazonaws.com:9092`],
        zookeeperConnect: `${node.props.name}.zookeeper.amazonaws.com:2181`,
        status: 'active'
      };
    } else if (node.construct?.name === 'SNSTopic') {
      node.outputs = {
        ...node.outputs,
        topicArn: `arn:aws:sns:us-east-1:123456789012:${node.props.name}`,
        status: 'confirmed'
      };
    } else if (node.construct?.name === 'S3Bucket') {
      node.outputs = {
        ...node.outputs,
        bucketName: node.props.bucketName || node.props.name,
        bucketUrl: `https://${node.props.bucketName || node.props.name}.s3.amazonaws.com`,
        region: 'us-east-1'
      };
    } else if (node.construct?.name === 'CloudFront') {
      node.outputs = {
        ...node.outputs,
        distributionId: `E${Math.random().toString(36).substr(2, 13).toUpperCase()}`,
        domainName: `${Math.random().toString(36).substr(2, 8)}.cloudfront.net`,
        status: 'deployed'
      };
    } else if (node.construct?.name === 'KubernetesDeployment') {
      node.outputs = {
        ...node.outputs,
        serviceName: node.props.name,
        namespace: node.props.namespace || 'default',
        replicas: node.props.replicas || 3,
        status: 'running'
      };
    } else if (node.construct?.name === 'AwsLambda') {
      node.outputs = {
        ...node.outputs,
        functionArn: `arn:aws:lambda:us-east-1:123456789012:function:${node.props.name}`,
        functionName: node.props.name,
        status: 'active'
      };
    } else if (node.construct?.name === 'EFSFileSystem') {
      node.outputs = {
        ...node.outputs,
        fileSystemId: `fs-${Math.random().toString(36).substr(2, 8)}`,
        dnsName: `fs-${Math.random().toString(36).substr(2, 8)}.efs.us-east-1.amazonaws.com`,
        status: 'available'
      };
    } else if (node.construct?.name === 'PrometheusServer') {
      node.outputs = {
        ...node.outputs,
        endpoint: `https://${node.props.name}.prometheus.example.com`,
        status: 'running'
      };
    } else if (node.construct?.name === 'GrafanaDashboard') {
      node.outputs = {
        ...node.outputs,
        dashboardUrl: `https://${node.props.name}.grafana.example.com`,
        status: 'active'
      };
    } else {
      // Generic mock outputs for unknown construct types
      node.outputs = {
        ...node.outputs,
        resourceArn: `arn:aws:${node.construct?.name?.toLowerCase() || 'unknown'}:us-east-1:123456789012:${node.id}`,
        status: 'deployed'
      };
    }

    // Safely log props (handle undefined/null)
    const propsStr = this.safeStringify(node.props || {}, 2);
    // console.debug(`${indent}  Props: ${propsLines.join(`\n${indent}  `)}`);

    // Log outputs
    if (node.outputs && Object.keys(node.outputs).length > 0) {
      console.debug(`${indent}  Outputs:`);
      Object.entries(node.outputs).forEach(([outputKey, value]) => {
        console.debug(`${indent}    ${node.id}.${outputKey} = ${this.safeStringify(value)}`);
      });
    }

    // Recursively materialize children
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        this.materializeNode(child, depth + 1, visited);
      });
    }
  }



  /**
   * Safely stringify objects, handling circular references and non-JSON values
   */
  private safeStringify(obj: any, indent?: number): string {
    try {
      return JSON.stringify(obj, this.getCircularReplacer(), indent);
    } catch {
      return '[Unable to stringify: contains circular references or non-JSON values]';
    }
  }

  /**
   * JSON replacer function that handles circular references
   */
  private getCircularReplacer() {
    const seen = new WeakSet();
    return (key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      // Handle functions
      if (typeof value === 'function') {
        return '[Function]';
      }
      // Handle symbols
      if (typeof value === 'symbol') {
        return '[Symbol]';
      }
      return value;
    };
  }

  /**
   * Optional lifecycle hook: called before deployment
   * REQ-09.1: preDeploy lifecycle hook
   */
  async preDeploy(cloudDOM: CloudDOMNode[]): Promise<void> {
    console.debug('[DummyCloudProvider] preDeploy hook called');
    console.debug(`[DummyCloudProvider] Validating ${cloudDOM.length} resources...`);
  }

  /**
   * Optional lifecycle hook: called after successful deployment
   * REQ-09.2: postDeploy lifecycle hook
   */
  async postDeploy(cloudDOM: CloudDOMNode[], outputs: Record<string, any>): Promise<void> {
    console.debug('[DummyCloudProvider] postDeploy hook called');
    console.debug(`[DummyCloudProvider] Deployed ${cloudDOM.length} resources`);
    console.debug(`[DummyCloudProvider] Collected ${Object.keys(outputs).length} outputs`);
  }

  /**
   * Optional lifecycle hook: called when deployment fails
   * REQ-09.3: onError lifecycle hook
   */
  async onError(error: Error, cloudDOM: CloudDOMNode[]): Promise<void> {
    console.error('[DummyCloudProvider] onError hook called');
    console.error(`[DummyCloudProvider] Deployment failed: ${error.message}`);
    console.error(`[DummyCloudProvider] Failed while deploying ${cloudDOM.length} resources`);
  }
}