// Instantiate TopoRender and generate a simple example SVG file.

import { TopoRender } from "../../src/topo-tool";
import { Point, PointType } from "../../src/model/point";
import { Segment } from "../../src/model/segment";

const fs = require("fs");

// For now we render to a 200 x 200 canvas.
// We create three renderers with increasing curve intensities so we can
// visually compare how the same geometry looks with different smoothing.
const topoSoft = new TopoRender({ width: 200, height: 200, curveIntensity: 0 });
const topoMedium = new TopoRender({ width: 200, height: 200, curveIntensity: 1 });
const topoStrong = new TopoRender({ width: 200, height: 200, curveIntensity: 2 });

// If you have a local or remote image you want to overlay, pass the URL here.
// For example:
// const imageHref = "https://example.com/my-topo-background.jpg";
const imageHref: string | undefined = undefined;

/**
 * Case 1: Points only (no connecting segments).
 */
const case1Points: Array<Point<PointType>> = [
    new Point(40, 160, PointType.BOLT),
    new Point(80, 140, PointType.FEATURE),
    new Point(120, 110, PointType.FEATURE),
    new Point(150, 80, PointType.ANCHOR),
    new Point(60, 60, PointType.GENERIC),
];

const case1Svg = topoMedium.render(case1Points, [], imageHref);

/**
 * Case 2: Straight line segments (mostly horizontal / vertical).
 */
const case2PointsStraight: Array<Point<PointType>> = [
    // Horizontal
    new Point(20, 180, PointType.BOLT),
    new Point(60, 180, PointType.BOLT),
    new Point(100, 180, PointType.BOLT),
    new Point(140, 180, PointType.BOLT),
    new Point(180, 180, PointType.BOLT),
];

const case2SegmentStraight = new Segment(case2PointsStraight);

// A second straight-ish segment (vertical).
const case2PointsVertical: Array<Point<PointType>> = [
    new Point(20, 20, PointType.BOLT),
    new Point(20, 60, PointType.BOLT),
    new Point(20, 100, PointType.BOLT),
    new Point(20, 140, PointType.BOLT),
    new Point(20, 180, PointType.BOLT),
];

const case2SegmentVertical = new Segment(case2PointsVertical);

const case2SvgSoft = topoSoft.render(
    [...case2PointsStraight, ...case2PointsVertical],
    [case2SegmentStraight, case2SegmentVertical],
    imageHref
);

const case2SvgMedium = topoMedium.render(
    [...case2PointsStraight, ...case2PointsVertical],
    [case2SegmentStraight, case2SegmentVertical],
    imageHref
);

const case2SvgStrong = topoStrong.render(
    [...case2PointsStraight, ...case2PointsVertical],
    [case2SegmentStraight, case2SegmentVertical],
    imageHref
);

/**
 * Case 3: Route that changes direction (zig-zag).
 */
const case3PointsZigZag: Array<Point<PointType>> = [
    new Point(40, 180, PointType.BOLT),
    new Point(80, 140, PointType.FEATURE),
    new Point(120, 160, PointType.FEATURE),
    new Point(140, 120, PointType.BOLT),
    new Point(100, 80, PointType.FEATURE),
    new Point(140, 40, PointType.ANCHOR),
];

const case3SegmentZigZag = new Segment(case3PointsZigZag);

const case3SvgSoft = topoSoft.render(case3PointsZigZag, [case3SegmentZigZag], imageHref);
const case3SvgMedium = topoMedium.render(case3PointsZigZag, [case3SegmentZigZag], imageHref);
const case3SvgStrong = topoStrong.render(case3PointsZigZag, [case3SegmentZigZag], imageHref);

/**
 * Case 4: Route that loops back around in a circle.
 */
function createCirclePoints(
    centerX: number,
    centerY: number,
    radius: number,
    count: number,
    type: PointType
): Array<Point<PointType>> {
    const pts: Array<Point<PointType>> = [];
    for (let i = 0; i < count; i++) {
        const angle = (2 * Math.PI * i) / count;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        pts.push(new Point(x, y, type));
    }
    return pts;
}

// Use a dozen points roughly forming a circle, and close the loop by repeating the first point.
const case4CirclePoints = createCirclePoints(100, 100, 60, 12, PointType.BOLT);
const case4LoopPoints: Array<Point<PointType>> = [
    ...case4CirclePoints,
    case4CirclePoints[0],
];

const case4SegmentCircle = new Segment(case4LoopPoints);
const case4SvgSoft = topoSoft.render(case4LoopPoints, [case4SegmentCircle], imageHref);
const case4SvgMedium = topoMedium.render(case4LoopPoints, [case4SegmentCircle], imageHref);
const case4SvgStrong = topoStrong.render(case4LoopPoints, [case4SegmentCircle], imageHref);

/**
 * Build a simple HTML page that shows all cases one below another.
 */
const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Topo Render Visual Test</title>
    <style>
      body {
        background: #111;
        color: #eee;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 16px;
      }
      h1, h2 {
        font-weight: 500;
      }
      .case {
        margin-bottom: 32px;
      }
      svg {
        border: 1px solid #444;
        background: #000;
        display: block;
      }
      .row {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }
      .variant {
        flex: 1 1 0;
        min-width: 200px;
      }
    </style>
  </head>
  <body>
    <h1>Topo Render Visual Test</h1>

    <div class="case">
      <h2>Case 1: Points only</h2>
      ${case1Svg}
    </div>

    <div class="case">
      <h2>Case 2: Straight segments</h2>
      <div class="row">
        <div class="variant">
          <h3>Curve intensity: 0 (straight)</h3>
          ${case2SvgSoft}
        </div>
        <div class="variant">
          <h3>Curve intensity: 1 (default)</h3>
          ${case2SvgMedium}
        </div>
        <div class="variant">
          <h3>Curve intensity: 2 (strong)</h3>
          ${case2SvgStrong}
        </div>
      </div>
    </div>

    <div class="case">
      <h2>Case 3: Zig-zag route</h2>
      <div class="row">
        <div class="variant">
          <h3>Curve intensity: 0 (straight)</h3>
          ${case3SvgSoft}
        </div>
        <div class="variant">
          <h3>Curve intensity: 1 (default)</h3>
          ${case3SvgMedium}
        </div>
        <div class="variant">
          <h3>Curve intensity: 2 (strong)</h3>
          ${case3SvgStrong}
        </div>
      </div>
    </div>

    <div class="case">
      <h2>Case 4: Circular loop</h2>
      <div class="row">
        <div class="variant">
          <h3>Curve intensity: 0 (straight)</h3>
          ${case4SvgSoft}
        </div>
        <div class="variant">
          <h3>Curve intensity: 1 (default)</h3>
          ${case4SvgMedium}
        </div>
        <div class="variant">
          <h3>Curve intensity: 2 (strong)</h3>
          ${case4SvgStrong}
        </div>
      </div>
    </div>
  </body>
</html>
`;

// Write out an HTML file that can be opened or served directly.
fs.writeFileSync("index.html", html);
