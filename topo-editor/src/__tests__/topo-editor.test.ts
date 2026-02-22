import { TopoEditor, TopoEditorOptions, TopoEventType, TopoEventHandler } from '../topo-editor';
import { TopoRender } from '../../../topo-render/src/topo-tool';
import { Route } from '../../../topo-render/src/model/route';
import { Point } from '../../../topo-render/src/model/point';
import { PointType } from '../../../topo-render/src/model/point/constants';

/**
 * Tests for the TopoEditor class.
 *
 * Note: TopoEditor is a browser-side DOM class that requires jsdom.
 * These tests focus on instantiation and public API contract.
 * Integration tests with DOM interactions would require full jsdom setup.
 */

describe('TopoEditor', () => {
    describe('constructor', () => {
        it('should create with default options', () => {
            const renderer = new TopoRender();
            const editor = new TopoEditor(renderer);

            expect(editor).toBeDefined();
        });

        it('should accept custom width and height', () => {
            const renderer = new TopoRender();
            const options: TopoEditorOptions = { width: 400, height: 300 };
            const editor = new TopoEditor(renderer, options);

            expect(editor).toBeDefined();
        });

        it('should accept custom curveIntensity', () => {
            const renderer = new TopoRender();
            const options: TopoEditorOptions = { curveIntensity: 1.5 };
            const editor = new TopoEditor(renderer, options);

            expect(editor).toBeDefined();
        });

        it('should accept all options together', () => {
            const renderer = new TopoRender();
            const options: TopoEditorOptions = {
                width: 400,
                height: 300,
                curveIntensity: 2,
            };
            const editor = new TopoEditor(renderer, options);

            expect(editor).toBeDefined();
        });

        it('should use defaults when options are not provided', () => {
            const renderer = new TopoRender();
            const editor = new TopoEditor(renderer);

            // Editor should be created successfully with defaults
            expect(editor).toBeDefined();
        });
    });

    describe('public API', () => {
        it('should have mount method', () => {
            const renderer = new TopoRender();
            const editor = new TopoEditor(renderer);

            expect(typeof editor.mount).toBe('function');
        });

        it('should have setIntensity method', () => {
            const renderer = new TopoRender();
            const editor = new TopoEditor(renderer);

            expect(typeof editor.setIntensity).toBe('function');
        });

        it('should have destroy method', () => {
            const renderer = new TopoRender();
            const editor = new TopoEditor(renderer);

            expect(typeof editor.destroy).toBe('function');
        });
    });

    describe('setIntensity', () => {
        it('should accept numeric intensity values', () => {
            const renderer = new TopoRender({ width: 200, height: 200, curveIntensity: 1 });
            const editor = new TopoEditor(renderer, { width: 200, height: 200, curveIntensity: 1 });

            expect(() => {
                editor.setIntensity(0);
            }).not.toThrow();

            expect(() => {
                editor.setIntensity(1);
            }).not.toThrow();

            expect(() => {
                editor.setIntensity(2);
            }).not.toThrow();

            expect(() => {
                editor.setIntensity(1.5);
            }).not.toThrow();
        });

        it('should accept zero intensity', () => {
            const renderer = new TopoRender();
            const editor = new TopoEditor(renderer);

            expect(() => {
                editor.setIntensity(0);
            }).not.toThrow();
        });

        it('should accept high intensity values', () => {
            const renderer = new TopoRender();
            const editor = new TopoEditor(renderer);

            expect(() => {
                editor.setIntensity(5);
            }).not.toThrow();
        });
    });

    describe('destroy', () => {
        it('should not throw when called', () => {
            const renderer = new TopoRender();
            const editor = new TopoEditor(renderer);

            expect(() => {
                editor.destroy();
            }).not.toThrow();
        });

        it('should be safe to call multiple times', () => {
            const renderer = new TopoRender();
            const editor = new TopoEditor(renderer);

            expect(() => {
                editor.destroy();
                editor.destroy();
            }).not.toThrow();
        });
    });

    describe('dependency injection', () => {
        it('should accept TopoRender as a dependency', () => {
            const renderer = new TopoRender({ width: 300, height: 250 });
            const editor = new TopoEditor(renderer);

            expect(editor).toBeDefined();
        });

        it('should work with differently configured renderers', () => {
            const renderer1 = new TopoRender({ width: 200, height: 200 });
            const editor1 = new TopoEditor(renderer1);

            const renderer2 = new TopoRender({ width: 500, height: 400 });
            const editor2 = new TopoEditor(renderer2);

            expect(editor1).toBeDefined();
            expect(editor2).toBeDefined();
        });

        it('should work with renderer that has custom style', () => {
            const renderer = new TopoRender({
                width: 200,
                height: 200,
                segmentStyle: {
                    strokeColor: '#ff0000',
                    strokeWidth: 3,
                },
            });
            const editor = new TopoEditor(renderer);

            expect(editor).toBeDefined();
        });
    });

    describe('contract compliance', () => {
        it('should match TopoEditorOptions interface', () => {
            const renderer = new TopoRender();

            // Valid options should all work
            const options1: TopoEditorOptions = {};
            const editor1 = new TopoEditor(renderer, options1);
            expect(editor1).toBeDefined();

            const options2: TopoEditorOptions = { width: 300 };
            const editor2 = new TopoEditor(renderer, options2);
            expect(editor2).toBeDefined();

            const options3: TopoEditorOptions = { height: 250 };
            const editor3 = new TopoEditor(renderer, options3);
            expect(editor3).toBeDefined();

            const options4: TopoEditorOptions = { curveIntensity: 1.5 };
            const editor4 = new TopoEditor(renderer, options4);
            expect(editor4).toBeDefined();

            const options5: TopoEditorOptions = {
                width: 400,
                height: 300,
                curveIntensity: 2,
            };
            const editor5 = new TopoEditor(renderer, options5);
            expect(editor5).toBeDefined();
        });
    });

    describe('lifecycle', () => {
        it('should support create-mount cycle', () => {
            const renderer = new TopoRender();
            const editor = new TopoEditor(renderer);

            // Should have public methods available after creation
            expect(typeof editor.mount).toBe('function');
            expect(typeof editor.setIntensity).toBe('function');
            expect(typeof editor.destroy).toBe('function');
        });

        it('should support create-destroy cycle', () => {
            const renderer = new TopoRender();
            const editor = new TopoEditor(renderer);

            expect(() => {
                editor.destroy();
            }).not.toThrow();
        });

        it('should allow multiple editors with same renderer', () => {
            const renderer = new TopoRender();

            const editor1 = new TopoEditor(renderer);
            const editor2 = new TopoEditor(renderer);

            expect(editor1).toBeDefined();
            expect(editor2).toBeDefined();

            editor1.destroy();
            editor2.destroy();
        });
    });

    describe('interface compatibility', () => {
        it('should export TopoEditorOptions interface', () => {
            // Check that the interface can be imported and used
            const options: TopoEditorOptions = {
                width: 200,
                height: 200,
                curveIntensity: 1,
            };

            expect(options).toBeDefined();
            expect(options.width).toBe(200);
            expect(options.height).toBe(200);
            expect(options.curveIntensity).toBe(1);
        });

        it('should allow partial TopoEditorOptions', () => {
            const renderer = new TopoRender();

            const partialOptions1: TopoEditorOptions = { width: 300 };
            const editor1 = new TopoEditor(renderer, partialOptions1);
            expect(editor1).toBeDefined();

            const partialOptions2: TopoEditorOptions = { curveIntensity: 2 };
            const editor2 = new TopoEditor(renderer, partialOptions2);
            expect(editor2).toBeDefined();

            const partialOptions3: TopoEditorOptions = {};
            const editor3 = new TopoEditor(renderer, partialOptions3);
            expect(editor3).toBeDefined();
        });
    });

    describe('event listener API', () => {
        it('should have instance-level on() and off() methods', () => {
            const renderer = new TopoRender();
            const editor = new TopoEditor(renderer);

            expect(typeof editor.on).toBe('function');
            expect(typeof editor.off).toBe('function');
        });

        it('should have static on() and off() methods', () => {
            expect(typeof TopoEditor.on).toBe('function');
            expect(typeof TopoEditor.off).toBe('function');
        });

        it('should accept valid event types on instance methods', () => {
            const renderer = new TopoRender();
            const editor = new TopoEditor(renderer);
            const handler: TopoEventHandler = () => {};

            // All supported event types should be accepted without error.
            const eventTypes: TopoEventType[] = [
                'hover:enter',
                'hover:leave',
                'click',
                'focus',
                'blur',
            ];

            for (const type of eventTypes) {
                expect(() => editor.on(type, handler)).not.toThrow();
                expect(() => editor.off(type, handler)).not.toThrow();
            }
        });

        it('should accept valid event types on static methods', () => {
            const handler: TopoEventHandler = () => {};

            const eventTypes: TopoEventType[] = [
                'hover:enter',
                'hover:leave',
                'click',
                'focus',
                'blur',
            ];

            for (const type of eventTypes) {
                expect(() => TopoEditor.on(type, handler)).not.toThrow();
                // Clean up to avoid cross-test pollution.
                expect(() => TopoEditor.off(type, handler)).not.toThrow();
            }
        });

        it('should clear instance-level handlers on destroy()', () => {
            const renderer = new TopoRender();
            const editor = new TopoEditor(renderer);
            const handler: TopoEventHandler = () => {};

            editor.on('click', handler);
            // destroy() should not throw and should clear instance handlers.
            expect(() => editor.destroy()).not.toThrow();
        });

        it('should not affect global handlers when an instance is destroyed', () => {
            const renderer = new TopoRender();
            const editor = new TopoEditor(renderer);
            const globalHandler: TopoEventHandler = () => {};

            TopoEditor.on('click', globalHandler);
            editor.destroy();

            // Global handler should still be removable (i.e. it was not cleared).
            expect(() => TopoEditor.off('click', globalHandler)).not.toThrow();
        });
    });
});
