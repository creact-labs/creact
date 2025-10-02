import { Construct } from "constructs";
import { TerraformStack, S3Backend } from "cdktf";
import { AwsProvider } from "@gen/providers/aws/provider";
import { EnvironmentConfig, sharedConfig } from "@config";
import { NodeJsServiceConstruct } from "@src/constructs";

export interface EscamboGraphqlOrchestratorNodejsServiceStackProps {
  config: EnvironmentConfig;
}

export class EscamboGraphqlOrchestratorNodejsServiceStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: EscamboGraphqlOrchestratorNodejsServiceStackProps) {
    super(scope, id);

    const envConfig = props.config;

    new AwsProvider(this, "aws", {
      region: sharedConfig.aws.region,
    });

    new S3Backend(this, {
      bucket: sharedConfig.terraform.backend.bucket,
      key: `${envConfig.environment}/graphql-orchestrator-nodejs-service.tfstate`,
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    new NodeJsServiceConstruct(this, "graphql_orchestrator_nodejs_service", {
      config: envConfig,
      serviceName: "graphql-orchestrator",
      urlService: "api",
    });
  }
}