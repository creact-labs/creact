import { App } from "cdktf";
import { config } from "../config";
import { EscamboCoreJavaServiceStack, EscamboDnsStack, EscamboEcrStack, EscamboNetworkStack, EscamboProviderReactWebClientStack, EscamboCustomerReactWebClientStack, EscamboSecretsManagerStack } from "./stacks";
import { EscamboWidgetsJavaServiceStack } from "./stacks/apps/EscamboWidgetsJavaServiceStack";
import { EscamboGraphqlOrchestratorNodejsServiceStack } from "./stacks/apps/EscamboGraphqlOrchestratorNodejsServiceStack";


const app = new App();

new EscamboDnsStack(app, "escambo-dns");
new EscamboNetworkStack(app, "escambo-network")

Object.values(config).forEach((envConfig: any) => {
  const env = envConfig.environment;

  new EscamboEcrStack(app, `escambo-${env}-ecr`, {
    config: envConfig
  });

  new EscamboSecretsManagerStack(app, `escambo-${env}-secrets-manager`, {
    config: envConfig
  });

  new EscamboCustomerReactWebClientStack(app, `escambo-${env}-customer-react-web-client`, {
    config: envConfig
  });
  new EscamboProviderReactWebClientStack(app, `escambo-${env}-provider-react-web-client`, {
    config: envConfig
  });

  new EscamboCoreJavaServiceStack(app, `escambo-${env}-core-java-service`, { config: envConfig });
  new EscamboWidgetsJavaServiceStack(app, `escambo-${env}-widgets-java-service`, { config: envConfig });

  new EscamboGraphqlOrchestratorNodejsServiceStack(app, `escambo-${env}-graphql-orchestrator-nodejs-service`, { config: envConfig });
});

app.synth();