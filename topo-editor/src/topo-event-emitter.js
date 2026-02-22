"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopoEventEmitter = void 0;
/**
 * Lightweight typed event emitter for topo events.
 *
 * Maintains a map of event type to ordered handler list. Supports
 * `on()` for subscribing, `off()` for unsubscribing, `emit()` for
 * dispatching, and `removeAll()` for bulk cleanup.
 *
 * This class is intentionally generic and dependency-free so it can
 * be instantiated as both an instance-level emitter and a static
 * (class-level) emitter on TopoEditor.
 */
class TopoEventEmitter {
    constructor() {
        /** Internal handler registry: event type → ordered list of callbacks. */
        this.listeners = new Map();
    }
    /**
     * Register a handler for the given event type.
     *
     * Handlers are called in registration order. Registering the same
     * function reference twice for the same event type is a no-op
     * (duplicate-safe).
     *
     * @param type    - The topo event type to listen for.
     * @param handler - Callback invoked when the event fires.
     */
    on(type, handler) {
        let handlers = this.listeners.get(type);
        if (!handlers) {
            handlers = [];
            this.listeners.set(type, handlers);
        }
        // Prevent duplicate registrations of the same function reference.
        if (!handlers.includes(handler)) {
            handlers.push(handler);
        }
    }
    /**
     * Remove a previously registered handler.
     *
     * If the handler was not registered, this is a no-op.
     *
     * @param type    - The topo event type.
     * @param handler - The exact function reference passed to {@link on}.
     */
    off(type, handler) {
        const handlers = this.listeners.get(type);
        if (!handlers)
            return;
        const idx = handlers.indexOf(handler);
        if (idx !== -1)
            handlers.splice(idx, 1);
        // Clean up empty arrays to avoid unbounded map growth.
        if (handlers.length === 0)
            this.listeners.delete(type);
    }
    /**
     * Dispatch an event to all registered handlers for its type.
     *
     * Handlers are invoked synchronously in registration order.
     * Exceptions in one handler do not prevent subsequent handlers
     * from running (each is wrapped in a try/catch).
     *
     * @param event - The topo event payload.
     */
    emit(event) {
        const handlers = this.listeners.get(event.type);
        if (!handlers)
            return;
        // Snapshot the array so that handlers calling off() mid-emit
        // don't cause skips.
        const snapshot = [...handlers];
        for (const handler of snapshot) {
            try {
                handler(event);
            }
            catch (err) {
                console.error(`[TopoEventEmitter] Error in "${event.type}" handler:`, err);
            }
        }
    }
    /**
     * Remove all handlers for all event types (or for a specific type).
     *
     * Called during TopoEditor.destroy() to prevent leaked references
     * to DOM elements or editor instances.
     *
     * @param type - If provided, only handlers for this type are removed.
     *   If omitted, all handlers for all types are removed.
     */
    removeAll(type) {
        if (type) {
            this.listeners.delete(type);
        }
        else {
            this.listeners.clear();
        }
    }
}
exports.TopoEventEmitter = TopoEventEmitter;
