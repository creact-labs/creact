import { Construct } from "constructs";
import { TerraformStack, S3Backend, DataTerraformRemoteStateS3 } from "cdktf";
import { AwsProvider } from "@gen/providers/aws/provider";

import { EnvironmentConfig, sharedConfig } from "@config";
import { ReactWebClientConstruct, DnsConstruct } from "@src/constructs";

export interface EscamboProviderReactWebClientStackProps {
  config: EnvironmentConfig;
}

export class EscamboProviderReactWebClientStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: EscamboProviderReactWebClientStackProps) {
    super(scope, id);

    const envConfig = props.config;

    new AwsProvider(this, "aws", {
      region: sharedConfig.aws.region,
    });

    new S3Backend(this, {
      bucket: sharedConfig.terraform.backend.bucket,
      key: `${envConfig.environment}/provider-react-web-client.tfstate`,
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    const dnsState = new DataTerraformRemoteStateS3(this, "dns_state", {
      bucket: sharedConfig.terraform.backend.bucket,
      key: "dns.tfstate",
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    const dns = DnsConstruct.fromRemoteState(dnsState);

    new ReactWebClientConstruct(this, "provider_react_web_client", {
      hostedZoneId: dns.dnsZoneId,
      config: envConfig,
      appType: "provider",
    });
  }
}
