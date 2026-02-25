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
        // The "reference direction" is computed at BOTH endpoints of each shared
        // sub-path. At each junction, ALL unique paths — both arrivals and
        // departures — contribute to a single averaged direction. Departures are
        // negated so they point toward the shared interior, making them
        // comparable with arrivals. The average sits exactly between all
        // branches (e.g. a Y-junction trunk goes straight when two branches
        // splay equally left and right).
        //
        // The divergence ref is the negation of the convergence ref. This
        // guarantees that opposite-direction routes produce reversal-compatible
        // Bézier curves through the shared segment.
        //
        // If no unique paths exist at a junction (e.g. the shared segment starts
        // at the very first point of every route) the shared segment's own
        // natural axis is used as the reference, keeping the path unchanged.
        //
        // Formulae (Catmull–Rom → cubic Bézier, factor = intensity/6):
        //
        //   At each junction J with adjacent interior point I:
        //     sharedAxis  = normalize(I − J)
        //     refDir      = normalize( Σ approach_i )
        //       where approach_i = normalize(J − pPrev) for arrivals
        //                        = normalize(J − pNext) for departures (negated)
        //
        //   Convergence (convRef = refDir, points INTO shared segment):
        //     Unique sub-path p3Override:  p_prev + |J − p_prev| × convRef
        //     Shared segment  p0Override:  I − |I − J| × convRef
        //
        //   Divergence  (divRef = −refDir, points AWAY from shared segment):
        //     Unique sub-path p0Override:  p_next − |p_next − J| × divRef
        //     Shared segment  p3Override:  I + |J − I| × divRef
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

            // Process BOTH endpoints of the shared segment. Each endpoint may
            // serve as convergence (unique→shared) for some routes and divergence
            // (shared→unique) for routes traversing in the opposite direction.
            const endpoints: Array<[Point<PointType>, Point<PointType>]> = [
                [firstPt, interiorFirst],
                [lastPt,  interiorLast],
            ];

            for (const [junctionPt, interiorPt] of endpoints) {
                // Skip if already processed by a previous shared sub-path.
                if (convergenceRefs.has(junctionPt)) continue;

                // Shared axis: direction from junction into the shared segment.
                const sharedAxis = vecNorm({
                    x: interiorPt.x - junctionPt.x,
                    y: interiorPt.y - junctionPt.y,
                });

                // Average the "approach" directions of ALL unique paths at this
                // junction. Arrivals naturally point toward the shared interior.
                // Departures are negated so they also point toward the shared
                // interior, making all directions comparable for averaging.
                let sumX = 0, sumY = 0;
                let count = 0;

                // Unique paths arriving at this junction.
                for (const up of (uniqueEndingAt.get(junctionPt) ?? [])) {
                    const pPrev  = up.points[up.points.length - 2];
                    const natDir = vecNorm({
                        x: junctionPt.x - pPrev.x,
                        y: junctionPt.y - pPrev.y,
                    });
                    sumX += natDir.x;
                    sumY += natDir.y;
                    count++;
                }

                // Unique paths departing from this junction (negated to match
                // the "toward shared interior" convention).
                for (const up of (uniqueStartingAt.get(junctionPt) ?? [])) {
                    const pNext  = up.points[1];
                    const natDir = vecNorm({
                        x: junctionPt.x - pNext.x,
                        y: junctionPt.y - pNext.y,
                    });
                    sumX += natDir.x;
                    sumY += natDir.y;
                    count++;
                }

                let refDir = sharedAxis;
                if (count > 0) {
                    const avg = vecNorm({ x: sumX, y: sumY });
                    if (avg.x !== 0 || avg.y !== 0) {
                        refDir = avg;
                    }
                }

                // Convergence ref points INTO the shared segment.
                convergenceRefs.set(junctionPt, {
                    refDir,
                    sharedInteriorPt: interiorPt,
                });
                // Divergence ref is the negation — ensures opposite-direction
                // routes produce reversal-compatible Bézier curves through the
                // shared segment.
                divergenceRefs.set(junctionPt, {
                    refDir: { x: -refDir.x, y: -refDir.y },
                    sharedInteriorPt: interiorPt,
                });
            }
        }

        // Render each route as a complete per-route path with junction
        // overrides at shared-segment boundaries. This preserves per-route
        // styling (colour, width) through shared sections while the junction
        // overrides ensure all routes produce identical Bézier curves through
        // the shared portion.
        for (let ri = 0; ri < routes.length; ri++) {
            const route = routes[ri];
            const pts   = route.points;
            if (pts.length < 2) continue;

            const style = route.style ?? this.segmentStyle;

            // Build per-bezier-segment overrides at junction points,
            // mirroring the editor's rebuildRoute logic.
            const p0Overrides = new Map<number, { x: number; y: number }>();
            const p3Overrides = new Map<number, { x: number; y: number }>();

            for (let k = 0; k < pts.length; k++) {
                const pt = pts[k];

                // Check if this point is a junction (has refs registered).
                const convRef = convergenceRefs.get(pt);
                const divRef  = divergenceRefs.get(pt);
                if (!convRef && !divRef) continue;

                // Determine this route's role at the junction by checking
                // whether the edges before/after are shared or unique.
                const beforeShared = k >= 1 && isShared(pts[k - 1], pts[k]);
                const afterShared  = k < pts.length - 1 && isShared(pts[k], pts[k + 1]);

                // Pick the appropriate ref for this route's role.
                let ref: { x: number; y: number } | undefined;
                if (!beforeShared && afterShared && convRef) {
                    ref = convRef.refDir;
                } else if (beforeShared && !afterShared && divRef) {
                    ref = divRef.refDir;
                }
                if (!ref) continue;

                if (k >= 1) {
                    const pPrev = pts[k - 1];
                    const scale = vecLen({ x: pt.x - pPrev.x, y: pt.y - pPrev.y });
                    p3Overrides.set(k - 1, {
                        x: pPrev.x + scale * ref.x,
                        y: pPrev.y + scale * ref.y,
                    });
                }
                if (k < pts.length - 1) {
                    const pNext = pts[k + 1];
                    const scale = vecLen({ x: pNext.x - pt.x, y: pNext.y - pt.y });
                    p0Overrides.set(k, {
                        x: pNext.x - scale * ref.x,
                        y: pNext.y - scale * ref.y,
                    });
                }
            }

            // Build the full-route path with per-bezier overrides.
            const intensity = Math.max(0, this.curveIntensity);
            let d = `M ${pts[0].x} ${pts[0].y}`;
            for (let i = 0; i < pts.length - 1; i++) {
                const p0 = p0Overrides.get(i) ?? (i === 0 ? pts[i] : pts[i - 1]);
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const p3 = p3Overrides.get(i) ?? (i === pts.length - 2 ? pts[i + 1] : pts[i + 2]);

                const factor = intensity / 6;
                const c1x = p1.x + (p2.x - p0.x) * factor;
                const c1y = p1.y + (p2.y - p0.y) * factor;
                const c2x = p2.x - (p3.x - p1.x) * factor;
                const c2y = p2.y - (p3.y - p1.y) * factor;

                d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
            }

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
