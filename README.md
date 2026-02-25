# Topo Tool

A topographic line drawing tool for rendering climbing route topos as static SVG. Zero runtime dependencies by design — all output is self-contained SVG that works without JavaScript.

## Modules

The project is split into two packages:

### `topo-render` — Core SVG renderer

The render engine. Takes structured route data and produces an SVG string. Use this anywhere you need static topo output: server-side generation, file export, embedding in HTML.

**Key classes:**

| Class        | File                                   | Description                                                                                                                                                          |
| ------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TopoRender` | `topo-render/src/topo-tool.ts`         | Main entry point. Accepts an array of `Route` objects and returns a self-contained SVG string. Configurable canvas size, curve intensity, and default segment style. |
| `Route`      | `topo-render/src/model/route.ts`       | An ordered array of `Point` objects that form a climbing line. Carries a name and an optional per-route `SegmentStyle` that overrides the global style.              |
| `Point`      | `topo-render/src/model/point/point.ts` | A 2D coordinate in SVG canvas space with an associated `PointType`. Renders as a coloured circle — colour is determined by type.                                     |
| `Segment`    | `topo-render/src/model/segment.ts`     | Static helpers for building SVG path data. Converts sequences of points to smooth cubic Bézier curves using a Catmull–Rom interpolation algorithm.                   |

**Point types** (`PointType` enum in `topo-render/src/model/point/constants.ts`):

| Type      | Colour | Meaning                           |
| --------- | ------ | --------------------------------- |
| `BOLT`    | Blue   | Fixed bolt protection             |
| `FEATURE` | Green  | Natural protection / rock feature |
| `ANCHOR`  | Yellow | Route anchor / belay station      |
| `GENERIC` | White  | General-purpose waypoint          |

**Shared segment detection:** When multiple routes share the same `Point` references, `TopoRender` automatically detects overlapping edges and renders them as a single, slightly thicker path. Unique sections keep their per-route style.

**Point style cascade:** Point appearance is resolved in priority order:
1. Per-route `pointStyle` (highest priority)
2. Global `pointStyle` on `TopoRenderOptions`
3. Per-type fill colour from `DEFAULT_POINT_FILLS` / `DEFAULT_POINT_STYLE` (fallback)

The `PointStyle` interface accepts:

| Property      | Type     | Default                          | Description                              |
| ------------- | -------- | -------------------------------- | ---------------------------------------- |
| `radius`      | `number` | `4`                              | Circle radius in pixels                  |
| `fillColor`   | `string` | Per-type (see table above)       | Fill colour (CSS). Overrides type colour |
| `strokeColor` | `string` | `'#000000'`                      | Outline colour (CSS)                     |
| `strokeWidth` | `number` | `1`                              | Outline width in pixels                  |
| `opacity`     | `number` | `1`                              | Circle opacity 0–1 (fill and stroke together) |

---

### `topo-editor` — Interactive browser editor

Mounts into a DOM element and adds drag-to-reposition interactivity on top of a `TopoRender` output. Only useful in a browser environment.

**Key classes:**

| Class              | File                                    | Description                                                                                                                                                                                       |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TopoEditor`       | `topo-editor/src/topo-editor.ts`        | Wraps a `TopoRender` instance. Call `mount(selector, routes)` to render and make editable. Supports drag interaction, live curve-intensity updates via `setIntensity()`, and a rich event system. |
| `TopoEventEmitter` | `topo-editor/src/topo-event-emitter.ts` | Lightweight typed event bus used internally. Supports `on`, `off`, `emit`, and `removeAll`.                                                                                                       |

**Editor events** (subscribe via `editor.on(type, handler)` or the static `TopoEditor.on`):

| Event         | Fires when                             |
| ------------- | -------------------------------------- |
| `hover:enter` | Cursor enters a point or path          |
| `hover:leave` | Cursor leaves a point or path          |
| `click`       | A point or path is clicked             |
| `focus`       | A point circle receives keyboard focus |
| `blur`        | A point circle loses keyboard focus    |

Instance-level handlers (`editor.on`) fire only for that editor. Static handlers (`TopoEditor.on`) fire for any mounted editor — useful for coordinating toolbars or sidebars.

---

## Getting Started

### Prerequisites

- Node.js **21.7.3** (use [nvm](https://github.com/nvm-sh/nvm): `nvm use`)

### Install

```bash
nvm use          # switch to the correct Node version
npm install
```

### Development workflow

```bash
npm run dev      # compile TypeScript, generate visual tests, and serve
```

Then open `http://localhost:3000` in your browser. The visual test page renders all test cases at configurable curve intensities.

### Available commands

| Command               | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `npm run build`       | Compile TypeScript (outputs `.js` files alongside `.ts` sources) |
| `npm run build:watch` | Compile in watch mode (recompiles on save)                       |
| `npm run visual`      | Build and generate `index.html` with visual test cases           |
| `npm run serve`       | Serve the project root at `http://localhost:3000` (no cache)     |
| `npm run dev`         | Build + visual tests + serve (full development loop)             |
| `npm run test`        | Alias for `npm run visual`                                       |

---

## Basic Usage

### Static rendering (server-side or build step)

```typescript
import { TopoRender } from "./topo-render/src/topo-tool";
import { Point, PointType } from "./topo-render/src/model/point";
import { Route } from "./topo-render/src/model/route";

// Define the points that make up the route
const points = [
  new Point(40, 180, PointType.BOLT),
  new Point(80, 140, PointType.FEATURE),
  new Point(120, 100, PointType.FEATURE),
  new Point(150, 60, PointType.ANCHOR),
];

const route = new Route("Main Route", points);

// Render to SVG
const renderer = new TopoRender({ width: 200, height: 200, curveIntensity: 1 });
const svg = renderer.render([route]);

// `svg` is a self-contained SVG string — embed it in HTML or write to a file
```

### Customising point appearance

`PointStyle` can be set globally on the renderer, per-route, or both. Per-route values are merged on top of the global defaults.

**Global style** — applies to every point unless a route overrides it:

```typescript
const renderer = new TopoRender({
  width: 200,
  height: 200,
  pointStyle: {
    radius: 6,          // larger circles
    strokeColor: "#ffffff",
    strokeWidth: 1.5,
  },
});
```

**Per-route style** — overrides the global style for all points on that route:

```typescript
const route = new Route(
  "East Face",
  [
    new Point(40, 180, PointType.BOLT),
    new Point(100, 100, PointType.FEATURE),
    new Point(160, 40, PointType.ANCHOR),
  ],
  { strokeColor: "#ff6666" },   // segment style (4th arg)
  {                             // point style (5th arg)
    radius: 5,
    fillColor: "#ff6666",       // uniform fill overriding per-type colours
    strokeColor: "#ffffff",
  },
);
```

**Overriding the fill for a single type** — supply `fillColor` only when you need to change one colour; all other properties keep their defaults:

```typescript
const renderer = new TopoRender({
  width: 200,
  height: 200,
  pointStyle: { fillColor: "#ff0000" },  // all points become red by default
});
```

---

### Multiple routes with shared points

Points are identified by **object reference**. Pass the same `Point` instance in multiple routes to have `TopoRender` detect and merge the shared section automatically:

```typescript
const sharedBottom = new Point(100, 180, PointType.BOLT);
const sharedMid = new Point(100, 120, PointType.FEATURE);

const routeLeft = new Route(
  "Left Variation",
  [sharedBottom, sharedMid, new Point(60, 60, PointType.ANCHOR)],
  { strokeColor: "#ff6666" },
);

const routeRight = new Route(
  "Right Variation",
  [sharedBottom, sharedMid, new Point(140, 60, PointType.ANCHOR)],
  { strokeColor: "#6666ff" },
);

const svg = new TopoRender({ width: 200, height: 200 }).render([
  routeLeft,
  routeRight,
]);
```

### Interactive editor (browser only)

```typescript
import { TopoRender } from "./topo-render/src/topo-tool";
import { TopoEditor } from "./topo-editor/src/topo-editor";

const renderer = new TopoRender({ width: 400, height: 400 });
const editor = new TopoEditor(renderer, { width: 400, height: 400 });

// Mount into a container element
editor.mount("#editor-container", [routeLeft, routeRight]);

// React to user interaction
editor.on("click", (evt) => {
  console.log("Clicked point", evt.pointId, "type:", evt.pointType);
});

// Adjust curve smoothing in real time
editor.setIntensity(1.5);

// Clean up when done
editor.destroy();
```

---

## Testing

Testing is visual regression via generated HTML. After running `npm run visual`, open `index.html` in a browser to inspect rendered output across 9 test cases covering points, segments, styling, and multi-route shared-segment detection.

Unit tests for the editor module run with Jest:

```bash
npx jest
```

---

## Design Constraints

- **No runtime dependencies** — the project is intentionally self-contained. `typescript` and `http-server` are the only dev dependencies.
- **Static SVG output** — rendered SVG works without JavaScript. Any JavaScript bundler or framework can consume the output.
- **Default canvas size** — 200 × 200 pixels.
