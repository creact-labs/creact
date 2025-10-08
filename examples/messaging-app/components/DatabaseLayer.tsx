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
import { useEffect } from '../../../src/hooks/useEffect';
import { PostgresDatabase, RedisCluster, ElasticsearchCluster } from '../constructs';
import { InfraConfigContext, DatabaseContext } from '../contexts';

interface DatabaseLayerProps {
  children?: any;
}

export function DatabaseLayer({ children }: DatabaseLayerProps) {
  // Get shared configuration from context
  const config = useContext(InfraConfigContext);
  
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
  
  // State for database URLs (will be populated by useEffect after deployment)
  const [postgresUrl, setPostgresUrl] = useState<string>('');
  const [redisUrl, setRedisUrl] = useState<string>('');
  const [elasticsearchUrl, setElasticsearchUrl] = useState<string>('');
  
  // useEffect runs after deployment when real resource outputs are available
  useEffect(() => {
    if (postgres.outputs?.connectionUrl) {
      setPostgresUrl(postgres.outputs.connectionUrl as string);
    }
  }, [postgres.outputs?.connectionUrl]);
  
  useEffect(() => {
    if (redis.outputs?.endpoint) {
      setRedisUrl(redis.outputs.endpoint as string);
    }
  }, [redis.outputs?.endpoint]);
  
  useEffect(() => {
    // For testing - this will change the output after deployment
    setElasticsearchUrl("POST_DEPLOY_VALUE_" + Date.now());
  }, []); // Empty deps = run once after first deployment
  
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
