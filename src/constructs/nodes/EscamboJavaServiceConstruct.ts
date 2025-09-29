import { Construct } from "constructs";
import { DataTerraformRemoteStateS3 } from "cdktf";
import { EnvironmentConfig, sharedConfig } from "@config";
import { DnsConstruct, DockerAppRunnerConstruct, EcrRepositoryConstruct } from "@src/constructs";

export interface EscamboJavaServiceConstructProps {
  config: EnvironmentConfig;
  serviceName: string;
  containerPort?: string;
  imageTag?: string;
}

export class EscamboJavaServiceConstruct extends Construct {
  constructor(scope: Construct, id: string, props: EscamboJavaServiceConstructProps) {
    super(scope, id);

    const { config, serviceName } = props;
    const environment = config.environment;
    const containerPort = props.containerPort ?? "8080";
    const imageTag = props.imageTag ?? "latest";

    // DNS Remote State
    const dnsState = new DataTerraformRemoteStateS3(this, "dns_state", {
      bucket: sharedConfig.terraform.backend.bucket,
      key: "dns.tfstate",
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });
    const dns = DnsConstruct.fromRemoteState(dnsState);

    // ECR Remote State
    const ecrState = new DataTerraformRemoteStateS3(this, "ecr_state", {
      bucket: sharedConfig.terraform.backend.bucket,
      key: `${environment}/ecr.tfstate`,
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });
    const ecr = EcrRepositoryConstruct.fromRemoteState(
      ecrState, 
      `${serviceName}-java-service`, 
      environment
    );

    // Docker App Runner
    new DockerAppRunnerConstruct(this, `${serviceName}_docker_app_runner`, {
      hostedZoneId: dns.dnsZoneId,
      environment,
      imageTag,
      containerPort,
      repositoryUrl: ecr.repositoryUrl,
      serviceName,
    });
  }
}