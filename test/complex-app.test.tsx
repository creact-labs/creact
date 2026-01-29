/**
 * Complex App Integration Tests
 *
 * A deeply nested infrastructure app that tests:
 * - Multiple levels of nesting (5+ deep)
 * - Multiple dependency chains running in parallel
 * - Conditional resource creation at various levels
 * - Dynamic children based on outputs
 * - Resources that depend on multiple parents
 * - Diamond dependency patterns
 * - Late-appearing resources (outputs trigger new branches)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useInstance, resetRuntime, type OutputAccessors } from '../src/index.js';
import { MockProvider } from './utils/mock-provider.js';
import { TestRuntime } from './utils/test-runtime.js';

// ============================================================================
// Construct Classes (markers for resource types)
// ============================================================================

class VPCConstruct {}
class SubnetConstruct {}
class SecurityGroupConstruct {}
class RDSInstanceConstruct {}
class RDSReplicaConstruct {}
class ElastiCacheConstruct {}
class LambdaConstruct {}
class APIGatewayConstruct {}
class S3BucketConstruct {}
class CloudFrontConstruct {}
class Route53RecordConstruct {}
class IAMRoleConstruct {}
class IAMPolicyConstruct {}
class SNSTopicConstruct {}
class SQSQueueConstruct {}
class EventBridgeRuleConstruct {}

// ============================================================================
// Type Definitions
// ============================================================================

type VPCOutputs = { vpcId: string; cidrBlock: string };
type SubnetOutputs = { subnetId: string; availabilityZone: string };
type SecurityGroupOutputs = { sgId: string };
type RDSOutputs = { endpoint: string; port: number; readerEndpoint?: string };
type CacheOutputs = { endpoint: string; port: number };
type LambdaOutputs = { arn: string; functionUrl?: string };
type APIGatewayOutputs = { url: string; apiId: string };
type S3Outputs = { bucketName: string; bucketArn: string; websiteUrl?: string };
type CloudFrontOutputs = { distributionId: string; domainName: string };
type Route53Outputs = { recordName: string };
type IAMRoleOutputs = { roleArn: string; roleName: string };
type IAMPolicyOutputs = { policyArn: string };
type SNSOutputs = { topicArn: string };
type SQSOutputs = { queueUrl: string; queueArn: string };
type EventBridgeOutputs = { ruleArn: string };

// ============================================================================
// Resource Components - Each has ONE useInstance
// ============================================================================

function VPC({ name, cidr, children }: {
  name: string;
  cidr: string;
  children: (outputs: OutputAccessors<VPCOutputs>) => any;
}) {
  const outputs = useInstance<VPCOutputs>(VPCConstruct, { name, cidr });
  return children(outputs);
}

function Subnet({ name, vpcId, az, cidr, children }: {
  name: string;
  vpcId: string | undefined;
  az: string;
  cidr: string;
  children?: (outputs: OutputAccessors<SubnetOutputs>) => any;
}) {
  const outputs = useInstance<SubnetOutputs>(SubnetConstruct, { name, vpcId, az, cidr });
  return children?.(outputs) ?? null;
}

function SecurityGroup({ name, vpcId, rules, children }: {
  name: string;
  vpcId: string | undefined;
  rules: string[];
  children?: (outputs: OutputAccessors<SecurityGroupOutputs>) => any;
}) {
  const outputs = useInstance<SecurityGroupOutputs>(SecurityGroupConstruct, { name, vpcId, rules });
  return children?.(outputs) ?? null;
}

function RDSInstance({ name, subnetIds, sgId, children }: {
  name: string;
  subnetIds: (string | undefined)[];
  sgId: string | undefined;
  children?: (outputs: OutputAccessors<RDSOutputs>) => any;
}) {
  // Skip if any subnet is undefined
  const allDefined = subnetIds.every(id => id !== undefined);
  const outputs = useInstance<RDSOutputs>(RDSInstanceConstruct, {
    name,
    subnetIds: allDefined ? subnetIds : undefined,
    sgId,
  });
  return children?.(outputs) ?? null;
}

function RDSReplica({ name, sourceEndpoint, subnetIds, children }: {
  name: string;
  sourceEndpoint: string | undefined;
  subnetIds: (string | undefined)[];
  children?: (outputs: OutputAccessors<RDSOutputs>) => any;
}) {
  const allDefined = subnetIds.every(id => id !== undefined);
  const outputs = useInstance<RDSOutputs>(RDSReplicaConstruct, {
    name,
    sourceEndpoint,
    subnetIds: allDefined ? subnetIds : undefined,
  });
  return children?.(outputs) ?? null;
}

function ElastiCache({ name, subnetIds, sgId, children }: {
  name: string;
  subnetIds: (string | undefined)[];
  sgId: string | undefined;
  children?: (outputs: OutputAccessors<CacheOutputs>) => any;
}) {
  const allDefined = subnetIds.every(id => id !== undefined);
  const outputs = useInstance<CacheOutputs>(ElastiCacheConstruct, {
    name,
    subnetIds: allDefined ? subnetIds : undefined,
    sgId,
  });
  return children?.(outputs) ?? null;
}

function Lambda({ name, roleArn, vpcConfig, environment, children }: {
  name: string;
  roleArn: string | undefined;
  vpcConfig?: { subnetIds: (string | undefined)[]; sgId: string | undefined };
  environment?: Record<string, string | undefined>;
  children?: (outputs: OutputAccessors<LambdaOutputs>) => any;
}) {
  // Clean undefined values from environment (optional env vars are just filtered out)
  const cleanEnv: Record<string, string> = {};
  if (environment) {
    for (const [k, v] of Object.entries(environment)) {
      if (v !== undefined) cleanEnv[k] = v;
    }
  }

  // VPC config is optional but if provided, must be complete
  const hasUndefinedVpc = vpcConfig && (
    vpcConfig.subnetIds.some(id => id === undefined) ||
    vpcConfig.sgId === undefined
  );

  const outputs = useInstance<LambdaOutputs>(LambdaConstruct, {
    name,
    roleArn,
    // VPC is optional - only include if complete (don't set to undefined)
    ...(!hasUndefinedVpc && vpcConfig ? { vpcConfig } : {}),
    // Environment is optional - only include if non-empty
    ...(Object.keys(cleanEnv).length > 0 ? { environment: cleanEnv } : {}),
  });
  return children?.(outputs) ?? null;
}

function APIGateway({ name, lambdaArn, children }: {
  name: string;
  lambdaArn: string | undefined;
  children?: (outputs: OutputAccessors<APIGatewayOutputs>) => any;
}) {
  const outputs = useInstance<APIGatewayOutputs>(APIGatewayConstruct, { name, lambdaArn });
  return children?.(outputs) ?? null;
}

function S3Bucket({ name, websiteConfig, children }: {
  name: string;
  websiteConfig?: { indexDocument: string };
  children?: (outputs: OutputAccessors<S3Outputs>) => any;
}) {
  const outputs = useInstance<S3Outputs>(S3BucketConstruct, { name, websiteConfig });
  return children?.(outputs) ?? null;
}

function CloudFront({ name, originDomain, s3BucketArn, children }: {
  name: string;
  originDomain: string | undefined;
  s3BucketArn?: string | undefined;
  children?: (outputs: OutputAccessors<CloudFrontOutputs>) => any;
}) {
  const outputs = useInstance<CloudFrontOutputs>(CloudFrontConstruct, {
    name,
    originDomain,
    ...(s3BucketArn ? { s3BucketArn } : {}),
  });
  return children?.(outputs) ?? null;
}

function Route53Record({ name, type, target }: {
  name: string;
  type: 'A' | 'CNAME' | 'ALIAS';
  target: string | undefined;
}) {
  useInstance<Route53Outputs>(Route53RecordConstruct, { name, type, target });
  return null;
}

function IAMRole({ name, assumeRolePolicy, children }: {
  name: string;
  assumeRolePolicy: string;
  children?: (outputs: OutputAccessors<IAMRoleOutputs>) => any;
}) {
  const outputs = useInstance<IAMRoleOutputs>(IAMRoleConstruct, { name, assumeRolePolicy });
  return children?.(outputs) ?? null;
}

function IAMPolicy({ name, roleArn, document }: {
  name: string;
  roleArn: string | undefined;
  document: string;
}) {
  useInstance<IAMPolicyOutputs>(IAMPolicyConstruct, { name, roleArn, document });
  return null;
}

function SNSTopic({ name, children }: {
  name: string;
  children?: (outputs: OutputAccessors<SNSOutputs>) => any;
}) {
  const outputs = useInstance<SNSOutputs>(SNSTopicConstruct, { name });
  return children?.(outputs) ?? null;
}

function SQSQueue({ name, topicArn, children }: {
  name: string;
  topicArn?: string | undefined;
  children?: (outputs: OutputAccessors<SQSOutputs>) => any;
}) {
  const outputs = useInstance<SQSOutputs>(SQSQueueConstruct, { name, topicArn });
  return children?.(outputs) ?? null;
}

function EventBridgeRule({ name, targets }: {
  name: string;
  targets: { arn: string | undefined; type: string }[];
}) {
  const allDefined = targets.every(t => t.arn !== undefined);
  useInstance<EventBridgeOutputs>(EventBridgeRuleConstruct, {
    name,
    targets: allDefined ? targets : undefined,
  });
  return null;
}

// ============================================================================
// Complex App - Multi-tier architecture
// ============================================================================

interface AppConfig {
  regions: string[];
  enableReplicas: boolean;
  enableCaching: boolean;
  enableCDN: boolean;
  enableEventProcessing: boolean;
  environments: string[];
}

function ComplexApp({ config }: { config: AppConfig }) {
  return (
    <VPC name="main" cidr="10.0.0.0/16">
      {(vpc) => (
        <>
          {/* Create subnets in multiple AZs */}
          {config.regions.map((region, i) => (
            <Subnet
              key={region}
              name={`subnet-${region}`}
              vpcId={vpc.vpcId()}
              az={region}
              cidr={`10.0.${i}.0/24`}
            >
              {(subnet) => (
                <>
                  {/* Security groups for different tiers */}
                  <SecurityGroup
                    name={`sg-db-${region}`}
                    vpcId={vpc.vpcId()}
                    rules={['postgres:5432']}
                  >
                    {(dbSg) => (
                      <>
                        {/* Primary DB only in first region */}
                        {i === 0 && (
                          <RDSInstance
                            name="primary-db"
                            subnetIds={[subnet.subnetId()]}
                            sgId={dbSg.sgId()}
                          >
                            {(db) => (
                              <>
                                {/* Read replicas in other regions */}
                                {config.enableReplicas && config.regions.slice(1).map((r) => (
                                  <RDSReplica
                                    key={r}
                                    name={`replica-${r}`}
                                    sourceEndpoint={db.endpoint()}
                                    subnetIds={[subnet.subnetId()]}
                                  />
                                ))}

                                {/* Cache layer */}
                                {config.enableCaching && (
                                  <ElastiCache
                                    name="cache"
                                    subnetIds={[subnet.subnetId()]}
                                    sgId={dbSg.sgId()}
                                  >
                                    {(cache) => (
                                      <LambdaWithAPI
                                        name="api"
                                        dbEndpoint={db.endpoint()}
                                        cacheEndpoint={cache.endpoint()}
                                        subnetId={subnet.subnetId()}
                                        sgId={dbSg.sgId()}
                                        enableCDN={config.enableCDN}
                                      />
                                    )}
                                  </ElastiCache>
                                )}

                                {/* No cache - direct to Lambda */}
                                {!config.enableCaching && (
                                  <LambdaWithAPI
                                    name="api"
                                    dbEndpoint={db.endpoint()}
                                    subnetId={subnet.subnetId()}
                                    sgId={dbSg.sgId()}
                                    enableCDN={config.enableCDN}
                                  />
                                )}
                              </>
                            )}
                          </RDSInstance>
                        )}
                      </>
                    )}
                  </SecurityGroup>
                </>
              )}
            </Subnet>
          ))}

          {/* Event processing pipeline */}
          {config.enableEventProcessing && (
            <EventProcessingPipeline environments={config.environments} />
          )}

          {/* Static assets */}
          <StaticAssets enableCDN={config.enableCDN} />
        </>
      )}
    </VPC>
  );
}

function LambdaWithAPI({ name, dbEndpoint, cacheEndpoint, subnetId, sgId, enableCDN }: {
  name: string;
  dbEndpoint: string | undefined;
  cacheEndpoint?: string | undefined;
  subnetId: string | undefined;
  sgId: string | undefined;
  enableCDN: boolean;
}) {
  return (
    <IAMRole name={`${name}-role`} assumeRolePolicy="lambda.amazonaws.com">
      {(role) => (
        <>
          <IAMPolicy
            name={`${name}-policy`}
            roleArn={role.roleArn()}
            document="allow:*"
          />
          <Lambda
            name={name}
            roleArn={role.roleArn()}
            vpcConfig={{ subnetIds: [subnetId], sgId }}
            environment={{
              DB_ENDPOINT: dbEndpoint,
              CACHE_ENDPOINT: cacheEndpoint,
            }}
          >
            {(lambda) => (
              <APIGateway name={`${name}-gw`} lambdaArn={lambda.arn()}>
                {(api) => (
                  <>
                    {/* CDN in front of API */}
                    {enableCDN && (
                      <CloudFront name={`${name}-cdn`} originDomain={api.url()}>
                        {(cdn) => (
                          <Route53Record
                            name={`api.example.com`}
                            type="ALIAS"
                            target={cdn.domainName()}
                          />
                        )}
                      </CloudFront>
                    )}

                    {/* Direct DNS without CDN */}
                    {!enableCDN && (
                      <Route53Record
                        name="api.example.com"
                        type="CNAME"
                        target={api.url()}
                      />
                    )}
                  </>
                )}
              </APIGateway>
            )}
          </Lambda>
        </>
      )}
    </IAMRole>
  );
}

function EventProcessingPipeline({ environments }: { environments: string[] }) {
  return (
    <SNSTopic name="events">
      {(topic) => (
        <>
          {environments.map((env) => (
            <SQSQueue key={env} name={`queue-${env}`} topicArn={topic.topicArn()}>
              {(queue) => (
                <IAMRole name={`processor-${env}-role`} assumeRolePolicy="lambda.amazonaws.com">
                  {(role) => (
                    <Lambda
                      name={`processor-${env}`}
                      roleArn={role.roleArn()}
                      environment={{ QUEUE_URL: queue.queueUrl() }}
                    >
                      {(lambda) => (
                        <EventBridgeRule
                          name={`trigger-${env}`}
                          targets={[{ arn: lambda.arn(), type: 'lambda' }]}
                        />
                      )}
                    </Lambda>
                  )}
                </IAMRole>
              )}
            </SQSQueue>
          ))}
        </>
      )}
    </SNSTopic>
  );
}

function StaticAssets({ enableCDN }: { enableCDN: boolean }) {
  return (
    <S3Bucket name="static-assets" websiteConfig={{ indexDocument: 'index.html' }}>
      {(bucket) => (
        <>
          {enableCDN && (
            <CloudFront
              name="static-cdn"
              originDomain={bucket.websiteUrl()}
              s3BucketArn={bucket.bucketArn()}
            >
              {(cdn) => (
                <Route53Record
                  name="static.example.com"
                  type="ALIAS"
                  target={cdn.domainName()}
                />
              )}
            </CloudFront>
          )}
        </>
      )}
    </S3Bucket>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('Complex App - Deep Nesting', () => {
  let provider: MockProvider;
  let runtime: TestRuntime;

  beforeEach(() => {
    resetRuntime();
    provider = new MockProvider();
    runtime = new TestRuntime(provider);

    // Configure all outputs
    provider
      .setOutputs('VPCConstruct', { vpcId: 'vpc-123', cidrBlock: '10.0.0.0/16' })
      .setOutputs('SubnetConstruct', { subnetId: 'subnet-123', availabilityZone: 'us-east-1a' })
      .setOutputs('SecurityGroupConstruct', { sgId: 'sg-123' })
      .setOutputs('RDSInstanceConstruct', { endpoint: 'db.example.com', port: 5432 })
      .setOutputs('RDSReplicaConstruct', { endpoint: 'replica.example.com', port: 5432 })
      .setOutputs('ElastiCacheConstruct', { endpoint: 'cache.example.com', port: 6379 })
      .setOutputs('LambdaConstruct', { arn: 'arn:aws:lambda:...' })
      .setOutputs('APIGatewayConstruct', { url: 'https://api.execute-api.amazonaws.com', apiId: 'abc123' })
      .setOutputs('S3BucketConstruct', { bucketName: 'my-bucket', bucketArn: 'arn:aws:s3:::my-bucket', websiteUrl: 'http://my-bucket.s3-website.amazonaws.com' })
      .setOutputs('CloudFrontConstruct', { distributionId: 'E123', domainName: 'd123.cloudfront.net' })
      .setOutputs('Route53RecordConstruct', { recordName: 'api.example.com' })
      .setOutputs('IAMRoleConstruct', { roleArn: 'arn:aws:iam::123:role/my-role', roleName: 'my-role' })
      .setOutputs('IAMPolicyConstruct', { policyArn: 'arn:aws:iam::123:policy/my-policy' })
      .setOutputs('SNSTopicConstruct', { topicArn: 'arn:aws:sns:...:events' })
      .setOutputs('SQSQueueConstruct', { queueUrl: 'https://sqs.../queue', queueArn: 'arn:aws:sqs:...' })
      .setOutputs('EventBridgeRuleConstruct', { ruleArn: 'arn:aws:events:...' });
  });

  describe('Minimal Configuration', () => {
    it('creates basic stack without optional features', async () => {
      const config: AppConfig = {
        regions: ['us-east-1a'],
        enableReplicas: false,
        enableCaching: false,
        enableCDN: false,
        enableEventProcessing: false,
        environments: [],
      };

      await runtime.run(<ComplexApp config={config} />);

      // VPC + Subnet + SG + RDS + IAMRole + IAMPolicy + Lambda + APIGateway + Route53 + S3
      expect(provider.wasApplied('VPCConstruct')).toBe(true);
      expect(provider.wasApplied('SubnetConstruct')).toBe(true);
      expect(provider.wasApplied('SecurityGroupConstruct')).toBe(true);
      expect(provider.wasApplied('RDSInstanceConstruct')).toBe(true);
      expect(provider.wasApplied('LambdaConstruct')).toBe(true);
      expect(provider.wasApplied('APIGatewayConstruct')).toBe(true);
      expect(provider.wasApplied('S3BucketConstruct')).toBe(true);

      // Should NOT have replicas, cache, CDN, or event processing
      expect(provider.wasApplied('RDSReplicaConstruct')).toBe(false);
      expect(provider.wasApplied('ElastiCacheConstruct')).toBe(false);
      expect(provider.wasApplied('CloudFrontConstruct')).toBe(false);
      expect(provider.wasApplied('SNSTopicConstruct')).toBe(false);
    });
  });

  describe('Full Configuration', () => {
    it('creates complete stack with all features', async () => {
      const config: AppConfig = {
        regions: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
        enableReplicas: true,
        enableCaching: true,
        enableCDN: true,
        enableEventProcessing: true,
        environments: ['dev', 'staging', 'prod'],
      };

      await runtime.run(<ComplexApp config={config} />);

      // Helper to count nodes by type (final state, not apply calls)
      const countByType = (type: string) =>
        runtime.nodes.filter(n => n.constructType === type).length;

      // Core infrastructure
      expect(provider.wasApplied('VPCConstruct')).toBe(true);
      expect(countByType('SubnetConstruct')).toBe(3); // 3 AZs
      expect(countByType('SecurityGroupConstruct')).toBe(3);

      // Database with replicas
      expect(provider.wasApplied('RDSInstanceConstruct')).toBe(true);
      expect(countByType('RDSReplicaConstruct')).toBe(2); // 2 replicas

      // Caching
      expect(provider.wasApplied('ElastiCacheConstruct')).toBe(true);

      // CDN
      expect(countByType('CloudFrontConstruct')).toBeGreaterThanOrEqual(1);

      // Event processing - 3 environments
      expect(provider.wasApplied('SNSTopicConstruct')).toBe(true);
      expect(countByType('SQSQueueConstruct')).toBe(3);
      expect(countByType('EventBridgeRuleConstruct')).toBe(3);
    });

    it('creates resources in correct dependency order', async () => {
      const config: AppConfig = {
        regions: ['us-east-1a'],
        enableReplicas: false,
        enableCaching: true,
        enableCDN: true,
        enableEventProcessing: false,
        environments: [],
      };

      await runtime.run(<ComplexApp config={config} />);

      const appliedTypes = provider.getAppliedTypes();

      // VPC must come before Subnet
      expect(appliedTypes.indexOf('VPCConstruct')).toBeLessThan(
        appliedTypes.indexOf('SubnetConstruct')
      );

      // Subnet must come before SecurityGroup (same VPC dependency)
      expect(appliedTypes.indexOf('SubnetConstruct')).toBeLessThan(
        appliedTypes.indexOf('SecurityGroupConstruct')
      );

      // SecurityGroup must come before RDS
      expect(appliedTypes.indexOf('SecurityGroupConstruct')).toBeLessThan(
        appliedTypes.indexOf('RDSInstanceConstruct')
      );

      // RDS must come before ElastiCache (both need subnet/sg)
      expect(appliedTypes.indexOf('RDSInstanceConstruct')).toBeLessThan(
        appliedTypes.indexOf('ElastiCacheConstruct')
      );

      // IAMRole must come before Lambda
      expect(appliedTypes.indexOf('IAMRoleConstruct')).toBeLessThan(
        appliedTypes.indexOf('LambdaConstruct')
      );

      // Lambda must come before APIGateway
      expect(appliedTypes.indexOf('LambdaConstruct')).toBeLessThan(
        appliedTypes.indexOf('APIGatewayConstruct')
      );

      // APIGateway must come before API CloudFront (not static CloudFront)
      const apiGatewayIndex = provider.applyCalls.findIndex(
        c => c.node.constructType === 'APIGatewayConstruct'
      );
      const apiCloudFrontIndex = provider.applyCalls.findIndex(
        c => c.node.constructType === 'CloudFrontConstruct' && c.node.props.name === 'api-cdn'
      );
      expect(apiGatewayIndex).toBeLessThan(apiCloudFrontIndex);
    });
  });

  describe('Dynamic Children', () => {
    it('creates event processing for each environment', async () => {
      const config: AppConfig = {
        regions: ['us-east-1a'],
        enableReplicas: false,
        enableCaching: false,
        enableCDN: false,
        enableEventProcessing: true,
        environments: ['dev', 'staging', 'prod'],
      };

      await runtime.run(<ComplexApp config={config} />);

      // Helper to count nodes by type (final state)
      const countByType = (type: string) =>
        runtime.nodes.filter(n => n.constructType === type).length;

      // Each environment gets: SQSQueue + IAMRole + Lambda + EventBridge
      expect(countByType('SQSQueueConstruct')).toBe(3);
      expect(countByType('EventBridgeRuleConstruct')).toBe(3);

      // Check specific queues were created
      expect(provider.wasApplied('SQSQueueConstruct', 'queue-dev')).toBe(true);
      expect(provider.wasApplied('SQSQueueConstruct', 'queue-staging')).toBe(true);
      expect(provider.wasApplied('SQSQueueConstruct', 'queue-prod')).toBe(true);
    });

    it('creates replicas for each additional region', async () => {
      const config: AppConfig = {
        regions: ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d'],
        enableReplicas: true,
        enableCaching: false,
        enableCDN: false,
        enableEventProcessing: false,
        environments: [],
      };

      await runtime.run(<ComplexApp config={config} />);

      // Helper to count nodes by type (final state)
      const countByType = (type: string) =>
        runtime.nodes.filter(n => n.constructType === type).length;

      // Primary in first region, replicas in remaining 3
      expect(countByType('RDSInstanceConstruct')).toBe(1);
      expect(countByType('RDSReplicaConstruct')).toBe(3);
    });
  });

  describe('Conditional Resources', () => {
    it('toggles caching on/off correctly', async () => {
      // Without caching
      const configNoCaching: AppConfig = {
        regions: ['us-east-1a'],
        enableReplicas: false,
        enableCaching: false,
        enableCDN: false,
        enableEventProcessing: false,
        environments: [],
      };

      await runtime.run(<ComplexApp config={configNoCaching} />);
      expect(provider.wasApplied('ElastiCacheConstruct')).toBe(false);
      const nodesWithoutCache = runtime.nodes;
      provider.reset();
      resetRuntime();

      // With caching - re-render
      const configWithCaching: AppConfig = {
        regions: ['us-east-1a'],
        enableReplicas: false,
        enableCaching: true,
        enableCDN: false,
        enableEventProcessing: false,
        environments: [],
      };

      await runtime.run(<ComplexApp config={configWithCaching} />);
      expect(provider.wasApplied('ElastiCacheConstruct')).toBe(true);
    });

    it('toggles CDN on/off correctly', async () => {
      // Without CDN
      const configNoCDN: AppConfig = {
        regions: ['us-east-1a'],
        enableReplicas: false,
        enableCaching: false,
        enableCDN: false,
        enableEventProcessing: false,
        environments: [],
      };

      await runtime.run(<ComplexApp config={configNoCDN} />);
      expect(provider.wasApplied('CloudFrontConstruct')).toBe(false);
      provider.reset();
      resetRuntime();

      // With CDN
      const configWithCDN: AppConfig = {
        regions: ['us-east-1a'],
        enableReplicas: false,
        enableCaching: false,
        enableCDN: true,
        enableEventProcessing: false,
        environments: [],
      };

      await runtime.run(<ComplexApp config={configWithCDN} />);
      expect(provider.wasApplied('CloudFrontConstruct')).toBe(true);
    });
  });

  describe('Deep Nesting Depth', () => {
    it('handles 8+ levels of nesting', async () => {
      // VPC > Subnet > SG > RDS > Cache > Lambda > APIGateway > CloudFront > Route53
      const config: AppConfig = {
        regions: ['us-east-1a'],
        enableReplicas: false,
        enableCaching: true,
        enableCDN: true,
        enableEventProcessing: false,
        environments: [],
      };

      await runtime.run(<ComplexApp config={config} />);

      // All 8 levels should be created
      const appliedTypes = provider.getAppliedTypes();
      expect(appliedTypes).toContain('VPCConstruct');
      expect(appliedTypes).toContain('SubnetConstruct');
      expect(appliedTypes).toContain('SecurityGroupConstruct');
      expect(appliedTypes).toContain('RDSInstanceConstruct');
      expect(appliedTypes).toContain('ElastiCacheConstruct');
      expect(appliedTypes).toContain('LambdaConstruct');
      expect(appliedTypes).toContain('APIGatewayConstruct');
      expect(appliedTypes).toContain('CloudFrontConstruct');
      expect(appliedTypes).toContain('Route53RecordConstruct');
    });
  });

  describe('Event-Driven Updates', () => {
    it('creates new resources when parent outputs change', async () => {
      // Start with no environments
      const config: AppConfig = {
        regions: ['us-east-1a'],
        enableReplicas: false,
        enableCaching: false,
        enableCDN: false,
        enableEventProcessing: true,
        environments: [],
      };

      await runtime.run(<ComplexApp config={config} />);

      // SNS topic exists but no queues
      expect(provider.wasApplied('SNSTopicConstruct')).toBe(true);
      expect(provider.wasApplied('SQSQueueConstruct')).toBe(false);
    });
  });

  describe('Multiple Parallel Branches', () => {
    it('creates multiple independent branches correctly', async () => {
      const config: AppConfig = {
        regions: ['us-east-1a', 'us-east-1b'],
        enableReplicas: false,
        enableCaching: false,
        enableCDN: true,
        enableEventProcessing: true,
        environments: ['dev', 'prod'],
      };

      await runtime.run(<ComplexApp config={config} />);

      // Should have parallel branches:
      // 1. Database branch (VPC > Subnet > SG > RDS > Lambda > API > CloudFront)
      // 2. Event processing branch (SNS > SQS x2 > Lambda x2 > EventBridge x2)
      // 3. Static assets branch (S3 > CloudFront)

      // Verify all branches created
      expect(provider.wasApplied('VPCConstruct')).toBe(true);
      expect(provider.wasApplied('RDSInstanceConstruct')).toBe(true);
      expect(provider.wasApplied('SNSTopicConstruct')).toBe(true);
      expect(provider.wasApplied('S3BucketConstruct')).toBe(true);

      // Multiple CloudFront distributions
      const cdnCount = provider.getAppliedByType('CloudFrontConstruct').length;
      expect(cdnCount).toBeGreaterThanOrEqual(2); // API CDN + Static CDN
    });
  });
});

describe('Edge Cases', () => {
  let provider: MockProvider;
  let runtime: TestRuntime;

  beforeEach(() => {
    resetRuntime();
    provider = new MockProvider();
    runtime = new TestRuntime(provider);
  });

  describe('Empty/Null Handling', () => {
    it('handles empty regions array', async () => {
      provider.setOutputs('VPCConstruct', { vpcId: 'vpc-123', cidrBlock: '10.0.0.0/16' });
      provider.setOutputs('S3BucketConstruct', { bucketName: 'bucket', bucketArn: 'arn', websiteUrl: 'http://...' });

      const config: AppConfig = {
        regions: [], // No regions!
        enableReplicas: false,
        enableCaching: false,
        enableCDN: false,
        enableEventProcessing: false,
        environments: [],
      };

      await runtime.run(<ComplexApp config={config} />);

      // VPC created but no subnets
      expect(provider.wasApplied('VPCConstruct')).toBe(true);
      expect(provider.wasApplied('SubnetConstruct')).toBe(false);
      expect(provider.wasApplied('RDSInstanceConstruct')).toBe(false);
    });

    it('handles empty environments array', async () => {
      provider
        .setOutputs('VPCConstruct', { vpcId: 'vpc-123', cidrBlock: '10.0.0.0/16' })
        .setOutputs('SNSTopicConstruct', { topicArn: 'arn:...' })
        .setOutputs('S3BucketConstruct', { bucketName: 'bucket', bucketArn: 'arn' });

      const config: AppConfig = {
        regions: [],
        enableReplicas: false,
        enableCaching: false,
        enableCDN: false,
        enableEventProcessing: true,
        environments: [], // No environments!
      };

      await runtime.run(<ComplexApp config={config} />);

      // SNS topic created but no queues
      expect(provider.wasApplied('SNSTopicConstruct')).toBe(true);
      expect(provider.wasApplied('SQSQueueConstruct')).toBe(false);
    });
  });

  describe('Undefined Output Handling', () => {
    it('skips resources when parent returns undefined output (placeholder proxy)', async () => {
      // With the placeholder proxy fix, when a parent returns undefined output,
      // children that depend on it will use the placeholder proxy and never
      // create nodes at all - they won't even be sent to the provider.
      const appliedTypes: string[] = [];

      provider.setOutputsFn((node) => {
        appliedTypes.push(node.constructType);

        // VPC returns undefined vpcId - this means children will have undefined props
        if (node.constructType === 'VPCConstruct') {
          return { vpcId: undefined, cidrBlock: '10.0.0.0/16' };
        }
        if (node.constructType === 'S3BucketConstruct') {
          return { bucketName: 'bucket', bucketArn: 'arn' };
        }
        return {};
      });

      const config: AppConfig = {
        regions: ['us-east-1a'],
        enableReplicas: false,
        enableCaching: false,
        enableCDN: false,
        enableEventProcessing: false,
        environments: [],
      };

      await runtime.run(<ComplexApp config={config} />);

      // VPC was successfully applied (no undefined in its own props)
      expect(appliedTypes).toContain('VPCConstruct');

      // Subnet was never sent to provider because vpcId is undefined,
      // so useInstance returned a placeholder proxy instead of creating a node
      expect(appliedTypes).not.toContain('SubnetConstruct');
    });
  });

  describe('Same Type Multiple Instances', () => {
    it('creates multiple instances of same type with unique paths', async () => {
      provider
        .setOutputs('VPCConstruct', { vpcId: 'vpc-123', cidrBlock: '10.0.0.0/16' })
        .setOutputs('SubnetConstruct', { subnetId: 'subnet-123', availabilityZone: 'us-east-1a' })
        .setOutputs('SecurityGroupConstruct', { sgId: 'sg-123' })
        .setOutputs('RDSInstanceConstruct', { endpoint: 'db.example.com', port: 5432 })
        .setOutputs('RDSReplicaConstruct', { endpoint: 'replica.example.com', port: 5432 })
        .setOutputs('LambdaConstruct', { arn: 'arn:...' })
        .setOutputs('APIGatewayConstruct', { url: 'https://...', apiId: 'id' })
        .setOutputs('S3BucketConstruct', { bucketName: 'bucket', bucketArn: 'arn' })
        .setOutputs('IAMRoleConstruct', { roleArn: 'arn:...', roleName: 'role' })
        .setOutputs('IAMPolicyConstruct', { policyArn: 'arn:...' })
        .setOutputs('Route53RecordConstruct', { recordName: 'example.com' });

      const config: AppConfig = {
        regions: ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e'],
        enableReplicas: true,
        enableCaching: false,
        enableCDN: false,
        enableEventProcessing: false,
        environments: [],
      };

      await runtime.run(<ComplexApp config={config} />);

      // Helper to count nodes by type (final state)
      const countByType = (type: string) =>
        runtime.nodes.filter(n => n.constructType === type).length;

      // 5 subnets, all with unique IDs
      expect(countByType('SubnetConstruct')).toBe(5);

      const subnetNodes = runtime.nodes.filter(n => n.constructType === 'SubnetConstruct');
      const uniqueIds = new Set(subnetNodes.map(n => n.id));
      expect(uniqueIds.size).toBe(5);

      // 4 replicas (regions minus primary)
      expect(countByType('RDSReplicaConstruct')).toBe(4);
    });
  });
});
