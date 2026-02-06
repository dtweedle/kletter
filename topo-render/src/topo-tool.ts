import { Point, PointType } from "./model/point";
import { Segment } from "./model/segment";

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
}

/**
 * Instantiates a new render object for a given topo / image.
 */
export class TopoRender {
    private image?: string;
    private width: number;
    private height: number;
    private curveIntensity: number;

    constructor(options: TopoRenderOptions = {}) {
        this.width = options.width ?? 200;
        this.height = options.height ?? 200;
        this.curveIntensity = options.curveIntensity ?? 1;
    }

    /**
     * Initialize the topo render object
     */
    public init(imageHref?: string): void {
        this.image = imageHref;
    }

    /**
     * Render the current topo to an SVG string.
     *
     * - If an `imageHref` is provided (or was set via `init`) we render that
     *   image as the background.
     * - Otherwise, we render a solid black background.
     * - Any points passed in are rendered on top of the background.
     */
    public render(
        points: Array<Point<PointType>> = [],
        segments: Segment[] = [],
        imageHref?: string
    ): string {
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
            // Fallback to a simple black background so that points are visible.
            svgParts.push(
                `<rect x="0" y="0" width="${width}" height="${height}" fill="black" />`
            );
        }

        for (const p of points) {
            svgParts.push(p.render());
        }

        for (const segment of segments) {
            svgParts.push(segment.render(this.curveIntensity));
        }

        svgParts.push(`</svg>`);

        return svgParts.join("");
    }
}
