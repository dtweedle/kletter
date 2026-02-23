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

        // Build a map of every directed edge (pointA → pointB) across all
        // routes, tracking which route indices contain each edge. This lets
        // us identify shared segments where two or more routes overlap.
        const edgeRoutes = new Map<string, { a: Point<PointType>; b: Point<PointType>; routeIndices: number[] }>();

        for (let ri = 0; ri < routes.length; ri++) {
            const pts = routes[ri].points;
            for (let i = 0; i < pts.length - 1; i++) {
                // Key by reference identity – use a unique id per point object.
                const key = refEdgeKey(pts[i], pts[i + 1]);
                const existing = edgeRoutes.get(key);
                if (existing) {
                    existing.routeIndices.push(ri);
                } else {
                    edgeRoutes.set(key, { a: pts[i], b: pts[i + 1], routeIndices: [ri] });
                }
            }
        }

        // Returns true when two or more routes traverse this edge.
        const isShared = (a: Point<PointType>, b: Point<PointType>) => {
            const entry = edgeRoutes.get(refEdgeKey(a, b));
            return entry !== undefined && entry.routeIndices.length > 1;
        };

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
                const key = sp.points.map(p => refPointId(p)).join(',');
                if (!renderedSharedKeys.has(key)) {
                    renderedSharedKeys.add(key);
                    sharedSubPaths.push(sp);
                }
            } else {
                uniqueSubPaths.push(sp);
            }
        }

        // Helper: compute the average position of a set of points. Used to
        // synthesise a "phantom" predecessor/successor that represents the
        // mean incoming or outgoing direction at a shared-segment junction
        // when more than one route converges or diverges there.
        const avgPointAt = (neighbors: Array<Point<PointType>>): { x: number; y: number } => {
            const x = neighbors.reduce((sum, p) => sum + p.x, 0) / neighbors.length;
            const y = neighbors.reduce((sum, p) => sum + p.y, 0) / neighbors.length;
            return { x, y };
        };

        // For every point, collect its predecessors and successors across
        // all routes. Used to compute averaged tangents at junctions.
        const predecessors = new Map<Point<PointType>, Array<Point<PointType>>>();
        const successors = new Map<Point<PointType>, Array<Point<PointType>>>();

        for (const route of routes) {
            const pts = route.points;
            for (let i = 0; i < pts.length; i++) {
                if (i > 0) {
                    if (!predecessors.has(pts[i])) predecessors.set(pts[i], []);
                    predecessors.get(pts[i])!.push(pts[i - 1]);
                }
                if (i < pts.length - 1) {
                    if (!successors.has(pts[i])) successors.set(pts[i], []);
                    successors.get(pts[i])!.push(pts[i + 1]);
                }
            }
        }

        // -----------------------------------------------------------------------
        // Junction metadata
        //
        // For each shared sub-path, record the "phantom" boundary point used as
        // p0/p3 when rendering that shared segment, and the adjacent interior
        // point of the shared segment. Together these define the tangent
        // direction of the shared segment at its start (convergence) and end
        // (divergence) junctions.
        //
        // This information is then used to force unique (non-shared) sub-paths
        // to arrive/depart at exactly the same angle as the shared segment at
        // the junction, eliminating the visual kink that results from each
        // unique path using its own unconstrained boundary tangent.
        // -----------------------------------------------------------------------

        interface JunctionInfo {
            /**
             * The first or last interior point of the shared segment (i.e.
             * sharedSP.points[1] for convergence, sharedSP.points[last-1] for
             * divergence). Together with `phantomPt` this defines the shared
             * segment's tangent direction at the junction.
             */
            sharedInteriorPt: Point<PointType>;

            /**
             * The effective "phantom" boundary point used as p0/p3 for the
             * shared segment at this junction.
             *
             * At convergence: average of unique predecessors entering the shared
             * section, or the junction itself when there is only one such route.
             *
             * At divergence: average of unique successors leaving the shared
             * section, or the junction itself when there is only one such route.
             *
             * The shared segment's tangent direction at the junction is:
             *   convergence → (sharedInteriorPt − phantomPt)
             *   divergence  → (phantomPt − sharedInteriorPt)
             */
            phantomPt: { x: number; y: number };
        }

        // Map: junction point → info needed to constrain unique paths ending here.
        const convergenceJunctions = new Map<Point<PointType>, JunctionInfo>();

        // Map: junction point → info needed to constrain unique paths starting here.
        const divergenceJunctions = new Map<Point<PointType>, JunctionInfo>();

        for (const sp of sharedSubPaths) {
            if (sp.points.length < 2) continue;

            const firstPt = sp.points[0];
            const lastPt  = sp.points[sp.points.length - 1];

            // --- Convergence (start of shared segment) ---
            // Unique predecessors: all predecessors of firstPt that are NOT the
            // next point of this shared segment (i.e. they come from non-shared
            // sections of routes entering here).
            const preds = predecessors.get(firstPt) ?? [];
            const uniquePreds = preds.filter(p => p !== sp.points[1]);
            const convPhantom: { x: number; y: number } =
                uniquePreds.length > 1 ? avgPointAt(uniquePreds) : firstPt;
            convergenceJunctions.set(firstPt, {
                sharedInteriorPt: sp.points[1],
                phantomPt: convPhantom,
            });

            // --- Divergence (end of shared segment) ---
            const succs = successors.get(lastPt) ?? [];
            const uniqueSuccs = succs.filter(p => p !== sp.points[sp.points.length - 2]);
            const divPhantom: { x: number; y: number } =
                uniqueSuccs.length > 1 ? avgPointAt(uniqueSuccs) : lastPt;
            divergenceJunctions.set(lastPt, {
                sharedInteriorPt: sp.points[sp.points.length - 2],
                phantomPt: divPhantom,
            });
        }

        // Render shared segments with a slightly thicker stroke so they
        // are visually distinct from per-route segments.
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

            // Re-use the phantom points computed above as p0/p3 overrides so
            // the shared segment's boundary tangents are consistent with those
            // stored in the junction maps (and therefore with the unique paths
            // we are about to constrain).
            const convInfo = convergenceJunctions.get(firstPt);
            const divInfo  = divergenceJunctions.get(lastPt);

            // Only pass a p0Override when the phantom differs from the junction
            // (i.e. there are multiple incoming routes that needed averaging).
            const p0Override = convInfo && convInfo.phantomPt !== firstPt
                ? convInfo.phantomPt
                : undefined;

            const p3Override = divInfo && divInfo.phantomPt !== lastPt
                ? divInfo.phantomPt
                : undefined;

            const d = Segment.buildPathD(sp.points, this.curveIntensity, p0Override, p3Override);
            svgParts.push(Segment.renderPathSvg(d, sharedStyle));
        }

        // -----------------------------------------------------------------------
        // Render unique (non-shared) sub-paths.
        //
        // At each junction, we derive a per-path p0Override / p3Override so
        // that every unique sub-path arrives or departs at exactly the same
        // angle as the shared segment at that junction.
        //
        // Derivation for convergence (unique path ending at junction):
        //
        //   The shared segment's departure tangent at junction is proportional
        //   to (sharedInteriorPt − phantomPt).
        //
        //   In buildPathD, the last Bézier segment of the unique path has:
        //     c2 = junction − (p3Override − p_prev) × factor
        //   → tangent at junction = (p3Override − p_prev) × factor
        //
        //   Setting this equal to the shared departure direction gives:
        //     p3Override − p_prev = sharedInteriorPt − phantomPt
        //     p3Override = p_prev + (sharedInteriorPt − phantomPt)
        //
        //   This override is path-specific because p_prev (the second-to-last
        //   point of the unique sub-path) differs per route. A single fixed
        //   p3Override would only make all paths "aim at" the same target
        //   point, which does NOT guarantee equal tangent directions.
        //
        // Symmetric logic applies for divergence (unique path starting at junction):
        //     p0Override = p_next − (phantomPt − sharedInteriorPt)
        // -----------------------------------------------------------------------

        for (const sp of uniqueSubPaths) {
            const route = routes[sp.routeIndex];
            const style = route.style ?? this.segmentStyle;

            let p0Override: { x: number; y: number } | undefined;
            let p3Override: { x: number; y: number } | undefined;

            // Divergence junction: this unique path starts at the end of a shared segment.
            if (sp.points.length >= 2) {
                const divInfo = divergenceJunctions.get(sp.points[0]);
                if (divInfo) {
                    // Shared segment arrival direction: phantomPt − sharedInteriorPt.
                    // Set p0Override so the unique path departs in the same direction.
                    const p_next = sp.points[1];
                    p0Override = {
                        x: p_next.x - (divInfo.phantomPt.x - divInfo.sharedInteriorPt.x),
                        y: p_next.y - (divInfo.phantomPt.y - divInfo.sharedInteriorPt.y),
                    };
                }
            }

            // Convergence junction: this unique path ends at the start of a shared segment.
            if (sp.points.length >= 2) {
                const lastPt = sp.points[sp.points.length - 1];
                const convInfo = convergenceJunctions.get(lastPt);
                if (convInfo) {
                    // Shared segment departure direction: sharedInteriorPt − phantomPt.
                    // Set p3Override so the unique path arrives in the same direction.
                    const p_prev = sp.points[sp.points.length - 2];
                    p3Override = {
                        x: p_prev.x + (convInfo.sharedInteriorPt.x - convInfo.phantomPt.x),
                        y: p_prev.y + (convInfo.sharedInteriorPt.y - convInfo.phantomPt.y),
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

function refPointId(p: Point<PointType>): number {
    let id = pointIdMap.get(p);
    if (id === undefined) {
        id = nextPointId++;
        pointIdMap.set(p, id);
    }
    return id;
}

function refEdgeKey(a: Point<PointType>, b: Point<PointType>): string {
    return `${refPointId(a)}->${refPointId(b)}`;
}
