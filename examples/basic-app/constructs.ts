/**
 * Infrastructure Constructs
 * 
 * These are the building blocks for your infrastructure.
 * Each construct represents a cloud resource type.
 */

export class VPC {
  constructor(public props: {
    name: string;
    cidr?: string;
    region?: string;
  }) {}
}

export class Subnet {
  constructor(public props: {
    name: string;
    vpcId: string;
    cidr?: string;
    region?: string;
  }) {}
}

export class Database {
  constructor(public props: {
    name: string;
    host?: string;
    port?: number;
    username?: string;
    subnetId?: string;
  }) {}
}

export class ApiGateway {
  constructor(public props: {
    name: string;
    stage?: string;
  }) {}
}

export class Lambda {
  constructor(public props: {
    name: string;
    runtime?: string;
    handler?: string;
    code?: string;
  }) {}
}

export class S3Bucket {
  constructor(public props: {
    name: string;
    region?: string;
    versioning?: boolean;
  }) {}
}

export class LoadBalancer {
  constructor(public props: {
    name: string;
    subnets?: string[];
    vpcId?: string;
  }) {}
}
