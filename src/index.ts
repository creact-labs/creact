import { App } from "cdktf";
import { config } from "../config";
import { EscamboDnsStack } from "./stacks/escambo-dns";
import { EscamboReactWebClientStack } from "./stacks/escambo-react-web-client";

const app = new App();

new EscamboDnsStack(app, "escambo-dns");

Object.values(config).forEach((envConfig: any) => {
  const env = envConfig.environment;
  new EscamboReactWebClientStack(app, `escambo-${env}-react-web-client`, { config: envConfig });
});

app.synth();
