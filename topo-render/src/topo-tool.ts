import { Point, PointType } from "./model/point";

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
}

/**
 * Instantiates a new render object for a given topo / image.
 */
export class TopoRender {
    private image?: string;
    private width: number;
    private height: number;

    constructor(options: TopoRenderOptions = {}) {
        this.width = options.width ?? 200;
        this.height = options.height ?? 200;
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
    public render(points: Array<Point<PointType>> = [], imageHref?: string): string {
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

        svgParts.push(`</svg>`);

        return svgParts.join("");
    }
}
