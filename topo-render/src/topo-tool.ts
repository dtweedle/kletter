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

        // At convergence/divergence junctions the tangent direction should
        // be an average of the incoming/outgoing directions from all routes
        // so the shared path doesn't favour any single route's direction.
        const avgPointAt = (junction: Point<PointType>, neighbors: Array<Point<PointType>>): { x: number; y: number } => {
            if (neighbors.length === 0) return junction;
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

        // Render shared segments with a slightly thicker stroke so they
        // are visually distinct from per-route segments.
        const sharedStyle: SegmentStyle = {
            strokeWidth: (this.segmentStyle?.strokeWidth ?? 2) + 1,
            strokeColor: this.segmentStyle?.strokeColor ?? '#ffffff',
            borderWidth: this.segmentStyle?.borderWidth ?? 0,
            borderColor: this.segmentStyle?.borderColor ?? '#000000',
        };

        for (const sp of sharedSubPaths) {
            const firstPt = sp.points[0];
            const lastPt = sp.points[sp.points.length - 1];

            // Convergence: average predecessors of the first point that are
            // NOT in this sub-path (i.e. from routes entering the shared section).
            const preds = predecessors.get(firstPt) ?? [];
            const uniquePreds = preds.filter(p => p !== sp.points[1]);
            const p0Override = uniquePreds.length > 1 ? avgPointAt(firstPt, uniquePreds) : undefined;

            // Divergence: average successors of the last point that are
            // NOT in this sub-path.
            const succs = successors.get(lastPt) ?? [];
            const uniqueSuccs = succs.filter(p => p !== sp.points[sp.points.length - 2]);
            const p3Override = uniqueSuccs.length > 1 ? avgPointAt(lastPt, uniqueSuccs) : undefined;

            const d = Segment.buildPathD(sp.points, this.curveIntensity, p0Override, p3Override);
            svgParts.push(Segment.renderPathSvg(d, sharedStyle));
        }

        // Render the unique (non-shared) sub-paths with each route's own style.
        for (const sp of uniqueSubPaths) {
            const route = routes[sp.routeIndex];
            const style = route.style ?? this.segmentStyle;
            const d = Segment.buildPathD(sp.points, this.curveIntensity);
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
