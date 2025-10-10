/**
 * Reactive CReact Application - Output-Driven Re-renders
 * 
 * CReact DOES have reactivity, but only for provider outputs!
 * 
 * How it works:
 * 1. Deploy 1: Create database, outputs are empty
 * 2. Provider materializes database, populates outputs
 * 3. CReact detects output changes
 * 4. Re-render triggered automatically
 * 5. Deploy 2: API created (conditional on database output)
 * 6. Provider materializes API, populates outputs
 * 7. CReact detects output changes again
 * 8. Another re-render triggered
 * 9. Deploy 3: Monitoring created (conditional on API output)
 * 
 * This demonstrates TRUE reactive infrastructure!
 */

/// <reference path="../../src/jsx.d.ts" />

import { CReact } from '../../src/core/CReact';
import { useState } from '../../src/hooks/useState';
import { useEffect } from '../../src/hooks/useEffect';
import { useInstance } from '../../src/hooks/useInstance';
import { SQLiteBackendProvider } from '../../tests/helpers/SQLiteBackendProvider';
import { MockCloudProvider } from './MockCloudProvider';
import { RDSInstance, ApiGateway, CloudWatch } from './constructs';

/* -------------------------------------------------------------------------- */
/*                    Output-Driven Reactive Infrastructure                   */
/* -------------------------------------------------------------------------- */

let renderCount = 0;

function ReactiveApp() {
    renderCount++;
    console.log(`\n🔄 [Render #${renderCount}] ReactiveApp rendering...`);

    // Always create database
    const database = useInstance(RDSInstance, {
        name: 'reactive-db',
        region: 'us-east-1',
        engine: 'postgres',
        size: 'db.t3.micro',
    });

    console.log(`   Database outputs: ${database.outputs?.endpoint || 'not yet available'}`);

    // Conditional: Only create API if database has outputs
    // First render: database.outputs is empty, API not created
    // After database deploys: outputs populated, re-render triggered
    // Second render: database.outputs exists, API IS created
    if (database.outputs?.endpoint) {
        console.log(`   ✓ Creating API (database output available)`);

        const api = useInstance(ApiGateway, {
            name: 'reactive-api',
            region: 'us-east-1',
            stage: 'prod',
            dbUrl: database.outputs.endpoint,
        });

        console.log(`   API outputs: ${api.outputs?.endpoint || 'not yet available'}`);

        // Conditional: Only create monitoring if API has outputs
        // Second render: api.outputs is empty, monitoring not created
        // After API deploys: outputs populated, re-render triggered
        // Third render: api.outputs exists, monitoring IS created
        if (api.outputs?.endpoint) {
            console.log(`   ✓ Creating Monitoring (API output available)`);

            const monitoring = useInstance(CloudWatch, {
                name: 'reactive-monitoring',
                targets: [database.outputs.endpoint, api.outputs.endpoint],
                alerting: true,
            });

            if (monitoring.outputs?.dashboardUrl) {
                console.log(`\n🎉 FULL REACTIVE STACK DEPLOYED!`);
                console.log(`   Render #1: Database created`);
                console.log(`   → Output change detected → Re-render`);
                console.log(`   Render #2: API created`);
                console.log(`   → Output change detected → Re-render`);
                console.log(`   Render #3: Monitoring created`);
                console.log(`\n   Final infrastructure:`);
                console.log(`   - Database: ${database.outputs.endpoint}`);
                console.log(`   - API: ${api.outputs.endpoint}`);
                console.log(`   - Monitoring: ${monitoring.outputs.dashboardUrl}`);
            }
        } else {
            console.log(`   ⏸️  Skipping Monitoring (waiting for API outputs)`);
        }
    } else {
        console.log(`   ⏸️  Skipping API (waiting for database outputs)`);
    }

    return <></>;
}

/* -------------------------------------------------------------------------- */
/*                          Provider Configuration                            */
/* -------------------------------------------------------------------------- */

CReact.cloudProvider = new MockCloudProvider();
CReact.backendProvider = new SQLiteBackendProvider('./examples/basic-app/reactive-state.db');

// Export default as a function that returns the promise
export default async function () {
    return CReact.renderCloudDOM(<ReactiveApp /> as any, 'reactive-app-stack');
}
