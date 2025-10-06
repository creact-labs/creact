/**
 * Messaging App Entry Point
 * 
 * This is the main entry point for the distributed messaging infrastructure.
 * Similar to React apps, we configure and render the app in one place.
 * 
 * Usage:
 *   creact build --entry examples/messaging-app/index.tsx
 *   creact deploy --entry examples/messaging-app/index.tsx
 */

import { CReact } from '../../src/core/CReact';
import { MessagingApp } from './components/MessagingApp';
import { DummyCloudProvider } from '../../src/providers/DummyCloudProvider';
import { DummyBackendProvider } from '../../src/providers/DummyBackendProvider';

// Configure CReact providers (singleton pattern, like ReactDOM)
CReact.cloudProvider = new DummyCloudProvider();
CReact.backendProvider = new DummyBackendProvider();

// Optional: Configure retry policies
CReact.retryPolicy = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  timeout: 300000,
};

// Optional: Configure async timeout
CReact.asyncTimeout = 600000; // 10 minutes

// Render to CloudDOM (like ReactDOM.render)
// Now we can use JSX syntax directly!
const stackName = process.env.STACK_NAME || 'messaging-app-dev';
export default CReact.renderCloudDOM(<MessagingApp />, stackName);
