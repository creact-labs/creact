/**
 * Introspectable mock provider for testing
 */

import { EventEmitter } from 'events';
import type { Provider, InstanceNode, OutputChangeEvent } from '../../src/index.js';

export interface MaterializeCall {
  node: InstanceNode;
  timestamp: number;
  outputs: Record<string, any>;
}

export interface DestroyCall {
  node: InstanceNode;
  timestamp: number;
}

export class MockProvider extends EventEmitter implements Provider {
  // Introspection: what happened
  readonly materializeCalls: MaterializeCall[] = [];
  readonly destroyCalls: DestroyCall[] = [];
  readonly emittedEvents: OutputChangeEvent[] = [];

  // Legacy alias for backward compatibility
  get applyCalls(): MaterializeCall[] {
    return this.materializeCalls;
  }

  // Configure outputs per construct type
  private outputsByType = new Map<string, Record<string, any>>();

  // Configure dynamic outputs (can change between materialize calls)
  private outputsFn?: (node: InstanceNode) => Record<string, any>;

  constructor() {
    super();
  }

  // Configure what outputs to return for a construct type
  setOutputs(constructType: string, outputs: Record<string, any>): this {
    this.outputsByType.set(constructType, outputs);
    return this;
  }

  // Configure dynamic outputs function
  setOutputsFn(fn: (node: InstanceNode) => Record<string, any>): this {
    this.outputsFn = fn;
    return this;
  }

  async materialize(nodes: InstanceNode[]): Promise<void> {
    for (const node of nodes) {
      const outputs = this.outputsFn?.(node)
        ?? this.outputsByType.get(node.constructType)
        ?? {};

      // Use reactive API - triggers dependent re-renders automatically
      node.setOutputs(outputs);

      // Also set legacy field for backward compatibility with state recording
      node.outputs = outputs;

      this.materializeCalls.push({ node, timestamp: Date.now(), outputs });
    }
  }

  async destroy(node: InstanceNode): Promise<void> {
    this.destroyCalls.push({ node, timestamp: Date.now() });
  }

  // Simulate external change by resource name (props.name)
  simulateChange(resourceName: string, outputs: Record<string, any>): void {
    const event: OutputChangeEvent = {
      resourceName,
      outputs,
      timestamp: Date.now()
    };
    this.emittedEvents.push(event);
    this.emit('outputsChanged', event);
  }

  // Introspection helpers
  getAppliedTypes(): string[] {
    return this.materializeCalls.map(c => c.node.constructType);
  }

  getAppliedByType(type: string): MaterializeCall[] {
    return this.materializeCalls.filter(c => c.node.constructType === type);
  }

  wasApplied(constructType: string, name?: string): boolean {
    return this.materializeCalls.some(c =>
      c.node.constructType === constructType &&
      (name === undefined || c.node.props.name === name)
    );
  }

  wasDestroyed(constructType: string, name?: string): boolean {
    return this.destroyCalls.some(c =>
      c.node.constructType === constructType &&
      (name === undefined || c.node.props.name === name)
    );
  }

  reset(): void {
    this.materializeCalls.length = 0;
    this.destroyCalls.length = 0;
    this.emittedEvents.length = 0;
  }

  stop(): void {
    this.removeAllListeners();
  }
}
