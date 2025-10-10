/**
 * Comprehensive Mock Cloud Provider for Examples
 * 
 * Simulates AWS-like cloud provider with:
 * - Realistic resource types (VPC, RDS, ECS, Lambda, S3, CloudFront, etc.)
 * - Proper output generation with ARNs, URLs, and endpoints
 * - Resource dependencies and validation
 * - Deployment simulation with delays
 * - State tracking and lifecycle management
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
    const constructName = node.constructType || node.construct?.name || 'Unknown';
    const props = node.props || {};
    const region = props.region || 'us-east-1';
    const accountId = '123456789012';
    
    switch (constructName) {
      // Networking
      case 'VPC':
        return {
          vpcId: `vpc-${this.generateId()}`,
          cidrBlock: props.cidr || '10.0.0.0/16',
          region,
          defaultSecurityGroupId: `sg-${this.generateId()}`,
          defaultNetworkAclId: `acl-${this.generateId()}`,
        };
      
      case 'Subnet':
        return {
          subnetId: `subnet-${this.generateId()}`,
          availabilityZone: `${region}${props.az || 'a'}`,
          cidrBlock: props.cidr || '10.0.1.0/24',
          vpcId: props.vpcId || `vpc-${this.generateId()}`,
        };
      
      case 'SecurityGroup':
        return {
          securityGroupId: `sg-${this.generateId()}`,
          groupName: props.name,
          vpcId: props.vpcId || `vpc-${this.generateId()}`,
        };
      
      // Compute
      case 'ECSCluster':
        return {
          clusterArn: `arn:aws:ecs:${region}:${accountId}:cluster/${props.name}`,
          clusterName: props.name,
          status: 'ACTIVE',
          registeredContainerInstancesCount: 0,
          runningTasksCount: 0,
        };
      
      case 'ECSService':
        return {
          serviceArn: `arn:aws:ecs:${region}:${accountId}:service/${props.cluster}/${props.name}`,
          serviceName: props.name,
          clusterArn: props.clusterArn,
          status: 'ACTIVE',
          desiredCount: props.desiredCount || 2,
          runningCount: props.desiredCount || 2,
          loadBalancers: props.loadBalancers || [],
        };
      
      case 'ECSTaskDefinition':
        return {
          taskDefinitionArn: `arn:aws:ecs:${region}:${accountId}:task-definition/${props.family}:1`,
          family: props.family,
          revision: 1,
          status: 'ACTIVE',
          cpu: props.cpu || '256',
          memory: props.memory || '512',
        };
      
      case 'Lambda':
        return {
          functionArn: `arn:aws:lambda:${region}:${accountId}:function:${props.name}`,
          functionName: props.name,
          runtime: props.runtime || 'nodejs20.x',
          handler: props.handler || 'index.handler',
          role: `arn:aws:iam::${accountId}:role/${props.name}-role`,
          invokeUrl: `https://lambda.${region}.amazonaws.com/2015-03-31/functions/${props.name}/invocations`,
          version: '$LATEST',
          memorySize: props.memory || 128,
          timeout: props.timeout || 3,
        };
      
      // Database
      case 'Database':
      case 'RDSInstance':
        const dbId = this.generateId();
        return {
          dbInstanceIdentifier: props.name,
          dbInstanceArn: `arn:aws:rds:${region}:${accountId}:db:${props.name}`,
          endpoint: `${props.name}.${dbId}.${region}.rds.amazonaws.com`,
          port: props.port || 5432,
          connectionUrl: `postgres://${props.username || 'admin'}:****@${props.name}.${dbId}.${region}.rds.amazonaws.com:${props.port || 5432}/${props.database || props.name}`,
          engine: props.engine || 'postgres',
          engineVersion: props.engineVersion || '15.3',
          instanceClass: props.size || 'db.t3.micro',
          allocatedStorage: props.storage || 20,
          status: 'available',
        };
      
      case 'Cache':
      case 'ElastiCache':
        return {
          cacheClusterId: props.name,
          cacheClusterArn: `arn:aws:elasticache:${region}:${accountId}:cluster:${props.name}`,
          endpoint: `${props.name}.${this.generateId()}.cache.amazonaws.com`,
          port: props.port || 6379,
          engine: props.engine || 'redis',
          engineVersion: props.engineVersion || '7.0',
          cacheNodeType: props.nodeType || 'cache.t3.micro',
          numCacheNodes: props.replicas || 1,
          status: 'available',
        };
      
      // Storage
      case 'S3Bucket':
        const bucketName = `${props.name}-${this.generateId()}`;
        return {
          bucketName,
          bucketArn: `arn:aws:s3:::${bucketName}`,
          region,
          websiteUrl: props.website ? `http://${bucketName}.s3-website-${region}.amazonaws.com` : undefined,
          domainName: `${bucketName}.s3.amazonaws.com`,
          regionalDomainName: `${bucketName}.s3.${region}.amazonaws.com`,
        };
      
      // API & Load Balancing
      case 'API':
      case 'ApiGateway':
        const apiId = this.generateId();
        return {
          apiId,
          apiArn: `arn:aws:apigateway:${region}::/restapis/${apiId}`,
          endpoint: `https://${apiId}.execute-api.${region}.amazonaws.com/${props.stage || 'prod'}`,
          stage: props.stage || 'prod',
          invokeUrl: `https://${apiId}.execute-api.${region}.amazonaws.com/${props.stage || 'prod'}`,
          rootResourceId: this.generateId(),
        };
      
      case 'LoadBalancer':
      case 'ALB':
        const lbId = this.generateId();
        return {
          loadBalancerArn: `arn:aws:elasticloadbalancing:${region}:${accountId}:loadbalancer/app/${props.name}/${lbId}`,
          loadBalancerName: props.name,
          dnsName: `${props.name}-${lbId}.${region}.elb.amazonaws.com`,
          hostedZoneId: 'Z35SXDOTRQ7X7K',
          scheme: props.internal ? 'internal' : 'internet-facing',
          type: 'application',
          vpcId: props.vpcId,
        };
      
      // CDN & Edge
      case 'CDN':
      case 'CloudFront':
        const distributionId = this.generateId().toUpperCase();
        return {
          distributionId,
          distributionArn: `arn:aws:cloudfront::${accountId}:distribution/${distributionId}`,
          domainName: `${distributionId.toLowerCase()}.cloudfront.net`,
          status: 'Deployed',
          origins: props.origins || [],
          enabled: true,
        };
      
      case 'Frontend':
        const frontendId = this.generateId();
        return {
          url: props.cdnEnabled 
            ? `https://${frontendId}.cloudfront.net`
            : `https://${props.name}-${frontendId}.${region}.web.local`,
          bucketName: `${props.name}-${frontendId}`,
          distributionId: props.cdnEnabled ? frontendId.toUpperCase() : undefined,
        };
      
      // Monitoring & Observability
      case 'Monitoring':
      case 'CloudWatch':
        return {
          dashboardName: props.name,
          dashboardArn: `arn:aws:cloudwatch::${accountId}:dashboard/${props.name}`,
          dashboardUrl: `https://console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=${props.name}`,
          alarmArns: props.alerting ? [`arn:aws:cloudwatch:${region}:${accountId}:alarm:${props.name}-alarm`] : [],
          logGroupName: `/aws/monitoring/${props.name}`,
        };
      
      case 'Analytics':
        return {
          streamName: props.name,
          streamArn: `arn:aws:kinesis:${region}:${accountId}:stream/${props.name}`,
          endpoint: `https://kinesis.${region}.amazonaws.com`,
          shardCount: props.shards || 1,
          retentionPeriod: props.retention || 24,
        };
      
      case 'Backup':
        return {
          backupVaultName: props.name,
          backupVaultArn: `arn:aws:backup:${region}:${accountId}:backup-vault:${props.name}`,
          backupPlanId: this.generateId(),
          schedule: props.schedule || 'cron(0 5 * * ? *)',
          retentionDays: props.retention || 30,
        };
      
      // IAM & Security
      case 'IAMRole':
        return {
          roleArn: `arn:aws:iam::${accountId}:role/${props.name}`,
          roleName: props.name,
          roleId: `AROA${this.generateId().toUpperCase()}`,
        };
      
      case 'IAMPolicy':
        return {
          policyArn: `arn:aws:iam::${accountId}:policy/${props.name}`,
          policyName: props.name,
          policyId: `ANPA${this.generateId().toUpperCase()}`,
        };
      
      // Default
      default:
        return {
          id: node.id,
          resourceType: constructName,
          status: 'deployed',
          region,
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
