/**
 * Provider interface - abstracts the execution environment
 */
/**
 * Create a mock provider for testing
 */
export function createMockProvider(handlers = {}) {
    return {
        async apply(node) {
            if (handlers.apply) {
                return await handlers.apply(node);
            }
            // Default: return empty outputs
            return {};
        },
        async destroy(node) {
            if (handlers.destroy) {
                await handlers.destroy(node);
            }
        },
    };
}
