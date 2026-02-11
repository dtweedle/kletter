import { PointType } from "./constants";

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
     * Render this point as an SVG element string.
     *
     * For now we render each point as a small circle, with the fill colour
     * indicating the point type. The coordinates are assumed to already be
     * in the SVG canvas coordinate space.
     */
    public render(pointId?: number): string {
        const radius = 4;

        let fill = "#ffffff";
        const stroke = "#000000";

        switch (this.type) {
            case PointType.ANCHOR:
                fill = "#ffd54f";
                break;
            case PointType.BOLT:
                fill = "#42a5f5";
                break;
            case PointType.FEATURE:
                fill = "#66bb6a";
                break;
            case PointType.GENERIC:
            default:
                fill = "#ffffff";
        }

        const idAttr = pointId !== undefined ? ` data-point-id="${pointId}"` : "";
        return `<circle class="topo-point"${idAttr} cx="${this.x}" cy="${this.y}" r="${radius}" fill="${fill}" stroke="${stroke}" data-point-type="${this.type}" />`;
    }
}
