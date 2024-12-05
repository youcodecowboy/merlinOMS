import { 
  calculateMatchScore,
  interchangeableComponents,
  matchingPriority,
  extractSKUComponents
} from '../matching/sku-matching.rules';

describe('SKU Matching Rules', () => {
  describe('extractSKUComponents', () => {
    it('should correctly extract SKU components', () => {
      const sku = 'ST-32-R-32-RAW';
      const components = extractSKUComponents(sku);

      expect(components).toEqual({
        style: 'ST',
        waist: '32',
        shape: 'R',
        length: '32',
        wash: 'RAW'
      });
    });
  });

  describe('calculateMatchScore', () => {
    it('should return exact match score for identical SKUs', () => {
      const target = extractSKUComponents('ST-32-R-32-RAW');
      const candidate = extractSKUComponents('ST-32-R-32-RAW');

      const result = calculateMatchScore(target, candidate);

      expect(result.score).toBe(matchingPriority.EXACT);
      expect(result.substitutions).toHaveLength(0);
    });

    it('should handle wash code substitutions', () => {
      const target = extractSKUComponents('ST-32-R-32-RAW');
      const candidate = extractSKUComponents('ST-32-R-32-IND');

      const result = calculateMatchScore(target, candidate);

      expect(result.score).toBe(matchingPriority.WASH);
      expect(result.substitutions).toHaveLength(1);
      expect(result.substitutions[0]).toMatchObject({
        component: 'wash',
        original: 'RAW',
        substitute: 'IND'
      });
    });

    it('should handle length adjustments', () => {
      const target = extractSKUComponents('ST-32-R-32-RAW');
      const candidate = extractSKUComponents('ST-32-R-33-RAW');

      const result = calculateMatchScore(target, candidate);

      expect(result.score).toBe(matchingPriority.LENGTH);
      expect(result.adjustments).toBeDefined();
      expect(result.adjustments).toMatchObject({
        type: 'LENGTH',
        from: 33,
        to: 32,
        difference: -1
      });
    });

    it('should handle universal length substitution', () => {
      const target = extractSKUComponents('ST-32-R-32-RAW');
      const candidate = extractSKUComponents('ST-32-R-00-RAW');

      const result = calculateMatchScore(target, candidate);

      expect(result.score).toBe(matchingPriority.UNIVERSAL);
      expect(result.substitutions).toHaveLength(1);
      expect(result.substitutions[0]).toMatchObject({
        component: 'length',
        original: '32',
        substitute: '00'
      });
    });

    it('should handle shape substitutions', () => {
      const target = extractSKUComponents('ST-32-S-32-RAW');
      const candidate = extractSKUComponents('ST-32-U-32-RAW');

      const result = calculateMatchScore(target, candidate);

      expect(result.score).toBe(matchingPriority.SHAPE);
      expect(result.substitutions).toHaveLength(1);
      expect(result.substitutions[0]).toMatchObject({
        component: 'shape',
        original: 'S',
        substitute: 'U'
      });
    });

    it('should return lowest applicable score for multiple substitutions', () => {
      const target = extractSKUComponents('ST-32-S-32-RAW');
      const candidate = extractSKUComponents('ST-32-U-33-IND');

      const result = calculateMatchScore(target, candidate);

      expect(result.score).toBe(Math.min(
        matchingPriority.SHAPE,
        matchingPriority.LENGTH,
        matchingPriority.WASH
      ));
      expect(result.substitutions.length).toBeGreaterThan(1);
    });
  });

  describe('interchangeableComponents', () => {
    describe('wash codes', () => {
      it('should validate wash code substitutions', () => {
        const { wash } = interchangeableComponents;
        
        expect(wash.RAW).toContain('RAW');
        expect(wash.IND).toContain('RAW');
        expect(wash.BLK).toContain('RAW');
        expect(wash.STA).toContain('RAW');
      });
    });

    describe('shape codes', () => {
      it('should validate shape substitutions', () => {
        const { shape } = interchangeableComponents;
        
        expect(shape.U).toContain('S');
        expect(shape.U).toContain('R');
        expect(shape.U).toContain('L');
      });
    });

    describe('length adjustments', () => {
      it('should validate length adjustment rules', () => {
        const { length } = interchangeableComponents;
        
        expect(length.adjustmentRange).toBe(2);
        expect(length.substitutions['00']).toContain('32');
        expect(length.substitutions['32']).toContain('31');
        expect(length.substitutions['32']).toContain('33');
      });
    });
  });
}); 