import { Route } from '../route';
import { Point } from '../point';
import { PointType } from '../point/constants';
import { SegmentStyle } from '../segment';

describe('Route', () => {
  describe('constructor', () => {
    it('should create a route with name and points', () => {
      const points = [
        new Point(0, 0, PointType.BOLT),
        new Point(100, 100, PointType.ANCHOR),
      ];
      const route = new Route('Test Route', points);

      expect(route.name).toBe('Test Route');
      expect(route.points).toBe(points);
      expect(route.points).toHaveLength(2);
      expect(route.style).toBeUndefined();
    });

    it('should create a route with optional style', () => {
      const points = [
        new Point(0, 0, PointType.BOLT),
        new Point(100, 100, PointType.ANCHOR),
      ];
      const style: SegmentStyle = {
        strokeColor: '#ff0000',
        strokeWidth: 3
      };
      const route = new Route('Styled Route', points, style);

      expect(route.name).toBe('Styled Route');
      expect(route.points).toBe(points);
      expect(route.style).toBe(style);
      expect(route.style?.strokeColor).toBe('#ff0000');
      expect(route.style?.strokeWidth).toBe(3);
    });

    it('should handle empty points array', () => {
      const route = new Route('Empty Route', []);

      expect(route.name).toBe('Empty Route');
      expect(route.points).toHaveLength(0);
    });

    it('should handle single point', () => {
      const points = [new Point(50, 50, PointType.BOLT)];
      const route = new Route('Single Point Route', points);

      expect(route.points).toHaveLength(1);
      expect(route.points[0].x).toBe(50);
      expect(route.points[0].y).toBe(50);
    });

    it('should preserve point order', () => {
      const points = [
        new Point(0, 100, PointType.BOLT),
        new Point(50, 50, PointType.FEATURE),
        new Point(100, 0, PointType.ANCHOR),
      ];
      const route = new Route('Ordered Route', points);

      expect(route.points[0]).toBe(points[0]);
      expect(route.points[1]).toBe(points[1]);
      expect(route.points[2]).toBe(points[2]);
    });

    it('should accept full SegmentStyle options', () => {
      const points = [
        new Point(0, 0, PointType.BOLT),
        new Point(100, 100, PointType.BOLT),
      ];
      const style: SegmentStyle = {
        strokeWidth: 4,
        strokeColor: '#66ff66',
        borderWidth: 2,
        borderColor: '#003300'
      };
      const route = new Route('Full Style Route', points, style);

      expect(route.style?.strokeWidth).toBe(4);
      expect(route.style?.strokeColor).toBe('#66ff66');
      expect(route.style?.borderWidth).toBe(2);
      expect(route.style?.borderColor).toBe('#003300');
    });
  });
});
