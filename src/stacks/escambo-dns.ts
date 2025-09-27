import { Construct } from "constructs";
import { TerraformStack, S3Backend } from "cdktf";
import { AwsProvider } from "../../.gen/providers/aws/provider";
import { Dns } from "../constructs/dns"
import { sharedConfig } from "../../config";

export class EscamboDnsStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const baseConfig = sharedConfig;

    new AwsProvider(this, "aws", {
      region: baseConfig.aws.region,
    });

    new S3Backend(this, {
      bucket: baseConfig.terraform.backend.bucket,
      key: "dns.tfstate",
      region: baseConfig.aws.region,
      dynamodbTable: baseConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    new Dns(this, "escambo_dns", {
      baseDomain: baseConfig.baseDomain,
    });
  }
}
