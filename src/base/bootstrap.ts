import { Construct } from "constructs";
import { Route53Zone } from "../../.gen/providers/aws/route53-zone";
import { TerraformOutput } from "cdktf";
import { EnvironmentConfig } from "../../config";

export interface BootstrapProps {
  config: EnvironmentConfig;
}

export class Bootstrap extends Construct {
  public readonly dnsZone: Route53Zone;
  private readonly config: EnvironmentConfig;

  constructor(scope: Construct, id: string, props: BootstrapProps) {
    super(scope, id);

    this.config = props.config;

    const { customDomain } = this.config.domains;

    this.dnsZone = new Route53Zone(this, "dns_zone", {
      name: customDomain,
    });

    const dnsZoneIdOutput = new TerraformOutput(this, "dns_zone_id", {
      value: this.dnsZone.zoneId,
    });
    dnsZoneIdOutput.overrideLogicalId("dns_zone_id");

    const dnsNameServersOutput = new TerraformOutput(this, "dns_name_servers", {
      value: this.dnsZone.nameServers,
    });
    dnsNameServersOutput.overrideLogicalId("dns_name_servers");

  }
}
