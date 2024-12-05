import { PrismaClient } from '@prisma/client';
import { 
  RequestType,
  RequestStatus,
  ValidationResult,
  ServiceResponse
} from '@app/types';
import { ValidationService } from './validation.service';
import { EventLoggerService } from './event-logger.service';

interface StateTransition {
  from: RequestStatus;
  to: RequestStatus;
  requiredRole: string[];
  requiredValidations: string[];
  sideEffects: string[];
}

export class RequestStateMachine {
  constructor(
    private prisma: PrismaClient,
    private validation: ValidationService,
    private eventLogger: EventLoggerService
  ) {}

  // ... rest of the code
} 