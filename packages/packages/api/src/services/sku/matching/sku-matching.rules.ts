import { z } from 'zod';

type WashCode = 'RAW' | 'IND' | 'BLK' | 'STA';
type ShapeCode = 'S' | 'R' | 'L' | 'U';

interface InterchangeableComponents {
  wash: Record<WashCode, string[]>;
  shape: Record<ShapeCode, string[]>;
  length: {
    adjustmentRange: number;
  };
}

export const interchangeableComponents: InterchangeableComponents = {
  wash: {
    RAW: ['IND', 'BLK'],
    IND: ['RAW', 'BLK'],
    BLK: ['IND', 'RAW'],
    STA: ['RAW']
  },
  shape: {
    S: ['R'],
    R: ['S'],
    L: ['U'],
    U: ['L']
  },
  length: {
    adjustmentRange: 2
  }
};

// Define matching priority rules
export const matchingPriority = {
  EXACT: 100,        // Exact SKU match
  WASH: 80,          // Same SKU with substitutable wash
  LENGTH: 60,        // Same SKU with adjustable length
  UNIVERSAL: 40,     // Universal component match
  SHAPE: 20          // Shape substitution match
};

export interface MatchResult {
  sku: string;
  score: number;
  substitutions: {
    component: string;
    original: string;
    substitute: string;
    reason: string;
  }[];
  adjustments?: {
    type: 'LENGTH';
    from: number;
    to: number;
    difference: number;
  };
}

export const matchResultSchema = z.object({
  sku: z.string(),
  score: z.number(),
  substitutions: z.array(z.object({
    component: z.string(),
    original: z.string(),
    substitute: z.string(),
    reason: z.string()
  })),
  adjustments: z.object({
    type: z.literal('LENGTH'),
    from: z.number(),
    to: z.number(),
    difference: z.number()
  }).optional()
});

// Add type guards
function isWashCode(code: string): code is WashCode {
  return ['RAW', 'IND', 'BLK', 'STA'].includes(code);
}

function isShapeCode(code: string): code is ShapeCode {
  return ['S', 'R', 'L', 'U'].includes(code);
}

export function calculateMatchScore(
  targetComponents: Record<string, string>,
  candidateComponents: Record<string, string>
): MatchResult {
  let score = matchingPriority.EXACT;
  const substitutions = [];

  // Check each component
  for (const [component, targetValue] of Object.entries(targetComponents)) {
    const candidateValue = candidateComponents[component];

    if (targetValue === candidateValue) {
      continue; // Exact match, no score reduction
    }

    // Handle wash substitutions
    if (component === 'wash' && isWashCode(candidateValue) && 
        interchangeableComponents.wash[candidateValue]?.includes(targetValue)) {
      score = Math.min(score, matchingPriority.WASH);
      substitutions.push({
        component: 'wash',
        original: targetValue,
        substitute: candidateValue,
        reason: 'Substitutable wash code'
      });
    }

    // Handle shape substitutions
    else if (component === 'shape' && isShapeCode(candidateValue) && 
             interchangeableComponents.shape[candidateValue]?.includes(targetValue)) {
      score = Math.min(score, matchingPriority.SHAPE);
      substitutions.push({
        component: 'shape',
        original: targetValue,
        substitute: candidateValue,
        reason: 'Compatible shape code'
      });
    }

    // Handle length adjustments
    else if (component === 'length') {
      const targetLength = parseInt(targetValue);
      const candidateLength = parseInt(candidateValue);

      // Check if candidate is universal length ('00')
      if (candidateValue === '00') {
        score = Math.min(score, matchingPriority.UNIVERSAL);
        substitutions.push({
          component: 'length',
          original: targetValue,
          substitute: candidateValue,
          reason: 'Universal length'
        });
      }
      // Check if length is within adjustment range
      else if (!isNaN(targetLength) && !isNaN(candidateLength)) {
        const difference = Math.abs(targetLength - candidateLength);
        if (difference <= interchangeableComponents.length.adjustmentRange) {
          score = Math.min(score, matchingPriority.LENGTH);
          substitutions.push({
            component: 'length',
            original: targetValue,
            substitute: candidateValue,
            reason: `Length adjustable within ${difference} inches`
          });
          return {
            sku: Object.values(candidateComponents).join('-'),
            score,
            substitutions,
            adjustments: {
              type: 'LENGTH',
              from: candidateLength,
              to: targetLength,
              difference: targetLength - candidateLength
            }
          };
        }
      }
    }
  }

  return {
    sku: Object.values(candidateComponents).join('-'),
    score,
    substitutions
  };
}

// Add extractSKUComponents to exports
export const extractSKUComponents = (sku: string) => {
  const [style, waist, shape, length, wash] = sku.split('-');
  return { style, waist, shape, length, wash };
}; 