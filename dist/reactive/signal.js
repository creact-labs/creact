/**
 * Signal - core reactive primitive (internal)
 * Inspired by SolidJS createSignal
 */
import { getListener, scheduleComputation } from './tracking.js';
/**
 * Create a reactive signal (internal - not exported from package)
 */
export function createSignal(initial) {
    const signal = {
        value: initial,
        observers: null,
        observerSlots: null,
    };
    function read() {
        const listener = getListener();
        // If there's an active computation, register it
        if (listener) {
            const sSlot = signal.observers?.length ?? 0;
            // Listener tracks this signal
            if (!listener.sources) {
                listener.sources = [signal];
                listener.sourceSlots = [sSlot];
            }
            else {
                listener.sources.push(signal);
                listener.sourceSlots.push(sSlot);
            }
            // Signal tracks this listener
            if (!signal.observers) {
                signal.observers = [listener];
                signal.observerSlots = [listener.sources.length - 1];
            }
            else {
                signal.observers.push(listener);
                signal.observerSlots.push(listener.sources.length - 1);
            }
        }
        return signal.value;
    }
    function write(value) {
        if (signal.value === value)
            return; // No change
        signal.value = value;
        // Notify all observers
        if (signal.observers?.length) {
            for (const observer of signal.observers) {
                observer.state = 1; // STALE
                scheduleComputation(observer);
            }
        }
    }
    return [read, write];
}
/**
 * Get raw signal value without tracking
 */
export function peekSignal(signal) {
    return signal.value;
}
