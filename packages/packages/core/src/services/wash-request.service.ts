import { PrismaClient } from '@prisma/client';
import { 
  RequestType, 
  RequestStatus,
  ValidationResult,
  WashRequestStep,
  StepValidation
} from '@app/types';
import { EventLoggerService } from './event-logger.service';
import { QRCodeService } from './qr-code.service';
import { SKUService } from './sku.service';

export class WashRequestService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService,
    private qrService: QRCodeService,
    private skuService: SKUService
  ) {}

  // ... rest of the code
} 