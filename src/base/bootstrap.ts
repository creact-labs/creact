import { Construct } from "constructs";
import { ResourceGroup } from "../../.gen/providers/azurerm/resource-group";
import { DnsZone } from "../../.gen/providers/azurerm/dns-zone";
import { TerraformOutput } from "cdktf";
import { EnvironmentConfig } from "../../config";

export interface BootstrapProps {
  config: EnvironmentConfig;
}

export class Bootstrap extends Construct {
  public readonly resourceGroup: ResourceGroup;
  public readonly dnsZone: DnsZone;

  constructor(scope: Construct, id: string, props: BootstrapProps) {
    super(scope, id);

    const { region, resourceGroupName } = props.config.azure;
    const { customDomain } = props.config.domains;

    this.resourceGroup = new ResourceGroup(this, "rg", {
      name: resourceGroupName,
      location: region,
    });

    this.dnsZone = new DnsZone(this, "dns_zone", {
      name: customDomain,
      resourceGroupName: this.resourceGroup.name,
    });

    new TerraformOutput(this, "resource_group_name", { value: this.resourceGroup.name });
    new TerraformOutput(this, "dns_zone_name", { value: this.dnsZone.name });
    new TerraformOutput(this, "dns_name_servers", {
      value: this.dnsZone.nameServers,
    });
  }
}
