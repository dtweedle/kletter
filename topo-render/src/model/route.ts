import { Point, PointType } from "./point";
import { SegmentStyle } from "./segment";

/**
 * A climbing route represented as an ordered array of points.
 *
 * Routes can optionally carry a per-route `SegmentStyle` that overrides
 * the global style set on `TopoRenderOptions`.
 */
export class Route {
    constructor(
        public name: string,
        public points: Array<Point<PointType>>,
        public style?: SegmentStyle
    ) {}
}
