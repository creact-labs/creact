import { Construct } from "constructs";
import { Route53Zone } from "@gen/providers/aws/route53-zone";
import { TerraformOutput, DataTerraformRemoteStateS3 } from "cdktf";

export interface DnsConstructProps {
  baseDomain: string;
}

export interface DnsOutputs {
  dnsZoneId: string;
  dnsNameServers: string[];
}

export class DnsConstruct extends Construct {
  public readonly dnsZone: Route53Zone;

  constructor(scope: Construct, id: string, props: DnsConstructProps) {
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

  static fromRemoteState(state: DataTerraformRemoteStateS3): DnsOutputs {
    return {
      dnsZoneId: state.get("dns_zone_id") as unknown as string,
      dnsNameServers: state.get("dns_name_servers") as unknown as string[],
    };
  }
}
