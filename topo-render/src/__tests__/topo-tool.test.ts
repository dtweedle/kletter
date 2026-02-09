import { TopoRender, TopoRenderOptions } from '../topo-tool';
import { Route } from '../model/route';
import { Point } from '../model/point';
import { PointType } from '../model/point/constants';
import { SegmentStyle } from '../model/segment';

describe('TopoRender', () => {
  describe('constructor', () => {
    it('should create with default options', () => {
      const topo = new TopoRender();
      const svg = topo.render([]);

      expect(svg).toContain('width="200"');
      expect(svg).toContain('height="200"');
      expect(svg).toContain('viewBox="0 0 200 200"');
    });

    it('should accept custom width and height', () => {
      const topo = new TopoRender({ width: 500, height: 600 });
      const svg = topo.render([]);

      expect(svg).toContain('width="500"');
      expect(svg).toContain('height="600"');
      expect(svg).toContain('viewBox="0 0 500 600"');
    });

    it('should accept custom curveIntensity', () => {
      const topo = new TopoRender({ curveIntensity: 2 });
      // Hard to test directly, but it should not throw
      expect(topo).toBeDefined();
    });

    it('should accept custom segmentStyle', () => {
      const style: SegmentStyle = { strokeColor: '#ff0000', strokeWidth: 3 };
      const topo = new TopoRender({ segmentStyle: style });

      expect(topo).toBeDefined();
    });

    it('should use 200x200 as default when only one dimension provided', () => {
      const topo1 = new TopoRender({ width: 300 });
      const svg1 = topo1.render([]);
      expect(svg1).toContain('width="300"');
      expect(svg1).toContain('height="200"');

      const topo2 = new TopoRender({ height: 400 });
      const svg2 = topo2.render([]);
      expect(svg2).toContain('width="200"');
      expect(svg2).toContain('height="400"');
    });
  });

  describe('init', () => {
    it('should set image href', () => {
      const topo = new TopoRender();
      topo.init('http://example.com/image.jpg');

      const svg = topo.render([]);
      expect(svg).toContain('<image href="http://example.com/image.jpg"');
    });

    it('should allow undefined image', () => {
      const topo = new TopoRender();
      topo.init(undefined);

      const svg = topo.render([]);
      expect(svg).toContain('<rect');
      expect(svg).toContain('fill="black"');
    });
  });

  describe('render', () => {
    it('should generate valid SVG structure', () => {
      const topo = new TopoRender();
      const svg = topo.render([]);

      expect(svg).toMatch(/^<svg/);
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toMatch(/<\/svg>$/);
    });

    it('should include black background when no image provided', () => {
      const topo = new TopoRender();
      const svg = topo.render([]);

      expect(svg).toContain('<rect x="0" y="0" width="200" height="200" fill="black" />');
      expect(svg).not.toContain('<image');
    });

    it('should include image background when imageHref provided in render', () => {
      const topo = new TopoRender();
      const svg = topo.render([], 'http://example.com/bg.jpg');

      expect(svg).toContain('<image href="http://example.com/bg.jpg"');
      expect(svg).not.toContain('<rect');
    });

    it('should prefer render imageHref over init imageHref', () => {
      const topo = new TopoRender();
      topo.init('http://example.com/init.jpg');
      const svg = topo.render([], 'http://example.com/render.jpg');

      expect(svg).toContain('http://example.com/render.jpg');
      expect(svg).not.toContain('http://example.com/init.jpg');
    });

    it('should use init imageHref when no render imageHref provided', () => {
      const topo = new TopoRender();
      topo.init('http://example.com/init.jpg');
      const svg = topo.render([]);

      expect(svg).toContain('http://example.com/init.jpg');
    });

    it('should render empty SVG for empty routes array', () => {
      const topo = new TopoRender();
      const svg = topo.render([]);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).not.toContain('<circle');
      expect(svg).not.toContain('<path');
    });

    it('should render points for single route', () => {
      const points = [
        new Point(50, 50, PointType.BOLT),
        new Point(100, 100, PointType.ANCHOR),
      ];
      const route = new Route('Test', points);
      const topo = new TopoRender();
      const svg = topo.render([route]);

      // Should have 2 circles
      const circleCount = (svg.match(/<circle/g) || []).length;
      expect(circleCount).toBe(2);

      // Should have path connecting them
      expect(svg).toContain('<path');
    });

    it('should render multiple independent routes', () => {
      const route1 = new Route('Route 1', [
        new Point(20, 20, PointType.BOLT),
        new Point(40, 40, PointType.BOLT),
      ]);

      const route2 = new Route('Route 2', [
        new Point(100, 20, PointType.BOLT),
        new Point(120, 40, PointType.BOLT),
      ]);

      const topo = new TopoRender();
      const svg = topo.render([route1, route2]);

      // Should have 4 circles (2 per route)
      const circleCount = (svg.match(/<circle/g) || []).length;
      expect(circleCount).toBe(4);

      // Should have paths
      expect(svg).toContain('<path');
    });

    it('should deduplicate shared points', () => {
      const sharedPoint = new Point(50, 50, PointType.BOLT);
      const route1 = new Route('Route 1', [
        new Point(20, 20, PointType.BOLT),
        sharedPoint,
        new Point(80, 20, PointType.BOLT),
      ]);

      const route2 = new Route('Route 2', [
        new Point(20, 80, PointType.BOLT),
        sharedPoint,
        new Point(80, 80, PointType.BOLT),
      ]);

      const topo = new TopoRender();
      const svg = topo.render([route1, route2]);

      // Should have 5 circles (not 6), as shared point is only rendered once
      const circleCount = (svg.match(/<circle/g) || []).length;
      expect(circleCount).toBe(5);
    });

    it('should handle route with only one point', () => {
      const route = new Route('Single', [
        new Point(50, 50, PointType.BOLT),
      ]);

      const topo = new TopoRender();
      const svg = topo.render([route]);

      // Should have 1 circle
      const circleCount = (svg.match(/<circle/g) || []).length;
      expect(circleCount).toBe(1);

      // Should not have any paths (need at least 2 points)
      const pathCount = (svg.match(/<path/g) || []).length;
      expect(pathCount).toBe(0);
    });

    it('should apply per-route style', () => {
      const style: SegmentStyle = { strokeColor: '#ff0000' };
      const route = new Route('Styled', [
        new Point(0, 0, PointType.BOLT),
        new Point(100, 100, PointType.BOLT),
      ], style);

      const topo = new TopoRender();
      const svg = topo.render([route]);

      expect(svg).toContain('stroke="#ff0000"');
    });

    it('should use global segmentStyle as default', () => {
      const globalStyle: SegmentStyle = { strokeColor: '#00ff00' };
      const route = new Route('Route', [
        new Point(0, 0, PointType.BOLT),
        new Point(100, 100, PointType.BOLT),
      ]);

      const topo = new TopoRender({ segmentStyle: globalStyle });
      const svg = topo.render([route]);

      expect(svg).toContain('stroke="#00ff00"');
    });

    it('should override global style with per-route style', () => {
      const globalStyle: SegmentStyle = { strokeColor: '#00ff00' };
      const routeStyle: SegmentStyle = { strokeColor: '#ff0000' };
      const route = new Route('Route', [
        new Point(0, 0, PointType.BOLT),
        new Point(100, 100, PointType.BOLT),
      ], routeStyle);

      const topo = new TopoRender({ segmentStyle: globalStyle });
      const svg = topo.render([route]);

      expect(svg).toContain('stroke="#ff0000"');
      expect(svg).not.toContain('stroke="#00ff00"');
    });

    it('should render shared segments with thicker stroke', () => {
      const sharedStart = new Point(50, 100, PointType.BOLT);
      const sharedEnd = new Point(50, 50, PointType.BOLT);

      const route1 = new Route('Route 1', [
        new Point(20, 150, PointType.BOLT),
        sharedStart,
        sharedEnd,
        new Point(20, 20, PointType.BOLT),
      ]);

      const route2 = new Route('Route 2', [
        new Point(80, 150, PointType.BOLT),
        sharedStart,
        sharedEnd,
        new Point(80, 20, PointType.BOLT),
      ]);

      const topo = new TopoRender({ segmentStyle: { strokeWidth: 2 } });
      const svg = topo.render([route1, route2]);

      // Shared segments should have strokeWidth = 2 + 1 = 3
      expect(svg).toContain('stroke-width="3"');
      // Unique segments should have strokeWidth = 2
      expect(svg).toContain('stroke-width="2"');
    });

    it('should respect curveIntensity setting', () => {
      const route = new Route('Route', [
        new Point(0, 100, PointType.BOLT),
        new Point(50, 50, PointType.BOLT),
        new Point(100, 100, PointType.BOLT),
      ]);

      const topo0 = new TopoRender({ curveIntensity: 0 });
      const topo1 = new TopoRender({ curveIntensity: 1 });
      const topo2 = new TopoRender({ curveIntensity: 2 });

      const svg0 = topo0.render([route]);
      const svg1 = topo1.render([route]);
      const svg2 = topo2.render([route]);

      // Different intensities should produce different path data
      expect(svg0).not.toBe(svg1);
      expect(svg1).not.toBe(svg2);
      expect(svg0).not.toBe(svg2);
    });

    it('should handle routes sharing multiple segments', () => {
      const p1 = new Point(50, 100, PointType.BOLT);
      const p2 = new Point(50, 80, PointType.BOLT);
      const p3 = new Point(50, 60, PointType.BOLT);

      const route1 = new Route('Route 1', [
        new Point(20, 100, PointType.BOLT),
        p1, p2, p3,
        new Point(20, 60, PointType.BOLT),
      ]);

      const route2 = new Route('Route 2', [
        new Point(80, 100, PointType.BOLT),
        p1, p2, p3,
        new Point(80, 60, PointType.BOLT),
      ]);

      const topo = new TopoRender();
      const svg = topo.render([route1, route2]);

      // Should render successfully
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('<path');
    });

    it('should render different point types with different colors', () => {
      const route = new Route('Multi-type', [
        new Point(20, 20, PointType.BOLT),
        new Point(40, 40, PointType.FEATURE),
        new Point(60, 60, PointType.ANCHOR),
        new Point(80, 80, PointType.GENERIC),
      ]);

      const topo = new TopoRender();
      const svg = topo.render([route]);

      expect(svg).toContain('fill="#42a5f5"'); // BOLT
      expect(svg).toContain('fill="#66bb6a"'); // FEATURE
      expect(svg).toContain('fill="#ffd54f"'); // ANCHOR
      expect(svg).toContain('fill="#ffffff"'); // GENERIC
    });
  });

  describe('complex scenarios', () => {
    it('should handle circular routes', () => {
      const p1 = new Point(100, 50, PointType.BOLT);
      const p2 = new Point(150, 100, PointType.BOLT);
      const p3 = new Point(100, 150, PointType.BOLT);
      const p4 = new Point(50, 100, PointType.BOLT);

      const route = new Route('Circle', [p1, p2, p3, p4, p1]);

      const topo = new TopoRender();
      const svg = topo.render([route]);

      // Should have 4 unique circles
      const circleCount = (svg.match(/<circle/g) || []).length;
      expect(circleCount).toBe(4);

      expect(svg).toContain('<path');
    });

    it('should handle three routes with complex sharing', () => {
      const shared1 = new Point(50, 100, PointType.BOLT);
      const shared2 = new Point(50, 50, PointType.BOLT);

      const route1 = new Route('Route 1', [
        new Point(20, 150, PointType.BOLT),
        shared1,
        shared2,
        new Point(20, 20, PointType.BOLT),
      ]);

      const route2 = new Route('Route 2', [
        new Point(50, 150, PointType.BOLT),
        shared1,
        shared2,
        new Point(50, 20, PointType.BOLT),
      ]);

      const route3 = new Route('Route 3', [
        new Point(80, 150, PointType.BOLT),
        shared1,
        shared2,
        new Point(80, 20, PointType.BOLT),
      ]);

      const topo = new TopoRender();
      const svg = topo.render([route1, route2, route3]);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');

      // Should have shared segments rendered once
      const pathCount = (svg.match(/<path/g) || []).length;
      expect(pathCount).toBeGreaterThan(0);
    });
  });
});
