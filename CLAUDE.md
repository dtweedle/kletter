# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Topographic line drawing tool that renders climbing route topos as SVG. Zero runtime dependencies by design — only TypeScript compiler and http-server as dev dependencies.

## Build & Development Commands

```bash
npm run build          # Compile TypeScript (tsc)
npm run build:watch    # Compile TypeScript in watch mode
npm run visual         # Build + generate visual test HTML (index.html)
npm run serve          # Serve on http://localhost:3000 (no cache)
npm run dev            # Build + visual tests + serve (full dev workflow)
npm run test           # Runs visual test generation (same as npm run visual)
```

There is no unit test framework — testing is visual regression via generated HTML with embedded SVGs. After running `npm run visual`, open `index.html` to inspect rendered output.

Node version is locked to 21.7.3 (see `.nvmrc`).

## Architecture

All source code is in `topo-render/src/`. TypeScript compiles to `.js` files in-place (same directories).

**TopoRender** (`topo-render/src/topo-tool.ts`) — Main class. Takes points and segments, returns an SVG string. Supports optional background image and configurable `curveIntensity`.

**Point** (`topo-render/src/model/point/point.ts`) — Generic over `PointType` enum (BOLT, FEATURE, ANCHOR, GENERIC). Each type renders as a colored SVG circle.

**Segment** (`topo-render/src/model/segment.ts`) — Takes an array of Points, renders as an SVG path using Catmull-Rom to cubic Bézier conversion. `curveIntensity` controls smoothing (0 = straight lines, 1 = default, 2 = exaggerated curves).

**Visual tests** (`topo-render/test/visual/create-image.ts`) — Generates `index.html` at project root with 4 test cases rendered at curve intensities 0, 1, and 2.

`topo-editor/` exists as a placeholder for a future interactive editor.

## Code Standards

- Always include detailed comments about what the code is doing
- Use JSDoc decriptions where appropirate

## Branching and Workflow

- Every task must begin by creating a plan and checking out a new branch from `master`.
- Branch names must follow the convention: `fix/<branch-name>` for bug fixes or `feature/<branch-name>` for new features.
- Do not commit directly to `master`.

## Model Tracking and Consistency

- If it doesn't already exist create a /.plans directory for tracking all of the executions that each model should write to once it's decided on a plan.
- Each new plan should be added to a new plan-<plan#>.txt file where the `plan#` is simply an incrementing id begining at 1.

## Design Constraints

- Avoid introducing runtime dependencies — the project is intentionally self-contained
- SVG output should work without JavaScript (static rendering)
- Default canvas size is 200x200 pixels
