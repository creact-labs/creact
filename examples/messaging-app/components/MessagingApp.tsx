/**
 * Main Messaging App Component
 * 
 * Orchestrates all infrastructure layers for the distributed messaging platform.
 * This is the root component that composes all other layers.
 * 
 * @jsx CReact.createElement
 * @jsxFrag CReact.Fragment
 */

import { CReact } from '../../../src/jsx';
import { InfraConfigContext } from '../contexts';
import { DatabaseLayer } from './DatabaseLayer';
import { MessagingLayer } from './MessagingLayer';
import { StorageLayer } from './StorageLayer';
import { NetworkLayer } from './NetworkLayer';
import { ComputeLayer } from './ComputeLayer';
import { SecurityLayer } from './SecurityLayer';
import { MonitoringLayer } from './MonitoringLayer';

export function MessagingApp() {
  // Define infrastructure configuration
  // In production, this would come from environment variables or config files
  const infraConfig = {
    environment: (process.env.ENVIRONMENT as 'dev' | 'staging' | 'prod') || 'dev',
    region: process.env.AWS_REGION || 'us-east-1',
    domain: process.env.DOMAIN || 'messaging-app.example.com',
    enableMonitoring: process.env.ENABLE_MONITORING !== 'false',
    enableBackups: process.env.ENABLE_BACKUPS !== 'false',
  };
  
  return (
    <InfraConfigContext.Provider value={infraConfig}>
      {/* 
        Infrastructure layers are composed hierarchically.
        Context providers wrap their children, making outputs available downstream.
        This creates a dependency graph: Security → Database → Messaging → Network → Compute
      */}
      
      <SecurityLayer>
        <DatabaseLayer>
          <MessagingLayer>
            <StorageLayer />
            
            <NetworkLayer>
              <ComputeLayer />
            </NetworkLayer>
            
            <MonitoringLayer />
          </MessagingLayer>
        </DatabaseLayer>
      </SecurityLayer>
    </InfraConfigContext.Provider>
  );
}
