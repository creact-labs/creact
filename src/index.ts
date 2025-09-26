import { App, TerraformStack, AzurermBackend } from "cdktf";
import { Construct } from "constructs";
import { AzurermProvider } from "../.gen/providers/azurerm/provider";
import { Bootstrap } from "./base/bootstrap";
import { ReactWebClient } from "./base/react-web-client";
import { config } from "../config";

class EscamboStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AzurermProvider(this, "azurerm", {
      subscriptionId: config.dev.azure.subscriptionId,
      features: {
        resourceGroup: {
          preventDeletionIfContainsResources: false,
        },
        keyVault: {
          purgeSoftDeleteOnDestroy: true,
          recoverSoftDeletedKeyVaults: true,
        },
      },
    });

    new AzurermBackend(this, {
      resourceGroupName: config.dev.terraform.backend.resourceGroupName,
      storageAccountName: config.dev.terraform.backend.storageAccountName,
      containerName: config.dev.terraform.backend.containerName,
      key: "escambo.tfstate",
    });

    const envConfig = config.dev;

    const bootstrap = new Bootstrap(this, "bootstrap", { config: envConfig });

    new ReactWebClient(this, "escambo_react_web_client", {
      rgName: bootstrap.resourceGroup.name,
      dnsZoneName: bootstrap.dnsZone.name,
      config: envConfig,
    });
  }
}

const app = new App();
new EscamboStack(app, "escambo");
app.synth();
