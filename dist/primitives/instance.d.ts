/**
 * useInstance - bind to a provider and get reactive outputs
 */
import { type Accessor, type Setter } from '../reactive/signal.js';
/**
 * Instance node - represents something materialized by provider
 */
export interface InstanceNode {
    id: string;
    path: string[];
    construct: any;
    constructType: string;
    props: Record<string, any>;
    outputSignals: Map<string, [Accessor<any>, Setter<any>]>;
    children: InstanceNode[];
    store?: any;
}
/**
 * Output accessor type - each property is a signal accessor
 */
export type OutputAccessors<O> = {
    [K in keyof O]: () => O[K] | undefined;
};
/**
 * Create an instance bound to a provider
 */
export declare function useInstance<O extends Record<string, any> = Record<string, any>>(construct: any, props: Record<string, any>): OutputAccessors<O>;
/**
 * Fill instance outputs (called by runtime after provider returns)
 * @internal
 */
export declare function fillInstanceOutputs(nodeId: string, outputs: Record<string, any>): void;
/**
 * Get a node by ID
 * @internal
 */
export declare function getNodeById(nodeId: string): InstanceNode | undefined;
/**
 * Get all registered nodes
 * @internal
 */
export declare function getAllNodes(): InstanceNode[];
/**
 * Clear node registry (for testing)
 * @internal
 */
export declare function clearNodeRegistry(): void;
