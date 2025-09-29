import { Construct } from "constructs";
import { TerraformStack, S3Backend } from "cdktf";
import { AwsProvider } from "@gen/providers/aws/provider";
import { sharedConfig, EnvironmentConfig } from "@config";
import { EcrRepositoryConstruct } from "@src/constructs";

export interface EscamboEcrStackProps {
  config: EnvironmentConfig;
}

export class EscamboEcrStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: EscamboEcrStackProps) {
    super(scope, id);

    const envConfig = props.config;

    new AwsProvider(this, "aws", {
      region: sharedConfig.aws.region,
    });

    new S3Backend(this, {
      bucket: sharedConfig.terraform.backend.bucket,
      key: `${envConfig.environment}/ecr.tfstate`,
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    new EcrRepositoryConstruct(this, `core_service_repo_${envConfig.environment}`, {
      repositoryName: "core-java-service",
      environment: envConfig.environment,
      imageTagMutability: "MUTABLE",
      scanOnPush: true,
    });

    new EcrRepositoryConstruct(this, `widgets_service_repo_${envConfig.environment}`, {
      repositoryName: "widgets-java-service",
      environment: envConfig.environment,
      imageTagMutability: "MUTABLE",
      scanOnPush: true,
    });
  }
}
