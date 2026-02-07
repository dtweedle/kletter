// Instantiate TopoRender and generate a simple example SVG file.

import { TopoRender } from "../../src/topo-tool";
import { Point, PointType } from "../../src/model/point";
import { SegmentStyle } from "../../src/model/segment";
import { Route } from "../../src/model/route";

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

const case1Route = new Route("Points Only", case1Points);
const case1Svg = topoMedium.render([case1Route], imageHref);

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

// A second straight-ish segment (vertical).
const case2PointsVertical: Array<Point<PointType>> = [
    new Point(20, 20, PointType.BOLT),
    new Point(20, 60, PointType.BOLT),
    new Point(20, 100, PointType.BOLT),
    new Point(20, 140, PointType.BOLT),
    new Point(20, 180, PointType.BOLT),
];

const case2RouteHorizontal = new Route("Horizontal", case2PointsStraight);
const case2RouteVertical = new Route("Vertical", case2PointsVertical);
const case2Routes = [case2RouteHorizontal, case2RouteVertical];

const case2SvgSoft = topoSoft.render(case2Routes, imageHref);
const case2SvgMedium = topoMedium.render(case2Routes, imageHref);
const case2SvgStrong = topoStrong.render(case2Routes, imageHref);

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

const case3Route = new Route("Zig-Zag", case3PointsZigZag);

const case3SvgSoft = topoSoft.render([case3Route], imageHref);
const case3SvgMedium = topoMedium.render([case3Route], imageHref);
const case3SvgStrong = topoStrong.render([case3Route], imageHref);

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

const case4Route = new Route("Circle", case4LoopPoints);
const case4SvgSoft = topoSoft.render([case4Route], imageHref);
const case4SvgMedium = topoMedium.render([case4Route], imageHref);
const case4SvgStrong = topoStrong.render([case4Route], imageHref);

/**
 * Case 5: Segment styling — same zig-zag rendered with different styles.
 */
const styleBold: SegmentStyle = { strokeWidth: 4, strokeColor: '#ff6666' };
const styleBorder: SegmentStyle = { strokeWidth: 2, strokeColor: '#66ff66', borderWidth: 2, borderColor: '#003300' };

const case5RouteDefault = new Route("Default Style", case3PointsZigZag);
const case5RouteBold = new Route("Bold Style", case3PointsZigZag, styleBold);
const case5RouteBorder = new Route("Border Style", case3PointsZigZag, styleBorder);

const topoCase5Default = new TopoRender({ width: 200, height: 200, curveIntensity: 1 });
const topoCase5Bold = new TopoRender({ width: 200, height: 200, curveIntensity: 1, segmentStyle: styleBold });
const topoCase5Border = new TopoRender({ width: 200, height: 200, curveIntensity: 1, segmentStyle: styleBorder });

const case5SvgDefault = topoCase5Default.render([case5RouteDefault], imageHref);
const case5SvgBold = topoCase5Bold.render([case5RouteBold], imageHref);
const case5SvgBorder = topoCase5Border.render([case5RouteBorder], imageHref);

/**
 * Case 6: Multiple independent routes (no shared points, no merging).
 */
const case6RouteLeft = new Route("Left Crack", [
    new Point(30, 180, PointType.BOLT),
    new Point(35, 140, PointType.BOLT),
    new Point(25, 100, PointType.FEATURE),
    new Point(30, 60, PointType.BOLT),
    new Point(35, 20, PointType.ANCHOR),
], { strokeColor: '#ff6666' });

const case6RouteMid = new Route("Central Slab", [
    new Point(100, 180, PointType.BOLT),
    new Point(90, 150, PointType.FEATURE),
    new Point(110, 110, PointType.BOLT),
    new Point(95, 70, PointType.FEATURE),
    new Point(100, 30, PointType.ANCHOR),
], { strokeColor: '#66ff66' });

const case6RouteRight = new Route("Right Arete", [
    new Point(170, 180, PointType.BOLT),
    new Point(175, 140, PointType.BOLT),
    new Point(165, 100, PointType.FEATURE),
    new Point(170, 60, PointType.BOLT),
    new Point(160, 20, PointType.ANCHOR),
], { strokeColor: '#6666ff' });

const topoCase6 = new TopoRender({ width: 200, height: 200, curveIntensity: 1 });
const case6Svg = topoCase6.render([case6RouteLeft, case6RouteMid, case6RouteRight], imageHref);

/**
 * Case 7a: Two routes with shared start — same direction, then diverge.
 */
const sharedStart = [
    new Point(100, 180, PointType.BOLT),
    new Point(100, 140, PointType.BOLT),
    new Point(100, 100, PointType.FEATURE),
];

const case7aRouteA = new Route("Route A", [
    ...sharedStart,
    new Point(60, 60, PointType.FEATURE),
    new Point(40, 30, PointType.ANCHOR),
], { strokeColor: '#ff6666' });

const case7aRouteB = new Route("Route B", [
    ...sharedStart,
    new Point(140, 60, PointType.FEATURE),
    new Point(160, 30, PointType.ANCHOR),
], { strokeColor: '#6666ff' });

const topoCase7a = new TopoRender({ width: 200, height: 200, curveIntensity: 1 });
const case7aSvg = topoCase7a.render([case7aRouteA, case7aRouteB], imageHref);

/**
 * Case 7b: Two routes with shared start — opposite directions through shared
 * section. Route A ascends through the shared points, Route B descends.
 */
const case7bRouteA = new Route("Route A (up)", [
    ...sharedStart,
    new Point(60, 60, PointType.FEATURE),
    new Point(40, 30, PointType.ANCHOR),
], { strokeColor: '#ff6666' });

const case7bRouteB = new Route("Route B (down)", [
    ...[...sharedStart].reverse(),
    new Point(140, 170, PointType.FEATURE),
    new Point(160, 190, PointType.ANCHOR),
], { strokeColor: '#6666ff' });

const topoCase7b = new TopoRender({ width: 200, height: 200, curveIntensity: 1 });
const case7bSvg = topoCase7b.render([case7bRouteA, case7bRouteB], imageHref);

/**
 * Case 8a: Two routes with shared middle — same direction, converge then diverge.
 */
const sharedMiddle = [
    new Point(100, 120, PointType.FEATURE),
    new Point(100, 100, PointType.BOLT),
    new Point(100, 80, PointType.FEATURE),
];

const case8aRouteA = new Route("Route C", [
    new Point(40, 170, PointType.BOLT),
    new Point(60, 150, PointType.FEATURE),
    ...sharedMiddle,
    new Point(60, 50, PointType.FEATURE),
    new Point(40, 20, PointType.ANCHOR),
], { strokeColor: '#ffaa00' });

const case8aRouteB = new Route("Route D", [
    new Point(160, 170, PointType.BOLT),
    new Point(140, 150, PointType.FEATURE),
    ...sharedMiddle,
    new Point(140, 50, PointType.FEATURE),
    new Point(160, 20, PointType.ANCHOR),
], { strokeColor: '#00aaff' });

const topoCase8a = new TopoRender({ width: 200, height: 200, curveIntensity: 1 });
const case8aSvg = topoCase8a.render([case8aRouteA, case8aRouteB], imageHref);

/**
 * Case 8b: Two routes with shared middle — opposite directions through the
 * shared section. Route E goes left-to-right through the shared points,
 * Route F goes right-to-left (reversed).
 */
const case8bRouteA = new Route("Route E (down)", [
    new Point(40, 170, PointType.BOLT),
    new Point(60, 150, PointType.FEATURE),
    ...sharedMiddle,
    new Point(60, 50, PointType.FEATURE),
    new Point(40, 20, PointType.ANCHOR),
], { strokeColor: '#ffaa00' });

const case8bRouteB = new Route("Route F (up)", [
    new Point(160, 20, PointType.BOLT),
    new Point(140, 50, PointType.FEATURE),
    ...[...sharedMiddle].reverse(),
    new Point(140, 150, PointType.FEATURE),
    new Point(160, 170, PointType.ANCHOR),
], { strokeColor: '#00aaff' });

const topoCase8b = new TopoRender({ width: 200, height: 200, curveIntensity: 1 });
const case8bSvg = topoCase8b.render([case8bRouteA, case8bRouteB], imageHref);

/**
 * Case 9: Complex asymmetric merge — 4 routes converge into a shared trunk
 * then diverge in different ways.
 *
 * Layout (bottom to top):
 *   - All 4 routes start at different positions along the bottom.
 *   - They merge into a shared vertical trunk in the middle.
 *   - Route 1 exits the trunk early and heads far left.
 *   - Routes 2 & 3 continue sharing the trunk longer; Route 2 exits left,
 *     Route 3 exits right.
 *   - Route 4 rides the full trunk and finishes at the top centre.
 */
const trunkBottom = new Point(100, 140, PointType.BOLT);
const trunkMid    = new Point(100, 110, PointType.BOLT);
const trunkUpper  = new Point(100, 80, PointType.FEATURE);
const trunkTop    = new Point(100, 50, PointType.BOLT);

const case9Route1 = new Route("Route 1", [
    new Point(30, 190, PointType.BOLT),
    new Point(50, 170, PointType.FEATURE),
    trunkBottom,
    trunkMid,
    // Exits early — heads far left
    new Point(55, 85, PointType.FEATURE),
    new Point(20, 55, PointType.ANCHOR),
], { strokeColor: '#ff6666' });

const case9Route2 = new Route("Route 2", [
    new Point(70, 190, PointType.BOLT),
    new Point(80, 170, PointType.FEATURE),
    trunkBottom,
    trunkMid,
    trunkUpper,
    // Exits mid-trunk — slight left
    new Point(70, 50, PointType.FEATURE),
    new Point(55, 25, PointType.ANCHOR),
], { strokeColor: '#66ff66' });

const case9Route3 = new Route("Route 3", [
    new Point(140, 190, PointType.BOLT),
    new Point(125, 170, PointType.FEATURE),
    trunkBottom,
    trunkMid,
    trunkUpper,
    // Exits mid-trunk — hard right
    new Point(150, 55, PointType.FEATURE),
    new Point(180, 30, PointType.ANCHOR),
], { strokeColor: '#6666ff' });

const case9Route4 = new Route("Route 4", [
    new Point(170, 190, PointType.BOLT),
    new Point(150, 165, PointType.FEATURE),
    trunkBottom,
    trunkMid,
    trunkUpper,
    trunkTop,
    // Rides the full trunk then finishes top-centre
    new Point(105, 25, PointType.ANCHOR),
], { strokeColor: '#ffaa00' });

const topoCase9 = new TopoRender({ width: 200, height: 200, curveIntensity: 1 });
const case9Svg = topoCase9.render(
    [case9Route1, case9Route2, case9Route3, case9Route4],
    imageHref
);

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

    <div class="case">
      <h2>Case 5: Segment styling</h2>
      <div class="row">
        <div class="variant">
          <h3>Default (white, 2px)</h3>
          ${case5SvgDefault}
        </div>
        <div class="variant">
          <h3>Bold red (4px)</h3>
          ${case5SvgBold}
        </div>
        <div class="variant">
          <h3>Green with dark border</h3>
          ${case5SvgBorder}
        </div>
      </div>
    </div>

    <div class="case">
      <h2>Case 6: Multiple independent routes (no merging)</h2>
      <p>Three separate routes with no shared points — left crack, central slab, right arete.</p>
      ${case6Svg}
    </div>

    <div class="case">
      <div class="row">
        <div class="variant">
          <h2>Case 7a: Shared start — same direction (divergence)</h2>
          <p>Red and blue routes share the first 3 points, then diverge.</p>
          ${case7aSvg}
        </div>
        <div class="variant">
          <h2>Case 7b: Shared start — opposite directions</h2>
          <p>Route A ascends through the shared section, Route B descends through it in reverse.</p>
          ${case7bSvg}
        </div>
      </div>
    </div>

    <div class="case">
      <div class="row">
        <div class="variant">
          <h2>Case 8a: Shared middle — same direction</h2>
          <p>Orange and cyan routes converge into a shared middle section then diverge again.</p>
          ${case8aSvg}
        </div>

        <div class="variant">
          <h2>Case 8b: Shared middle — opposite directions</h2>
          <p>Route E descends through the shared section, Route F ascends through it in reverse.</p>
          ${case8bSvg}
        </div>
      </div>
    </div>

    <div class="case">
      <h2>Case 9: Complex 4-route asymmetric merge</h2>
      <p>Four routes converge into a shared trunk from different starting positions.
         Route 1 (red) exits early left. Routes 2 (green) &amp; 3 (blue) share more trunk
         then exit left and right. Route 4 (orange) rides the full trunk to the top.</p>
      ${case9Svg}
    </div>
  </body>
</html>
`;

// Write out an HTML file that can be opened or served directly.
fs.writeFileSync("index.html", html);
