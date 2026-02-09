import { Point } from '../point';
import { PointType } from '../constants';

describe('Point', () => {
  describe('constructor', () => {
    it('should create a point with correct coordinates and type', () => {
      const point = new Point(100, 150, PointType.BOLT);
      expect(point.x).toBe(100);
      expect(point.y).toBe(150);
      expect(point.type).toBe(PointType.BOLT);
    });

    it('should accept decimal coordinates', () => {
      const point = new Point(45.5, 67.8, PointType.FEATURE);
      expect(point.x).toBe(45.5);
      expect(point.y).toBe(67.8);
    });

    it('should accept negative coordinates', () => {
      const point = new Point(-10, -20, PointType.ANCHOR);
      expect(point.x).toBe(-10);
      expect(point.y).toBe(-20);
    });
  });

  describe('render', () => {
    it('should render a BOLT point with correct color', () => {
      const point = new Point(100, 150, PointType.BOLT);
      const svg = point.render();

      expect(svg).toContain('cx="100"');
      expect(svg).toContain('cy="150"');
      expect(svg).toContain('r="4"');
      expect(svg).toContain('fill="#42a5f5"');
      expect(svg).toContain('stroke="#000000"');
      expect(svg).toContain('data-point-type="bolt"');
    });

    it('should render a FEATURE point with correct color', () => {
      const point = new Point(50, 75, PointType.FEATURE);
      const svg = point.render();

      expect(svg).toContain('fill="#66bb6a"');
      expect(svg).toContain('data-point-type="natural_protection"');
    });

    it('should render an ANCHOR point with correct color', () => {
      const point = new Point(200, 100, PointType.ANCHOR);
      const svg = point.render();

      expect(svg).toContain('fill="#ffd54f"');
      expect(svg).toContain('data-point-type="anchor"');
    });

    it('should render a GENERIC point with correct color', () => {
      const point = new Point(80, 120, PointType.GENERIC);
      const svg = point.render();

      expect(svg).toContain('fill="#ffffff"');
      expect(svg).toContain('data-point-type="generic"');
    });

    it('should render valid SVG circle element', () => {
      const point = new Point(100, 150, PointType.BOLT);
      const svg = point.render();

      expect(svg).toMatch(/^<circle.*\/>$/);
    });

    it('should handle decimal coordinates in rendering', () => {
      const point = new Point(45.5, 67.8, PointType.BOLT);
      const svg = point.render();

      expect(svg).toContain('cx="45.5"');
      expect(svg).toContain('cy="67.8"');
    });
  });

  describe('point types', () => {
    const types = [
      { type: PointType.BOLT, color: '#42a5f5', dataAttr: 'bolt' },
      { type: PointType.FEATURE, color: '#66bb6a', dataAttr: 'natural_protection' },
      { type: PointType.ANCHOR, color: '#ffd54f', dataAttr: 'anchor' },
      { type: PointType.GENERIC, color: '#ffffff', dataAttr: 'generic' },
    ];

    types.forEach(({ type, color, dataAttr }) => {
      it(`should render ${type} with color ${color}`, () => {
        const point = new Point(10, 20, type);
        const svg = point.render();

        expect(svg).toContain(`fill="${color}"`);
        expect(svg).toContain(`data-point-type="${dataAttr}"`);
      });
    });
  });
});
