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

    public render(): string {
        switch( this.type ) {
            case PointType.GENERIC:
                return ""
            case PointType.ANCHOR:
                return "<circle></circle>";
            case PointType.BOLT:
                return  ""
            case PointType.FEATURE:
                return "<circle></circle>";
            default:
                throw new Error("Unknown point type");
        }
    }
}
