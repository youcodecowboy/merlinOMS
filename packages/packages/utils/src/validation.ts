import { 
  SKUComponents, 
  RequestType, 
  RequestStatus,
  ValidationResult 
} from '@app/types';

export class TypeValidator {
  static isRequestType(value: any): value is RequestType {
    const validTypes: RequestType[] = [
      'PATTERN',
      'CUTTING',
      'WASH',
      'QC',
      'FINISHING',
      'PACKING',
      'MOVE'
    ];
    return validTypes.includes(value as RequestType);
  }

  static isRequestStatus(value: any): value is RequestStatus {
    const validStatuses: RequestStatus[] = [
      'PENDING',
      'IN_PROGRESS',
      'COMPLETED',
      'FAILED'
    ];
    return validStatuses.includes(value as RequestStatus);
  }

  static isSKUComponents(value: any): value is SKUComponents {
    return (
      typeof value === 'object' &&
      typeof value.style === 'string' &&
      typeof value.waist === 'string' &&
      typeof value.shape === 'string' &&
      typeof value.length === 'string' &&
      typeof value.wash === 'string'
    );
  }

  static isValidationResult(value: any): value is ValidationResult {
    return (
      typeof value === 'object' &&
      typeof value.valid === 'boolean' &&
      Array.isArray(value.errors)
    );
  }

  static isISODate(value: string): boolean {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    return isoDateRegex.test(value);
  }

  static isValidSKUFormat(sku: string): boolean {
    const skuRegex = /^[A-Z]{2}-\d{2}-[A-Z]-\d{2}-[A-Z]{3}$/;
    return skuRegex.test(sku);
  }
} 