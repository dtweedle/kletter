"use strict";
// Combined visual test page for topo-render and topo-editor.
//
// This build-time script produces a single index.html containing:
//   1. Topo Render section — pre-rendered SVGs at multiple intensity levels
//   2. Topo Editor section — interactive editors with drag-to-reposition
//   3. A shared intensity slider that controls both sections
//
// Run:  npm run visual   (builds + generates index.html)
// View: open index.html via http-server
Object.defineProperty(exports, "__esModule", { value: true });
const point_1 = require("../../../topo-render/src/model/point");
const route_1 = require("../../../topo-render/src/model/route");
const create_image_1 = require("../../../topo-render/test/visual/create-image");
const fs = require("fs");
const pathModule = require("path");
// ---------------------------------------------------------------------------
// Test case route data — mirrors topo-render/test/visual/create-image.ts
// ---------------------------------------------------------------------------
/** Case 1: Points only (no connecting segments). */
const case1Points = [
    new point_1.Point(40, 160, point_1.PointType.BOLT),
    new point_1.Point(80, 140, point_1.PointType.FEATURE),
    new point_1.Point(120, 110, point_1.PointType.FEATURE),
    new point_1.Point(150, 80, point_1.PointType.ANCHOR),
    new point_1.Point(60, 60, point_1.PointType.GENERIC),
];
const case1Route = new route_1.Route("Points Only", case1Points);
/** Case 2: Straight line segments (horizontal + vertical). */
const case2RouteH = new route_1.Route("Horizontal", [
    new point_1.Point(20, 180, point_1.PointType.BOLT),
    new point_1.Point(60, 180, point_1.PointType.BOLT),
    new point_1.Point(100, 180, point_1.PointType.BOLT),
    new point_1.Point(140, 180, point_1.PointType.BOLT),
    new point_1.Point(180, 180, point_1.PointType.BOLT),
]);
const case2RouteV = new route_1.Route("Vertical", [
    new point_1.Point(20, 20, point_1.PointType.BOLT),
    new point_1.Point(20, 60, point_1.PointType.BOLT),
    new point_1.Point(20, 100, point_1.PointType.BOLT),
    new point_1.Point(20, 140, point_1.PointType.BOLT),
    new point_1.Point(20, 180, point_1.PointType.BOLT),
]);
/** Case 3: Zig-zag route. */
const case3PointsZigZag = [
    new point_1.Point(40, 180, point_1.PointType.BOLT),
    new point_1.Point(80, 140, point_1.PointType.FEATURE),
    new point_1.Point(120, 160, point_1.PointType.FEATURE),
    new point_1.Point(140, 120, point_1.PointType.BOLT),
    new point_1.Point(100, 80, point_1.PointType.FEATURE),
    new point_1.Point(140, 40, point_1.PointType.ANCHOR),
];
const case3Route = new route_1.Route("Zig-Zag", case3PointsZigZag);
/** Case 4: Circular loop. */
function createCirclePoints(cx, cy, r, count, type) {
    const pts = [];
    for (let i = 0; i < count; i++) {
        const angle = (2 * Math.PI * i) / count;
        pts.push(new point_1.Point(cx + r * Math.cos(angle), cy + r * Math.sin(angle), type));
    }
    return pts;
}
const case4CirclePoints = createCirclePoints(100, 100, 60, 12, point_1.PointType.BOLT);
const case4Route = new route_1.Route("Circle", [...case4CirclePoints, case4CirclePoints[0]]);
/** Case 5: Segment styling — same zig-zag with different visual styles. */
const styleBold = { strokeWidth: 4, strokeColor: "#ff6666" };
const styleBorder = { strokeWidth: 2, strokeColor: "#66ff66", borderWidth: 2, borderColor: "#003300" };
const case5RouteDefault = new route_1.Route("Default Style", case3PointsZigZag);
const case5RouteBold = new route_1.Route("Bold Style", case3PointsZigZag, styleBold);
const case5RouteBorder = new route_1.Route("Border Style", case3PointsZigZag, styleBorder);
/** Case 6: Multiple independent routes (no shared points). */
const case6RouteLeft = new route_1.Route("Left Crack", [
    new point_1.Point(30, 180, point_1.PointType.BOLT), new point_1.Point(35, 140, point_1.PointType.BOLT),
    new point_1.Point(25, 100, point_1.PointType.FEATURE), new point_1.Point(30, 60, point_1.PointType.BOLT),
    new point_1.Point(35, 20, point_1.PointType.ANCHOR),
], { strokeColor: "#ff6666" });
const case6RouteMid = new route_1.Route("Central Slab", [
    new point_1.Point(100, 180, point_1.PointType.BOLT), new point_1.Point(90, 150, point_1.PointType.FEATURE),
    new point_1.Point(110, 110, point_1.PointType.BOLT), new point_1.Point(95, 70, point_1.PointType.FEATURE),
    new point_1.Point(100, 30, point_1.PointType.ANCHOR),
], { strokeColor: "#66ff66" });
const case6RouteRight = new route_1.Route("Right Arete", [
    new point_1.Point(170, 180, point_1.PointType.BOLT), new point_1.Point(175, 140, point_1.PointType.BOLT),
    new point_1.Point(165, 100, point_1.PointType.FEATURE), new point_1.Point(170, 60, point_1.PointType.BOLT),
    new point_1.Point(160, 20, point_1.PointType.ANCHOR),
], { strokeColor: "#6666ff" });
/** Case 7: Shared start — two routes diverge from a common beginning. */
const sharedStart = [
    new point_1.Point(100, 180, point_1.PointType.BOLT),
    new point_1.Point(100, 140, point_1.PointType.BOLT),
    new point_1.Point(100, 100, point_1.PointType.FEATURE),
];
const case7aRouteA = new route_1.Route("Route A", [
    ...sharedStart, new point_1.Point(60, 60, point_1.PointType.FEATURE), new point_1.Point(40, 30, point_1.PointType.ANCHOR),
], { strokeColor: "#ff6666" });
const case7aRouteB = new route_1.Route("Route B", [
    ...sharedStart, new point_1.Point(140, 60, point_1.PointType.FEATURE), new point_1.Point(160, 30, point_1.PointType.ANCHOR),
], { strokeColor: "#6666ff" });
const case7bRouteA = new route_1.Route("Route A (up)", [
    ...sharedStart, new point_1.Point(60, 60, point_1.PointType.FEATURE), new point_1.Point(40, 30, point_1.PointType.ANCHOR),
], { strokeColor: "#ff6666" });
const case7bRouteB = new route_1.Route("Route B (down)", [
    ...[...sharedStart].reverse(),
    new point_1.Point(140, 170, point_1.PointType.FEATURE), new point_1.Point(160, 190, point_1.PointType.ANCHOR),
], { strokeColor: "#6666ff" });
/** Case 8: Shared middle — two routes converge then diverge. */
const sharedMiddle = [
    new point_1.Point(100, 120, point_1.PointType.FEATURE),
    new point_1.Point(100, 100, point_1.PointType.BOLT),
    new point_1.Point(100, 80, point_1.PointType.FEATURE),
];
const case8aRouteA = new route_1.Route("Route C", [
    new point_1.Point(40, 170, point_1.PointType.BOLT), new point_1.Point(60, 150, point_1.PointType.FEATURE),
    ...sharedMiddle,
    new point_1.Point(60, 50, point_1.PointType.FEATURE), new point_1.Point(40, 20, point_1.PointType.ANCHOR),
], { strokeColor: "#ffaa00" });
const case8aRouteB = new route_1.Route("Route D", [
    new point_1.Point(160, 170, point_1.PointType.BOLT), new point_1.Point(140, 150, point_1.PointType.FEATURE),
    ...sharedMiddle,
    new point_1.Point(140, 50, point_1.PointType.FEATURE), new point_1.Point(160, 20, point_1.PointType.ANCHOR),
], { strokeColor: "#00aaff" });
const case8bRouteA = new route_1.Route("Route E (down)", [
    new point_1.Point(40, 170, point_1.PointType.BOLT), new point_1.Point(60, 150, point_1.PointType.FEATURE),
    ...sharedMiddle,
    new point_1.Point(60, 50, point_1.PointType.FEATURE), new point_1.Point(40, 20, point_1.PointType.ANCHOR),
], { strokeColor: "#ffaa00" });
const case8bRouteB = new route_1.Route("Route F (up)", [
    new point_1.Point(160, 20, point_1.PointType.BOLT), new point_1.Point(140, 50, point_1.PointType.FEATURE),
    ...[...sharedMiddle].reverse(),
    new point_1.Point(140, 150, point_1.PointType.FEATURE), new point_1.Point(160, 170, point_1.PointType.ANCHOR),
], { strokeColor: "#00aaff" });
/** Case 9: Complex 4-route asymmetric merge into shared trunk. */
const trunkBottom = new point_1.Point(100, 140, point_1.PointType.BOLT);
const trunkMid = new point_1.Point(100, 110, point_1.PointType.BOLT);
const trunkUpper = new point_1.Point(100, 80, point_1.PointType.FEATURE);
const trunkTop = new point_1.Point(100, 50, point_1.PointType.BOLT);
const case9Route1 = new route_1.Route("Route 1", [
    new point_1.Point(30, 190, point_1.PointType.BOLT), new point_1.Point(50, 170, point_1.PointType.FEATURE),
    trunkBottom, trunkMid,
    new point_1.Point(55, 85, point_1.PointType.FEATURE), new point_1.Point(20, 55, point_1.PointType.ANCHOR),
], { strokeColor: "#ff6666" });
const case9Route2 = new route_1.Route("Route 2", [
    new point_1.Point(70, 190, point_1.PointType.BOLT), new point_1.Point(80, 170, point_1.PointType.FEATURE),
    trunkBottom, trunkMid, trunkUpper,
    new point_1.Point(70, 50, point_1.PointType.FEATURE), new point_1.Point(55, 25, point_1.PointType.ANCHOR),
], { strokeColor: "#66ff66" });
const case9Route3 = new route_1.Route("Route 3", [
    new point_1.Point(140, 190, point_1.PointType.BOLT), new point_1.Point(125, 170, point_1.PointType.FEATURE),
    trunkBottom, trunkMid, trunkUpper,
    new point_1.Point(150, 55, point_1.PointType.FEATURE), new point_1.Point(180, 30, point_1.PointType.ANCHOR),
], { strokeColor: "#6666ff" });
const case9Route4 = new route_1.Route("Route 4", [
    new point_1.Point(170, 190, point_1.PointType.BOLT), new point_1.Point(150, 165, point_1.PointType.FEATURE),
    trunkBottom, trunkMid, trunkUpper, trunkTop,
    new point_1.Point(105, 25, point_1.PointType.ANCHOR),
], { strokeColor: "#ffaa00" });
/** Case 10: Point styling — same zig-zag with different point styles. */
const pointStyleLarge = { radius: 6, strokeWidth: 2 };
const pointStyleCustom = { radius: 5, fillColor: '#ff69b4', strokeColor: '#ffffff', strokeWidth: 1.5 };
const case10RouteDefault = new route_1.Route("Default Points", case3PointsZigZag);
const case10RouteLarge = new route_1.Route("Large Points", case3PointsZigZag, undefined, pointStyleLarge);
const case10RouteCustom = new route_1.Route("Custom Points", case3PointsZigZag, undefined, pointStyleCustom);
const testCases = [
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
    {
        id: "case10",
        title: "Case 10: Point styling",
        description: "Same zig-zag route with different point visual styles.",
        variants: [
            { label: "Default", routes: [case10RouteDefault] },
            { label: "Large (r=6, stroke=2)", routes: [case10RouteLarge] },
            { label: "Custom (pink, white stroke)", routes: [case10RouteCustom] },
        ],
    },
];
/**
 * The modules needed by TopoEditor in dependency order.
 *
 * TypeScript elides type-only imports, so many modules have no require()
 * calls in their compiled output. The requireMap only needs entries for
 * require() calls that actually appear in the compiled JS.
 */
const MODULE_DEFS = [
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
function createBrowserBundle() {
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
        let code = fs.readFileSync(pathModule.join(rootDir, mod.file), "utf-8");
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
function pointTypeKey(type) {
    switch (type) {
        case point_1.PointType.BOLT: return "BOLT";
        case point_1.PointType.FEATURE: return "FEATURE";
        case point_1.PointType.ANCHOR: return "ANCHOR";
        case point_1.PointType.GENERIC: return "GENERIC";
        default: return "GENERIC";
    }
}
/** Round a number to 2 decimal places for readable output. */
function num(n) {
    return String(Math.round(n * 100) / 100);
}
/**
 * Serialize a test-case variant into a self-contained JS IIFE that:
 * - Creates Point instances (shared references for shared points).
 * - Creates Route instances.
 * - Creates a TopoRender + TopoEditor and mounts into a container.
 * - Registers the editor for the intensity slider.
 */
function serializeVariantSetup(routes, containerId, width, height, segmentStyle, pointStyle) {
    var _a;
    // Detect points used more than once across all routes (by reference).
    const pointCount = new Map();
    for (const route of routes) {
        for (const p of route.points) {
            pointCount.set(p, ((_a = pointCount.get(p)) !== null && _a !== void 0 ? _a : 0) + 1);
        }
    }
    // Assign variable names to shared points.
    const sharedVars = new Map();
    let vi = 0;
    for (const [point, count] of pointCount) {
        if (count > 1)
            sharedVars.set(point, `sp${vi++}`);
    }
    let js = "  (function() {\n";
    // Shared point declarations.
    for (const [point, varName] of sharedVars) {
        js += `    var ${varName} = new Point(${num(point.x)}, ${num(point.y)}, PointType.${pointTypeKey(point.type)});\n`;
    }
    if (sharedVars.size > 0)
        js += "\n";
    // Route array.
    js += "    var routes = [\n";
    for (const route of routes) {
        const ptsStr = route.points
            .map((p) => {
            const sv = sharedVars.get(p);
            if (sv)
                return sv;
            return `new Point(${num(p.x)}, ${num(p.y)}, PointType.${pointTypeKey(p.type)})`;
        })
            .join(", ");
        // Build the optional 3rd (segmentStyle) and 4th (pointStyle) args.
        const segStr = route.style ? JSON.stringify(route.style) : (route.pointStyle ? "undefined" : "");
        const ptStr = route.pointStyle ? `, ${JSON.stringify(route.pointStyle)}` : "";
        const argsStr = segStr || ptStr ? `, ${segStr}${ptStr}` : "";
        js += `      new Route("${route.name}", [${ptsStr}]${argsStr}),\n`;
    }
    js += "    ];\n\n";
    // Renderer + editor setup.
    const rendererOpts = { width, height, curveIntensity: 1 };
    if (segmentStyle)
        rendererOpts.segmentStyle = segmentStyle;
    // Always include a base opacity; merge any variant-level pointStyle on top so per-case
    // overrides (radius, fillColor, etc.) are preserved while opacity is always set.
    rendererOpts.pointStyle = { opacity: 0.9, ...(pointStyle !== null && pointStyle !== void 0 ? pointStyle : {}) };
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
function slugify(s) {
    return s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}
/** Build the container HTML for a single test case (no scripts). */
function buildCaseHtml(tc) {
    const descHtml = tc.description ? `\n      <p>${tc.description}</p>` : "";
    let inner = "";
    if (tc.variants.length > 1) {
        inner += '\n      <div class="row">';
        for (const v of tc.variants) {
            const cid = `${tc.id}-${slugify(v.label)}`;
            inner += `\n        <div class="variant">`;
            if (v.label)
                inner += `\n          <h3>${v.label}</h3>`;
            inner += `\n          <div class="editor-container" id="${cid}"></div>`;
            inner += `\n        </div>`;
        }
        inner += "\n      </div>";
    }
    else {
        inner += `\n      <div class="editor-container" id="${tc.id}"></div>`;
    }
    return `
    <div class="case">
      <h2>${tc.title}</h2>${descHtml}${inner}
    </div>`;
}
/** Build the setup script for a single test case. */
function buildCaseScript(tc) {
    let script = "";
    for (const v of tc.variants) {
        const cid = tc.variants.length > 1
            ? `${tc.id}-${slugify(v.label)}`
            : tc.id;
        script += serializeVariantSetup(v.routes, cid, 200, 200, v.segmentStyle, v.pointStyle);
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
const renderCasesHtml = (0, create_image_1.buildRenderCasesHtml)();
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
