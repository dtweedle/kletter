import { point } from "./model";
import { Point, PointType } from "./model/point";

/**
 * Instantiates a new render object for a given topo / image.
 */
export class TopoRender {
    /**
     * 
     */
    private image: string | ArrayBuffer;

    /**
     * Stop the constructor from being called
     */
    private constructor() {}

    /**
     * Initialize the topo render object
     */
    public init(): void {
        const test: point.Point<PointType> = new Point(0, 0, point.PointType.GENERIC);
    }
}
