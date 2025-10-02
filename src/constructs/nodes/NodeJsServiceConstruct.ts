import { Construct } from "constructs";
import { DataTerraformRemoteStateS3 } from "cdktf";
import { EnvironmentConfig, sharedConfig } from "@config";
import { DnsConstruct, DockerAppRunnerConstruct, EcrRepositoryConstruct } from "@src/constructs";

export interface NodeJsServiceConstructProps {
  config: EnvironmentConfig;
  serviceName: string;
  containerPort?: string;
  imageTag?: string;
  urlService?: string;
}

export class NodeJsServiceConstruct extends Construct {
  constructor(scope: Construct, id: string, props: NodeJsServiceConstructProps) {
    super(scope, id);

    const { config, serviceName, urlService } = props;
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

    const ecrState = new DataTerraformRemoteStateS3(this, "ecr_state", {
      bucket: sharedConfig.terraform.backend.bucket,
      key: `${environment}/ecr.tfstate`,
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });
    const ecr = EcrRepositoryConstruct.fromRemoteState(
      ecrState, 
      `${serviceName}-nodejs-service`, 
      environment
    );
    

    // Docker App Runner
    new DockerAppRunnerConstruct(this, `${serviceName}_docker_app_runner`, {
      hostedZoneId: dns.dnsZoneId,
      environment,
      imageTag,
      containerPort,
      serviceName,
      urlService,
      repositoryUrl: ecr.repositoryUrl
    });
  }
}