// Instantiate TopoRender and generate a simple example SVG file.

import { TopoRender } from "../../src/topo-tool";
import { Point, PointType } from "../../src/model/point";

const fs = require("fs");

// For now we render to a 200 x 200 canvas.
const topoTool = new TopoRender({ width: 200, height: 200 });

// Example points laid out roughly like a simple route.
const points: Array<Point<PointType>> = [
    new Point(40, 160, PointType.BOLT),
    new Point(80, 120, PointType.FEATURE),
    new Point(120, 80, PointType.BOLT),
    new Point(160, 40, PointType.ANCHOR),
];

// If you have a local or remote image you want to overlay, pass the URL here.
// For example:
// const imageHref = "https://example.com/my-topo-background.jpg";
const imageHref: string | undefined = undefined;

const svg = topoTool.render(points, imageHref);

// Write out a standalone SVG file that can be opened or edited directly.
fs.writeFileSync("index.html", svg);
