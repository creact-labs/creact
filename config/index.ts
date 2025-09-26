import * as devConfig from "./dev.json";

export interface AzureConfig {
  readonly subscriptionId: string;
  readonly region: string;
  readonly resourceGroupName: string;
  readonly servicePrincipalClientId: string;
}

export interface TerraformBackendConfig {
  readonly resourceGroupName: string;
  readonly storageAccountName: string;
  readonly containerName: string;
}

export interface TerraformConfig {
  readonly backend: TerraformBackendConfig;
}

export interface ReactWebClientConfig {
  readonly staticSiteName: string;
}

export interface ClientsConfig {
  readonly reactWebClient: ReactWebClientConfig;
}

export interface DomainsConfig {
  readonly customDomain: string;
}

export interface EnvironmentConfig {
  readonly environment: string;
  readonly azure: AzureConfig;
  readonly terraform: TerraformConfig;
  readonly clients: ClientsConfig;
  readonly domains: DomainsConfig;
}

export const config = {
    dev: devConfig as EnvironmentConfig,
}

export type EnvType = 'dev';