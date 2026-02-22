"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const topo_event_emitter_1 = require("../topo-event-emitter");
/**
 * Helper to create a minimal TopoEvent payload for testing.
 * Only the `type` field matters for emission routing; other
 * fields are set to safe defaults.
 */
function makeEvent(type, overrides = {}) {
    return {
        type,
        pointId: null,
        pointType: null,
        routeIndex: null,
        routeIndices: [],
        target: null,
        originalEvent: null,
        instance: null,
        ...overrides,
    };
}
describe("TopoEventEmitter", () => {
    let emitter;
    beforeEach(() => {
        emitter = new topo_event_emitter_1.TopoEventEmitter();
    });
    // -----------------------------------------------------------------
    // on() + emit()
    // -----------------------------------------------------------------
    it("should call a registered handler when the matching event is emitted", () => {
        const handler = jest.fn();
        emitter.on("click", handler);
        const event = makeEvent("click");
        emitter.emit(event);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(event);
    });
    it("should not call a handler registered for a different event type", () => {
        const handler = jest.fn();
        emitter.on("click", handler);
        emitter.emit(makeEvent("hover:enter"));
        expect(handler).not.toHaveBeenCalled();
    });
    // -----------------------------------------------------------------
    // Multiple handlers
    // -----------------------------------------------------------------
    it("should call multiple handlers in registration order", () => {
        const order = [];
        const handlerA = () => order.push(1);
        const handlerB = () => order.push(2);
        emitter.on("click", handlerA);
        emitter.on("click", handlerB);
        emitter.emit(makeEvent("click"));
        expect(order).toEqual([1, 2]);
    });
    // -----------------------------------------------------------------
    // off()
    // -----------------------------------------------------------------
    it("should not call a handler after it has been removed with off()", () => {
        const handler = jest.fn();
        emitter.on("click", handler);
        emitter.off("click", handler);
        emitter.emit(makeEvent("click"));
        expect(handler).not.toHaveBeenCalled();
    });
    it("should be a no-op when removing a handler that was never registered", () => {
        const handler = jest.fn();
        // Should not throw.
        expect(() => emitter.off("click", handler)).not.toThrow();
    });
    // -----------------------------------------------------------------
    // Duplicate registration guard
    // -----------------------------------------------------------------
    it("should not fire the same handler twice when registered twice for the same type", () => {
        const handler = jest.fn();
        emitter.on("click", handler);
        emitter.on("click", handler);
        emitter.emit(makeEvent("click"));
        expect(handler).toHaveBeenCalledTimes(1);
    });
    // -----------------------------------------------------------------
    // removeAll()
    // -----------------------------------------------------------------
    it("should remove all handlers for all types when called without arguments", () => {
        const clickHandler = jest.fn();
        const hoverHandler = jest.fn();
        emitter.on("click", clickHandler);
        emitter.on("hover:enter", hoverHandler);
        emitter.removeAll();
        emitter.emit(makeEvent("click"));
        emitter.emit(makeEvent("hover:enter"));
        expect(clickHandler).not.toHaveBeenCalled();
        expect(hoverHandler).not.toHaveBeenCalled();
    });
    it("should remove only handlers for the specified type when a type is given", () => {
        const clickHandler = jest.fn();
        const hoverHandler = jest.fn();
        emitter.on("click", clickHandler);
        emitter.on("hover:enter", hoverHandler);
        emitter.removeAll("click");
        emitter.emit(makeEvent("click"));
        emitter.emit(makeEvent("hover:enter"));
        expect(clickHandler).not.toHaveBeenCalled();
        expect(hoverHandler).toHaveBeenCalledTimes(1);
    });
    // -----------------------------------------------------------------
    // Error isolation
    // -----------------------------------------------------------------
    it("should continue calling subsequent handlers when one throws", () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation(() => { });
        const badHandler = () => {
            throw new Error("boom");
        };
        const goodHandler = jest.fn();
        emitter.on("click", badHandler);
        emitter.on("click", goodHandler);
        emitter.emit(makeEvent("click"));
        // The good handler should still have been called despite the throw.
        expect(goodHandler).toHaveBeenCalledTimes(1);
        // The error should have been logged.
        expect(errorSpy).toHaveBeenCalledTimes(1);
        errorSpy.mockRestore();
    });
    // -----------------------------------------------------------------
    // Safe mutation during emit
    // -----------------------------------------------------------------
    it("should not skip handlers when a handler removes itself during emit", () => {
        const order = [];
        const selfRemover = () => {
            order.push("self-remover");
            emitter.off("click", selfRemover);
        };
        const after = () => {
            order.push("after");
        };
        emitter.on("click", selfRemover);
        emitter.on("click", after);
        emitter.emit(makeEvent("click"));
        // Both should have run because emit() snapshots the handler array.
        expect(order).toEqual(["self-remover", "after"]);
        // On a second emit, only "after" should run since selfRemover was removed.
        order.length = 0;
        emitter.emit(makeEvent("click"));
        expect(order).toEqual(["after"]);
    });
});
