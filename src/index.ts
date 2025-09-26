import { App } from "cdktf";
import { config } from "../config";
import { BootstrapStack } from "./stacks/bootstrap";
import { EscamboReactWebClientStack } from "./stacks/escambo-react-web-client";

const app = new App();
const envConfig = config.dev;

new BootstrapStack(app, "bootstrap", { config: envConfig });

new EscamboReactWebClientStack(app, "escambo-react-web-client", { config: envConfig });

app.synth();
