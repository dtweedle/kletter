import { PointType, BoltType } from '../constants';

describe('Constants', () => {
  describe('PointType enum', () => {
    it('should have correct BOLT value', () => {
      expect(PointType.BOLT).toBe('bolt');
    });

    it('should have correct FEATURE value', () => {
      expect(PointType.FEATURE).toBe('natural_protection');
    });

    it('should have correct ANCHOR value', () => {
      expect(PointType.ANCHOR).toBe('anchor');
    });

    it('should have correct GENERIC value', () => {
      expect(PointType.GENERIC).toBe('generic');
    });

    it('should have exactly 4 point types', () => {
      const values = Object.values(PointType);
      expect(values).toHaveLength(4);
    });
  });

  describe('BoltType enum', () => {
    it('should have correct RING_BOLT value', () => {
      expect(BoltType.RING_BOLT).toBe('rb');
    });

    it('should have correct U_BOLT value', () => {
      expect(BoltType.U_BOLT).toBe('ub');
    });

    it('should have correct FIXED_HANGER value', () => {
      expect(BoltType.FIXED_HANGER).toBe('fh');
    });

    it('should have correct CARROT value', () => {
      expect(BoltType.CARROT).toBe('ct');
    });

    it('should have correct PITON value', () => {
      expect(BoltType.PITON).toBe('pn');
    });

    it('should have exactly 5 bolt types', () => {
      const values = Object.values(BoltType);
      expect(values).toHaveLength(5);
    });
  });
});
