// Instantiate TopoRender and generate a visual test HTML page.
// A single range slider controls curve intensity across all cases.

import { TopoRender } from "../../src/topo-tool";
import { Point, PointType } from "../../src/model/point";
import { SegmentStyle } from "../../src/model/segment";
import { Route } from "../../src/model/route";

const fs = require("fs");

// Intensity steps from 0 to 2 in 0.1 increments.
const INTENSITY_MIN = 0;
const INTENSITY_MAX = 2;
const INTENSITY_STEP = 0.1;
const intensitySteps: number[] = [];
for (let v = INTENSITY_MIN; v <= INTENSITY_MAX + 0.001; v += INTENSITY_STEP) {
    intensitySteps.push(Math.round(v * 10) / 10);
}

const imageHref: string | undefined = undefined;

// ---------------------------------------------------------------------------
// Test case route data
// ---------------------------------------------------------------------------

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

/**
 * Case 2: Straight line segments (horizontal + vertical).
 */
const case2RouteH = new Route("Horizontal", [
    new Point(20, 180, PointType.BOLT),
    new Point(60, 180, PointType.BOLT),
    new Point(100, 180, PointType.BOLT),
    new Point(140, 180, PointType.BOLT),
    new Point(180, 180, PointType.BOLT),
]);
const case2RouteV = new Route("Vertical", [
    new Point(20, 20, PointType.BOLT),
    new Point(20, 60, PointType.BOLT),
    new Point(20, 100, PointType.BOLT),
    new Point(20, 140, PointType.BOLT),
    new Point(20, 180, PointType.BOLT),
]);

/**
 * Case 3: Zig-zag route.
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

/**
 * Case 4: Circular loop.
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

const case4CirclePoints = createCirclePoints(100, 100, 60, 12, PointType.BOLT);
const case4Route = new Route("Circle", [...case4CirclePoints, case4CirclePoints[0]]);

/**
 * Case 5: Segment styling — same zig-zag with different visual styles.
 */
const styleBold: SegmentStyle = { strokeWidth: 4, strokeColor: '#ff6666' };
const styleBorder: SegmentStyle = { strokeWidth: 2, strokeColor: '#66ff66', borderWidth: 2, borderColor: '#003300' };

const case5RouteDefault = new Route("Default Style", case3PointsZigZag);
const case5RouteBold = new Route("Bold Style", case3PointsZigZag, styleBold);
const case5RouteBorder = new Route("Border Style", case3PointsZigZag, styleBorder);

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

/**
 * Case 7b: Shared start — opposite directions through shared section.
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

/**
 * Case 8b: Shared middle — opposite directions through the shared section.
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

/**
 * Case 9: Complex asymmetric merge — 4 routes converge into a shared trunk
 * then diverge in different ways.
 */
const trunkBottom = new Point(100, 140, PointType.BOLT);
const trunkMid    = new Point(100, 110, PointType.BOLT);
const trunkUpper  = new Point(100, 80, PointType.FEATURE);
const trunkTop    = new Point(100, 50, PointType.BOLT);

const case9Route1 = new Route("Route 1", [
    new Point(30, 190, PointType.BOLT),
    new Point(50, 170, PointType.FEATURE),
    trunkBottom, trunkMid,
    new Point(55, 85, PointType.FEATURE),
    new Point(20, 55, PointType.ANCHOR),
], { strokeColor: '#ff6666' });

const case9Route2 = new Route("Route 2", [
    new Point(70, 190, PointType.BOLT),
    new Point(80, 170, PointType.FEATURE),
    trunkBottom, trunkMid, trunkUpper,
    new Point(70, 50, PointType.FEATURE),
    new Point(55, 25, PointType.ANCHOR),
], { strokeColor: '#66ff66' });

const case9Route3 = new Route("Route 3", [
    new Point(140, 190, PointType.BOLT),
    new Point(125, 170, PointType.FEATURE),
    trunkBottom, trunkMid, trunkUpper,
    new Point(150, 55, PointType.FEATURE),
    new Point(180, 30, PointType.ANCHOR),
], { strokeColor: '#6666ff' });

const case9Route4 = new Route("Route 4", [
    new Point(170, 190, PointType.BOLT),
    new Point(150, 165, PointType.FEATURE),
    trunkBottom, trunkMid, trunkUpper, trunkTop,
    new Point(105, 25, PointType.ANCHOR),
], { strokeColor: '#ffaa00' });

// ---------------------------------------------------------------------------
// Describe each test case: id, title, description, and how to render it.
// Cases with sub-variants (like segment styling) produce multiple SVGs per
// intensity step — each sub-variant gets its own column.
// ---------------------------------------------------------------------------

interface CaseVariant {
    label: string;
    routes: Route[];
    segmentStyle?: SegmentStyle;
}

interface TestCase {
    id: string;
    title: string;
    description?: string;
    variants: CaseVariant[];
}

const testCases: TestCase[] = [
    {
        id: "case1",
        title: "Case 1: Points only",
        variants: [{ label: "", routes: [case1Route] }],
    },
    {
        id: "case2",
        title: "Case 2: Straight segments",
        variants: [{ label: "", routes: [case2RouteH, case2RouteV] }],
    },
    {
        id: "case3",
        title: "Case 3: Zig-zag route",
        variants: [{ label: "", routes: [case3Route] }],
    },
    {
        id: "case4",
        title: "Case 4: Circular loop",
        variants: [{ label: "", routes: [case4Route] }],
    },
    {
        id: "case5",
        title: "Case 5: Segment styling",
        variants: [
            { label: "Default (white, 2px)", routes: [case5RouteDefault] },
            { label: "Bold red (4px)", routes: [case5RouteBold], segmentStyle: styleBold },
            { label: "Green with dark border", routes: [case5RouteBorder], segmentStyle: styleBorder },
        ],
    },
    {
        id: "case6",
        title: "Case 6: Multiple independent routes (no merging)",
        description: "Three separate routes with no shared points — left crack, central slab, right arete.",
        variants: [{ label: "", routes: [case6RouteLeft, case6RouteMid, case6RouteRight] }],
    },
    {
        id: "case7",
        title: "Case 7: Shared start (divergence)",
        variants: [
            { label: "7a: Same direction", routes: [case7aRouteA, case7aRouteB] },
            { label: "7b: Opposite directions", routes: [case7bRouteA, case7bRouteB] },
        ],
    },
    {
        id: "case8",
        title: "Case 8: Shared middle (convergence + divergence)",
        variants: [
            { label: "8a: Same direction", routes: [case8aRouteA, case8aRouteB] },
            { label: "8b: Opposite directions", routes: [case8bRouteA, case8bRouteB] },
        ],
    },
    {
        id: "case9",
        title: "Case 9: Complex 4-route asymmetric merge",
        description: "Four routes converge into a shared trunk. Route 1 (red) exits early left. Routes 2 (green) & 3 (blue) share more trunk then exit left and right. Route 4 (orange) rides the full trunk to the top.",
        variants: [{ label: "", routes: [case9Route1, case9Route2, case9Route3, case9Route4] }],
    },
];

// ---------------------------------------------------------------------------
// Pre-render every case × variant × intensity step
// ---------------------------------------------------------------------------

// Map: caseId -> variantIndex -> intensity -> svgString
const rendered = new Map<string, Map<number, Map<number, string>>>();

for (const tc of testCases) {
    const caseMap = new Map<number, Map<number, string>>();
    for (let vi = 0; vi < tc.variants.length; vi++) {
        const variant = tc.variants[vi];
        const intensityMap = new Map<number, string>();
        for (const intensity of intensitySteps) {
            const topo = new TopoRender({
                width: 200,
                height: 200,
                curveIntensity: intensity,
                segmentStyle: variant.segmentStyle,
            });
            intensityMap.set(intensity, topo.render(variant.routes, imageHref));
        }
        caseMap.set(vi, intensityMap);
    }
    rendered.set(tc.id, caseMap);
}

// ---------------------------------------------------------------------------
// Build HTML for each case
// ---------------------------------------------------------------------------

function buildCaseHtml(tc: TestCase): string {
    const caseMap = rendered.get(tc.id)!;
    const hasMultipleVariants = tc.variants.length > 1;

    let inner = "";

    if (hasMultipleVariants) {
        // Wrap variants in a row
        inner += `<div class="row">`;
        for (let vi = 0; vi < tc.variants.length; vi++) {
            const variant = tc.variants[vi];
            const intensityMap = caseMap.get(vi)!;
            inner += `<div class="variant">`;
            if (variant.label) {
                inner += `<h3>${variant.label}</h3>`;
            }
            for (const intensity of intensitySteps) {
                const display = intensity === 1 ? "block" : "none";
                inner += `<div class="intensity-frame" data-intensity="${intensity}" style="display:${display}">${intensityMap.get(intensity)}</div>`;
            }
            inner += `</div>`;
        }
        inner += `</div>`;
    } else {
        const intensityMap = caseMap.get(0)!;
        for (const intensity of intensitySteps) {
            const display = intensity === 1 ? "block" : "none";
            inner += `<div class="intensity-frame" data-intensity="${intensity}" style="display:${display}">${intensityMap.get(intensity)}</div>`;
        }
    }

    const descHtml = tc.description ? `<p>${tc.description}</p>` : "";

    return `
    <div class="case">
      <h2>${tc.title}</h2>
      ${descHtml}
      ${inner}
    </div>`;
}

const casesHtml = testCases.map(buildCaseHtml).join("\n");

// ---------------------------------------------------------------------------
// Assemble the full HTML page
// ---------------------------------------------------------------------------

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
      .controls {
        position: sticky;
        top: 0;
        z-index: 10;
        background: #111;
        padding: 12px 0 8px;
        border-bottom: 1px solid #333;
        margin-bottom: 24px;
      }
      .controls label {
        font-size: 14px;
      }
      .controls input[type="range"] {
        width: 300px;
        vertical-align: middle;
        margin: 0 8px;
      }
      .controls #intensity-value {
        display: inline-block;
        min-width: 28px;
        text-align: right;
        font-variant-numeric: tabular-nums;
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

    <div class="controls">
      <label>
        Curve intensity:
        <input type="range" id="intensity-slider" min="${INTENSITY_MIN}" max="${INTENSITY_MAX}" step="${INTENSITY_STEP}" value="1" />
        <span id="intensity-value">1</span>
      </label>
    </div>

${casesHtml}

    <script>
      const slider = document.getElementById("intensity-slider");
      const display = document.getElementById("intensity-value");
      const frames = document.querySelectorAll(".intensity-frame");

      function update() {
        const val = parseFloat(slider.value).toFixed(1);
        display.textContent = val;
        frames.forEach(function (el) {
          el.style.display = el.getAttribute("data-intensity") === val ? "block" : "none";
        });
      }

      slider.addEventListener("input", update);
    </script>
  </body>
</html>
`;

fs.writeFileSync("index.html", html);
