/**
 * Compute Layer Component
 * 
 * Manages application services and serverless functions.
 * Consumes database and messaging contexts.
 * 
 * @jsx CReact.createElement
 * @jsxFrag CReact.Fragment
 */

import { CReact } from '../../../src/jsx';
import { useInstance } from '../../../src/hooks/useInstance';
import { useState } from '../../../src/hooks/useState';
import { useContext } from '../../../src/hooks/useContext';
import { useEffect } from '../../../src/hooks/useEffect';
import { KubernetesDeployment, AwsLambda } from '../constructs';
import {
  InfraConfigContext,
  DatabaseContext,
  MessagingContext,
} from '../contexts';

export function ComputeLayer() {
  const config = useContext(InfraConfigContext);
  const database = useContext(DatabaseContext);
  const messaging = useContext(MessagingContext);
  
  // State for service endpoints (populated after deployment)
  const [apiServiceUrl, setApiServiceUrl] = useState<string>('');
  const [websocketServiceUrl, setWebsocketServiceUrl] = useState<string>('');
  const [workerServiceUrl, setWorkerServiceUrl] = useState<string>('');
  
  // Build environment variables from context
  const baseEnv = {
    ENVIRONMENT: config.environment,
    REGION: config.region,
    POSTGRES_URL: database.postgresUrl || '',
    REDIS_URL: database.redisUrl || '',
    ELASTICSEARCH_URL: database.elasticsearchUrl || '',
    KAFKA_BROKERS: messaging.kafkaBrokers?.join(',') || '',
    SQS_QUEUE_URL: messaging.sqsQueueUrl || '',
    SNS_TOPIC_ARN: messaging.snsTopicArn || '',
  };
  
  // API Service - REST API for messaging
  const apiService = useInstance(KubernetesDeployment, {
    key: 'api-service',
    name: `messaging-api-${config.environment}`,
    image: `messaging-api:${config.environment}`,
    replicas: config.environment === 'prod' ? 10 : 3,
    port: 8080,
    env: {
      ...baseEnv,
      SERVICE_NAME: 'api',
      LOG_LEVEL: config.environment === 'prod' ? 'info' : 'debug',
    },
    resources: {
      cpu: config.environment === 'prod' ? '2000m' : '500m',
      memory: config.environment === 'prod' ? '4Gi' : '1Gi',
    },
  });
  
  // WebSocket Service - Real-time messaging
  const websocketService = useInstance(KubernetesDeployment, {
    key: 'websocket-service',
    name: `messaging-ws-${config.environment}`,
    image: `messaging-websocket:${config.environment}`,
    replicas: config.environment === 'prod' ? 15 : 4,
    port: 8081,
    env: {
      ...baseEnv,
      SERVICE_NAME: 'websocket',
      WS_HEARTBEAT_INTERVAL: '30000',
      WS_MAX_CONNECTIONS: config.environment === 'prod' ? '10000' : '1000',
    },
    resources: {
      cpu: config.environment === 'prod' ? '1500m' : '500m',
      memory: config.environment === 'prod' ? '3Gi' : '1Gi',
    },
  });
  
  // Message Worker Service - Background message processing
  const messageWorker = useInstance(KubernetesDeployment, {
    key: 'message-worker',
    name: `messaging-worker-${config.environment}`,
    image: `messaging-worker:${config.environment}`,
    replicas: config.environment === 'prod' ? 8 : 2,
    port: 8082,
    env: {
      ...baseEnv,
      SERVICE_NAME: 'worker',
      WORKER_CONCURRENCY: config.environment === 'prod' ? '50' : '10',
      BATCH_SIZE: '100',
    },
    resources: {
      cpu: config.environment === 'prod' ? '2000m' : '500m',
      memory: config.environment === 'prod' ? '4Gi' : '1Gi',
    },
  });
  
  // Media Processing Lambda - Process images/videos
  const mediaProcessor = useInstance(AwsLambda, {
    key: 'media-processor',
    name: `messaging-media-processor-${config.environment}`,
    handler: 'index.processMedia',
    runtime: 'nodejs18.x',
    memory: 3008, // Max memory for faster processing
    timeout: 900, // 15 minutes
    env: {
      ...baseEnv,
      S3_BUCKET: `messaging-media-${config.environment}`,
      MAX_IMAGE_SIZE: '10485760', // 10MB
      MAX_VIDEO_SIZE: '104857600', // 100MB
    },
  });
  
  // Notification Lambda - Send push notifications
  const notificationSender = useInstance(AwsLambda, {
    key: 'notification-sender',
    name: `messaging-notifications-${config.environment}`,
    handler: 'index.sendNotification',
    runtime: 'nodejs18.x',
    memory: 512,
    timeout: 60,
    env: {
      ...baseEnv,
      FCM_API_KEY: 'encrypted:fcm-key',
      APNS_CERT: 'encrypted:apns-cert',
    },
  });
  
  // Analytics Lambda - Process analytics events
  const analyticsProcessor = useInstance(AwsLambda, {
    key: 'analytics-processor',
    name: `messaging-analytics-${config.environment}`,
    handler: 'index.processAnalytics',
    runtime: 'python3.11',
    memory: 1024,
    timeout: 300,
    env: {
      ...baseEnv,
      ANALYTICS_BATCH_SIZE: '1000',
      ANALYTICS_FLUSH_INTERVAL: '60',
    },
  });
  
  // useEffect runs after deployment to populate state with service endpoints
  useEffect(() => {
    if (apiService.outputs?.serviceUrl) {
      setApiServiceUrl(apiService.outputs.serviceUrl as string);
    }
  }, [apiService.outputs?.serviceUrl]);
  
  useEffect(() => {
    if (websocketService.outputs?.serviceUrl) {
      setWebsocketServiceUrl(websocketService.outputs.serviceUrl as string);
    }
  }, [websocketService.outputs?.serviceUrl]);
  
  useEffect(() => {
    if (messageWorker.outputs?.serviceUrl) {
      setWorkerServiceUrl(messageWorker.outputs.serviceUrl as string);
    }
  }, [messageWorker.outputs?.serviceUrl]);
  
  // Cleanup effect example - runs before stack destruction
  useEffect(() => {
    return () => {
      console.log('Cleaning up compute resources...');
    };
  }, []);
  
  return <></>;
}
