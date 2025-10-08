/**
 * Monitoring Layer Component
 * 
 * Manages observability infrastructure (metrics, logs, dashboards).
 * 
 * @jsx CReact.createElement
 * @jsxFrag CReact.Fragment
 */

import { CReact } from '../../../src/jsx';
import { useInstance } from '../../../src/hooks/useInstance';
import { useState } from '../../../src/hooks/useState';
import { useContext } from '../../../src/hooks/useContext';
import { useEffect } from '../../../src/hooks/useEffect';
import { PrometheusServer, GrafanaDashboard } from '../constructs';
import { InfraConfigContext, DatabaseContext, MessagingContext } from '../contexts';

export function MonitoringLayer() {
  const config = useContext(InfraConfigContext);
  const database = useContext(DatabaseContext);
  const messaging = useContext(MessagingContext);
  
  // State for monitoring endpoints (populated after deployment)
  const [prometheusUrl, setPrometheusUrl] = useState<string>('');
  const [grafanaUrl, setGrafanaUrl] = useState<string>('');
  
  // Only deploy monitoring in environments where it's enabled
  if (!config.enableMonitoring) {
    return <></>;
  }
  
  // Prometheus server for metrics collection
  const prometheus = useInstance(PrometheusServer, {
    key: 'metrics',
    name: `messaging-prometheus-${config.environment}`,
    retention: config.environment === 'prod' ? '90d' : '30d',
    scrapeInterval: '15s',
  });
  
  // Grafana dashboards for visualization
  const grafana = useInstance(GrafanaDashboard, {
    key: 'dashboards',
    name: `messaging-grafana-${config.environment}`,
    datasources: [
      'prometheus',
      'elasticsearch',
      'postgres',
    ],
    dashboards: [
      'system-overview',
      'api-performance',
      'websocket-connections',
      'message-throughput',
      'database-health',
      'kafka-metrics',
      'error-rates',
      'user-analytics',
    ],
  });
  
  // useEffect runs after deployment to populate state with monitoring endpoints
  useEffect(() => {
    if (prometheus.outputs?.serverUrl) {
      setPrometheusUrl(prometheus.outputs.serverUrl as string);
    }
  }, [prometheus.outputs?.serverUrl]);
  
  useEffect(() => {
    if (grafana.outputs?.dashboardUrl) {
      setGrafanaUrl(grafana.outputs.dashboardUrl as string);
    }
  }, [grafana.outputs?.dashboardUrl]);
  
  return <></>;
}
