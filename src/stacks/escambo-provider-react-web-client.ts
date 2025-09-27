import { Construct } from "constructs";
import { TerraformStack, S3Backend, DataTerraformRemoteStateS3 } from "cdktf";
import { AwsProvider } from "../../.gen/providers/aws/provider";
import { ReactWebClient } from "../constructs/react-web-client";
import { EnvironmentConfig, sharedConfig } from "../../config";

export interface EscamboProviderReactWebClientStackProps {
  config: EnvironmentConfig;
}

export class EscamboProviderReactWebClientStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: EscamboProviderReactWebClientStackProps) {
    super(scope, id);

    const envConfig = props.config;

    // --- AWS Provider ---
    new AwsProvider(this, "aws", {
      region: sharedConfig.aws.region,
    });

    // --- Backend ---
    new S3Backend(this, {
      bucket: sharedConfig.terraform.backend.bucket,
      key: `${envConfig.environment}/provider-react-web-client.tfstate`,
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    // --- Import DNS state ---
    const dnsState = new DataTerraformRemoteStateS3(this, "dns_state", {
      bucket: sharedConfig.terraform.backend.bucket,
      key: "dns.tfstate",
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    // --- Provider React Web Client ---
    new ReactWebClient(this, "provider_react_web_client", {
      hostedZoneId: dnsState.get("dns_zone_id"),
      config: envConfig,
      appType: 'provider',
    });
  }
}