# Distributed Messaging App Infrastructure

This example demonstrates a complete, production-ready infrastructure for a distributed messaging platform (similar to WhatsApp) built with CReact.

## Architecture Overview

The messaging app consists of 7 infrastructure layers:

### 1. **Security Layer**
- Vault cluster for secrets management
- SSL/TLS certificates for secure communication
- Encryption keys for data at rest

### 2. **Database Layer**
- PostgreSQL for persistent message storage
- Redis cluster for caching and real-time features
- Elasticsearch for message search and analytics

### 3. **Messaging Layer**
- Kafka cluster for real-time message streaming
- SQS queues for async job processing
- SNS topics for push notifications

### 4. **Storage Layer**
- S3 buckets for media files (images, videos, attachments)
- S3 buckets for static assets
- S3 buckets for backups
- EFS for shared file storage

### 5. **Network Layer**
- Application Load Balancer for HTTP traffic
- Network Load Balancer for WebSocket connections
- API Gateway for serverless functions
- CloudFront CDN for global content delivery

### 6. **Compute Layer**
- Kubernetes deployments for core services:
  - API service (REST API)
  - WebSocket service (real-time messaging)
  - Message worker (background processing)
- Lambda functions for:
  - Media processing (images/videos)
  - Push notifications
  - Analytics processing

### 7. **Monitoring Layer**
- Prometheus for metrics collection
- Grafana dashboards for visualization
- Custom dashboards for:
  - System overview
  - API performance
  - WebSocket connections
  - Message throughput
  - Database health
  - Kafka metrics
  - Error rates
  - User analytics

## Key Features Demonstrated

### All Three Hooks
- **useInstance**: Creates infrastructure resources
- **useState**: Manages outputs and state between components
- **useContext**: Shares configuration across layers

### Context Propagation
- `InfraConfigContext`: Environment configuration (dev/staging/prod)
- `DatabaseContext`: Database connection strings
- `MessagingContext`: Message queue endpoints
- `NetworkContext`: Load balancer and CDN URLs
- `SecurityContext`: Certificates and encryption keys

### Complex Dependencies
- Compute layer depends on database and messaging contexts
- Network layer provides endpoints to compute layer
- Monitoring layer observes all other layers

### Environment-Aware Configuration
- Different resource sizes for dev/staging/prod
- Conditional monitoring deployment
- Configurable backup policies

## File Structure

```
messaging-app/
├── index.tsx                    # Entry point with CReact configuration
├── constructs.ts               # Infrastructure construct definitions
├── contexts.ts                 # Shared context definitions
├── components/
│   ├── MessagingApp.tsx        # Root component
│   ├── SecurityLayer.tsx       # Security infrastructure
│   ├── DatabaseLayer.tsx       # Database infrastructure
│   ├── MessagingLayer.tsx      # Message queue infrastructure
│   ├── StorageLayer.tsx        # Object storage infrastructure
│   ├── NetworkLayer.tsx        # Load balancers and CDN
│   ├── ComputeLayer.tsx        # Application services
│   └── MonitoringLayer.tsx     # Observability infrastructure
└── README.md                   # This file
```

## Usage

### Build CloudDOM

```bash
# Build with default (dev) environment
creact build --entry examples/messaging-app/index.tsx

# Build for production
STACK_NAME=messaging-app-prod creact build --entry examples/messaging-app/index.tsx

# Build with verbose output
creact build --entry examples/messaging-app/index.tsx --verbose
```

### Deploy Infrastructure

```bash
# Deploy to dev environment
creact deploy --entry examples/messaging-app/index.tsx

# Deploy to production
STACK_NAME=messaging-app-prod creact deploy --entry examples/messaging-app/index.tsx

# Deploy with auto-approval (CI/CD)
creact deploy --config examples/messaging-app/creact.config.ts --auto-approve
```

### Preview Changes

```bash
# Show diff before deploying
creact plan --config examples/messaging-app/creact.config.ts
```

## Environment Variables

Configure the deployment using environment variables:

```bash
# Environment (dev, staging, prod)
export ENVIRONMENT=dev

# AWS region
export AWS_REGION=us-east-1

# Domain name
export DOMAIN=messaging-app.example.com

# Feature flags
export ENABLE_MONITORING=true
export ENABLE_BACKUPS=true

# Stack name
export STACK_NAME=messaging-app-dev

# Logging
export VERBOSE=true
export DEBUG=false
```

## Resource Outputs

After deployment, resources produce outputs that are accessible via context:

### Database Outputs
- `postgresUrl`: PostgreSQL connection string
- `redisUrl`: Redis cluster endpoint
- `elasticsearchUrl`: Elasticsearch endpoint

### Messaging Outputs
- `kafkaBrokers`: Kafka broker list
- `sqsQueueUrl`: SQS queue URL
- `snsTopicArn`: SNS topic ARN

### Network Outputs
- `loadBalancerUrl`: Application load balancer DNS
- `apiGatewayUrl`: API Gateway invoke URL
- `cdnUrl`: CloudFront distribution URL

### Security Outputs
- `vaultUrl`: Vault cluster URL
- `certificateArn`: SSL certificate ARN
- `encryptionKey`: KMS encryption key ARN

## Scaling Configuration

The infrastructure automatically scales based on environment:

| Resource | Dev | Staging | Production |
|----------|-----|---------|------------|
| PostgreSQL replicas | 1 | 2 | 3 |
| Redis nodes | 3 | 4 | 6 |
| Elasticsearch nodes | 2 | 3 | 5 |
| Kafka brokers | 3 | 4 | 5 |
| API service replicas | 3 | 5 | 10 |
| WebSocket replicas | 4 | 8 | 15 |
| Worker replicas | 2 | 4 | 8 |

## Cost Optimization

- **Dev environment**: Minimal resources, no backups, short retention
- **Staging environment**: Medium resources, limited backups
- **Production environment**: Full redundancy, long retention, automated backups

## Next Steps

1. Replace `DummyCloudProvider` with real cloud providers:
   - `AwsCloudProvider` for AWS
   - `ProviderRouter` for multi-cloud

2. Replace `DummyBackendProvider` with persistent state backend:
   - `S3BackendProvider` for AWS S3
   - `PostgresBackendProvider` for PostgreSQL

3. Add real construct implementations for your cloud provider

4. Configure CI/CD pipeline for automated deployments

5. Set up monitoring and alerting

## Learn More

This example demonstrates:
- ✅ Complex multi-layer infrastructure
- ✅ All three CReact hooks (useInstance, useState, useContext)
- ✅ Context propagation between components
- ✅ Environment-aware configuration
- ✅ Realistic resource outputs
- ✅ Production-ready architecture patterns
