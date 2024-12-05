import { BaseService } from '../../base/base.service';

export interface StepValidation {
  step: string;
  validate: (data: any) => Promise<boolean>;
  errorMessage: string;
}

export abstract class BaseRequestHandler extends BaseService {
  protected abstract steps: string[];
  protected abstract stepTransitions: Record<string, string[]>;
  protected abstract stepValidations: Record<string, StepValidation>;

  constructor(serviceName: string) {
    super(serviceName);
  }
} 