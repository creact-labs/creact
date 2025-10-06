/** @jsx CReact.createElement */
// smoke-test.tsx — AI-evolving infra prototype (safe simulation)
// Requires: better-sqlite3, your local CReact codebase (imports mirror your test harness)

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

import { CReact as CReactCore } from '../../src/core/CReact';
import { CReact } from '../../src/jsx';
import { Reconciler } from '../../src/core/Reconciler';
import { ICloudProvider } from '../../src/providers/ICloudProvider';
import { IBackendProvider } from '../../src/providers/IBackendProvider';
import { CloudDOMNode } from '../../src/core/types';
import { useInstance } from '../../src/hooks/useInstance';
import { useState } from '../../src/hooks/useState';
import { createContext, useContext } from '../../src/context/createContext';

// ---------- Simple Test Constructs (used by JSX apps) ----------
class ModelService { constructor(public props: any) {} }
class EdgeNode { constructor(public props: any) {} }
class AiOrchestrator { constructor(public props: any) {} }
class DataPipeline { constructor(public props: any) {} }

// ---------- In-memory backend provider (like earlier) ----------
class MemoryBackendProvider implements IBackendProvider {
  private state = new Map<string, any>();
  async getState(stackName: string): Promise<any | undefined> { return this.state.get(stackName); }
  async saveState(stackName: string, state: any): Promise<void> { this.state.set(stackName, state); }
  clear(): void { this.state.clear(); }
}

// ---------- Cloud provider that will apply "registered" provider behaviors ----------
type ProviderBehavior = {
  id: string;
  name: string;
  matchConstructs?: string[]; // constructs it can handle
  outputs?: Record<string, any>; // static output template
  // NOTE: No executable code here. Behavior is limited to templated outputs.
};

class DynamicCloudProvider implements ICloudProvider {
  // registry of safe behaviors (concrete objects implementing a small DSL)
  private behaviors = new Map<string, ProviderBehavior>();

  registerBehavior(b: ProviderBehavior) {
    this.behaviors.set(b.id, b);
    console.log(`[ProviderRegistry] Registered behavior "${b.name}" id=${b.id} match=${JSON.stringify(b.matchConstructs)}`);
  }

  listBehaviors(): ProviderBehavior[] {
    return Array.from(this.behaviors.values());
  }

  // materialize applies registered behaviors to nodes that match construct names
  async materialize(cloudDOM: CloudDOMNode[]): Promise<void> {
    // each node: if its construct.name matches provider.matchConstructs, add outputs accordingly
    for (const node of cloudDOM) {
      const cname = node.construct?.name;
      if (!cname) continue;
      for (const b of this.behaviors.values()) {
        if (b.matchConstructs && b.matchConstructs.includes(cname)) {
          // don't execute arbitrary code — simply template outputs
          node.outputs = node.outputs || {};
          for (const [k, v] of Object.entries(b.outputs || {})) {
            // support a simple templating: replace ${id} and ${prop.X}
            node.outputs[k] = String(v)
              .replace(/\$\{id\}/g, node.id)
              .replace(/\$\{stack\}/g, node.stack || 'default')
              .replace(/\$\{construct\}/g, cname);
          }
        }
      }
    }
  }
}

// ---------- SQLite proposals DB ----------
function openDB(dbPath: string) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle INTEGER,
      summary TEXT,
      json_proposal TEXT,
      applied INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

// ---------- OpenAI REST helper (uses global fetch; key from env) ----------
async function callOpenAI(prompt: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    // safe fallback: return a deterministic mock
    return {
      ok: true,
      json: async () => ({
        proposal: {
          type: 'register_behavior',
          name: 'mock-edge-model',
          matchConstructs: ['ModelService', 'EdgeNode'],
          outputs: { endpoint: 'https://${id}.mock.local', modelVersion: 'v1' }
        },
        summary: 'Mock: register behavior that provides endpoints for ModelService/EdgeNode'
      })
    };
  }

  // ask model to respond JSON only. we include explicit instruction to reply JSON with a top-level 'proposal' object.
  const body = {
    model: 'gpt-4o-mini', // change as desired
    messages: [
      {
        role: 'system',
        content: `You are an assistant that writes SAFE JSON proposals for an infra-evolution prototype.\
Reply ONLY with a JSON object. DO NOT include runnable code, shell commands, or arbitrary JS.\
Top-level keys: proposal (object), summary (string).`
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 400
  };

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenAI error: ${resp.status} ${txt}`);
  }

  const payload = await resp.json();
  // extract assistant content and parse as JSON (we instruct model to produce JSON)
  const content = payload.choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(content);
    return { ok: true, json: async () => parsed };
  } catch (err) {
    // fallback — attempt to extract JSON substring
    const m = content.match(/\{[\s\S]*\}$/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]);
        return { ok: true, json: async () => parsed };
      } catch (e) {
        throw new Error('OpenAI returned non-JSON response and fallback parse failed');
      }
    }
    throw new Error('OpenAI returned non-JSON response');
  }
}

// ---------- Utility: pretty diff logging ----------
function summarizeChangeSet(creact: any, reconciler: Reconciler, prev: CloudDOMNode[], next: CloudDOMNode[]) {
  const changeSet = reconciler.reconcile(prev, next);
  // We'll print a friendly summary
  console.log('\n📊 ChangeSet Summary:');
  console.log(`  + creates: ${changeSet.creates?.length ?? 0}`);
  console.log(`  ~ updates: ${changeSet.updates?.length ?? 0}`);
  console.log(`  - deletes: ${changeSet.deletes?.length ?? 0}`);
  console.log(`  * replacements: ${changeSet.replacements?.length ?? 0}`);
  if (changeSet.deploymentOrder) {
    console.log(`  → deploymentOrder: ${JSON.stringify(changeSet.deploymentOrder.slice(0, 10))}${changeSet.deploymentOrder.length > 10 ? '...' : ''}`);
  }
  return changeSet;
}

// ---------- Example "App" JSX that uses useInstance hooks ----------
function SampleApp({ replica = 2 }: { replica?: number }) {
  // create some constructs that represent an AI infra
  useInstance(ModelService, { key: 'model', modelName: 'infer-model', replicas: replica });
  useInstance(AiOrchestrator, { key: 'orchestrator', strategy: 'autoscale' });
  useInstance(DataPipeline, { key: 'pipeline', throughput: 1000 });
  useInstance(EdgeNode, { key: 'edge', region: 'eu-west-1', capacity: 8 });
  return null;
}

// ---------- Main evolution loop ----------
async function main() {
  const cycles = Number(process.env.EVOLUTION_CYCLES || 8);
  const persistDir = process.env.CREACT_PERSIST_DIR || '.creact-ai-proto';
  if (!fs.existsSync(persistDir)) fs.mkdirSync(persistDir, { recursive: true });

  const db = openDB(path.join(persistDir, 'proposals.db'));
  const metricsPath = path.join(persistDir, 'metrics.json');

  const backendProvider = new MemoryBackendProvider();
  const cloudProvider = new DynamicCloudProvider();
  const creact = new CReactCore({
    cloudProvider,
    backendProvider,
    persistDir,
  });

  const reconciler = new Reconciler();

  // prev cloud DOM for diffing
  let prevCloudDOM: CloudDOMNode[] = [];

  console.log('🚀 Safe AI-Evolving Infra Prototype (no arbitrary code execution)');
  console.log(`Saving artifacts under: ${persistDir}`);
  console.log(`SQLite DB: ${path.join(persistDir, 'proposals.db')}`);
  console.log('');

  const metrics: any[] = [];

  for (let cycle = 1; cycle <= cycles; cycle++) {
    console.log('='.repeat(70));
    console.log(`🔁 CYCLE ${cycle}`);
    console.log('='.repeat(70));

    // 1) Build the CloudDOM from the JSX app
    const replica = 1 + (cycle % 3); // vary replicas during evolution
    const app = <SampleApp replica={replica} />;
    const cloudDOM = await creact.build(app);

    // 2) Show concise snapshot
    console.log(`⤷ Built CloudDOM nodes: ${cloudDOM.length}`);
    for (const n of cloudDOM.slice(0, 12)) {
      console.log(`   - ${n.id} (${n.construct?.name}) props=${JSON.stringify(n.props || {})}`);
    }
    if (cloudDOM.length > 12) console.log(`   ... (${cloudDOM.length - 12} more nodes)`);

    // 3) Ask the AI for a SAFE JSON proposal
    const topologySummary = {
      cycle,
      nodeCount: cloudDOM.length,
      constructs: Array.from(new Set(cloudDOM.map(n => n.construct?.name).filter(Boolean))),
      sampleNodes: cloudDOM.slice(0, 6).map(n => ({ id: n.id, construct: n.construct?.name, props: n.props })),
    };

    const userPrompt = `Given the following topology summary:\n${JSON.stringify(topologySummary, null, 2)}\n\nPropose exactly one JSON-only proposal with top-level keys:\n- proposal: { type: 'register_behavior'|'update_behavior'|'noop', name: string, matchConstructs?: string[], outputs?: Record<string,string> }\n- summary: short string\nExample outputs should be templated strings using \${id} \${construct} \${stack} if helpful.\nDo NOT include arbitrary JS, code, or shell commands.`;

    let openaiResp;
    try {
      openaiResp = await callOpenAI(userPrompt);
    } catch (err: any) {
      console.error('✖ OpenAI call failed:', String(err).slice(0, 200));
      // produce fallback deterministic proposal
      openaiResp = { ok: true, json: async () => ({
        proposal: {
          type: 'register_behavior',
          name: `auto-edge-behavior-${cycle}`,
          matchConstructs: ['ModelService', 'EdgeNode'],
          outputs: { endpoint: 'https://${id}.ai.local', version: `v${cycle}` }
        },
        summary: `Fallback: register behavior for ModelService/EdgeNode v${cycle}`
      })};
    }

    const parsed = await openaiResp.json();
    // validate shape
    const proposal = parsed.proposal;
    const summary = parsed.summary || 'no summary';

    if (!proposal || !proposal.type) {
      console.warn('⚠️ AI returned invalid proposal JSON — skipping application.');
      // record as invalid
      db.prepare('INSERT INTO proposals (cycle, summary, json_proposal, applied) VALUES (?, ?, ?, 0)')
        .run(cycle, `INVALID: ${summary}`, JSON.stringify(parsed));
      metrics.push({ cycle, applied: false, reason: 'invalid-proposal' });
      continue;
    }

    // 4) persist proposal
    db.prepare('INSERT INTO proposals (cycle, summary, json_proposal, applied) VALUES (?, ?, ?, 0)')
      .run(cycle, summary, JSON.stringify(parsed));

    console.log('\n🤖 AI Proposal Summary:');
    console.log(`  - summary: ${summary}`);
    console.log(`  - proposal: ${JSON.stringify(proposal, null, 2)}`);

    // 5) Interpret the safe proposal DSL and register provider behavior accordingly
    let applied = false;
    if (proposal.type === 'register_behavior') {
      // validate shape (only accept arrays/strings)
      const id = `behavior-c${cycle}-${Date.now()}`;
      const pb: ProviderBehavior = {
        id,
        name: proposal.name || id,
        matchConstructs: Array.isArray(proposal.matchConstructs) ? proposal.matchConstructs : [],
        outputs: proposal.outputs || {},
      };
      cloudProvider.registerBehavior(pb);
      applied = true;
      // mark proposal as applied
      db.prepare('UPDATE proposals SET applied = 1 WHERE cycle = ?').run(cycle);
    } else if (proposal.type === 'update_behavior') {
      // safe update: find by name and patch outputs (no code)
      const name = proposal.name;
      if (name) {
        const found = cloudProvider.listBehaviors().find(b => b.name === name);
        if (found) {
          if (proposal.outputs && typeof proposal.outputs === 'object') {
            found.outputs = { ...(found.outputs || {}), ...proposal.outputs };
            applied = true;
            db.prepare('UPDATE proposals SET applied = 1 WHERE cycle = ?').run(cycle);
            console.log(`  → Updated behavior ${found.name}`);
          }
        } else {
          console.log(`  → No behavior named ${name} found; skipping update.`);
        }
      }
    } else if (proposal.type === 'noop') {
      console.log('  → NOOP requested by AI.');
      applied = true;
      db.prepare('UPDATE proposals SET applied = 1 WHERE cycle = ?').run(cycle);
    } else {
      console.log(`  → Unrecognized proposal type: ${proposal.type}`);
    }

    // 6) Materialize (using only the behaviors registered above)
    await creact.deploy(cloudDOM); // creact will call cloudProvider.materialize internally

    // 7) Read back deployed cloudDOM (rebuild to get outputs restored)
    const cloudDOMAfter = await creact.build(app);

    // 8) Summarize changes vs prev
    const changeSet = summarizeChangeSet(creact, reconciler, prevCloudDOM, cloudDOMAfter);

    // extra detailed visibility of updates/creates
    if (changeSet.creates?.length) {
      console.log('  Created nodes:');
      for (const c of changeSet.creates) console.log(`    + ${c.id} (${c.construct?.name})`);
    }
    if (changeSet.updates?.length) {
      console.log('  Updated nodes:');
      for (const u of changeSet.updates) console.log(`    ~ ${u.id} ({...})`);
    }
    if (changeSet.deletes?.length) {
      console.log('  Deleted nodes:');
      for (const d of changeSet.deletes) console.log(`    - ${d.id}`);
    }

    // 9) Persist metrics for this cycle
    metrics.push({
      cycle,
      nodeCount: cloudDOMAfter.length,
      created: changeSet.creates?.length || 0,
      updated: changeSet.updates?.length || 0,
      deleted: changeSet.deletes?.length || 0,
      appliedProposal: applied,
      proposalSummary: summary,
    });

    // save snapshot of cloudDOM json (safe serializable)
    const snapshotPath = path.join(persistDir, `clouddom-cycle-${cycle}.json`);
    fs.writeFileSync(snapshotPath, JSON.stringify(cloudDOMAfter, null, 2), 'utf8');
    console.log(`  Snapshot: ${snapshotPath}`);

    prevCloudDOM = cloudDOMAfter;
    // short delay to avoid hitting OpenAI too fast in real flow
    await new Promise(res => setTimeout(res, 150));
  }

  // save global metrics
  fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2), 'utf8');
  console.log('\n🎉 Evolution finished. Metrics saved →', metricsPath);
  console.log('Proposals DB location →', path.join(persistDir, 'proposals.db'));
  console.log('To inspect proposals: use sqlite3 or any SQLite viewer.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
