// Combined visual test page for topo-render and topo-editor.
//
// This build-time script produces a single index.html containing:
//   1. Topo Render section — pre-rendered SVGs at multiple intensity levels
//   2. Topo Editor section — interactive editors with drag-to-reposition
//   3. A shared intensity slider that controls both sections
//
// Run:  npm run visual   (builds + generates index.html)
// View: open index.html via http-server

import { Point, PointType } from "../../../topo-render/src/model/point";
import { Route } from "../../../topo-render/src/model/route";
import { SegmentStyle } from "../../../topo-render/src/model/segment";
import { buildRenderCasesHtml } from "../../../topo-render/test/visual/create-image";

const fs = require("fs");
const pathModule = require("path");

// ---------------------------------------------------------------------------
// Test case route data — mirrors topo-render/test/visual/create-image.ts
// ---------------------------------------------------------------------------

/** Case 1: Points only (no connecting segments). */
const case1Points: Array<Point<PointType>> = [
    new Point(40, 160, PointType.BOLT),
    new Point(80, 140, PointType.FEATURE),
    new Point(120, 110, PointType.FEATURE),
    new Point(150, 80, PointType.ANCHOR),
    new Point(60, 60, PointType.GENERIC),
];
const case1Route = new Route("Points Only", case1Points);

/** Case 2: Straight line segments (horizontal + vertical). */
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

/** Case 3: Zig-zag route. */
const case3PointsZigZag: Array<Point<PointType>> = [
    new Point(40, 180, PointType.BOLT),
    new Point(80, 140, PointType.FEATURE),
    new Point(120, 160, PointType.FEATURE),
    new Point(140, 120, PointType.BOLT),
    new Point(100, 80, PointType.FEATURE),
    new Point(140, 40, PointType.ANCHOR),
];
const case3Route = new Route("Zig-Zag", case3PointsZigZag);

/** Case 4: Circular loop. */
function createCirclePoints(
    cx: number, cy: number, r: number, count: number, type: PointType
): Array<Point<PointType>> {
    const pts: Array<Point<PointType>> = [];
    for (let i = 0; i < count; i++) {
        const angle = (2 * Math.PI * i) / count;
        pts.push(new Point(cx + r * Math.cos(angle), cy + r * Math.sin(angle), type));
    }
    return pts;
}
const case4CirclePoints = createCirclePoints(100, 100, 60, 12, PointType.BOLT);
const case4Route = new Route("Circle", [...case4CirclePoints, case4CirclePoints[0]]);

/** Case 5: Segment styling — same zig-zag with different visual styles. */
const styleBold: SegmentStyle = { strokeWidth: 4, strokeColor: "#ff6666" };
const styleBorder: SegmentStyle = { strokeWidth: 2, strokeColor: "#66ff66", borderWidth: 2, borderColor: "#003300" };
const case5RouteDefault = new Route("Default Style", case3PointsZigZag);
const case5RouteBold = new Route("Bold Style", case3PointsZigZag, styleBold);
const case5RouteBorder = new Route("Border Style", case3PointsZigZag, styleBorder);

/** Case 6: Multiple independent routes (no shared points). */
const case6RouteLeft = new Route("Left Crack", [
    new Point(30, 180, PointType.BOLT), new Point(35, 140, PointType.BOLT),
    new Point(25, 100, PointType.FEATURE), new Point(30, 60, PointType.BOLT),
    new Point(35, 20, PointType.ANCHOR),
], { strokeColor: "#ff6666" });
const case6RouteMid = new Route("Central Slab", [
    new Point(100, 180, PointType.BOLT), new Point(90, 150, PointType.FEATURE),
    new Point(110, 110, PointType.BOLT), new Point(95, 70, PointType.FEATURE),
    new Point(100, 30, PointType.ANCHOR),
], { strokeColor: "#66ff66" });
const case6RouteRight = new Route("Right Arete", [
    new Point(170, 180, PointType.BOLT), new Point(175, 140, PointType.BOLT),
    new Point(165, 100, PointType.FEATURE), new Point(170, 60, PointType.BOLT),
    new Point(160, 20, PointType.ANCHOR),
], { strokeColor: "#6666ff" });

/** Case 7: Shared start — two routes diverge from a common beginning. */
const sharedStart = [
    new Point(100, 180, PointType.BOLT),
    new Point(100, 140, PointType.BOLT),
    new Point(100, 100, PointType.FEATURE),
];
const case7aRouteA = new Route("Route A", [
    ...sharedStart, new Point(60, 60, PointType.FEATURE), new Point(40, 30, PointType.ANCHOR),
], { strokeColor: "#ff6666" });
const case7aRouteB = new Route("Route B", [
    ...sharedStart, new Point(140, 60, PointType.FEATURE), new Point(160, 30, PointType.ANCHOR),
], { strokeColor: "#6666ff" });

const case7bRouteA = new Route("Route A (up)", [
    ...sharedStart, new Point(60, 60, PointType.FEATURE), new Point(40, 30, PointType.ANCHOR),
], { strokeColor: "#ff6666" });
const case7bRouteB = new Route("Route B (down)", [
    ...[...sharedStart].reverse(),
    new Point(140, 170, PointType.FEATURE), new Point(160, 190, PointType.ANCHOR),
], { strokeColor: "#6666ff" });

/** Case 8: Shared middle — two routes converge then diverge. */
const sharedMiddle = [
    new Point(100, 120, PointType.FEATURE),
    new Point(100, 100, PointType.BOLT),
    new Point(100, 80, PointType.FEATURE),
];
const case8aRouteA = new Route("Route C", [
    new Point(40, 170, PointType.BOLT), new Point(60, 150, PointType.FEATURE),
    ...sharedMiddle,
    new Point(60, 50, PointType.FEATURE), new Point(40, 20, PointType.ANCHOR),
], { strokeColor: "#ffaa00" });
const case8aRouteB = new Route("Route D", [
    new Point(160, 170, PointType.BOLT), new Point(140, 150, PointType.FEATURE),
    ...sharedMiddle,
    new Point(140, 50, PointType.FEATURE), new Point(160, 20, PointType.ANCHOR),
], { strokeColor: "#00aaff" });

const case8bRouteA = new Route("Route E (down)", [
    new Point(40, 170, PointType.BOLT), new Point(60, 150, PointType.FEATURE),
    ...sharedMiddle,
    new Point(60, 50, PointType.FEATURE), new Point(40, 20, PointType.ANCHOR),
], { strokeColor: "#ffaa00" });
const case8bRouteB = new Route("Route F (up)", [
    new Point(160, 20, PointType.BOLT), new Point(140, 50, PointType.FEATURE),
    ...[...sharedMiddle].reverse(),
    new Point(140, 150, PointType.FEATURE), new Point(160, 170, PointType.ANCHOR),
], { strokeColor: "#00aaff" });

/** Case 9: Complex 4-route asymmetric merge into shared trunk. */
const trunkBottom = new Point(100, 140, PointType.BOLT);
const trunkMid    = new Point(100, 110, PointType.BOLT);
const trunkUpper  = new Point(100, 80, PointType.FEATURE);
const trunkTop    = new Point(100, 50, PointType.BOLT);

const case9Route1 = new Route("Route 1", [
    new Point(30, 190, PointType.BOLT), new Point(50, 170, PointType.FEATURE),
    trunkBottom, trunkMid,
    new Point(55, 85, PointType.FEATURE), new Point(20, 55, PointType.ANCHOR),
], { strokeColor: "#ff6666" });
const case9Route2 = new Route("Route 2", [
    new Point(70, 190, PointType.BOLT), new Point(80, 170, PointType.FEATURE),
    trunkBottom, trunkMid, trunkUpper,
    new Point(70, 50, PointType.FEATURE), new Point(55, 25, PointType.ANCHOR),
], { strokeColor: "#66ff66" });
const case9Route3 = new Route("Route 3", [
    new Point(140, 190, PointType.BOLT), new Point(125, 170, PointType.FEATURE),
    trunkBottom, trunkMid, trunkUpper,
    new Point(150, 55, PointType.FEATURE), new Point(180, 30, PointType.ANCHOR),
], { strokeColor: "#6666ff" });
const case9Route4 = new Route("Route 4", [
    new Point(170, 190, PointType.BOLT), new Point(150, 165, PointType.FEATURE),
    trunkBottom, trunkMid, trunkUpper, trunkTop,
    new Point(105, 25, PointType.ANCHOR),
], { strokeColor: "#ffaa00" });

// ---------------------------------------------------------------------------
// Test case definitions
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
        description: "Three separate routes with no shared points.",
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
        description: "Four routes converge into a shared trunk. Route 1 (red) exits early left. Routes 2 (green) & 3 (blue) share more trunk. Route 4 (orange) rides the full trunk.",
        variants: [{ label: "", routes: [case9Route1, case9Route2, case9Route3, case9Route4] }],
    },
];

// ---------------------------------------------------------------------------
// Browser bundle — reads compiled CommonJS modules and wraps them in a
// tiny module loader so they can run in the browser as a single <script>.
// ---------------------------------------------------------------------------

/** Module definition for the bundler. */
interface ModuleDef {
    /** Registry name used by the in-browser require(). */
    name: string;
    /** Path to the compiled .js file relative to the project root. */
    file: string;
    /** Maps `require("from")` → `require("to")` within this module. */
    requireMap: Record<string, string>;
}

/**
 * The modules needed by TopoEditor in dependency order.
 *
 * TypeScript elides type-only imports, so many modules have no require()
 * calls in their compiled output. The requireMap only needs entries for
 * require() calls that actually appear in the compiled JS.
 */
const MODULE_DEFS: ModuleDef[] = [
    {
        name: "point-constants",
        file: "topo-render/src/model/point/constants.js",
        requireMap: {},
    },
    {
        name: "point",
        file: "topo-render/src/model/point/point.js",
        requireMap: { '"./constants"': '"point-constants"' },
    },
    {
        name: "point-index",
        file: "topo-render/src/model/point/index.js",
        requireMap: {
            '"./point"': '"point"',
            '"./constants"': '"point-constants"',
        },
    },
    {
        name: "segment",
        file: "topo-render/src/model/segment.js",
        requireMap: {},
    },
    {
        name: "route",
        file: "topo-render/src/model/route.js",
        requireMap: {},
    },
    {
        name: "topo-tool",
        file: "topo-render/src/topo-tool.js",
        requireMap: { '"./model/segment"': '"segment"' },
    },
    {
        name: "topo-event-emitter",
        file: "topo-editor/src/topo-event-emitter.js",
        requireMap: {},
    },
    {
        name: "topo-editor",
        file: "topo-editor/src/topo-editor.js",
        requireMap: {
            '"./topo-event-emitter"': '"topo-event-emitter"',
        },
    },
];

/**
 * Read each compiled module, rewrite require() paths to registry names,
 * and wrap everything in a self-executing module loader that exposes
 * the key classes as globals.
 */
function createBrowserBundle(): string {
    const rootDir = pathModule.resolve(__dirname, "..", "..", "..");

    // Tiny CommonJS-compatible module loader.
    let bundle = `(function() {
  var __modules = {};
  var __cache = {};
  function __define(name, factory) { __modules[name] = factory; }
  function __require(name) {
    if (__cache[name]) return __cache[name];
    if (!__modules[name]) throw new Error("Module not found: " + name);
    var m = { exports: {} };
    __cache[name] = m.exports;
    __modules[name](m, m.exports, __require);
    __cache[name] = m.exports;
    return m.exports;
  }\n\n`;

    for (const mod of MODULE_DEFS) {
        let code = fs.readFileSync(
            pathModule.join(rootDir, mod.file),
            "utf-8"
        );

        // Rewrite require() paths to use registry names.
        for (const [from, to] of Object.entries(mod.requireMap)) {
            code = code.split(`require(${from})`).join(`require(${to})`);
        }

        bundle += `  __define("${mod.name}", function(module, exports, require) {\n`;
        for (const line of code.split("\n")) {
            bundle += `    ${line}\n`;
        }
        bundle += `  });\n\n`;
    }

    // Expose key classes as globals for the setup scripts.
    bundle += `  var _p = __require("point-index");\n`;
    bundle += `  var _c = __require("point-constants");\n`;
    bundle += `  window.TopoRender = __require("topo-tool").TopoRender;\n`;
    bundle += `  window.TopoEditor = __require("topo-editor").TopoEditor;\n`;
    bundle += `  window.Point = _p.Point;\n`;
    bundle += `  window.PointType = _c.PointType;\n`;
    bundle += `  window.Route = __require("route").Route;\n`;
    bundle += `})();\n`;

    return bundle;
}

// ---------------------------------------------------------------------------
// Serialization helpers — convert TS route data into browser JS code
// that creates the same routes with correct shared-point references.
// ---------------------------------------------------------------------------

/** Map a PointType enum value back to its key name. */
function pointTypeKey(type: PointType): string {
    switch (type) {
        case PointType.BOLT:    return "BOLT";
        case PointType.FEATURE: return "FEATURE";
        case PointType.ANCHOR:  return "ANCHOR";
        case PointType.GENERIC: return "GENERIC";
        default:                return "GENERIC";
    }
}

/** Round a number to 2 decimal places for readable output. */
function num(n: number): string {
    return String(Math.round(n * 100) / 100);
}

/**
 * Serialize a test-case variant into a self-contained JS IIFE that:
 * - Creates Point instances (shared references for shared points).
 * - Creates Route instances.
 * - Creates a TopoRender + TopoEditor and mounts into a container.
 * - Registers the editor for the intensity slider.
 */
function serializeVariantSetup(
    routes: Route[],
    containerId: string,
    width: number,
    height: number,
    segmentStyle?: SegmentStyle
): string {
    // Detect points used more than once across all routes (by reference).
    const pointCount = new Map<Point<PointType>, number>();
    for (const route of routes) {
        for (const p of route.points) {
            pointCount.set(p, (pointCount.get(p) ?? 0) + 1);
        }
    }

    // Assign variable names to shared points.
    const sharedVars = new Map<Point<PointType>, string>();
    let vi = 0;
    for (const [point, count] of pointCount) {
        if (count > 1) sharedVars.set(point, `sp${vi++}`);
    }

    let js = "  (function() {\n";

    // Shared point declarations.
    for (const [point, varName] of sharedVars) {
        js += `    var ${varName} = new Point(${num(point.x)}, ${num(point.y)}, PointType.${pointTypeKey(point.type)});\n`;
    }
    if (sharedVars.size > 0) js += "\n";

    // Route array.
    js += "    var routes = [\n";
    for (const route of routes) {
        const ptsStr = route.points
            .map((p) => {
                const sv = sharedVars.get(p);
                if (sv) return sv;
                return `new Point(${num(p.x)}, ${num(p.y)}, PointType.${pointTypeKey(p.type)})`;
            })
            .join(", ");

        const styleStr = route.style ? `, ${JSON.stringify(route.style)}` : "";
        js += `      new Route("${route.name}", [${ptsStr}]${styleStr}),\n`;
    }
    js += "    ];\n\n";

    // Renderer + editor setup.
    const rendererOpts: Record<string, unknown> = { width, height, curveIntensity: 1 };
    if (segmentStyle) rendererOpts.segmentStyle = segmentStyle;
    const editorOpts = JSON.stringify({ width, height, curveIntensity: 1 });

    js += `    var renderer = new TopoRender(${JSON.stringify(rendererOpts)});\n`;
    js += `    var editor = new TopoEditor(renderer, ${editorOpts});\n`;
    js += `    editor.mount("#${containerId}", routes);\n`;
    js += `    window.__topoEditors = window.__topoEditors || [];\n`;
    js += `    window.__topoEditors.push(editor);\n`;
    js += "  })();\n";

    return js;
}

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

/** Sanitize a label into a CSS-safe ID fragment. */
function slugify(s: string): string {
    return s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

/** Build the container HTML for a single test case (no scripts). */
function buildCaseHtml(tc: TestCase): string {
    const descHtml = tc.description ? `\n      <p>${tc.description}</p>` : "";
    let inner = "";

    if (tc.variants.length > 1) {
        inner += '\n      <div class="row">';
        for (const v of tc.variants) {
            const cid = `${tc.id}-${slugify(v.label)}`;
            inner += `\n        <div class="variant">`;
            if (v.label) inner += `\n          <h3>${v.label}</h3>`;
            inner += `\n          <div class="editor-container" id="${cid}"></div>`;
            inner += `\n        </div>`;
        }
        inner += "\n      </div>";
    } else {
        inner += `\n      <div class="editor-container" id="${tc.id}"></div>`;
    }

    return `
    <div class="case">
      <h2>${tc.title}</h2>${descHtml}${inner}
    </div>`;
}

/** Build the setup script for a single test case. */
function buildCaseScript(tc: TestCase): string {
    let script = "";
    for (const v of tc.variants) {
        const cid = tc.variants.length > 1
            ? `${tc.id}-${slugify(v.label)}`
            : tc.id;
        script += serializeVariantSetup(v.routes, cid, 200, 200, v.segmentStyle);
    }
    return script;
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

const CSS = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background: #1a1a1a;
        color: #eee;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 24px;
        min-height: 100vh;
      }
      h1 { font-weight: 500; margin-bottom: 16px; }
      h2 { font-weight: 400; margin: 24px 0 8px; font-size: 18px; }
      h3 { font-weight: 400; font-size: 14px; color: #ccc; margin-bottom: 4px; }
      .controls {
        position: sticky; top: 0; z-index: 10;
        background: #1a1a1a;
        padding: 12px 0 8px;
        border-bottom: 1px solid #333;
        margin-bottom: 24px;
      }
      .controls label { font-size: 14px; }
      .controls input[type="range"] { width: 300px; vertical-align: middle; margin: 0 8px; }
      .controls #intensity-value {
        display: inline-block; min-width: 28px;
        text-align: right; font-variant-numeric: tabular-nums;
      }
      .case { margin-bottom: 32px; }
      .case p { font-size: 13px; color: #999; margin-bottom: 8px; }
      .editor-container {
        border: 1px solid #444; background: #000;
        cursor: default; display: inline-block;
      }
      .editor-container svg { display: block; }
      .row { display: flex; gap: 16px; flex-wrap: wrap; }
      .variant { flex: 1 1 0; min-width: 200px; }
      .section-heading {
        font-size: 22px; font-weight: 500; margin: 40px 0 16px;
        padding-bottom: 8px; border-bottom: 1px solid #444;
      }
      .info { margin-top: 8px; margin-bottom: 16px; font-size: 13px; color: #999; }
      .topo-point { cursor: grab; }
      .topo-point:hover { r: 6; filter: brightness(1.3); }
      .topo-point.dragging { cursor: grabbing; r: 6; filter: brightness(1.5); }
    </style>`;

// ---------------------------------------------------------------------------
// Assemble and write the HTML
// ---------------------------------------------------------------------------

const renderCasesHtml = buildRenderCasesHtml();
const editorCasesHtml = testCases.map(buildCaseHtml).join("\n");
const editorCasesScript = testCases.map(buildCaseScript).join("\n");
const bundle = createBrowserBundle();

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Topo Visual Tests</title>
${CSS}
  </head>
  <body>
    <h1>Topo Visual Tests</h1>

    <div class="controls">
      <label>
        Curve intensity:
        <input type="range" id="intensity-slider" min="0" max="2" step="0.1" value="1" />
        <span id="intensity-value">1</span>
      </label>
    </div>

    <h2 class="section-heading">Renderer</h2>

${renderCasesHtml}

    <h2 class="section-heading">Editor</h2>
    <p class="info">Drag points to reposition them. Paths update in real-time.</p>

${editorCasesHtml}

    <script>
${bundle}
    </script>

    <script>
${editorCasesScript}
    </script>

    <script>
      var slider = document.getElementById("intensity-slider");
      var display = document.getElementById("intensity-value");
      var frames = document.querySelectorAll(".intensity-frame");
      slider.addEventListener("input", function() {
        var val = parseFloat(slider.value);
        var valStr = val.toFixed(1);
        display.textContent = valStr;
        // Toggle pre-rendered render frames
        frames.forEach(function(el) {
          el.style.display = el.getAttribute("data-intensity") === valStr ? "block" : "none";
        });
        // Update live editors
        (window.__topoEditors || []).forEach(function(e) { e.setIntensity(val); });
      });
    </script>
  </body>
</html>`;

fs.writeFileSync("index.html", html);
console.log("Generated index.html");
