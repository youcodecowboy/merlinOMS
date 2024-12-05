import { 
  SKUComponents, 
  SKUValidationError, 
  WashMapping,
  ValidationResult 
} from '@app/types';

export class SKUService {
  private readonly WASH_MAPPINGS: WashMapping[] = [
    { targetWash: 'STA', universalWash: 'RAW', group: 'light' },
    { targetWash: 'IND', universalWash: 'RAW', group: 'light' },
    { targetWash: 'ONX', universalWash: 'BRW', group: 'dark' },
    { targetWash: 'JAG', universalWash: 'BRW', group: 'dark' },
  ];

  parseSKU(sku: string): SKUComponents | SKUValidationError[] {
    const parts = sku.split('-');
    if (parts.length !== 5) {
      return [{ field: 'style', message: 'Invalid SKU format' }];
    }

    const [style, waist, shape, length, wash] = parts;
    return { style, waist, shape, length, wash };
  }

  validateSKU(components: SKUComponents): SKUValidationError[] {
    const errors: SKUValidationError[] = [];

    // Style validation
    if (!components.style.match(/^[A-Z]{2}$/)) {
      errors.push({ field: 'style', message: 'Style must be 2 uppercase letters' });
    }

    // Waist validation
    if (!components.waist.match(/^\d{2}$/)) {
      errors.push({ field: 'waist', message: 'Waist must be 2 digits' });
    }

    // Shape validation
    if (!components.shape.match(/^[A-Z]$/)) {
      errors.push({ field: 'shape', message: 'Shape must be 1 uppercase letter' });
    }

    // Length validation
    if (!components.length.match(/^\d{2}$/)) {
      errors.push({ field: 'length', message: 'Length must be 2 digits' });
    }

    // Wash validation
    const validWashes = [...new Set(this.WASH_MAPPINGS.map(m => [m.targetWash, m.universalWash]).flat())];
    if (!validWashes.includes(components.wash)) {
      errors.push({ field: 'wash', message: 'Invalid wash code' });
    }

    return errors;
  }

  getUniversalSKU(targetSKU: string): string | null {
    const components = this.parseSKU(targetSKU);
    if (!this.isSkuComponents(components)) return null;

    const washMapping = this.WASH_MAPPINGS.find(m => m.targetWash === components.wash);
    if (!washMapping) return null;

    return [
      components.style,
      components.waist,
      components.shape,
      '36', // Universal length
      washMapping.universalWash
    ].join('-');
  }

  canFulfill(currentSKU: string, targetSKU: string): boolean {
    const current = this.parseSKU(currentSKU);
    const target = this.parseSKU(targetSKU);
    
    if (!this.isSkuComponents(current) || !this.isSkuComponents(target)) return false;

    // Immutable components must match exactly
    if (current.style !== target.style) return false;
    if (current.waist !== target.waist) return false;
    if (current.shape !== target.shape) return false;

    // Length must be >= target
    if (parseInt(current.length, 10) < parseInt(target.length, 10)) return false;

    // Check wash compatibility
    const currentWashMapping = this.WASH_MAPPINGS.find(m => 
      m.universalWash === current.wash || m.targetWash === current.wash
    );
    const targetWashMapping = this.WASH_MAPPINGS.find(m => 
      m.targetWash === target.wash
    );

    if (!currentWashMapping || !targetWashMapping) return false;
    return currentWashMapping.group === targetWashMapping.group;
  }

  private isSkuComponents(obj: SKUComponents | SKUValidationError[]): obj is SKUComponents {
    return !Array.isArray(obj);
  }
} 