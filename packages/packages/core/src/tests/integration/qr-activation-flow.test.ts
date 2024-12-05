import { PrismaClient } from '@prisma/client';
import { TestFactories } from '../factories';
import { QRActivationService } from '../../services/qr-activation.service';
import { WashRequestService } from '../../services/wash-request.service';

describe('QR Activation Flow Tests', () => {
  let prisma: PrismaClient;
  let factories: TestFactories;
  let qrActivation: QRActivationService;
  let washRequest: WashRequestService;

  beforeAll(async () => {
    prisma = new PrismaClient();
    factories = new TestFactories();
    // Initialize services...
  });

  test('QR activation with waitlisted order', async () => {
    // Create waitlisted order
    const order = await createWaitlistedOrder();
    
    // Create and activate new inventory item
    const item = await createInventoryItem();
    const activation = await qrActivation.activateQR({
      scannedQR: item.qr_code,
      actorId: 'test-actor'
    });

    // Verify assignment and wash request creation
    expect(activation.action).toBe('WAITLIST_ASSIGNMENT');
    const washReq = await prisma.request.findFirst({
      where: {
        type: 'WASH',
        item_id: item.id
      }
    });
    expect(washReq).toBeTruthy();
  });
}); 