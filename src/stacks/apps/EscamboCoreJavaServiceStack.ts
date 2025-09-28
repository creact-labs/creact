import { Construct } from "constructs";
import { TerraformStack, S3Backend, DataTerraformRemoteStateS3 } from "cdktf";
import { AwsProvider } from "@gen/providers/aws/provider";
import * as crypto from "crypto";
import { EnvironmentConfig, sharedConfig } from "@config";
import { DnsConstruct, DockerAppRunnerConstruct, EcrRepositoryConstruct } from "@src/constructs";

export interface EscamboCoreJavaServiceStackProps {
  config: EnvironmentConfig;
}

const BASE_SERVICE_NAME = "core";
const DEFAULT_CONTAINER_PORT = "8080";

export class EscamboCoreJavaServiceStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: EscamboCoreJavaServiceStackProps) {
    super(scope, id);

    const envConfig = props.config;
    const environment = envConfig.environment;

    const uniqueBase = `${BASE_SERVICE_NAME}-${environment}`;
    const hash = crypto.createHash("sha1").update(uniqueBase).digest("hex").slice(0, 8);
    const finalServiceName = `${BASE_SERVICE_NAME}-${environment}-${hash}`;

    new AwsProvider(this, "aws", {
      region: sharedConfig.aws.region,
    });

    new S3Backend(this, {
      bucket: sharedConfig.terraform.backend.bucket,
      key: `${environment}/core-java-service.tfstate`,
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    const dnsState = new DataTerraformRemoteStateS3(this, "dns_state", {
      bucket: sharedConfig.terraform.backend.bucket,
      key: "dns.tfstate",
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });
    const dns = DnsConstruct.fromRemoteState(dnsState);

    const ecrState = new DataTerraformRemoteStateS3(this, "ecr_state", {
      bucket: sharedConfig.terraform.backend.bucket,
      key: "ecr.tfstate",
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });
    const ecr = EcrRepositoryConstruct.fromRemoteState(ecrState);

    new DockerAppRunnerConstruct(this, "core_docker_app_runner", {
      hostedZoneId: dns.dnsZoneId,
      serviceName: finalServiceName,
      environment,
      imageTag: "latest",
      containerPort: DEFAULT_CONTAINER_PORT,
      repositoryUrl: ecr.repositoryUrl,
    });
  }
}
