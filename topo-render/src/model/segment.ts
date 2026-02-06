import { Point, PointType } from "./point";

/**
 * A route connecting a series of points.
 *
 * This is rendered as a single SVG path using cubic Bézier curves
 * derived from a Catmull–Rom style interpolation so that the curve
 * smoothly flows through the points instead of just joining them
 * with straight lines.
 */
export class Segment {
    constructor(public points: Array<Point<PointType>>) {}

    public render(curveIntensity: number = 1): string {
        if (!this.points.length) {
            return "";
        }

        if (this.points.length === 1) {
            // A segment with a single point does not render a line.
            return "";
        }

        const pts = this.points;

        // Clamp curve intensity to a sane range.
        const intensity = Math.max(0, curveIntensity);

        // Start at the first point.
        let d = `M ${pts[0].x} ${pts[0].y}`;

        // Use a Catmull–Rom to cubic Bézier conversion so we "look ahead"
        // at the next point when computing control points, which produces
        // visibly curved paths even when points are roughly aligned.
        //
        // For each segment [p1 -> p2] we use p0 (previous) and p3 (next)
        // to compute two control points c1, c2:
        //
        //   c1 = p1 + (p2 - p0) / 6
        //   c2 = p2 - (p3 - p1) / 6
        //
        // Endpoints are clamped by reusing the boundary points.
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = i === 0 ? pts[i] : pts[i - 1];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = i + 2 < pts.length ? pts[i + 2] : pts[i + 1];

            const factor = intensity / 6;

            const c1x = p1.x + (p2.x - p0.x) * factor;
            const c1y = p1.y + (p2.y - p0.y) * factor;
            const c2x = p2.x - (p3.x - p1.x) * factor;
            const c2y = p2.y - (p3.y - p1.y) * factor;

            d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
        }

        return `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
    }
}

