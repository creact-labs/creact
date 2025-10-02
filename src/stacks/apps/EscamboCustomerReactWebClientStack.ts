import { Construct } from "constructs";
import { TerraformStack, S3Backend, DataTerraformRemoteStateS3 } from "cdktf";
import { AwsProvider } from "@gen/providers/aws/provider";

import { EnvironmentConfig, sharedConfig } from "@config";
import { DnsConstruct, ReactWebClientConstruct } from "@src/constructs";

export interface EscamboCustomerReactWebClientStackProps {
  config: EnvironmentConfig;
}

export class EscamboCustomerReactWebClientStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: EscamboCustomerReactWebClientStackProps) {
    super(scope, id);

    const envConfig = props.config;

    new AwsProvider(this, "aws", {
      region: sharedConfig.aws.region,
    });

    new S3Backend(this, {
      bucket: sharedConfig.terraform.backend.bucket,
      key: `${envConfig.environment}/customer-react-web-client.tfstate`,
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

    new ReactWebClientConstruct(this, "customer_react_web_client", {
      hostedZoneId: dns.dnsZoneId,
      config: envConfig,
      appType: "customer",
    });
  }
}
