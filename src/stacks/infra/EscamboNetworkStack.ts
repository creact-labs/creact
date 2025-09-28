import { Construct } from "constructs";
import { TerraformStack, S3Backend } from "cdktf";

import { AwsProvider } from "@gen/providers/aws/provider";
import { sharedConfig } from "@config";
import { NetworkConstruct } from "@src/constructs";

export class EscamboNetworkStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const baseConfig = sharedConfig;

    new AwsProvider(this, "aws", {
      region: baseConfig.aws.region,
    });

    new S3Backend(this, {
      bucket: baseConfig.terraform.backend.bucket,
      key: "network.tfstate",
      region: baseConfig.aws.region,
      dynamodbTable: baseConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    new NetworkConstruct(this, "escambo_network", {
      region: baseConfig.aws.region,
      environment: "shared",
    });
  }
}
