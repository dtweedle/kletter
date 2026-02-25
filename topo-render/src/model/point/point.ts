import { PointType } from "./constants";

/**
 * Visual style overrides for point rendering.
 *
 * All fields are optional. When a field is omitted, the built-in default
 * is used. For `fillColor`, the default depends on the point's
 * {@link PointType} — see {@link DEFAULT_POINT_FILLS}.
 */
export interface PointStyle {
    /** Circle radius in pixels. @defaultValue 4 */
    radius?: number;
    /** Fill colour (CSS). Overrides the per-type default when set. */
    fillColor?: string;
    /** Stroke (outline) colour (CSS). @defaultValue '#000000' */
    strokeColor?: string;
    /** Stroke width in pixels. @defaultValue 1 */
    strokeWidth?: number;
    /** Overall opacity applied to the circle (fill and stroke together). Range 0–1. @defaultValue 1 */
    opacity?: number;
}

/**
 * Default values for all type-independent point style properties.
 * `fillColor` is intentionally absent — it falls back to the
 * per-{@link PointType} colour in {@link DEFAULT_POINT_FILLS}.
 */
export const DEFAULT_POINT_STYLE: Required<Omit<PointStyle, 'fillColor'>> = {
    radius: 4,
    strokeColor: '#000000',
    strokeWidth: 1,
    opacity: 1,
};

/**
 * Default fill colour per {@link PointType}.
 * Used as the fallback when no `fillColor` is specified in a
 * {@link PointStyle}.
 */
export const DEFAULT_POINT_FILLS: Record<PointType, string> = {
    [PointType.ANCHOR]: '#ffd54f',
    [PointType.BOLT]: '#42a5f5',
    [PointType.FEATURE]: '#66bb6a',
    [PointType.GENERIC]: '#ffffff',
};

/**
 * Represents a point in a 2D space with x and y coordinates given in pixels
 * that have been normalized to the svg canvas that are being rendered too.
 */
export class Point<PointT extends PointType> {
    /**
     * All co-ordinates are relative to the original scaling of the SVG canvas.
     *
     * @param x The x coordinate of the point
     * @param y The y coordinate of the point
     * @param type The type of point that is being rendered
     */
    constructor(public x: number, public y: number, public type: PointT) {}

    /**
     * Render this point as an SVG circle element string.
     *
     * Style resolution follows a cascade:
     *   1. Explicit `style` parameter fields (highest priority)
     *   2. {@link DEFAULT_POINT_STYLE} for radius, strokeColor, strokeWidth, opacity
     *   3. {@link DEFAULT_POINT_FILLS} for fillColor (type-based fallback)
     *
     * @param pointId - Optional numeric identifier written as `data-point-id`.
     * @param style   - Optional style overrides.
     */
    public render(pointId?: number, style?: PointStyle): string {
        const radius      = style?.radius      ?? DEFAULT_POINT_STYLE.radius;
        const strokeColor = style?.strokeColor  ?? DEFAULT_POINT_STYLE.strokeColor;
        const strokeWidth = style?.strokeWidth  ?? DEFAULT_POINT_STYLE.strokeWidth;
        const fill        = style?.fillColor    ?? DEFAULT_POINT_FILLS[this.type] ?? '#ffffff';
        // Clamp opacity to the valid SVG range [0, 1] to guard against out-of-range values
        const opacity     = Math.min(1, Math.max(0, style?.opacity ?? DEFAULT_POINT_STYLE.opacity));

        const idAttr = pointId !== undefined ? ` data-point-id="${pointId}"` : "";
        return `<circle class="topo-point"${idAttr} cx="${this.x}" cy="${this.y}" r="${radius}" fill="${fill}" stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="${opacity}" data-point-type="${this.type}" />`;
    }
}
