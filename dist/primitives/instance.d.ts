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
    outputs?: Record<string, any>;
    /** Update outputs reactively - triggers dependent re-renders via signals */
    setOutputs(outputs: Record<string, any>): void;
}
/**
 * Serialized node shape (from backend.ts) - only what we need for hydration
 */
interface SerializedNodeForHydration {
    id: string;
    outputs?: Record<string, any>;
}
/**
 * Prepare output hydration from serialized nodes
 * Called by runtime BEFORE rendering to restore outputs
 */
export declare function prepareOutputHydration(serializedNodes: SerializedNodeForHydration[]): void;
/**
 * Clear output hydration map
 */
export declare function clearOutputHydration(): void;
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
/**
 * Clear node ownership (call at start of each render pass)
 * @internal
 */
export declare function clearNodeOwnership(): void;
export {};
