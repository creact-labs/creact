/**
 * Network Layer Component
 * 
 * Manages load balancers, API gateways, and CDN.
 * Demonstrates complex context dependencies.
 * 
 * @jsx CReact.createElement
 * @jsxFrag CReact.Fragment
 */

import { CReact } from '../../../src/jsx';
import { useInstance } from '../../../src/hooks/useInstance';
import { useState } from '../../../src/hooks/useState';
import { useContext } from '../../../src/hooks/useContext';
import { LoadBalancer, ApiGateway, CloudFront } from '../constructs';
import { InfraConfigContext, NetworkContext } from '../contexts';

interface NetworkLayerProps {
  children?: any;
}

export function NetworkLayer({ children }: NetworkLayerProps) {
  const config = useContext(InfraConfigContext);
  
  // State for network endpoints
  const [loadBalancerUrl, setLoadBalancerUrl] = useState<string>();
  const [apiGatewayUrl, setApiGatewayUrl] = useState<string>();
  const [cdnUrl, setCdnUrl] = useState<string>();
  
  // Application Load Balancer for HTTP traffic
  const appLoadBalancer = useInstance(LoadBalancer, {
    key: 'app-lb',
    name: `messaging-alb-${config.environment}`,
    type: 'application',
    port: 443,
    healthCheck: {
      path: '/health',
      interval: 30,
    },
  });
  
  // Network Load Balancer for WebSocket traffic
  const wsLoadBalancer = useInstance(LoadBalancer, {
    key: 'ws-lb',
    name: `messaging-ws-lb-${config.environment}`,
    type: 'network',
    port: 443,
    healthCheck: {
      path: '/ws/health',
      interval: 10,
    },
  });
  
  // API Gateway for serverless functions
  const apiGateway = useInstance(ApiGateway, {
    key: 'api-gateway',
    name: `messaging-apigw-${config.environment}`,
    stage: config.environment,
    cors: true,
    throttle: {
      rateLimit: config.environment === 'prod' ? 10000 : 1000,
      burstLimit: config.environment === 'prod' ? 5000 : 500,
    },
  });
  
  // CloudFront CDN for static assets and media
  const cdn = useInstance(CloudFront, {
    key: 'cdn',
    name: `messaging-cdn-${config.environment}`,
    origins: [
      `messaging-media-${config.environment}.s3.amazonaws.com`,
      `messaging-static-${config.environment}.s3.amazonaws.com`,
    ],
    caching: {
      ttl: config.environment === 'prod' ? 86400 : 3600, // 24h prod, 1h dev
      compress: true,
    },
  });
  
  // Extract network endpoints
  if (appLoadBalancer.outputs?.dnsName && !loadBalancerUrl) {
    setLoadBalancerUrl(appLoadBalancer.outputs.dnsName as string);
  }
  
  if (apiGateway.outputs?.invokeUrl && !apiGatewayUrl) {
    setApiGatewayUrl(apiGateway.outputs.invokeUrl as string);
  }
  
  if (cdn.outputs?.distributionUrl && !cdnUrl) {
    setCdnUrl(cdn.outputs.distributionUrl as string);
  }
  
  // Provide network configuration to child components
  return (
    <NetworkContext.Provider
      value={{
        loadBalancerUrl,
        apiGatewayUrl,
        cdnUrl,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}
