export interface SKUComponents {
  style: string;
  waist: string;
  shape: string;
  length: string;
  wash: string;
}

export interface SKUMatchCriteria {
  exactMatch: boolean;
  lengthMatch: 'exact' | 'greater-equal';
  washMatch: 'exact' | 'universal';
}

export interface SKUValidationError {
  field: keyof SKUComponents;
  message: string;
}

export type WashGroup = 'light' | 'dark';

export interface WashMapping {
  targetWash: string;
  universalWash: string;
  group: WashGroup;
} 