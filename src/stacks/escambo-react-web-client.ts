import { Construct } from "constructs";
import { TerraformStack, S3Backend, DataTerraformRemoteStateS3 } from "cdktf";
import { AwsProvider } from "../../.gen/providers/aws/provider";
import { ReactWebClient } from "../base/react-web-client";
import { EnvironmentConfig } from "../../config";

export interface EscamboReactWebClientStackProps {
  config: EnvironmentConfig;
}

export class EscamboReactWebClientStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: EscamboReactWebClientStackProps) {
    super(scope, id);

    const envConfig = props.config;

    new AwsProvider(this, "aws", {
      region: envConfig.aws.region,
      profile: envConfig.aws.profile,
    });

    new S3Backend(this, {
      bucket: envConfig.terraform.backend.bucket,
      key: "react-web-client.tfstate",
      region: envConfig.aws.region,
      dynamodbTable: envConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    const bootstrapState = new DataTerraformRemoteStateS3(this, "bootstrap_state", {
      bucket: envConfig.terraform.backend.bucket,
      key: "bootstrap.tfstate",
      region: envConfig.aws.region,
      dynamodbTable: envConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    new ReactWebClient(this, "react_web_client", {
      hostedZoneId: bootstrapState.get("dns_zone_id"),
      config: envConfig,
    });
  }
}
