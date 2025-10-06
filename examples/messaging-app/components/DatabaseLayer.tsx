/**
 * Database Layer Component
 * 
 * Manages all database infrastructure for the messaging app.
 * Uses useInstance, useState, and useContext hooks.
 * 
 * @jsx CReact.createElement
 * @jsxFrag CReact.Fragment
 */

import { CReact } from '../../../src/jsx';
import { useInstance } from '../../../src/hooks/useInstance';
import { useState } from '../../../src/hooks/useState';
import { useContext } from '../../../src/hooks/useContext';
import { PostgresDatabase, RedisCluster, ElasticsearchCluster } from '../constructs';
import { InfraConfigContext, DatabaseContext } from '../contexts';

interface DatabaseLayerProps {
  children?: any;
}

export function DatabaseLayer({ children }: DatabaseLayerProps) {
  // Get shared configuration from context
  const config = useContext(InfraConfigContext);
  
  // State for database URLs (will be populated after deployment)
  const [postgresUrl, setPostgresUrl] = useState<string>();
  const [redisUrl, setRedisUrl] = useState<string>();
  const [elasticsearchUrl, setElasticsearchUrl] = useState<string>();
  
  // Create PostgreSQL database for persistent storage
  const postgres = useInstance(PostgresDatabase, {
    key: 'main-db',
    name: `messaging-db-${config.environment}`,
    version: '14.5',
    storage: config.environment === 'prod' ? '500GB' : '100GB',
    replicas: config.environment === 'prod' ? 3 : 1,
  });
  
  // Create Redis cluster for caching and real-time features
  const redis = useInstance(RedisCluster, {
    key: 'cache',
    name: `messaging-cache-${config.environment}`,
    nodes: config.environment === 'prod' ? 6 : 3,
    memory: config.environment === 'prod' ? '16GB' : '4GB',
    evictionPolicy: 'allkeys-lru',
  });
  
  // Create Elasticsearch for message search
  const elasticsearch = useInstance(ElasticsearchCluster, {
    key: 'search',
    name: `messaging-search-${config.environment}`,
    nodes: config.environment === 'prod' ? 5 : 2,
    storage: config.environment === 'prod' ? '1TB' : '200GB',
    version: '8.5.0',
  });
  
  // Simulate outputs from deployed resources
  // In real deployment, these would come from the cloud provider
  if (postgres.outputs?.connectionUrl && !postgresUrl) {
    setPostgresUrl(postgres.outputs.connectionUrl as string);
  }
  
  if (redis.outputs?.endpoint && !redisUrl) {
    setRedisUrl(redis.outputs.endpoint as string);
  }
  
  if (elasticsearch.outputs?.endpoint && !elasticsearchUrl) {
    setElasticsearchUrl(elasticsearch.outputs.endpoint as string);
  }
  
  // Provide database configuration to child components
  return (
    <DatabaseContext.Provider
      value={{
        postgresUrl,
        redisUrl,
        elasticsearchUrl,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}
