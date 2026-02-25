import { Point, PointType, PointStyle } from "./point";
import { SegmentStyle } from "./segment";

/**
 * A climbing route represented as an ordered array of points.
 *
 * Routes can optionally carry per-route style overrides for both
 * segments and points. These override the global styles set on
 * `TopoRenderOptions`.
 */
export class Route {
    constructor(
        public name: string,
        public points: Array<Point<PointType>>,
        public style?: SegmentStyle,
        public pointStyle?: PointStyle
    ) {}
}
