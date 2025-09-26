import { Construct } from "constructs";
import { StorageAccount } from "../../.gen/providers/azurerm/storage-account";
import { StorageAccountStaticWebsiteA } from "../../.gen/providers/azurerm/storage-account-static-website";
import { DnsCnameRecord } from "../../.gen/providers/azurerm/dns-cname-record";
import { TerraformOutput } from "cdktf";
import { EnvironmentConfig } from "../../config";

export interface ReactWebClientProps {
  rgName: string;
  dnsZoneName: string;
  config: EnvironmentConfig;
}

export class ReactWebClient extends Construct {
  constructor(scope: Construct, id: string, props: ReactWebClientProps) {
    super(scope, id);

    const { rgName, dnsZoneName, config } = props;

    const name = config.clients.reactWebClient.staticSiteName;
    const { customDomain } = config.domains;
    const location = config.azure.region;

    const storage = new StorageAccount(this, "storage", {
      name: name.replace(/-/g, ""),
      resourceGroupName: rgName,
      location,
      accountTier: "Standard",
      accountReplicationType: "LRS",
    });

    new StorageAccountStaticWebsiteA(this, "website", {
      storageAccountId: storage.id,
      indexDocument: "index.html",
      error404Document: "index.html",
    });

    new DnsCnameRecord(this, "cname_record", {
      name: config.environment,
      zoneName: dnsZoneName,
      resourceGroupName: rgName,
      ttl: 3600,
      record: storage.primaryWebHost,
    });

    new TerraformOutput(this, "storage_hostname", {
      value: storage.primaryWebHost,
    });

    new TerraformOutput(this, "site_url", {
      value: `https://${customDomain}`,
    });
  }
}
