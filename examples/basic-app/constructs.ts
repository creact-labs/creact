/**
 * Infrastructure Construct Definitions
 * 
 * These are TypeScript classes that represent infrastructure resources.
 * They act as "types" or "schemas" for the resources you want to create.
 * 
 * In a real application, these would come from:
 * - @aws-cdk/aws-* packages for AWS
 * - @pulumi/* packages for Pulumi
 * - Custom construct libraries
 * 
 * The MockCloudProvider knows how to materialize these into realistic outputs.
 */

// Compute
export class ECSCluster {
  constructor(public props: any) {}
}

export class ECSService {
  constructor(public props: any) {}
}

export class Lambda {
  constructor(public props: any) {}
}

// Database & Cache
export class RDSInstance {
  constructor(public props: any) {}
}

export class ElastiCache {
  constructor(public props: any) {}
}

// Storage
export class S3Bucket {
  constructor(public props: any) {}
}

// Networking
export class VPC {
  constructor(public props: any) {}
}

export class Subnet {
  constructor(public props: any) {}
}

export class SecurityGroup {
  constructor(public props: any) {}
}

export class LoadBalancer {
  constructor(public props: any) {}
}

// API & CDN
export class ApiGateway {
  constructor(public props: any) {}
}

export class CloudFront {
  constructor(public props: any) {}
}

// Monitoring
export class CloudWatch {
  constructor(public props: any) {}
}

export class Analytics {
  constructor(public props: any) {}
}

export class Backup {
  constructor(public props: any) {}
}
