/**
 * Mock Cloud Provider for Examples
 * 
 * Simulates a real cloud provider with realistic output generation
 * and dependencies between resources.
 */

import { ICloudProvider } from '../../src/providers/ICloudProvider';
import { CloudDOMNode } from '../../src/core/types';

export class MockCloudProvider implements ICloudProvider {
  private deployedResources = new Map<string, CloudDOMNode>();
  
  async materialize(cloudDOM: CloudDOMNode[], scope?: any): Promise<void> {
    console.log(`\n[MockCloud] 🚀 Materializing ${cloudDOM.length} resources...`);
    
    for (const node of cloudDOM) {
      await this.materializeNode(node);
    }
    
    console.log('[MockCloud] ✅ All resources materialized\n');
  }
  
  private async materializeNode(node: CloudDOMNode): Promise<void> {
    const constructName = node.construct?.name || 'Unknown';
    console.log(`[MockCloud] 📦 Deploying ${constructName}: ${node.id}`);
    
    // Simulate deployment delay
    await this.sleep(100);
    
    // Generate realistic outputs based on construct type
    const outputs = this.generateOutputs(node);
    
    // Initialize outputs if not present
    if (!node.outputs) {
      node.outputs = {};
    }
    
    // Merge provider outputs (don't overwrite state.* outputs)
    for (const [key, value] of Object.entries(outputs)) {
      if (!key.startsWith('state.')) {
        node.outputs[key] = value;
      }
    }
    
    console.log(`[MockCloud]   ✓ Outputs:`, outputs);
    
    // Store deployed resource
    this.deployedResources.set(node.id, node);
    
    // Materialize children
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        await this.materializeNode(child);
      }
    }
  }
  
  private generateOutputs(node: CloudDOMNode): Record<string, any> {
    const constructName = node.construct?.name || 'Unknown';
    const props = node.props || {};
    
    switch (constructName) {
      case 'VPC':
        return {
          vpcId: `vpc-${this.generateId()}`,
          cidrBlock: props.cidr || '10.0.0.0/16',
          region: props.region || 'us-east-1',
        };
      
      case 'Subnet':
        return {
          subnetId: `subnet-${this.generateId()}`,
          availabilityZone: `${props.region || 'us-east-1'}a`,
          cidrBlock: props.cidr || '10.0.1.0/24',
        };
      
      case 'Database':
        return {
          connectionUrl: `postgres://${props.host || 'localhost'}:${props.port || 5432}/${props.name}`,
          host: props.host || 'localhost',
          port: props.port || 5432,
          database: props.name,
          username: props.username || 'admin',
          endpoint: `${props.name}.${this.generateId()}.us-east-1.rds.amazonaws.com`,
        };
      
      case 'ApiGateway':
        return {
          apiId: `api-${this.generateId()}`,
          endpoint: `https://${this.generateId()}.execute-api.us-east-1.amazonaws.com/${props.stage || 'prod'}`,
          stage: props.stage || 'prod',
          invokeUrl: `https://${this.generateId()}.execute-api.us-east-1.amazonaws.com/${props.stage || 'prod'}`,
        };
      
      case 'Lambda':
        return {
          functionArn: `arn:aws:lambda:us-east-1:123456789012:function:${props.name}`,
          functionName: props.name,
          runtime: props.runtime || 'nodejs18.x',
          invokeUrl: `https://lambda.us-east-1.amazonaws.com/2015-03-31/functions/${props.name}/invocations`,
        };
      
      case 'S3Bucket':
        return {
          bucketName: `${props.name}-${this.generateId()}`,
          bucketArn: `arn:aws:s3:::${props.name}-${this.generateId()}`,
          region: props.region || 'us-east-1',
          websiteUrl: `http://${props.name}-${this.generateId()}.s3-website-us-east-1.amazonaws.com`,
        };
      
      case 'LoadBalancer':
        return {
          loadBalancerArn: `arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/${props.name}/${this.generateId()}`,
          dnsName: `${props.name}-${this.generateId()}.us-east-1.elb.amazonaws.com`,
          hostedZoneId: 'Z35SXDOTRQ7X7K',
        };
      
      default:
        return {
          id: node.id,
          status: 'deployed',
          createdAt: new Date().toISOString(),
        };
    }
  }
  
  private generateId(): string {
    return Math.random().toString(36).substring(2, 10);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async deploy(nodes: CloudDOMNode[]): Promise<void> {
    await this.materialize(nodes);
  }
  
  async destroy(nodes: CloudDOMNode[]): Promise<void> {
    console.log(`\n[MockCloud] 🗑️  Destroying ${nodes.length} resources...`);
    
    for (const node of nodes) {
      console.log(`[MockCloud]   ✓ Destroyed ${node.id}`);
      this.deployedResources.delete(node.id);
    }
    
    console.log('[MockCloud] ✅ All resources destroyed\n');
  }
  
  async validate(nodes: CloudDOMNode[]): Promise<void> {
    console.log(`\n[MockCloud] 🔍 Validating ${nodes.length} resources...`);
    
    for (const node of nodes) {
      const constructName = node.construct?.name || 'Unknown';
      console.log(`[MockCloud]   ✓ ${constructName} validated`);
    }
    
    console.log('[MockCloud] ✅ All resources valid\n');
  }
  
  getDeployedResource(id: string): CloudDOMNode | undefined {
    return this.deployedResources.get(id);
  }
  
  getAllDeployedResources(): CloudDOMNode[] {
    return Array.from(this.deployedResources.values());
  }
}
