import * as shared from "./shared.json";
import * as devConfig from "./dev.json";

export interface SharedConfig {
  baseDomain: string;
  aws: {
    region: string;
  };
  terraform: {
    backend: {
      bucket: string;
      dynamodbTable: string;
    };
  };
}

export interface EnvironmentConfig {
  environment: string;
  clients: {
    reactWebClient: {
      staticSiteName: string;
    };
  };
}

export type EnvType = "dev";

export const config: Record<EnvType, EnvironmentConfig> = {
  dev: devConfig as EnvironmentConfig
};

export const sharedConfig: SharedConfig = shared as SharedConfig;
