/** @jsx CReact.createElement */
import { CReact } from './src/jsx';
import { Reconciler } from './src/core/Reconciler';
import { ICloudProvider } from './src/providers/ICloudProvider';
import { IBackendProvider } from './src/providers/IBackendProvider';
import { CloudDOMNode } from './src/core/types';
import { useInstance } from './src/hooks/useInstance';
import * as vm from 'vm';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Mock Constructs
class ModelService {
    constructor(public props: { name: string; version?: string }) {}
}

class EdgeNode {
    constructor(public props: { region: string; capacity?: number }) {}
}

class AiOrchestrator {
    constructor(public props: { model: string; temperature?: number }) {}
}

class DataPipeline {
    constructor(public props: { source: string; destination: string }) {}
}

// Evolutionary Types
interface BehaviorGene {
    construct: string;
    behavior: string;
    fitness: number;
    originCycle: number;
    hash: string;
    parentHashes: string[];
}

interface Environment {
    latencyTarget: number;
    costLimit: number;
    failureRate: number;
}

interface LineageRecord {
    parentHashes: string[];
    childHash: string;
    mutationType: 'AI' | 'crossover' | 'initial';
    fitness: number;
    cycle: number;
}

// SafeVM Class - Execute AI-generated functions in isolated sandbox
class SafeVM {
    private timeout: number = 1000;

    execute(functionBody: string, context: Record<string, any> = {}): any {
        const sandbox = {
            console: console,
            JSON: JSON,
            Math: Math,
            Date: Date,
            ...context,
        };

        let wrappedCode: string;
        if (functionBody.trim().startsWith('function')) {
            wrappedCode = `(${functionBody})()`;
        } else {
            wrappedCode = `(function() { ${functionBody} })()`;
        }

        try {
            const script = new vm.Script(wrappedCode);
            const vmContext = vm.createContext(sandbox);
            return script.runInContext(vmContext, { timeout: this.timeout });
        } catch (error) {
            console.error('SafeVM execution error:', error);
            throw error;
        }
    }
}

// Gene Pool Manager
class GenePool {
    private genes: Map<string, BehaviorGene[]> = new Map();
    private lineage: LineageRecord[] = [];
    private safeVM: SafeVM = new SafeVM();

    addGene(gene: BehaviorGene): void {
        if (!this.genes.has(gene.construct)) {
            this.genes.set(gene.construct, []);
        }
        this.genes.get(gene.construct)!.push(gene);
    }

    getTopGenes(construct: string, n: number = 3): BehaviorGene[] {
        const genes = this.genes.get(construct) || [];
        return genes.sort((a, b) => b.fitness - a.fitness).slice(0, n);
    }

    getAllConstructs(): string[] {
        return Array.from(this.genes.keys());
    }

    getBestGene(construct: string): BehaviorGene | undefined {
        const genes = this.genes.get(construct) || [];
        return genes.sort((a, b) => b.fitness - a.fitness)[0];
    }

    addLineage(record: LineageRecord): void {
        this.lineage.push(record);
    }

    getLineage(): LineageRecord[] {
        return this.lineage;
    }

    // Evaluate fitness of a behavior
    evaluateFitness(gene: BehaviorGene, env: Environment, node: CloudDOMNode): number {
        try {
            const result = this.safeVM.execute(gene.behavior, { props: node.props });
            
            // Deterministic fitness scoring
            let score = 50; // Base score

            // Check if result has expected metrics
            if (result && typeof result === 'object') {
                // Reward latency optimization
                if (result.latency && result.latency <= env.latencyTarget) {
                    score += 20;
                }
                
                // Reward cost efficiency
                if (result.cost && result.cost <= env.costLimit) {
                    score += 15;
                }
                
                // Reward reliability
                if (result.status === 'active' || result.deployed === true) {
                    score += 10;
                }
                
                // Reward completeness (more metrics = better)
                score += Math.min(Object.keys(result).length * 2, 15);
            }

            return Math.min(score, 100);
        } catch (error) {
            return 0; // Failed execution = 0 fitness
        }
    }
}

// Evolutionary Operators
class EvolutionEngine {
    private genePool: GenePool;

    constructor(genePool: GenePool) {
        this.genePool = genePool;
    }

    // Mutation: Ask AI to mutate a behavior
    async mutate(gene: BehaviorGene, env: Environment): Promise<BehaviorGene> {
        const prompt = `
Mutate the following infrastructure behavior function to improve performance under these conditions:
- Latency target: ${env.latencyTarget}ms
- Cost limit: $${env.costLimit}
- Failure rate: ${env.failureRate}

Current behavior:
${gene.behavior}

Return ONLY a JSON object with:
{ "behavior": "improved JavaScript function body" }
`;

        const response = await callOpenAI(prompt);
        try {
            const parsed = JSON.parse(response);
            const hash = this.hashBehavior(parsed.behavior);
            
            return {
                construct: gene.construct,
                behavior: parsed.behavior,
                fitness: 0,
                originCycle: gene.originCycle + 1,
                hash,
                parentHashes: [gene.hash],
            };
        } catch (error) {
            return gene; // Return original if mutation fails
        }
    }

    // Crossover: Combine two behaviors
    async crossover(gene1: BehaviorGene, gene2: BehaviorGene): Promise<BehaviorGene> {
        const prompt = `
Combine these two infrastructure behaviors into a single optimized version:

Behavior 1:
${gene1.behavior}

Behavior 2:
${gene2.behavior}

Return ONLY a JSON object with:
{ "behavior": "combined JavaScript function body" }
`;

        const response = await callOpenAI(prompt);
        try {
            const parsed = JSON.parse(response);
            const hash = this.hashBehavior(parsed.behavior);
            
            return {
                construct: gene1.construct,
                behavior: parsed.behavior,
                fitness: 0,
                originCycle: Math.max(gene1.originCycle, gene2.originCycle) + 1,
                hash,
                parentHashes: [gene1.hash, gene2.hash],
            };
        } catch (error) {
            return gene1; // Return first parent if crossover fails
        }
    }

    // Novelty score based on behavior difference
    calculateNovelty(gene: BehaviorGene, existingGenes: BehaviorGene[]): number {
        if (existingGenes.length === 0) return 1.0;
        
        const distances = existingGenes.map(existing => {
            return this.levenshteinDistance(gene.behavior, existing.behavior);
        });
        
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        const maxLength = Math.max(gene.behavior.length, 1);
        
        return Math.min(avgDistance / maxLength, 1.0);
    }

    private levenshteinDistance(a: string, b: string): number {
        const matrix: number[][] = [];
        
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[b.length][a.length];
    }

    private hashBehavior(behavior: string): string {
        return crypto.createHash('sha256').update(behavior).digest('hex').substring(0, 16);
    }
}

// DynamicCloudProvider with Gene Pool
class DynamicCloudProvider implements ICloudProvider {
    private genePool: GenePool;
    private safeVM: SafeVM = new SafeVM();

    constructor(genePool: GenePool) {
        this.genePool = genePool;
    }

    async initialize(): Promise<void> {
        console.log('[DynamicCloudProvider] Initialized');
    }

    materialize(cloudDOM: CloudDOMNode[], scope?: any): void {
        console.log(`[DynamicCloudProvider] Materializing ${cloudDOM.length} nodes`);

        for (const node of cloudDOM) {
            const constructName = node.construct.name;
            const bestGene = this.genePool.getBestGene(constructName);

            if (bestGene) {
                try {
                    const context = { node, props: node.props };
                    const result = this.safeVM.execute(bestGene.behavior, context);
                    console.log(`[${constructName}] Fitness: ${bestGene.fitness.toFixed(1)} | Result:`, result);
                } catch (error) {
                    console.error(`[${constructName}] Execution failed:`, error);
                }
            }
        }
    }
}

// MemoryBackendProvider
class MemoryBackendProvider implements IBackendProvider {
    private state: Map<string, any> = new Map();

    async initialize(): Promise<void> {
        console.log('[MemoryBackendProvider] Initialized');
    }

    async getState(stackName: string): Promise<any | undefined> {
        return this.state.get(stackName);
    }

    async saveState(stackName: string, state: any): Promise<void> {
        this.state.set(stackName, state);
    }
}

// OpenAI Integration
async function callOpenAI(prompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return mockEvolutionSuggestion();
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are an AI that evolves infrastructure code. Return JSON only.' },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.8,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        return content.replace(/```(?:json)?\s*\n?([\s\S]*?)\n?```/g, '$1').trim();
    } catch (error) {
        return mockEvolutionSuggestion();
    }
}

function mockEvolutionSuggestion(): string {
    const behaviors = [
        'return { status: "optimized", latency: 45, cost: 80, throughput: "15GB/s" };',
        'return { deployed: true, region: props.region, nodes: props.capacity || 3, latency: 30 };',
        'return { model: props.model, temperature: props.temperature || 0.7, status: "active", cost: 50 };',
        'return { source: props.source, destination: props.destination, throughput: "20GB/s", latency: 25 };',
    ];
    return JSON.stringify({ behavior: behaviors[Math.floor(Math.random() * behaviors.length)] });
}

// SampleApp Component
function SampleApp({ replica }: { replica: number }) {
    useInstance(ModelService, { key: `model-${replica}`, name: 'GPT-Service', version: 'v2' });
    useInstance(AiOrchestrator, { key: `orchestrator-${replica}`, model: 'gpt-4o-mini', temperature: 0.7 });
    useInstance(DataPipeline, { key: `pipeline-${replica}`, source: 's3://data-lake', destination: 'warehouse' });
    useInstance(EdgeNode, { key: `edge-${replica}`, region: 'us-east-1', capacity: 5 });
    return null;
}

// Main Evolutionary Loop
async function main() {
    console.log('🧬 === Basilisk: Self-Evolving Infrastructure === 🧬\n');

    const genePool = new GenePool();
    const evolutionEngine = new EvolutionEngine(genePool);
    const provider = new DynamicCloudProvider(genePool);
    const backend = new MemoryBackendProvider();
    const reconciler = new Reconciler();

    await provider.initialize();
    await backend.initialize();

    // Import CReact core
    const { Renderer } = await import('./src/core/Renderer');
    const { Validator } = await import('./src/core/Validator');
    const { CloudDOMBuilder } = await import('./src/core/CloudDOMBuilder');

    const renderer = new Renderer();
    const validator = new Validator();
    const cloudDOMBuilder = new CloudDOMBuilder(provider);

    // Dynamic environments for selective pressure
    const environments: Environment[] = [
        { latencyTarget: 50, costLimit: 100, failureRate: 0.01 },
        { latencyTarget: 30, costLimit: 80, failureRate: 0.02 },
        { latencyTarget: 40, costLimit: 90, failureRate: 0.015 },
    ];

    const constructs = ['ModelService', 'EdgeNode', 'AiOrchestrator', 'DataPipeline'];
    
    // Initialize gene pool with seed behaviors
    console.log('🌱 Seeding initial gene pool...\n');
    for (const construct of constructs) {
        const seedBehavior = 'return { status: "initial", initialized: true };';
        const hash = crypto.createHash('sha256').update(seedBehavior).digest('hex').substring(0, 16);
        
        genePool.addGene({
            construct,
            behavior: seedBehavior,
            fitness: 50,
            originCycle: 0,
            hash,
            parentHashes: [],
        });
    }

    let previousCloudDOM: CloudDOMNode[] = [];

    for (let cycle = 1; cycle <= 10; cycle++) {
        const env = environments[cycle % environments.length];
        console.log(`\n🔄 --- Cycle ${cycle} --- Environment: Latency=${env.latencyTarget}ms, Cost=$${env.costLimit}, Failure=${env.failureRate}`);

        // Build CloudDOM
        const app = <SampleApp replica={cycle} />;
        const fiber = renderer.render(app as any);
        validator.validate(fiber);
        const cloudDOM = await cloudDOMBuilder.build(fiber);

        console.log(`📦 Built CloudDOM with ${cloudDOM.length} nodes`);

        // Evolution Phase
        const newGenes: BehaviorGene[] = [];

        for (const construct of constructs) {
            const topGenes = genePool.getTopGenes(construct, 2);
            
            if (topGenes.length > 0) {
                // Mutation
                const mutated = await evolutionEngine.mutate(topGenes[0], env);
                newGenes.push(mutated);
                
                // Crossover if we have 2+ genes
                if (topGenes.length >= 2) {
                    const hybrid = await evolutionEngine.crossover(topGenes[0], topGenes[1], env);
                    newGenes.push(hybrid);
                }
            }
        }

        // Evaluate fitness for all new genes
        console.log('🧪 Evaluating fitness...');
        for (const gene of newGenes) {
            const node = cloudDOM.find(n => n.construct.name === gene.construct);
            if (node) {
                const baseFitness = genePool.evaluateFitness(gene, env, node);
                const existingGenes = genePool.getTopGenes(gene.construct, 10);
                const novelty = evolutionEngine.calculateNovelty(gene, existingGenes);
                
                // Combined fitness: 70% performance, 30% novelty
                gene.fitness = baseFitness * 0.7 + novelty * 30;
                
                genePool.addGene(gene);
                
                // Track lineage
                genePool.addLineage({
                    parentHashes: gene.parentHashes,
                    childHash: gene.hash,
                    mutationType: gene.parentHashes.length > 1 ? 'crossover' : 'AI',
                    fitness: gene.fitness,
                    cycle,
                });
            }
        }

        // Display top genes
        console.log('\n🏆 Top Genes:');
        for (const construct of constructs) {
            const best = genePool.getBestGene(construct);
            if (best) {
                console.log(`  ${construct}: Fitness=${best.fitness.toFixed(1)} (Cycle ${best.originCycle})`);
            }
        }

        // Reconcile and deploy
        const changeSet = reconciler.reconcile(previousCloudDOM, cloudDOM);
        console.log(`\n♻️  Reconciler: +${changeSet.creates.length} ~${changeSet.updates.length} -${changeSet.deletes.length}`);

        provider.materialize(cloudDOM);

        await backend.saveState('basilisk', { cloudDOM, cycle, genePool: genePool.getLineage() });

        previousCloudDOM = cloudDOM;
    }

    // Final report
    console.log('\n\n📊 === Evolution Complete ===');
    console.log(`Total lineage records: ${genePool.getLineage().length}`);
    console.log('\n🧬 Final Best Genes:');
    for (const construct of constructs) {
        const best = genePool.getBestGene(construct);
        if (best) {
            console.log(`\n${construct}:`);
            console.log(`  Fitness: ${best.fitness.toFixed(1)}`);
            console.log(`  Origin: Cycle ${best.originCycle}`);
            console.log(`  Parents: ${best.parentHashes.length}`);
        }
    }

    // Save lineage to file
    const lineageDir = '.creact-basilisk';
    if (!fs.existsSync(lineageDir)) {
        fs.mkdirSync(lineageDir, { recursive: true });
    }
    fs.writeFileSync(
        `${lineageDir}/lineage.json`,
        JSON.stringify(genePool.getLineage(), null, 2)
    );
    console.log(`\n💾 Lineage saved to ${lineageDir}/lineage.json`);
}

main().catch(console.error);
