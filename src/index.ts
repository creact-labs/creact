import { App } from "cdktf";
import { config } from "../config";
import { EscamboCoreJavaServiceStack, EscamboDnsStack, EscamboEcrStack, EscamboProviderReactWebClientStack, EscamboReactWebClientStack } from "./stacks";
import { EscamboWidgetsJavaServiceStack } from "./stacks/apps/EscamboWidgetsJavaServiceStack";


const app = new App();

new EscamboDnsStack(app, "escambo-dns");
// new EscamboNetworkStack(app, "escambo-network")

Object.values(config).forEach((envConfig: any) => {
  const env = envConfig.environment;

  new EscamboEcrStack(app, `escambo-${env}-ecr`, {
    config: envConfig
  });

  new EscamboReactWebClientStack(app, `escambo-${env}-customer-react-web-client`, {
    config: envConfig
  });
  new EscamboProviderReactWebClientStack(app, `escambo-${env}-provider-react-web-client`, {
    config: envConfig
  });

  new EscamboCoreJavaServiceStack(app, `escambo-${env}-core-java-service`, { config: envConfig });
  new EscamboWidgetsJavaServiceStack(app, `escambo-${env}-widgets-java-service`, { config: envConfig });
});

app.synth();