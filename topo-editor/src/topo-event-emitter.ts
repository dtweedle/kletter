/**
 * Event names supported by the topo event system.
 *
 * These map to user-facing interaction events on SVG elements
 * within a {@link TopoEditor} instance.
 */
export type TopoEventType =
    | "hover:enter"
    | "hover:leave"
    | "click"
    | "focus"
    | "blur";

/**
 * Payload emitted for every topo event.
 *
 * Contains both the semantic topo-level metadata (which point,
 * which routes) and the raw DOM event for advanced consumers.
 */
export interface TopoEvent {
    /** The topo event type (e.g. `"hover:enter"`, `"click"`). */
    type: TopoEventType;

    /**
     * The `data-point-id` of the target point, or `null` if the
     * target is a path or the SVG background.
     */
    pointId: number | null;

    /**
     * The `data-point-type` of the target point (e.g. `"bolt"`),
     * or `null` if the target is not a point.
     */
    pointType: string | null;

    /**
     * Index of the route the target path belongs to, or `null`
     * if the target is a point or the SVG background.
     */
    routeIndex: number | null;

    /**
     * Indices of all routes that contain the target point.
     * Empty array if the target is not a point.
     */
    routeIndices: number[];

    /** The SVG DOM element that triggered the event. */
    target: Element;

    /** The original DOM event (MouseEvent, FocusEvent, etc.). */
    originalEvent: Event;

    /** The TopoEditor instance that owns the SVG. */
    instance: unknown;
}

/** Callback signature for topo event handlers. */
export type TopoEventHandler = (event: TopoEvent) => void;

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
export class TopoEventEmitter {
    /** Internal handler registry: event type → ordered list of callbacks. */
    private listeners: Map<TopoEventType, TopoEventHandler[]> = new Map();

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
    public on(type: TopoEventType, handler: TopoEventHandler): void {
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
    public off(type: TopoEventType, handler: TopoEventHandler): void {
        const handlers = this.listeners.get(type);
        if (!handlers) return;
        const idx = handlers.indexOf(handler);
        if (idx !== -1) handlers.splice(idx, 1);
        // Clean up empty arrays to avoid unbounded map growth.
        if (handlers.length === 0) this.listeners.delete(type);
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
    public emit(event: TopoEvent): void {
        const handlers = this.listeners.get(event.type);
        if (!handlers) return;
        // Snapshot the array so that handlers calling off() mid-emit
        // don't cause skips.
        const snapshot = [...handlers];
        for (const handler of snapshot) {
            try {
                handler(event);
            } catch (err) {
                console.error(
                    `[TopoEventEmitter] Error in "${event.type}" handler:`,
                    err
                );
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
    public removeAll(type?: TopoEventType): void {
        if (type) {
            this.listeners.delete(type);
        } else {
            this.listeners.clear();
        }
    }
}
