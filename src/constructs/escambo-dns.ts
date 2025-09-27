import { Construct } from "constructs";
import { Route53Zone } from "../../.gen/providers/aws/route53-zone";
import { TerraformOutput } from "cdktf";

export interface EscamboDnsProps {
  baseDomain: string;
}

export class EscamboDns extends Construct {
  public readonly dnsZone: Route53Zone;

  constructor(scope: Construct, id: string, props: EscamboDnsProps) {
    super(scope, id);

    this.dnsZone = new Route53Zone(this, "dns_zone", {
      name: props.baseDomain,
    });

    new TerraformOutput(this, "dns_zone_id", {
      value: this.dnsZone.zoneId,
    }).overrideLogicalId("dns_zone_id");

    new TerraformOutput(this, "dns_name_servers", {
      value: this.dnsZone.nameServers,
    }).overrideLogicalId("dns_name_servers");
  }
}
