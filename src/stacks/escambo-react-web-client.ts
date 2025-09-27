import { Construct } from "constructs";
import { TerraformStack, S3Backend, DataTerraformRemoteStateS3 } from "cdktf";
import { AwsProvider } from "../../.gen/providers/aws/provider";
import { EscamboReactWebClient } from "../constructs/escambo-react-web-client";
import { EnvironmentConfig, sharedConfig } from "../../config";

export interface EscamboReactWebClientStackProps {
  config: EnvironmentConfig;
}

export class EscamboReactWebClientStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: EscamboReactWebClientStackProps) {
    super(scope, id);

    const envConfig = props.config;

    // --- AWS Provider (from shared config)
    new AwsProvider(this, "aws", {
      region: sharedConfig.aws.region,
    });

    // --- Backend for env-specific state
    new S3Backend(this, {
      bucket: sharedConfig.terraform.backend.bucket,
      key: `${envConfig.environment}/react-web-client.tfstate`,
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    // --- Import DNS outputs (shared stack)
    const dnsState = new DataTerraformRemoteStateS3(this, "dns_state", {
      bucket: sharedConfig.terraform.backend.bucket,
      key: "dns.tfstate",
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    // --- React Web Client infra
    new EscamboReactWebClient(this, "escambo_react_web_client", {
      hostedZoneId: dnsState.get("dns_zone_id"),
      config: {
        ...envConfig,
      },
    });
  }
}
