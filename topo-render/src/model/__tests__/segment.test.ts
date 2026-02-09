import { Segment, SegmentStyle } from '../segment';
import { Point } from '../point';
import { PointType } from '../point/constants';

describe('Segment', () => {
  describe('constructor', () => {
    it('should create a segment with points', () => {
      const points = [
        new Point(0, 0, PointType.BOLT),
        new Point(100, 100, PointType.BOLT),
      ];
      const segment = new Segment(points);

      expect(segment.points).toBe(points);
      expect(segment.points).toHaveLength(2);
    });
  });

  describe('buildPathD', () => {
    it('should return empty string for less than 2 points', () => {
      const result = Segment.buildPathD([], 1);
      expect(result).toBe('');

      const result2 = Segment.buildPathD([new Point(0, 0, PointType.BOLT)], 1);
      expect(result2).toBe('');
    });

    it('should create a straight line for 2 points with intensity 0', () => {
      const points = [
        new Point(0, 0, PointType.BOLT),
        new Point(100, 100, PointType.BOLT),
      ];
      const d = Segment.buildPathD(points, 0);

      expect(d).toContain('M 0 0');
      expect(d).toContain('100 100');
      expect(d).toContain('C');
    });

    it('should start with M (moveto) command at first point', () => {
      const points = [
        new Point(50, 75, PointType.BOLT),
        new Point(150, 125, PointType.BOLT),
      ];
      const d = Segment.buildPathD(points, 1);

      expect(d).toMatch(/^M 50 75/);
    });

    it('should create curved path for 3 points with intensity 1', () => {
      const points = [
        new Point(0, 0, PointType.BOLT),
        new Point(50, 50, PointType.BOLT),
        new Point(100, 0, PointType.BOLT),
      ];
      const d = Segment.buildPathD(points, 1);

      expect(d).toContain('M 0 0');
      expect(d).toContain('C');
      expect(d).toContain('100 0');
      // Should have 2 cubic Bézier curves for 3 points
      const cCount = (d.match(/C/g) || []).length;
      expect(cCount).toBe(2);
    });

    it('should handle intensity 0 (straight lines)', () => {
      const points = [
        new Point(0, 0, PointType.BOLT),
        new Point(50, 50, PointType.BOLT),
        new Point(100, 0, PointType.BOLT),
      ];
      const d = Segment.buildPathD(points, 0);

      // With intensity 0, control points should equal the endpoints
      expect(d).toContain('M 0 0');
      expect(d).toContain('C 0 0 50 50 50 50');
      expect(d).toContain('C 50 50 100 0 100 0');
    });

    it('should handle negative intensity as 0', () => {
      const points = [
        new Point(0, 0, PointType.BOLT),
        new Point(100, 100, PointType.BOLT),
      ];
      const d1 = Segment.buildPathD(points, -1);
      const d2 = Segment.buildPathD(points, 0);

      expect(d1).toBe(d2);
    });

    it('should use p0Override for first segment control point', () => {
      const points = [
        new Point(50, 50, PointType.BOLT),
        new Point(100, 100, PointType.BOLT),
      ];
      const p0Override = { x: 0, y: 0 };

      const d = Segment.buildPathD(points, 1, p0Override);

      // The first control point calculation should use p0Override instead of clamping
      expect(d).toContain('M 50 50');
      expect(d).toContain('C');
    });

    it('should use p3Override for last segment control point', () => {
      const points = [
        new Point(0, 0, PointType.BOLT),
        new Point(50, 50, PointType.BOLT),
      ];
      const p3Override = { x: 150, y: 150 };

      const d = Segment.buildPathD(points, 1, undefined, p3Override);

      expect(d).toContain('M 0 0');
      expect(d).toContain('C');
    });

    it('should produce different curves for different intensities', () => {
      const points = [
        new Point(0, 0, PointType.BOLT),
        new Point(50, 50, PointType.BOLT),
        new Point(100, 0, PointType.BOLT),
      ];

      const d0 = Segment.buildPathD(points, 0);
      const d1 = Segment.buildPathD(points, 1);
      const d2 = Segment.buildPathD(points, 2);

      expect(d0).not.toBe(d1);
      expect(d1).not.toBe(d2);
      expect(d0).not.toBe(d2);
    });

    it('should handle horizontal line', () => {
      const points = [
        new Point(0, 50, PointType.BOLT),
        new Point(100, 50, PointType.BOLT),
      ];
      const d = Segment.buildPathD(points, 1);

      expect(d).toContain('M 0 50');
      expect(d).toContain('100 50');
    });

    it('should handle vertical line', () => {
      const points = [
        new Point(50, 0, PointType.BOLT),
        new Point(50, 100, PointType.BOLT),
      ];
      const d = Segment.buildPathD(points, 1);

      expect(d).toContain('M 50 0');
      expect(d).toContain('50 100');
    });
  });

  describe('renderPathSvg', () => {
    it('should render path with default style', () => {
      const d = 'M 0 0 C 10 10 20 20 30 30';
      const svg = Segment.renderPathSvg(d);

      expect(svg).toContain(`d="${d}"`);
      expect(svg).toContain('fill="none"');
      expect(svg).toContain('stroke="#ffffff"');
      expect(svg).toContain('stroke-width="2"');
      expect(svg).toContain('stroke-linecap="round"');
      expect(svg).toContain('stroke-linejoin="round"');
    });

    it('should render path with custom stroke width', () => {
      const d = 'M 0 0 L 100 100';
      const style: SegmentStyle = { strokeWidth: 5 };
      const svg = Segment.renderPathSvg(d, style);

      expect(svg).toContain('stroke-width="5"');
    });

    it('should render path with custom stroke color', () => {
      const d = 'M 0 0 L 100 100';
      const style: SegmentStyle = { strokeColor: '#ff0000' };
      const svg = Segment.renderPathSvg(d, style);

      expect(svg).toContain('stroke="#ff0000"');
    });

    it('should render path with border when borderWidth > 0', () => {
      const d = 'M 0 0 L 100 100';
      const style: SegmentStyle = {
        strokeWidth: 2,
        borderWidth: 1,
        borderColor: '#000000'
      };
      const svg = Segment.renderPathSvg(d, style);

      // Should have 2 path elements: border + main
      const pathCount = (svg.match(/<path/g) || []).length;
      expect(pathCount).toBe(2);

      // Border should be strokeWidth + 2*borderWidth = 2 + 2*1 = 4
      expect(svg).toContain('stroke-width="4"');
      expect(svg).toContain('stroke="#000000"');

      // Main path should have original width
      expect(svg).toContain('stroke-width="2"');
    });

    it('should not render border when borderWidth is 0', () => {
      const d = 'M 0 0 L 100 100';
      const style: SegmentStyle = { borderWidth: 0 };
      const svg = Segment.renderPathSvg(d, style);

      // Should have only 1 path element
      const pathCount = (svg.match(/<path/g) || []).length;
      expect(pathCount).toBe(1);
    });

    it('should apply all custom styles together', () => {
      const d = 'M 0 0 L 100 100';
      const style: SegmentStyle = {
        strokeWidth: 4,
        strokeColor: '#ff6666',
        borderWidth: 2,
        borderColor: '#003300'
      };
      const svg = Segment.renderPathSvg(d, style);

      expect(svg).toContain('stroke="#ff6666"');
      expect(svg).toContain('stroke-width="4"');
      expect(svg).toContain('stroke="#003300"');
      // Border width = 4 + 2*2 = 8
      expect(svg).toContain('stroke-width="8"');
    });
  });

  describe('render', () => {
    it('should return empty string for less than 2 points', () => {
      const segment1 = new Segment([]);
      expect(segment1.render()).toBe('');

      const segment2 = new Segment([new Point(0, 0, PointType.BOLT)]);
      expect(segment2.render()).toBe('');
    });

    it('should render a segment with 2 points', () => {
      const points = [
        new Point(0, 0, PointType.BOLT),
        new Point(100, 100, PointType.BOLT),
      ];
      const segment = new Segment(points);
      const svg = segment.render();

      expect(svg).toContain('<path');
      expect(svg).toContain('M 0 0');
      expect(svg).toContain('100 100');
    });

    it('should render with default intensity when not specified', () => {
      const points = [
        new Point(0, 0, PointType.BOLT),
        new Point(50, 50, PointType.BOLT),
      ];
      const segment = new Segment(points);
      const svg = segment.render();

      expect(svg).toBeTruthy();
      expect(svg).toContain('<path');
    });

    it('should render with custom intensity', () => {
      const points = [
        new Point(0, 0, PointType.BOLT),
        new Point(50, 50, PointType.BOLT),
        new Point(100, 0, PointType.BOLT),
      ];
      const segment = new Segment(points);

      const svg0 = segment.render(0);
      const svg1 = segment.render(1);
      const svg2 = segment.render(2);

      expect(svg0).not.toBe(svg1);
      expect(svg1).not.toBe(svg2);
    });

    it('should render with custom style', () => {
      const points = [
        new Point(0, 0, PointType.BOLT),
        new Point(100, 100, PointType.BOLT),
      ];
      const segment = new Segment(points);
      const style: SegmentStyle = { strokeColor: '#ff0000', strokeWidth: 5 };
      const svg = segment.render(1, style);

      expect(svg).toContain('stroke="#ff0000"');
      expect(svg).toContain('stroke-width="5"');
    });
  });
});
