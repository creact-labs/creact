import * as shared from "./shared/shared.json";
import * as devConfig from "./env/dev.json";
import * as qaConfig from "./env/qa.json";

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
}

export type EnvType = "dev" | "qa";

export const config: Record<EnvType, EnvironmentConfig> = {
  dev: devConfig as EnvironmentConfig,
  qa: qaConfig as EnvironmentConfig,
};

export const sharedConfig: SharedConfig = shared as SharedConfig;
