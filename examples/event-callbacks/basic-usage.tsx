/**
 * Basic CloudDOM Event Callbacks Example
 * 
 * Demonstrates how to use onDeploy, onError, and onDestroy callbacks
 * with infrastructure components. Based on the messaging app structure.
 * 
 * Usage:
 *   creact build --entry examples/event-callbacks/basic-usage.tsx
 *   creact deploy --entry examples/event-callbacks/basic-usage.tsx
 */

import { CReact } from '../../src/jsx'; // Import JSX factory for createElement
import { CReact as CReactCore } from '../../src/core/CReact';
import { useInstance } from '../../src/hooks/useInstance';
import { useState } from '../../src/hooks/useState';
import { CloudDOMEventContext, WithCloudDOMEvents } from '../../src/core/types';
import { ICloudProvider } from '../../src/providers/ICloudProvider';
import { CloudDOMNode } from '../../src/core/types';
import { DummyBackendProvider } from '../providers/DummyBackendProvider';

// Mock constructs for demonstration
class Database {
    constructor(public props: { name: string; size: string }) { }
}

class LoadBalancer {
    constructor(public props: { name: string; targets: string[] }) { }
}

class ApiGateway {
    constructor(public props: { name: string; routes: string[] }) { }
}

/**
 * Custom Cloud Provider that mocks resource outputs for event callbacks demo
 */
class EventCallbacksCloudProvider implements ICloudProvider {
    private initialized = false;

    async initialize(): Promise<void> {
        console.log('[EventCallbacksCloudProvider] Initializing...');
        this.initialized = true;
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    materialize(cloudDOM: CloudDOMNode[]): void {
        console.debug('\n=== EventCallbacksCloudProvider: Materializing with Mock Outputs ===\n');

        cloudDOM.forEach((node) => {
            this.materializeNode(node, 0);
        });

        console.debug('\n=== Materialization Complete ===\n');
    }

    private materializeNode(node: CloudDOMNode, depth: number): void {
        const indent = '  '.repeat(depth);
        console.debug(`${indent}Deploying: ${node.id} (${node.construct?.name || 'Unknown'})`);

        // Mock resource outputs based on construct type
        if (node.construct?.name === 'Database') {
            node.outputs = {
                ...node.outputs,
                connectionUrl: `postgres://localhost:5432/${node.props.name}`,
                status: 'ready',
                port: 5432,
                host: 'localhost'
            };
            console.debug(`${indent}  Mock Database Outputs:`);
            console.debug(`${indent}    connectionUrl: ${node.outputs.connectionUrl}`);
            console.debug(`${indent}    status: ${node.outputs.status}`);
        } else if (node.construct?.name === 'LoadBalancer') {
            node.outputs = {
                ...node.outputs,
                endpoint: `https://${node.props.name}.elb.amazonaws.com`,
                healthStatus: 'healthy',
                dnsName: `${node.props.name}.elb.amazonaws.com`
            };
            console.debug(`${indent}  Mock LoadBalancer Outputs:`);
            console.debug(`${indent}    endpoint: ${node.outputs.endpoint}`);
            console.debug(`${indent}    healthStatus: ${node.outputs.healthStatus}`);
        } else if (node.construct?.name === 'ApiGateway') {
            node.outputs = {
                ...node.outputs,
                apiUrl: `https://${node.props.name}.execute-api.us-east-1.amazonaws.com/prod`,
                apiKey: `api-key-${Math.random().toString(36).substr(2, 9)}`,
                stage: 'prod'
            };
            console.debug(`${indent}  Mock ApiGateway Outputs:`);
            console.debug(`${indent}    apiUrl: ${node.outputs.apiUrl}`);
            console.debug(`${indent}    apiKey: ${node.outputs.apiKey}`);
        }

        // Log props
        const propsStr = JSON.stringify(node.props || {}, null, 2);
        console.debug(`${indent}  Props: ${propsStr}`);

        // Recursively materialize children
        if (node.children && node.children.length > 0) {
            node.children.forEach((child) => {
                this.materializeNode(child, depth + 1);
            });
        }
    }

    async preDeploy(cloudDOM: CloudDOMNode[]): Promise<void> {
        console.debug('[EventCallbacksCloudProvider] preDeploy hook called');
        console.debug(`[EventCallbacksCloudProvider] Preparing to deploy ${cloudDOM.length} resources with event callbacks...`);
    }

    async postDeploy(cloudDOM: CloudDOMNode[], outputs: Record<string, any>): Promise<void> {
        console.debug('[EventCallbacksCloudProvider] postDeploy hook called');
        console.debug(`[EventCallbacksCloudProvider] Successfully deployed ${cloudDOM.length} resources`);
        console.debug(`[EventCallbacksCloudProvider] Generated ${Object.keys(outputs).length} mock outputs`);
    }

    async onError(error: Error, cloudDOM: CloudDOMNode[]): Promise<void> {
        console.error('[EventCallbacksCloudProvider] onError hook called');
        console.error(`[EventCallbacksCloudProvider] Deployment failed: ${error.message}`);
        console.error(`[EventCallbacksCloudProvider] Failed while deploying ${cloudDOM.length} resources`);
    }
}

/**
 * Database component with event callbacks
 * Event callbacks (onDeploy, onError, onDestroy) are automatically extracted by useInstance
 */
function DatabaseComponent({
    name,
    size,
    onDeploy,
    onError,
    onDestroy
}: WithCloudDOMEvents<{
    name: string;
    size: string;
}>) {
    const db = useInstance(Database, {
        name,
        size
    });

    // Set up database outputs (these will be overridden by the cloud provider)
    const [connectionUrl, setConnectionUrl] = useState<string>();
    const [status, setStatus] = useState<string>();

    // Simulate database outputs (will be replaced by real outputs from cloud provider)
    setConnectionUrl(`postgres://localhost:5432/${name}`);
    setStatus('ready');

    // Event callbacks are automatically extracted from component props
    // and attached to the CloudDOM node

    return <></>;
}

/**
 * Load balancer component with event callbacks
 * Event callbacks (onDeploy, onError) are automatically extracted by useInstance
 */
function LoadBalancerComponent({
    name,
    targets
}: {
    name: string;
    targets: string[];
}) {
    const lb = useInstance(LoadBalancer, {
        name,
        targets
    });

    // Set up load balancer outputs
    const [endpoint, setEndpoint] = useState<string>();
    const [healthStatus, setHealthStatus] = useState<string>();

    // Simulate load balancer outputs
    setEndpoint(`https://${name}.elb.amazonaws.com`);
    setHealthStatus('healthy');

    return <></>;
}

/**
 * API Gateway component with event callbacks
 * Event callbacks (onDeploy, onDestroy) are automatically extracted by useInstance
 */
function ApiGatewayComponent({
    name,
    routes
}: {
    name: string;
    routes: string[];
}) {
    const api = useInstance(ApiGateway, {
        name,
        routes
    });

    // Set up API Gateway outputs
    const [apiUrl, setApiUrl] = useState<string>();
    const [apiKey, setApiKey] = useState<string>();

    // Simulate API Gateway outputs
    setApiUrl(`https://${name}.execute-api.us-east-1.amazonaws.com/prod`);
    setApiKey('api-key-12345');

    return <></>;
}

/**
 * Main application stack with event callbacks
 */
function BasicEventCallbacksApp() {
    return (
        <>
            {/* @ts-ignore - Event callback props are extracted by useInstance hook */}
            <DatabaseComponent
                name="user-db"
                size="100GB"
                onDeploy={(ctx) => {
                    console.log(`✅ Database deployed successfully!`);
                    console.log(`   Resource ID: ${ctx.resourceId}`);
                    console.log(`   Path: ${ctx.path.join('.')}`);
                    console.log(`   Connection URL: ${ctx.outputs?.connectionUrl}`);
                    console.log(`   Status: ${ctx.outputs?.status}`);
                    console.log(`   Host: ${ctx.outputs?.host}`);
                    console.log(`   Port: ${ctx.outputs?.port}`);
                    console.log(`   Timestamp: ${new Date(ctx.timestamp).toISOString()}`);
                }}
                onError={(ctx, error) => {
                    console.error(`❌ Database deployment failed!`);
                    console.error(`   Resource ID: ${ctx.resourceId}`);
                    console.error(`   Error: ${error.message}`);

                    // Could send alert to monitoring system
                    // alerting.sendAlert('database-deployment-failed', { resourceId: ctx.resourceId, error });
                }}
                onDestroy={(ctx) => {
                    console.log(`🗑️ Database destroyed`);
                    console.log(`   Resource ID: ${ctx.resourceId}`);

                    // Could trigger backup or cleanup
                    // backup.createFinalBackup(ctx.resourceId);
                }}
            />

            {/* @ts-ignore - Event callback props are extracted by useInstance hook */}
            <LoadBalancerComponent
                name="api-lb"
                targets={['api-1', 'api-2', 'api-3']}
                onDeploy={(ctx) => {
                    console.log(`✅ Load balancer deployed: ${ctx.resourceId}`);
                    console.log(`   Endpoint: ${ctx.outputs?.endpoint}`);
                    console.log(`   Health Status: ${ctx.outputs?.healthStatus}`);
                    console.log(`   DNS Name: ${ctx.outputs?.dnsName}`);

                    // Could register with service discovery
                    // serviceDiscovery.register(ctx.resourceId, ctx.outputs?.endpoint);
                }}
                onError={(ctx, error) => {
                    console.error(`❌ Load balancer failed: ${error.message}`);

                    // Could fallback to alternative configuration
                    // fallback.activateBackupLoadBalancer();
                }}
            />

            {/* @ts-ignore - Event callback props are extracted by useInstance hook */}
            <ApiGatewayComponent
                name="main-api"
                routes={['/users', '/posts', '/comments']}
                onDeploy={(ctx) => {
                    console.log(`✅ API Gateway deployed: ${ctx.resourceId}`);
                    console.log(`   API URL: ${ctx.outputs?.apiUrl}`);
                    console.log(`   API Key: ${ctx.outputs?.apiKey}`);
                    console.log(`   Stage: ${ctx.outputs?.stage}`);
                    console.log(`   Available routes: ${ctx.props.routes.join(', ')}`);

                    // Could update DNS records
                    // dns.updateRecord('api.example.com', ctx.outputs?.apiUrl);
                }}
                onDestroy={(ctx) => {
                    console.log(`🗑️ API Gateway destroyed: ${ctx.resourceId}`);

                    // Could clean up DNS records
                    // dns.deleteRecord('api.example.com');
                }}
            />
        </>
    );
}

// Configure CReact providers (singleton pattern, like ReactDOM)
CReactCore.cloudProvider = new EventCallbacksCloudProvider();
CReactCore.backendProvider = new DummyBackendProvider();

// Optional: Configure retry policies
CReactCore.retryPolicy = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    timeout: 300000,
};

// Optional: Configure async timeout
CReactCore.asyncTimeout = 600000; // 10 minutes

// Render to CloudDOM (like ReactDOM.render)
// Now we can use JSX syntax directly!
const stackName = process.env.STACK_NAME || 'event-callbacks-stack';
export default CReactCore.renderCloudDOM(<BasicEventCallbacksApp />, stackName);