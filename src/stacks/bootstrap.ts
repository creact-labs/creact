import { Construct } from "constructs";
import { TerraformStack, S3Backend } from "cdktf";
import { AwsProvider } from "../../.gen/providers/aws/provider";
import { Bootstrap } from "../base/bootstrap";
import { EnvironmentConfig } from "../../config";

export interface BootstrapStackProps {
  config: EnvironmentConfig;
}

export class BootstrapStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: BootstrapStackProps) {
    super(scope, id);

    const envConfig = props.config;

    new AwsProvider(this, "aws", {
      region: envConfig.aws.region,
    });

    new S3Backend(this, {
      bucket: envConfig.terraform.backend.bucket,
      key: "bootstrap.tfstate",
      region: envConfig.aws.region,
      dynamodbTable: envConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    new Bootstrap(this, "bootstrap", { config: envConfig });
  }
}
