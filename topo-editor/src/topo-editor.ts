import { TopoRender } from "../../topo-render/src/topo-tool";
import { Point, PointType } from "../../topo-render/src/model/point";
import { Route } from "../../topo-render/src/model/route";
import { SegmentStyle } from "../../topo-render/src/model/segment";

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/**
 * Configuration options for a {@link TopoEditor} instance.
 *
 * The `width`, `height`, and `curveIntensity` values should match the
 * settings on the {@link TopoRender} instance passed to the constructor
 * so that the editor's live path rebuilding stays consistent with the
 * initial render.
 */
export interface TopoEditorOptions {
    /**
     * Width of the SVG canvas in pixels.
     * @defaultValue 200
     */
    width?: number;

    /**
     * Height of the SVG canvas in pixels.
     * @defaultValue 200
     */
    height?: number;

    /**
     * Catmull-Rom curve intensity scalar.
     *
     * Controls how much the path curves between points:
     * - `0`  — straight lines
     * - `1`  — default Catmull-Rom smoothing
     * - `>1` — increasingly exaggerated curves
     *
     * @defaultValue 1
     */
    curveIntensity?: number;
}

// ---------------------------------------------------------------------------
// Internal data structures
// ---------------------------------------------------------------------------

/**
 * Mutable point data tracked by the editor during drag operations.
 * Coordinates update in real-time as the user repositions a point.
 */
interface EditorPoint {
    /** Unique identifier matching the SVG `data-point-id` attribute. */
    id: number;
    /** Current X coordinate in SVG canvas space. */
    x: number;
    /** Current Y coordinate in SVG canvas space. */
    y: number;
    /** Point type string (e.g. `"bolt"`, `"anchor"`). */
    type: string;
}

/**
 * Internal route representation that references points by ID rather
 * than by object reference. The `style` field is fully resolved with
 * all defaults filled in so the editor never needs to consult the
 * original {@link Route} objects after mounting.
 */
interface EditorRoute {
    /** Route display name. */
    name: string;
    /** Ordered list of {@link EditorPoint.id} values forming this route. */
    pointIds: number[];
    /** Fully resolved segment style. */
    style: Required<SegmentStyle>;
}

// ---------------------------------------------------------------------------
// TopoEditor
// ---------------------------------------------------------------------------

/**
 * Interactive topo editor that mounts into a DOM element.
 *
 * ## Dependency injection
 *
 * The editor receives a pre-configured {@link TopoRender} instance via
 * the constructor. This renderer is used once — to produce the initial
 * SVG markup when {@link mount} is called. After that, the editor owns
 * all DOM updates itself.
 *
 * ## Mounting
 *
 * Call {@link mount} with a CSS selector (or Element reference) and an
 * array of {@link Route} objects. The editor will:
 *
 * 1. Render the initial SVG via {@link TopoRender.render}.
 * 2. Extract point and route metadata into mutable internal structures.
 * 3. Replace shared-segment paths with per-route paths so that each
 *    route maps 1-to-1 with a DOM path element.
 * 4. Bind mouse events for drag-to-reposition interactivity.
 *
 * ## Real-time updates
 *
 * When the user drags a point, the editor:
 * - Updates the mutable {@link EditorPoint} coordinates.
 * - Moves the SVG `<circle>` element.
 * - Rebuilds the SVG `<path>` `d` attribute for every route that passes
 *   through the dragged point, using the same Catmull-Rom → cubic
 *   Bézier conversion as {@link TopoRender}.
 *
 * @example
 * ```ts
 * const renderer = new TopoRender({ width: 400, height: 400 });
 * const editor = new TopoEditor(renderer, { width: 400, height: 400 });
 * editor.mount('#editor-container', myRoutes);
 *
 * // Later, adjust curve smoothing:
 * editor.setIntensity(1.5);
 *
 * // Tear down when done:
 * editor.destroy();
 * ```
 */
export class TopoEditor {
    /** Injected renderer used for the initial SVG generation. */
    private renderer: TopoRender;

    /** SVG canvas width — used to clamp dragged points. */
    private width: number;

    /** SVG canvas height — used to clamp dragged points. */
    private height: number;

    /** Current Catmull-Rom curve intensity for path rebuilding. */
    private curveIntensity: number;

    /** Container element the editor is mounted into. */
    private container: Element | null = null;

    /** Root SVG element created by the initial render. */
    private svg: SVGSVGElement | null = null;

    /** Map of point ID → mutable point data. */
    private points: Map<number, EditorPoint> = new Map();

    /** Ordered list of route data with resolved styles. */
    private routes: EditorRoute[] = [];

    /** Map of point ID → SVG `<circle>` element reference. */
    private circleElements: Map<number, SVGCircleElement> = new Map();

    /** Per-route path element references (main stroke + optional border). */
    private routePathElements: Array<{
        main: SVGPathElement | null;
        border: SVGPathElement | null;
    }> = [];

    /** Reverse index: point ID → list of route indices that include it. */
    private pointToRouteIndices: Map<number, number[]> = new Map();

    /** ID of the point currently being dragged, or `null` when idle. */
    private dragPointId: number | null = null;

    /** Offset between cursor position and point centre at drag start. */
    private dragOffset = { x: 0, y: 0 };

    /** Bound `mousedown` handler (stored for removal in {@link destroy}). */
    private boundMouseDown: (evt: MouseEvent) => void;

    /** Bound `mousemove` handler. */
    private boundMouseMove: (evt: MouseEvent) => void;

    /** Bound `mouseup` handler. */
    private boundMouseUp: () => void;

    /** Bound `mouseleave` handler. */
    private boundMouseLeave: () => void;

    /**
     * Create a new TopoEditor.
     *
     * @param renderer - A configured {@link TopoRender} instance. Its
     *   `width`, `height`, and `curveIntensity` should match the values
     *   in `options` to keep the initial render and live editing consistent.
     * @param options - Optional editor configuration overrides.
     */
    constructor(renderer: TopoRender, options?: TopoEditorOptions) {
        this.renderer = renderer;
        this.width = options?.width ?? 200;
        this.height = options?.height ?? 200;
        this.curveIntensity = options?.curveIntensity ?? 1;

        // Pre-bind event handlers so they can be added and removed by
        // reference without creating new function instances each time.
        this.boundMouseDown = this.handleMouseDown.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundMouseUp = this.endDrag.bind(this);
        this.boundMouseLeave = this.endDrag.bind(this);
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Mount the editor into a DOM element and render the given routes.
     *
     * This is the main entry point after construction. It performs the
     * full setup sequence:
     *
     * 1. Resolve the target container (CSS selector or Element).
     * 2. Render the initial SVG via the injected {@link TopoRender}.
     * 3. Extract and store mutable point / route metadata.
     * 4. Replace TopoRender's shared-segment paths with simple per-route
     *    paths for predictable drag updates.
     * 5. Index which routes pass through each point.
     * 6. Bind mouse event listeners for drag interaction.
     *
     * @param target - CSS selector string **or** a DOM Element.
     * @param routes - The climbing routes to render and make editable.
     * @throws Error if the selector doesn't match any element.
     */
    public mount(target: string | Element, routes: Route[]): void {
        // Resolve the container element.
        this.container = typeof target === "string"
            ? document.querySelector(target)
            : target;

        if (!this.container) {
            throw new Error(`TopoEditor: target "${target}" not found`);
        }

        // 1. Initial SVG render via the injected renderer.
        const svgString = this.renderer.render(routes);
        this.container.innerHTML = svgString;
        this.svg = this.container.querySelector("svg")!;

        // 2. Build mutable internal data from the route objects.
        this.extractPointData(routes);
        this.extractRouteData(routes);

        // 3. Collect circle element references from the rendered SVG.
        this.collectCircleElements();

        // 4. Replace TopoRender paths with per-route paths.
        this.replacePathsWithPerRoute();

        // 5. Build the point → route reverse index.
        this.buildPointToRouteIndex();

        // 6. Attach drag event listeners to the SVG.
        this.bindEvents();
    }

    /**
     * Update the Catmull-Rom curve intensity and immediately rebuild
     * every route's path to reflect the new value.
     *
     * @param intensity - New curve intensity (0 = straight, 1 = default).
     */
    public setIntensity(intensity: number): void {
        this.curveIntensity = intensity;
        this.rebuildAllRoutes();
    }

    /**
     * Tear down the editor: remove event listeners and release DOM
     * references. Call this before discarding the editor instance to
     * prevent memory leaks.
     */
    public destroy(): void {
        this.unbindEvents();
        this.container = null;
        this.svg = null;
    }

    // -----------------------------------------------------------------------
    // Data extraction
    // -----------------------------------------------------------------------

    /**
     * Walk every route and extract a deduplicated set of point data.
     *
     * Points are identified by **object reference** — the same `Point`
     * instance shared across multiple routes receives a single ID. This
     * matches how {@link TopoRender} assigns `data-point-id` attributes,
     * keeping the editor's internal IDs in sync with the DOM.
     *
     * @param routes - Source routes containing `Point` instances.
     */
    private extractPointData(routes: Route[]): void {
        this.points.clear();
        const seen = new Map<Point<PointType>, number>();
        let nextId = 0;

        for (const route of routes) {
            for (const p of route.points) {
                if (!seen.has(p)) {
                    seen.set(p, nextId);
                    this.points.set(nextId, {
                        id: nextId,
                        x: p.x,
                        y: p.y,
                        type: p.type,
                    });
                    nextId++;
                }
            }
        }
    }

    /**
     * Convert `Route` objects into the editor's internal format.
     *
     * Each route's points are mapped to IDs (matching those assigned in
     * {@link extractPointData}), and the segment style is resolved with
     * all defaults filled in so subsequent code never needs to handle
     * `undefined` style properties.
     *
     * @param routes - Source routes to convert.
     */
    private extractRouteData(routes: Route[]): void {
        // Build the same ref → id map as extractPointData.
        const refToId = new Map<Point<PointType>, number>();
        let id = 0;
        for (const route of routes) {
            for (const p of route.points) {
                if (!refToId.has(p)) {
                    refToId.set(p, id++);
                }
            }
        }

        this.routes = routes.map((r) => ({
            name: r.name,
            pointIds: r.points.map((p) => refToId.get(p)!),
            style: {
                strokeWidth: r.style?.strokeWidth ?? 2,
                strokeColor: r.style?.strokeColor ?? "#ffffff",
                borderWidth: r.style?.borderWidth ?? 0,
                borderColor: r.style?.borderColor ?? "#000000",
            },
        }));
    }

    /**
     * Scan the SVG for `.topo-point` circle elements and store
     * references keyed by `data-point-id`.
     *
     * These references are used during drag operations to move circles
     * without querying the DOM repeatedly.
     */
    private collectCircleElements(): void {
        this.circleElements.clear();
        this.svg!.querySelectorAll(".topo-point").forEach((el) => {
            const id = parseInt(el.getAttribute("data-point-id") ?? "", 10);
            if (!isNaN(id)) {
                this.circleElements.set(id, el as SVGCircleElement);
            }
        });
    }

    // -----------------------------------------------------------------------
    // Path management
    // -----------------------------------------------------------------------

    /**
     * Remove all TopoRender-generated `<path>` elements and replace
     * them with one path per route.
     *
     * **Why?** — TopoRender detects shared segments across routes and
     * merges them into single thicker paths. This is great for static
     * display but makes live editing difficult because there is no
     * simple 1-to-1 mapping from route index to path element.
     *
     * By creating one `<path>` per route (plus an optional border
     * path), the editor can update any route's path independently
     * when one of its points is dragged.
     *
     * New paths are inserted **before** the first circle element so
     * that points always render on top of paths.
     */
    private replacePathsWithPerRoute(): void {
        // Remove existing paths (shared and unique).
        this.svg!.querySelectorAll(".topo-path, .topo-path-border").forEach(
            (el) => el.remove()
        );

        // Insertion anchor: all new paths go before the first circle.
        const firstCircle = this.svg!.querySelector(".topo-point");
        this.routePathElements = [];

        for (const r of this.routes) {
            const pts = r.pointIds.map((id) => this.points.get(id)!);
            const d = this.buildPathD(pts);

            const els: {
                main: SVGPathElement | null;
                border: SVGPathElement | null;
            } = { main: null, border: null };

            // Optional border path (wider stroke behind the main path).
            if (r.style.borderWidth > 0) {
                const borderStroke =
                    r.style.strokeWidth + 2 * r.style.borderWidth;
                els.border = this.createPathElement(
                    d,
                    r.style.borderColor,
                    borderStroke,
                    "topo-path-border"
                );
                this.svg!.insertBefore(els.border, firstCircle);
            }

            // Main stroke path.
            els.main = this.createPathElement(
                d,
                r.style.strokeColor,
                r.style.strokeWidth,
                "topo-path"
            );
            this.svg!.insertBefore(els.main, firstCircle);
            this.routePathElements.push(els);
        }
    }

    /**
     * Build a reverse index mapping each point ID to the list of route
     * indices that include it.
     *
     * When a point is dragged, this index tells us exactly which routes
     * need their paths rebuilt — avoiding a full scan of every route on
     * every mouse-move event.
     */
    private buildPointToRouteIndex(): void {
        this.pointToRouteIndices.clear();
        this.routes.forEach((r, ri) => {
            for (const pid of r.pointIds) {
                if (!this.pointToRouteIndices.has(pid)) {
                    this.pointToRouteIndices.set(pid, []);
                }
                const arr = this.pointToRouteIndices.get(pid)!;
                if (!arr.includes(ri)) arr.push(ri);
            }
        });
    }

    // -----------------------------------------------------------------------
    // SVG path helpers
    // -----------------------------------------------------------------------

    /**
     * Build an SVG path `d` attribute using Catmull-Rom to cubic Bézier
     * conversion.
     *
     * This mirrors the algorithm in {@link Segment.buildPathD} but
     * operates on the editor's mutable `{ x, y }` point data instead
     * of `Point` class instances.
     *
     * ### Algorithm
     *
     * For each segment between consecutive points `p1` and `p2`, we
     * compute two cubic Bézier control points using the surrounding
     * points `p0` (predecessor) and `p3` (successor):
     *
     * ```
     * factor = intensity / 6
     * C1 = p1 + (p2 − p0) × factor
     * C2 = p2 − (p3 − p1) × factor
     * ```
     *
     * At the path boundaries, `p0` and `p3` are clamped to the
     * endpoint itself, producing a natural deceleration into the
     * first/last point.
     *
     * @param pts - Ordered array of points with `x` and `y` properties.
     * @returns The SVG path `d` string, or `""` if fewer than 2 points.
     */
    private buildPathD(pts: Array<{ x: number; y: number }>): string {
        if (pts.length < 2) return "";

        const intensity = Math.max(0, this.curveIntensity);
        let d = `M ${pts[0].x} ${pts[0].y}`;

        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = i === 0 ? pts[i] : pts[i - 1];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = i === pts.length - 2 ? pts[i + 1] : pts[i + 2];

            const factor = intensity / 6;
            const c1x = p1.x + (p2.x - p0.x) * factor;
            const c1y = p1.y + (p2.y - p0.y) * factor;
            const c2x = p2.x - (p3.x - p1.x) * factor;
            const c2y = p2.y - (p3.y - p1.y) * factor;

            d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
        }

        return d;
    }

    /**
     * Create an SVG `<path>` element in the SVG namespace with the
     * given visual attributes.
     *
     * @param d           - SVG path data string.
     * @param stroke      - Stroke colour (CSS colour value).
     * @param strokeWidth - Stroke width in pixels.
     * @param className   - CSS class name (e.g. `"topo-path"`).
     * @returns A new `<path>` element ready to insert into the SVG.
     */
    private createPathElement(
        d: string,
        stroke: string,
        strokeWidth: number,
        className: string
    ): SVGPathElement {
        const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
        );
        path.setAttribute("class", className);
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", stroke);
        path.setAttribute("stroke-width", String(strokeWidth));
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        return path;
    }

    // -----------------------------------------------------------------------
    // Route rebuilding
    // -----------------------------------------------------------------------

    /**
     * Rebuild a single route's SVG path `d` attribute from the current
     * (possibly dragged) point positions.
     *
     * @param routeIndex - Index into {@link routes} and
     *   {@link routePathElements}.
     */
    private rebuildRoute(routeIndex: number): void {
        const r = this.routes[routeIndex];
        const pts = r.pointIds.map((id) => this.points.get(id)!);
        const d = this.buildPathD(pts);
        const els = this.routePathElements[routeIndex];
        if (els.main) els.main.setAttribute("d", d);
        if (els.border) els.border.setAttribute("d", d);
    }

    /**
     * Rebuild every route's path. Called when a global parameter
     * changes (e.g. curve intensity via {@link setIntensity}).
     */
    private rebuildAllRoutes(): void {
        for (let i = 0; i < this.routes.length; i++) {
            this.rebuildRoute(i);
        }
    }

    // -----------------------------------------------------------------------
    // Event binding
    // -----------------------------------------------------------------------

    /**
     * Attach mouse event listeners to the SVG element for drag
     * interaction. Uses the pre-bound handler references so that
     * {@link unbindEvents} can remove them later.
     */
    private bindEvents(): void {
        const svg = this.svg!;
        svg.addEventListener("mousedown", this.boundMouseDown as EventListener);
        svg.addEventListener("mousemove", this.boundMouseMove as EventListener);
        svg.addEventListener("mouseup", this.boundMouseUp);
        svg.addEventListener("mouseleave", this.boundMouseLeave);
    }

    /**
     * Remove all mouse event listeners from the SVG element.
     * Called by {@link destroy}.
     */
    private unbindEvents(): void {
        if (!this.svg) return;
        this.svg.removeEventListener(
            "mousedown",
            this.boundMouseDown as EventListener
        );
        this.svg.removeEventListener(
            "mousemove",
            this.boundMouseMove as EventListener
        );
        this.svg.removeEventListener("mouseup", this.boundMouseUp);
        this.svg.removeEventListener("mouseleave", this.boundMouseLeave);
    }

    // -----------------------------------------------------------------------
    // Drag handling
    // -----------------------------------------------------------------------

    /**
     * Convert a mouse event's client coordinates to SVG canvas
     * coordinates using the SVG element's current screen transform
     * matrix. This accounts for any CSS transforms, scrolling, or
     * scaling applied to the page.
     *
     * @param evt - The mouse event to transform.
     * @returns An `{ x, y }` object in SVG canvas space.
     */
    private getSVGPoint(evt: MouseEvent): { x: number; y: number } {
        const pt = this.svg!.createSVGPoint();
        pt.x = evt.clientX;
        pt.y = evt.clientY;
        const ctm = this.svg!.getScreenCTM()!.inverse();
        const transformed = pt.matrixTransform(ctm);
        return { x: transformed.x, y: transformed.y };
    }

    /**
     * Handle `mousedown` on a `.topo-point` circle to begin a drag
     * operation.
     *
     * Records the offset between the cursor position and the point
     * centre so that the point doesn't "jump" to the cursor — it
     * moves relative to where the user clicked.
     *
     * @param evt - The mousedown event.
     */
    private handleMouseDown(evt: MouseEvent): void {
        const target = evt.target as Element;
        if (!target.classList?.contains("topo-point")) return;

        const pid = parseInt(
            target.getAttribute("data-point-id") ?? "",
            10
        );
        if (isNaN(pid)) return;

        this.dragPointId = pid;
        target.classList.add("dragging");

        const svgPt = this.getSVGPoint(evt);
        const point = this.points.get(pid)!;
        this.dragOffset.x = point.x - svgPt.x;
        this.dragOffset.y = point.y - svgPt.y;
        evt.preventDefault();
    }

    /**
     * Handle `mousemove` while a drag is active.
     *
     * Updates the dragged point's coordinates (clamped to the SVG
     * canvas bounds), moves the SVG circle element, and rebuilds the
     * path for every route that passes through this point.
     *
     * @param evt - The mousemove event.
     */
    private handleMouseMove(evt: MouseEvent): void {
        if (this.dragPointId === null) return;

        const svgPt = this.getSVGPoint(evt);
        const newX = Math.max(
            0,
            Math.min(this.width, svgPt.x + this.dragOffset.x)
        );
        const newY = Math.max(
            0,
            Math.min(this.height, svgPt.y + this.dragOffset.y)
        );

        // Update internal point data.
        const point = this.points.get(this.dragPointId)!;
        point.x = newX;
        point.y = newY;

        // Move the SVG circle.
        const circle = this.circleElements.get(this.dragPointId);
        if (circle) {
            circle.setAttribute("cx", String(newX));
            circle.setAttribute("cy", String(newY));
        }

        // Rebuild every route that includes this point.
        const affected =
            this.pointToRouteIndices.get(this.dragPointId) ?? [];
        for (const ri of affected) {
            this.rebuildRoute(ri);
        }

        evt.preventDefault();
    }

    /**
     * End the current drag operation. Removes the `"dragging"` CSS
     * class from the circle element and resets the drag state.
     *
     * Called on `mouseup` and `mouseleave`.
     */
    private endDrag(): void {
        if (this.dragPointId === null) return;
        const circle = this.circleElements.get(this.dragPointId);
        if (circle) circle.classList.remove("dragging");
        this.dragPointId = null;
    }
}
