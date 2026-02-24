import { Point, PointType } from "./model/point";
import { Segment, SegmentStyle } from "./model/segment";
import { Route } from "./model/route";

export interface TopoRenderOptions {
    /**
     * Width of the SVG canvas in pixels.
     *
     * Defaults to 200.
     */
    width?: number;

    /**
     * Height of the SVG canvas in pixels.
     *
     * Defaults to 200.
     */
    height?: number;

    /**
     * Intensity of the curve for route segments.
     *
     * This is a scalar applied to the Catmull–Rom based control point
     * calculation when converting to cubic Bézier segments:
     *
     *   - 0   → straight lines between points
     *   - 1   → default smoothing
     *   - > 1 → increasingly exaggerated curves
     */
    curveIntensity?: number;

    /**
     * Default segment style applied to all segments/routes unless
     * overridden per-route.
     */
    segmentStyle?: SegmentStyle;
}

/**
 * Instantiates a new render object for a given topo / image.
 */
export class TopoRender {
    private image?: string;
    private width: number;
    private height: number;
    private curveIntensity: number;
    private segmentStyle?: SegmentStyle;

    constructor(options: TopoRenderOptions = {}) {
        this.width = options.width ?? 200;
        this.height = options.height ?? 200;
        this.curveIntensity = options.curveIntensity ?? 1;
        this.segmentStyle = options.segmentStyle;
    }

    /**
     * Initialize the topo render object
     */
    public init(imageHref?: string): void {
        this.image = imageHref;
    }

    /**
     * Render the given routes to an SVG string.
     *
     * Each {@link Route} contains an ordered list of points that form a
     * climbing line. When multiple routes share the same point references,
     * the shared edges are detected automatically and rendered as a single
     * thicker segment, while unique sections retain their per-route style.
     *
     * An optional background image can be supplied via `imageHref` (or
     * pre-set with {@link init}). When no image is provided, a solid black
     * rectangle is used so that points and paths remain visible.
     *
     * @param routes    - The climbing routes to render.
     * @param imageHref - Optional URL/data-URI for a background image.
     * @returns A self-contained SVG string.
     */
    public render(routes: Route[], imageHref?: string): string {
        const width = this.width;
        const height = this.height;
        const effectiveImageHref = imageHref ?? this.image;
        const svgParts: string[] = [];

        svgParts.push(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
        );

        if (effectiveImageHref) {
            svgParts.push(
                `<image href="${effectiveImageHref}" x="0" y="0" width="${width}" height="${height}" />`
            );
        } else {
            svgParts.push(
                `<rect x="0" y="0" width="${width}" height="${height}" fill="black" />`
            );
        }

        // Build a count of how many routes traverse each undirected edge.
        // Using a canonical (direction-agnostic) key means a route traversing
        // P→Q and another traversing Q→P both increment the same counter, so
        // opposite-direction traversals of the same physical segment are
        // correctly identified as shared.
        const edgeRouteCount = new Map<string, number>();

        for (let ri = 0; ri < routes.length; ri++) {
            const pts = routes[ri].points;
            for (let i = 0; i < pts.length - 1; i++) {
                const key = canonicalEdgeKey(pts[i], pts[i + 1]);
                edgeRouteCount.set(key, (edgeRouteCount.get(key) ?? 0) + 1);
            }
        }

        // Returns true when two or more routes traverse this edge in any direction.
        const isShared = (a: Point<PointType>, b: Point<PointType>) =>
            (edgeRouteCount.get(canonicalEdgeKey(a, b)) ?? 0) > 1;

        // Walk each route and split it into contiguous sub-paths where
        // every edge is either shared or unique. Adjacent sub-paths
        // overlap by one point to keep path continuity.
        interface SubPath {
            points: Array<Point<PointType>>;
            shared: boolean;
            routeIndex: number;
        }

        const allSubPaths: SubPath[] = [];

        for (let ri = 0; ri < routes.length; ri++) {
            const pts = routes[ri].points;
            if (pts.length < 2) continue;

            let currentPoints: Array<Point<PointType>> = [pts[0]];
            let currentShared = isShared(pts[0], pts[1]);

            for (let i = 0; i < pts.length - 1; i++) {
                const shared = isShared(pts[i], pts[i + 1]);
                if (shared !== currentShared) {
                    // Finish current sub-path
                    allSubPaths.push({ points: currentPoints, shared: currentShared, routeIndex: ri });
                    // Start new sub-path, overlapping by one point for continuity
                    currentPoints = [pts[i]];
                    currentShared = shared;
                }
                currentPoints.push(pts[i + 1]);
            }
            allSubPaths.push({ points: currentPoints, shared: currentShared, routeIndex: ri });
        }

        // Deduplicate shared sub-paths so overlapping routes don't draw
        // the same shared segment twice.
        const renderedSharedKeys = new Set<string>();
        const sharedSubPaths: SubPath[] = [];
        const uniqueSubPaths: SubPath[] = [];

        for (const sp of allSubPaths) {
            if (sp.shared) {
                // Normalise key direction so [P1,P2,P3] and [P3,P2,P1] collapse
                // to the same shared segment and are rendered only once.
                const ids = sp.points.map(p => refPointId(p));
                const fwd = ids.join(',');
                const rev = [...ids].reverse().join(',');
                const key = fwd <= rev ? fwd : rev;
                if (!renderedSharedKeys.has(key)) {
                    renderedSharedKeys.add(key);
                    sharedSubPaths.push(sp);
                }
            } else {
                uniqueSubPaths.push(sp);
            }
        }

        // -----------------------------------------------------------------------
        // Junction reference directions
        //
        // At each junction between a unique and a shared sub-path, every path—
        // including the shared segment itself—must arrive/depart in exactly the
        // same direction so the join looks seamless.
        //
        // We choose this "reference direction" as the natural arrival/departure
        // direction of whichever unique path makes the SMALLEST angle with the
        // shared segment's own axis (largest dot product). This avoids pulling
        // every route toward an averaged direction that none of them naturally
        // approaches from.
        //
        // If no unique paths exist at a junction (e.g. the shared segment starts
        // at the very first point of every route) the shared segment's own
        // natural axis is used as the reference, keeping the path unchanged.
        //
        // Formulae (Catmull–Rom → cubic Bézier, factor = intensity/6):
        //
        //   Convergence (unique → shared, junction = firstPt of shared):
        //     sharedAxis  = normalize(interiorFirst − junction)
        //     refDir      = natDir of min-angle unique arrival
        //
        //     Unique sub-path p3Override (per-path, scaled by |junction − p_prev|):
        //       p3Override = p_prev + |junction − p_prev| × refDir
        //
        //     Shared segment p0Override:
        //       p0Override = interiorFirst − |interiorFirst − junction| × refDir
        //
        //   Divergence (shared → unique, junction = lastPt of shared):
        //     sharedAxis  = normalize(junction − interiorLast)
        //     refDir      = natDir of min-angle unique departure
        //
        //     Unique sub-path p0Override (per-path, scaled by |p_next − junction|):
        //       p0Override = p_next − |p_next − junction| × refDir
        //
        //     Shared segment p3Override:
        //       p3Override = interiorLast + |junction − interiorLast| × refDir
        // -----------------------------------------------------------------------

        interface JunctionRef {
            /** Unit reference direction. */
            refDir: { x: number; y: number };
            /** The interior point of the shared segment adjacent to the junction. */
            sharedInteriorPt: Point<PointType>;
        }

        const convergenceRefs = new Map<Point<PointType>, JunctionRef>();
        const divergenceRefs  = new Map<Point<PointType>, JunctionRef>();

        // Index unique sub-paths by their endpoint so we can iterate over all
        // routes arriving at or departing from each junction point.
        const uniqueEndingAt   = new Map<Point<PointType>, SubPath[]>();
        const uniqueStartingAt = new Map<Point<PointType>, SubPath[]>();

        for (const sp of uniqueSubPaths) {
            if (sp.points.length < 2) continue;
            const first = sp.points[0];
            const last  = sp.points[sp.points.length - 1];
            if (!uniqueStartingAt.has(first)) uniqueStartingAt.set(first, []);
            uniqueStartingAt.get(first)!.push(sp);
            if (!uniqueEndingAt.has(last)) uniqueEndingAt.set(last, []);
            uniqueEndingAt.get(last)!.push(sp);
        }

        for (const sp of sharedSubPaths) {
            if (sp.points.length < 2) continue;

            const firstPt       = sp.points[0];
            const lastPt        = sp.points[sp.points.length - 1];
            const interiorFirst = sp.points[1];
            const interiorLast  = sp.points[sp.points.length - 2];

            // ---- Convergence ----
            // Shared segment's natural departure axis at firstPt.
            const sharedDepartAxis = vecNorm({
                x: interiorFirst.x - firstPt.x,
                y: interiorFirst.y - firstPt.y,
            });

            // Scan unique paths arriving at firstPt; pick the one whose natural
            // arrival direction has the smallest angle to the shared axis.
            let convRefDir = sharedDepartAxis;
            let convMaxDot = -2;

            for (const up of (uniqueEndingAt.get(firstPt) ?? [])) {
                const pPrev  = up.points[up.points.length - 2];
                const natDir = vecNorm({
                    x: firstPt.x - pPrev.x,
                    y: firstPt.y - pPrev.y,
                });
                const dot = natDir.x * sharedDepartAxis.x + natDir.y * sharedDepartAxis.y;
                if (dot > convMaxDot) { convMaxDot = dot; convRefDir = natDir; }
            }

            convergenceRefs.set(firstPt, { refDir: convRefDir, sharedInteriorPt: interiorFirst });

            // ---- Divergence ----
            const sharedArrivalAxis = vecNorm({
                x: lastPt.x - interiorLast.x,
                y: lastPt.y - interiorLast.y,
            });

            let divRefDir = sharedArrivalAxis;
            let divMaxDot = -2;

            for (const up of (uniqueStartingAt.get(lastPt) ?? [])) {
                const pNext  = up.points[1];
                const natDir = vecNorm({
                    x: pNext.x - lastPt.x,
                    y: pNext.y - lastPt.y,
                });
                const dot = natDir.x * sharedArrivalAxis.x + natDir.y * sharedArrivalAxis.y;
                if (dot > divMaxDot) { divMaxDot = dot; divRefDir = natDir; }
            }

            divergenceRefs.set(lastPt, { refDir: divRefDir, sharedInteriorPt: interiorLast });
        }

        // Render shared segments with a slightly thicker stroke so they
        // are visually distinct from per-route segments.
        // The boundary tangents are forced to the reference direction so the
        // rendered path is identical regardless of which or how many unique
        // sub-paths are attached to it.
        const sharedStyle: SegmentStyle = {
            strokeWidth: (this.segmentStyle?.strokeWidth ?? 2) + 1,
            strokeColor: this.segmentStyle?.strokeColor ?? '#ffffff',
            borderWidth: this.segmentStyle?.borderWidth ?? 0,
            borderColor: this.segmentStyle?.borderColor ?? '#000000',
        };

        for (const sp of sharedSubPaths) {
            if (sp.points.length < 2) continue;

            const firstPt = sp.points[0];
            const lastPt  = sp.points[sp.points.length - 1];

            let p0Override: { x: number; y: number } | undefined;
            let p3Override: { x: number; y: number } | undefined;

            const convRef = convergenceRefs.get(firstPt);
            if (convRef) {
                // c1 = firstPt + (interiorFirst − p0Override) × factor
                // For departure direction = refDir:
                //   interiorFirst − p0Override = dist × refDir
                //   p0Override = interiorFirst − dist × refDir
                const si   = convRef.sharedInteriorPt;
                const dist = vecLen({ x: si.x - firstPt.x, y: si.y - firstPt.y });
                p0Override = {
                    x: si.x - dist * convRef.refDir.x,
                    y: si.y - dist * convRef.refDir.y,
                };
            }

            const divRef = divergenceRefs.get(lastPt);
            if (divRef) {
                // c2 = lastPt − (p3Override − interiorLast) × factor
                // For arrival direction = refDir:
                //   p3Override − interiorLast = dist × refDir
                //   p3Override = interiorLast + dist × refDir
                const si   = divRef.sharedInteriorPt;
                const dist = vecLen({ x: lastPt.x - si.x, y: lastPt.y - si.y });
                p3Override = {
                    x: si.x + dist * divRef.refDir.x,
                    y: si.y + dist * divRef.refDir.y,
                };
            }

            const d = Segment.buildPathD(sp.points, this.curveIntensity, p0Override, p3Override);
            svgParts.push(Segment.renderPathSvg(d, sharedStyle));
        }

        // Render unique (non-shared) sub-paths.
        // Each path ending at a convergence junction or starting at a divergence
        // junction receives a per-path p3Override / p0Override that forces its
        // boundary tangent to match the junction's reference direction.
        //
        // The override must be scaled by the individual segment length because a
        // single fixed target point produces different tangent directions for
        // routes with different predecessor/successor distances.
        for (const sp of uniqueSubPaths) {
            const route = routes[sp.routeIndex];
            const style = route.style ?? this.segmentStyle;

            let p0Override: { x: number; y: number } | undefined;
            let p3Override: { x: number; y: number } | undefined;

            if (sp.points.length >= 2) {
                // Divergence: path starts at the end of a shared segment.
                const divRef = divergenceRefs.get(sp.points[0]);
                if (divRef) {
                    const junction = sp.points[0];
                    const pNext    = sp.points[1];
                    const scale    = vecLen({ x: pNext.x - junction.x, y: pNext.y - junction.y });
                    p0Override = {
                        x: pNext.x - scale * divRef.refDir.x,
                        y: pNext.y - scale * divRef.refDir.y,
                    };
                }

                // Convergence: path ends at the start of a shared segment.
                const lastPt  = sp.points[sp.points.length - 1];
                const convRef = convergenceRefs.get(lastPt);
                if (convRef) {
                    const pPrev = sp.points[sp.points.length - 2];
                    const scale = vecLen({ x: lastPt.x - pPrev.x, y: lastPt.y - pPrev.y });
                    p3Override = {
                        x: pPrev.x + scale * convRef.refDir.x,
                        y: pPrev.y + scale * convRef.refDir.y,
                    };
                }
            }

            const d = Segment.buildPathD(sp.points, this.curveIntensity, p0Override, p3Override);
            svgParts.push(Segment.renderPathSvg(d, style));
        }

        // Render all points on top of the paths (deduplicated by reference).
        const renderedPoints = new Set<Point<PointType>>();
        let pointIdCounter = 0;
        for (const route of routes) {
            for (const p of route.points) {
                if (!renderedPoints.has(p)) {
                    renderedPoints.add(p);
                    svgParts.push(p.render(pointIdCounter++));
                }
            }
        }

        svgParts.push(`</svg>`);
        return svgParts.join("");
    }
}

// --- Reference-identity helpers ---
let nextPointId = 1;
const pointIdMap = new WeakMap<Point<PointType>, number>();

/**
 * Return a stable numeric ID for a Point instance.
 * IDs are assigned on first access and stored in a WeakMap so they do not
 * prevent garbage collection of the point objects.
 */
function refPointId(p: Point<PointType>): number {
    let id = pointIdMap.get(p);
    if (id === undefined) {
        id = nextPointId++;
        pointIdMap.set(p, id);
    }
    return id;
}

/**
 * Canonical undirected edge key.
 * Produces the same string for (a, b) and (b, a) so shared-edge detection
 * is direction-agnostic: routes that traverse the same physical segment in
 * opposite directions are treated as sharing it.
 */
function canonicalEdgeKey(a: Point<PointType>, b: Point<PointType>): string {
    const ia = refPointId(a), ib = refPointId(b);
    return ia < ib ? `${ia}:${ib}` : `${ib}:${ia}`;
}

/** Return the unit vector of v, or {0, 0} for a near-zero input. */
function vecNorm(v: { x: number; y: number }): { x: number; y: number } {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len < 1e-10) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
}

/** Euclidean length of a 2-D vector. */
function vecLen(v: { x: number; y: number }): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}
