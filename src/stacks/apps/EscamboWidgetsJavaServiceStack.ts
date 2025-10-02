import { Construct } from "constructs";
import { TerraformStack, S3Backend } from "cdktf";
import { AwsProvider } from "@gen/providers/aws/provider";
import { EnvironmentConfig, sharedConfig } from "@config";
import { JavaServiceConstruct } from "@src/constructs";

export interface EscamboWidgetsJavaServiceStackProps {
  config: EnvironmentConfig;
}

export class EscamboWidgetsJavaServiceStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: EscamboWidgetsJavaServiceStackProps) {
    super(scope, id);

    const envConfig = props.config;

    new AwsProvider(this, "aws", {
      region: sharedConfig.aws.region,
    });

    new S3Backend(this, {
      bucket: sharedConfig.terraform.backend.bucket,
      key: `${envConfig.environment}/widgets-java-service.tfstate`,
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    new JavaServiceConstruct(this, "widgets_java_service", {
      config: envConfig,
      serviceName: "widgets",
    });
  }
}