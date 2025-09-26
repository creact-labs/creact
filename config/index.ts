import * as devConfig from "./dev.json";

export interface EnvironmentConfig {
  environment: string;
  aws: {
    region: string;
    profile: string;
  };
  terraform: {
    backend: {
      bucket: string;
      dynamodbTable: string;
    };
  };
  clients: {
    reactWebClient: {
      staticSiteName: string;
    };
  };
  domains: {
    customDomain: string;
  };
}
export const config = {
    dev: devConfig as EnvironmentConfig,
}

export type EnvType = 'dev';