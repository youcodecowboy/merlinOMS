import { z } from 'zod';

// SKU Component Types
export enum SKUComponentType {
  STYLE = 'ST',
  WAIST = 'W',
  SHAPE = 'SH',
  LENGTH = 'L',
  WASH = 'WSH'
}

// SKU Format Rules
export const skuFormatRules = {
  style: /^[A-Z]{2}$/,
  waist: /^\d{2}$/,
  shape: /^[A-Z]$/,
  length: /^\d{2}$/,
  wash: /^[A-Z]{3}$/
};

// SKU Component Schemas
export const skuComponentSchemas = {
  style: z.string().regex(skuFormatRules.style, 'Invalid style code format'),
  waist: z.string().regex(skuFormatRules.waist, 'Invalid waist measurement format'),
  shape: z.string().regex(skuFormatRules.shape, 'Invalid shape code format'),
  length: z.string().regex(skuFormatRules.length, 'Invalid length format'),
  wash: z.string().regex(skuFormatRules.wash, 'Invalid wash code format')
};

// SKU Validation Schema
export const skuSchema = z.string().refine(
  (sku) => {
    const parts = sku.split('-');
    return parts.length === 5 &&
      skuFormatRules.style.test(parts[0]) &&
      skuFormatRules.waist.test(parts[1]) &&
      skuFormatRules.shape.test(parts[2]) &&
      skuFormatRules.length.test(parts[3]) &&
      skuFormatRules.wash.test(parts[4]);
  },
  {
    message: 'Invalid SKU format. Expected: ST-32-X-32-IND'
  }
);

// Component Validation Rules
export const componentValidationRules = {
  style: {
    allowed: ['ST', 'SL', 'SK', 'PT'],
    validate: (value: string) => skuComponentSchemas.style.safeParse(value).success
  },
  waist: {
    range: { min: 26, max: 44 },
    validate: (value: string) => {
      const parsed = parseInt(value);
      return !isNaN(parsed) && parsed >= 26 && parsed <= 44;
    }
  },
  shape: {
    allowed: ['S', 'R', 'L'],
    validate: (value: string) => skuComponentSchemas.shape.safeParse(value).success
  },
  length: {
    range: { min: 28, max: 36 },
    validate: (value: string) => {
      const parsed = parseInt(value);
      return !isNaN(parsed) && parsed >= 28 && parsed <= 36;
    }
  },
  wash: {
    allowed: ['RAW', 'IND', 'BLK', 'STA'],
    validate: (value: string) => skuComponentSchemas.wash.safeParse(value).success
  }
};

// Wash Group Mappings
export const washGroupMappings = {
  RAW: 'LIGHT',
  IND: 'LIGHT',
  STA: 'LIGHT',
  BLK: 'DARK',
  DRK: 'DARK'
} as const;

// SKU Component Extractor
export const extractSKUComponents = (sku: string) => {
  const [style, waist, shape, length, wash] = sku.split('-');
  return {
    style,
    waist,
    shape,
    length,
    wash
  };
};

// Validation Result Type
export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  components?: ReturnType<typeof extractSKUComponents>;
}

// Main Validation Function
export const validateSKU = (sku: string): ValidationResult => {
  const schemaResult = skuSchema.safeParse(sku);
  
  if (!schemaResult.success) {
    return {
      isValid: false,
      errors: schemaResult.error.errors.map(e => e.message)
    };
  }

  const components = extractSKUComponents(sku);
  const errors: string[] = [];

  // Validate each component
  Object.entries(components).forEach(([key, value]) => {
    const rule = componentValidationRules[key as keyof typeof componentValidationRules];
    if (!rule.validate(value)) {
      errors.push(`Invalid ${key}: ${value}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    components: components
  };
}; 