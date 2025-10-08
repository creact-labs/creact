/**
 * Messaging Layer Component
 * 
 * Manages message queue and event streaming infrastructure.
 * Demonstrates complex state management and context usage.
 * 
 * @jsx CReact.createElement
 * @jsxFrag CReact.Fragment
 */

import { CReact } from '../../../src/jsx';
import { useInstance } from '../../../src/hooks/useInstance';
import { useState } from '../../../src/hooks/useState';
import { useContext } from '../../../src/hooks/useContext';
import { useEffect } from '../../../src/hooks/useEffect';
import { KafkaCluster, SQSQueue, SNSTopic } from '../constructs';
import { InfraConfigContext, MessagingContext } from '../contexts';

interface MessagingLayerProps {
  children?: any;
}

export function MessagingLayer({ children }: MessagingLayerProps) {
  const config = useContext(InfraConfigContext);

  // State for messaging endpoints (populated after deployment)
  const [kafkaBrokers, setKafkaBrokers] = useState<string[]>();
  const [sqsQueueUrl, setSqsQueueUrl] = useState<string>();
  const [snsTopicArn, setSnsTopicArn] = useState<string>();

  // Kafka cluster for real-time message streaming
  const kafka = useInstance(KafkaCluster, {
    key: 'message-stream',
    name: `messaging-kafka-${config.environment}`,
    brokers: config.environment === 'prod' ? 5 : 3,
    version: '3.4.0',
    topics: [
      {
        name: 'messages',
        partitions: config.environment === 'prod' ? 12 : 4,
        replication: config.environment === 'prod' ? 3 : 2,
      },
      {
        name: 'user-events',
        partitions: config.environment === 'prod' ? 8 : 3,
        replication: config.environment === 'prod' ? 3 : 2,
      },
      {
        name: 'notifications',
        partitions: config.environment === 'prod' ? 6 : 2,
        replication: config.environment === 'prod' ? 3 : 2,
      },
      {
        name: 'analytics',
        partitions: config.environment === 'prod' ? 10 : 3,
        replication: config.environment === 'prod' ? 3 : 2,
      },
    ],
  });

  // SQS queue for async job processing
  const jobQueue = useInstance(SQSQueue, {
    key: 'job-queue',
    name: `messaging-jobs-${config.environment}`,
    visibilityTimeout: 300, // 5 minutes
    messageRetention: 1209600, // 14 days
    deadLetterQueue: true,
  });

  // SQS queue for media processing
  const mediaQueue = useInstance(SQSQueue, {
    key: 'media-queue',
    name: `messaging-media-${config.environment}`,
    visibilityTimeout: 900, // 15 minutes
    messageRetention: 604800, // 7 days
    deadLetterQueue: true,
  });

  // SNS topic for push notifications
  const notificationTopic = useInstance(SNSTopic, {
    key: 'notifications',
    name: `messaging-notifications-${config.environment}`,
    displayName: 'Message Notifications',
    subscriptions: [
      {
        protocol: 'https',
        endpoint: `https://api.${config.domain}/webhooks/notifications`,
      },
    ],
  });

  // useEffect runs after deployment to populate state with real resource outputs
  useEffect(() => {
    if (kafka.outputs?.brokers) {
      setKafkaBrokers(kafka.outputs.brokers as string[]);
    }
  }, []);

  useEffect(() => {
    if (jobQueue.outputs?.queueUrl) {
      setSqsQueueUrl(jobQueue.outputs.queueUrl as string);
    }
  }, [jobQueue.outputs?.queueUrl]);

  useEffect(() => {
    if (notificationTopic.outputs?.topicArn) {
      setSnsTopicArn(notificationTopic.outputs.topicArn as string);
    }
  }, [notificationTopic.outputs?.topicArn]);

  // Provide messaging configuration to child components
  return (
    <MessagingContext.Provider
      value={{
        kafkaBrokers,
        sqsQueueUrl,
        snsTopicArn,
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
}
