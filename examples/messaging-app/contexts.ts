/**
 * Shared Contexts for Messaging App
 * 
 * Contexts allow sharing configuration and outputs between components.
 */

import { createContext } from '../../src/context/createContext';

/**
 * Infrastructure configuration context
 */
export interface InfraConfig {
  environment: 'dev' | 'staging' | 'prod';
  region: string;
  domain: string;
  enableMonitoring: boolean;
  enableBackups: boolean;
}

export const InfraConfigContext = createContext<InfraConfig>({
  environment: 'dev',
  region: 'us-east-1',
  domain: 'example.com',
  enableMonitoring: true,
  enableBackups: true,
});

/**
 * Database connection context
 */
export interface DatabaseConfig {
  postgresUrl?: string;
  redisUrl?: string;
  elasticsearchUrl?: string;
}

export const DatabaseContext = createContext<DatabaseConfig>({});

/**
 * Networking context
 */
export interface NetworkConfig {
  vpcId?: string;
  loadBalancerUrl?: string;
  apiGatewayUrl?: string;
  cdnUrl?: string;
}

export const NetworkContext = createContext<NetworkConfig>({});

/**
 * Messaging context
 */
export interface MessagingConfig {
  kafkaBrokers?: string[];
  sqsQueueUrl?: string;
  snsTopicArn?: string;
}

export const MessagingContext = createContext<MessagingConfig>({});

/**
 * Security context
 */
export interface SecurityConfig {
  vaultUrl?: string;
  certificateArn?: string;
  encryptionKey?: string;
}

export const SecurityContext = createContext<SecurityConfig>({});
