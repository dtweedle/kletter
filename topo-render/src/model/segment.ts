import { Point, PointType } from "./point";

export interface SegmentStyle {
    strokeWidth?: number;    // default: 2
    strokeColor?: string;    // default: '#ffffff'
    borderWidth?: number;    // default: 0 (no border)
    borderColor?: string;    // default: '#000000'
}

const DEFAULT_STYLE: Required<SegmentStyle> = {
    strokeWidth: 2,
    strokeColor: '#ffffff',
    borderWidth: 0,
    borderColor: '#000000',
};

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

    /**
     * Build the SVG path `d` attribute string for the given points using
     * Catmull–Rom to cubic Bézier conversion.
     *
     * Optionally accepts `p0Override` and `p3Override` to replace the
     * clamped boundary points at the start and end of the path. This is
     * used for tangent smoothing at shared-segment junctions.
     */
    public static buildPathD(
        pts: Array<Point<PointType>>,
        curveIntensity: number,
        p0Override?: { x: number; y: number },
        p3Override?: { x: number; y: number }
    ): string {
        if (pts.length < 2) return "";

        const intensity = Math.max(0, curveIntensity);
        let d = `M ${pts[0].x} ${pts[0].y}`;

        for (let i = 0; i < pts.length - 1; i++) {
            const isFirst = i === 0;
            const isLast = i === pts.length - 2;

            const p0 = isFirst
                ? (p0Override ?? pts[i])
                : pts[i - 1];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = isLast
                ? (p3Override ?? pts[i + 1])
                : pts[i + 2];

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
     * Render SVG path elements for the given `d` string and style.
     * Returns the border path (if any) followed by the main path.
     */
    public static renderPathSvg(d: string, style?: SegmentStyle): string {
        const s = { ...DEFAULT_STYLE, ...style };
        const parts: string[] = [];

        if (s.borderWidth > 0) {
            const borderStroke = s.strokeWidth + 2 * s.borderWidth;
            parts.push(
                `<path d="${d}" fill="none" stroke="${s.borderColor}" stroke-width="${borderStroke}" stroke-linecap="round" stroke-linejoin="round" />`
            );
        }

        parts.push(
            `<path d="${d}" fill="none" stroke="${s.strokeColor}" stroke-width="${s.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`
        );

        return parts.join("");
    }

    public render(curveIntensity: number = 1, style?: SegmentStyle): string {
        if (this.points.length < 2) {
            return "";
        }

        const d = Segment.buildPathD(this.points, curveIntensity);
        return Segment.renderPathSvg(d, style);
    }
}
