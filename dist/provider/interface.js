/**
 * Provider interface - abstracts the execution environment
 */
/**
 * Create a mock provider for testing
 */
export function createMockProvider(handlers = {}) {
    const eventHandlers = new Map();
    return {
        async materialize(nodes) {
            if (handlers.materialize) {
                await handlers.materialize(nodes);
            }
            else {
                // Default: set empty outputs via reactive API
                for (const node of nodes) {
                    node.setOutputs({});
                }
            }
        },
        async destroy(node) {
            if (handlers.destroy) {
                await handlers.destroy(node);
            }
        },
        on(event, handler) {
            if (!eventHandlers.has(event)) {
                eventHandlers.set(event, new Set());
            }
            eventHandlers.get(event).add(handler);
        },
        off(event, handler) {
            eventHandlers.get(event)?.delete(handler);
        },
        stop() {
            eventHandlers.clear();
        },
    };
}
