/**
 * Infrastructure Constructs for Distributed Messaging App
 * 
 * These represent real cloud resources (AWS, Docker, Kubernetes, etc.)
 * Each construct produces mocked but realistic outputs.
 */

// Database constructs
export class PostgresDatabase {
  constructor(public props: {
    name: string;
    version: string;
    storage: string;
    replicas?: number;
  }) {}
  
  // Mock outputs that would come from actual deployment
  static mockOutputs(props: any) {
    return {
      connectionUrl: `postgresql://admin:password@${props.name}.cluster-abc123.us-east-1.rds.amazonaws.com:5432/messaging`,
      host: `${props.name}.cluster-abc123.us-east-1.rds.amazonaws.com`,
      port: 5432,
      database: 'messaging',
      username: 'admin',
      replicaEndpoints: Array.from({ length: props.replicas || 1 }, (_, i) => 
        `${props.name}-replica-${i}.cluster-abc123.us-east-1.rds.amazonaws.com`
      ),
    };
  }
}

export class RedisCluster {
  constructor(public props: {
    name: string;
    nodes: number;
    memory: string;
    evictionPolicy?: string;
  }) {}
  
  static mockOutputs(props: any) {
    return {
      endpoint: `${props.name}.abc123.cache.amazonaws.com:6379`,
      primaryEndpoint: `${props.name}-primary.abc123.cache.amazonaws.com:6379`,
      readerEndpoint: `${props.name}-reader.abc123.cache.amazonaws.com:6379`,
      nodes: Array.from({ length: props.nodes }, (_, i) => 
        `${props.name}-node-${i}.abc123.cache.amazonaws.com:6379`
      ),
      clusterEnabled: props.nodes > 1,
    };
  }
}

export class ElasticsearchCluster {
  constructor(public props: {
    name: string;
    nodes: number;
    storage: string;
    version: string;
  }) {}
  
  static mockOutputs(props: any) {
    return {
      endpoint: `https://${props.name}-abc123.us-east-1.es.amazonaws.com`,
      kibanaEndpoint: `https://${props.name}-abc123.us-east-1.es.amazonaws.com/_plugin/kibana`,
      domainArn: `arn:aws:es:us-east-1:123456789012:domain/${props.name}`,
      nodes: Array.from({ length: props.nodes }, (_, i) => 
        `${props.name}-node-${i}.us-east-1.es.amazonaws.com`
      ),
    };
  }
}

// Compute constructs
export class KubernetesDeployment {
  constructor(public props: {
    name: string;
    image: string;
    replicas: number;
    port: number;
    env?: Record<string, string>;
    resources?: {
      cpu: string;
      memory: string;
    };
  }) {}
  
  static mockOutputs(props: any) {
    return {
      serviceUrl: `http://${props.name}.default.svc.cluster.local:${props.port}`,
      externalUrl: `https://${props.name}.example.com`,
      serviceName: props.name,
      namespace: 'default',
      replicas: props.replicas,
      podNames: Array.from({ length: props.replicas }, (_, i) => 
        `${props.name}-${Math.random().toString(36).substring(7)}-${i}`
      ),
    };
  }
}

export class AwsLambda {
  constructor(public props: {
    name: string;
    handler: string;
    runtime: string;
    memory: number;
    timeout: number;
    env?: Record<string, string>;
  }) {}
  
  static mockOutputs(props: any) {
    return {
      functionArn: `arn:aws:lambda:us-east-1:123456789012:function:${props.name}`,
      functionName: props.name,
      invokeUrl: `https://lambda.us-east-1.amazonaws.com/2015-03-31/functions/${props.name}/invocations`,
      version: '$LATEST',
      lastModified: new Date().toISOString(),
    };
  }
}

// Storage constructs
export class S3Bucket {
  constructor(public props: {
    name: string;
    versioning?: boolean;
    encryption?: boolean;
    lifecycle?: {
      transitionDays: number;
      storageClass: string;
    };
  }) {}
  
  static mockOutputs(props: any) {
    return {
      bucketName: props.name,
      bucketArn: `arn:aws:s3:::${props.name}`,
      bucketUrl: `https://${props.name}.s3.amazonaws.com`,
      bucketDomainName: `${props.name}.s3.amazonaws.com`,
      region: 'us-east-1',
      websiteUrl: `http://${props.name}.s3-website-us-east-1.amazonaws.com`,
    };
  }
}

export class EFSFileSystem {
  constructor(public props: {
    name: string;
    performanceMode: 'generalPurpose' | 'maxIO';
    throughputMode: 'bursting' | 'provisioned';
  }) {}
  
  static mockOutputs(props: any) {
    return {
      fileSystemId: `fs-${Math.random().toString(36).substring(2, 10)}`,
      dnsName: `fs-${Math.random().toString(36).substring(2, 10)}.efs.us-east-1.amazonaws.com`,
      mountTarget: `/mnt/${props.name}`,
      arn: `arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-${Math.random().toString(36).substring(2, 10)}`,
    };
  }
}

// Networking constructs
export class LoadBalancer {
  constructor(public props: {
    name: string;
    type: 'application' | 'network';
    port: number;
    healthCheck: {
      path: string;
      interval: number;
    };
  }) {}
  
  static mockOutputs(props: any) {
    const lbId = Math.random().toString(36).substring(2, 10);
    return {
      dnsName: `${props.name}-${lbId}.us-east-1.elb.amazonaws.com`,
      arn: `arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/${props.type}/${props.name}/${lbId}`,
      hostedZoneId: 'Z35SXDOTRQ7X7K',
      url: `https://${props.name}-${lbId}.us-east-1.elb.amazonaws.com`,
      targetGroupArn: `arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/${props.name}-tg/${lbId}`,
    };
  }
}

export class ApiGateway {
  constructor(public props: {
    name: string;
    stage: string;
    cors?: boolean;
    throttle?: {
      rateLimit: number;
      burstLimit: number;
    };
  }) {}
  
  static mockOutputs(props: any) {
    const apiId = Math.random().toString(36).substring(2, 10);
    return {
      apiId,
      invokeUrl: `https://${apiId}.execute-api.us-east-1.amazonaws.com/${props.stage}`,
      apiEndpoint: `https://${apiId}.execute-api.us-east-1.amazonaws.com`,
      stage: props.stage,
      arn: `arn:aws:apigateway:us-east-1::/restapis/${apiId}`,
    };
  }
}

export class CloudFront {
  constructor(public props: {
    name: string;
    origins: string[];
    caching?: {
      ttl: number;
      compress: boolean;
    };
  }) {}
  
  static mockOutputs(props: any) {
    const distId = Math.random().toString(36).substring(2, 14).toUpperCase();
    return {
      distributionId: distId,
      distributionUrl: `https://${distId.toLowerCase()}.cloudfront.net`,
      domainName: `${distId.toLowerCase()}.cloudfront.net`,
      arn: `arn:aws:cloudfront::123456789012:distribution/${distId}`,
      hostedZoneId: 'Z2FDTNDATAQYW2',
    };
  }
}

// Messaging constructs
export class KafkaCluster {
  constructor(public props: {
    name: string;
    brokers: number;
    version: string;
    topics: Array<{
      name: string;
      partitions: number;
      replication: number;
    }>;
  }) {}
  
  static mockOutputs(props: any) {
    const brokers = Array.from({ length: props.brokers }, (_, i) => 
      `${props.name}-broker-${i}.kafka.us-east-1.amazonaws.com:9092`
    );
    return {
      brokers,
      bootstrapServers: brokers.join(','),
      zookeeperConnect: `${props.name}-zk.kafka.us-east-1.amazonaws.com:2181`,
      clusterArn: `arn:aws:kafka:us-east-1:123456789012:cluster/${props.name}/${Math.random().toString(36).substring(2, 10)}`,
      topics: props.topics.map((t: any) => ({
        name: t.name,
        partitions: t.partitions,
        replication: t.replication,
      })),
    };
  }
}

export class SQSQueue {
  constructor(public props: {
    name: string;
    visibilityTimeout: number;
    messageRetention: number;
    deadLetterQueue?: boolean;
  }) {}
  
  static mockOutputs(props: any) {
    return {
      queueUrl: `https://sqs.us-east-1.amazonaws.com/123456789012/${props.name}`,
      queueArn: `arn:aws:sqs:us-east-1:123456789012:${props.name}`,
      queueName: props.name,
      deadLetterQueueUrl: props.deadLetterQueue 
        ? `https://sqs.us-east-1.amazonaws.com/123456789012/${props.name}-dlq`
        : undefined,
      deadLetterQueueArn: props.deadLetterQueue
        ? `arn:aws:sqs:us-east-1:123456789012:${props.name}-dlq`
        : undefined,
    };
  }
}

export class SNSTopic {
  constructor(public props: {
    name: string;
    displayName: string;
    subscriptions?: Array<{
      protocol: string;
      endpoint: string;
    }>;
  }) {}
  
  static mockOutputs(props: any) {
    return {
      topicArn: `arn:aws:sns:us-east-1:123456789012:${props.name}`,
      topicName: props.name,
      subscriptions: props.subscriptions?.map((sub: any, i: number) => ({
        subscriptionArn: `arn:aws:sns:us-east-1:123456789012:${props.name}:${Math.random().toString(36).substring(2, 10)}`,
        protocol: sub.protocol,
        endpoint: sub.endpoint,
      })) || [],
    };
  }
}

// Monitoring constructs
export class PrometheusServer {
  constructor(public props: {
    name: string;
    retention: string;
    scrapeInterval: string;
  }) {}
  
  static mockOutputs(props: any) {
    return {
      serverUrl: `http://${props.name}.monitoring.svc.cluster.local:9090`,
      externalUrl: `https://prometheus.${props.name}.example.com`,
      metricsPath: '/metrics',
      alertmanagerUrl: `http://${props.name}-alertmanager.monitoring.svc.cluster.local:9093`,
    };
  }
}

export class GrafanaDashboard {
  constructor(public props: {
    name: string;
    datasources: string[];
    dashboards: string[];
  }) {}
  
  static mockOutputs(props: any) {
    return {
      dashboardUrl: `https://grafana.${props.name}.example.com`,
      apiUrl: `https://grafana.${props.name}.example.com/api`,
      datasources: props.datasources,
      dashboardIds: props.dashboards.map((d: string) => 
        `${d}-${Math.random().toString(36).substring(2, 8)}`
      ),
    };
  }
}

// Security constructs
export class VaultCluster {
  constructor(public props: {
    name: string;
    nodes: number;
    storage: string;
  }) {}
  
  static mockOutputs(props: any) {
    return {
      vaultUrl: `https://${props.name}.vault.example.com:8200`,
      vaultAddr: `https://${props.name}.vault.example.com:8200`,
      nodes: Array.from({ length: props.nodes }, (_, i) => 
        `${props.name}-node-${i}.vault.example.com`
      ),
      unsealKeys: ['key1-mock', 'key2-mock', 'key3-mock'],
      rootToken: 'root-token-mock-do-not-use-in-prod',
    };
  }
}

export class CertificateManager {
  constructor(public props: {
    domain: string;
    validation: 'DNS' | 'EMAIL';
    autoRenew: boolean;
  }) {}
  
  static mockOutputs(props: any) {
    return {
      certificateArn: `arn:aws:acm:us-east-1:123456789012:certificate/${Math.random().toString(36).substring(2, 10)}`,
      domain: props.domain,
      status: 'ISSUED',
      notBefore: new Date().toISOString(),
      notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      subjectAlternativeNames: [`*.${props.domain}`, props.domain],
    };
  }
}
