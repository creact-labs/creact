import { App } from "cdktf";
import { config } from "../config";
import { EscamboDnsStack } from "./stacks/escambo-dns";
import { EscamboReactWebClientStack } from "./stacks/escambo-react-web-client";
import { EscamboProviderReactWebClientStack } from "./stacks/escambo-provider-react-web-client";

const app = new App();

// DNS stack (shared)
new EscamboDnsStack(app, "escambo-dns");

// Environment-specific stacks
Object.values(config).forEach((envConfig: any) => {
  const env = envConfig.environment;
  
  // Main app stack
  new EscamboReactWebClientStack(app, `escambo-${env}-customer-react-web-client`, { 
    config: envConfig 
  });
  
  // Provider app stack
  new EscamboProviderReactWebClientStack(app, `escambo-${env}-provider-react-web-client`, { 
    config: envConfig 
  });
});

app.synth();