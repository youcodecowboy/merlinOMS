import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../utils/prisma';
import { createAuthToken } from '../helpers';
import { UserRole } from '@prisma/client';

describe('Move Workflow', () => {
  let operatorId: string;
  let authToken: string;
  let testItemId: string;

  beforeAll(async () => {
    // Create test operator
    const operator = await prisma.user.create({
      data: {
        email: 'move.operator@test.com',
        password: 'hashed_password',
        role: 'WAREHOUSE'
      }
    });
    operatorId = operator.id;

    // Create test item with unique QR code
    const item = await prisma.inventoryItem.create({
      data: {
        sku: 'TEST-SKU-001',
        status1: 'AVAILABLE',
        status2: 'NEW',
        location: 'WAREHOUSE-A',
        qr_code: 'MOVE-TEST-ITEM-123'
      }
    });
    testItemId = item.id;

    // Create auth token
    authToken = await createAuthToken(operatorId);
  });

  beforeEach(async () => {
    // Clean tables except User, AuthToken, and InventoryItem
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    for (const { tablename } of tables) {
      if (!['_prisma_migrations', 'User', 'AuthToken', 'InventoryItem'].includes(tablename)) {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
      }
    }

    // Create test item for each test
    const item = await prisma.inventoryItem.create({
      data: {
        sku: 'TEST-SKU-001',
        status1: 'AVAILABLE',
        status2: 'NEW',
        location: 'WAREHOUSE-A',
        qr_code: 'MOVE-TEST-ITEM-123'
      }
    });
    testItemId = item.id;
  });

  it('should complete full move workflow successfully', async () => {
    const createResponse = await request(app)
      .post('/move/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        itemId: testItemId,
        destinationZone: 'ZONE-B'
      });

    // Log response for debugging
    console.log('Create response:', createResponse.status, createResponse.body);

    expect(createResponse.status).toBe(201);
    const requestId = createResponse.body.id;

    // Step 2: Scan item
    const scanResponse = await request(app)
      .put(`/move/${requestId}/scan-item`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        itemQrCode: 'MOVE-TEST-ITEM-123'
      });

    expect(scanResponse.status).toBe(200);
    expect(scanResponse.body.success).toBe(true);

    // Step 3: Scan destination
    const destinationResponse = await request(app)
      .put(`/move/${requestId}/scan-destination`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        destinationQrCode: 'ZONE-B1',
        type: 'ZONE'
      });

    expect(destinationResponse.status).toBe(200);
    expect(destinationResponse.body.success).toBe(true);

    // Verify final state
    const finalRequest = await prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        metadata: true
      }
    });

    expect(finalRequest).toBeDefined();
    expect(finalRequest?.status).toBe('COMPLETED');

    // Verify item location updated
    const item = await prisma.inventoryItem.findFirst({
      where: { qr_code: 'MOVE-TEST-ITEM-123' },
      select: {
        id: true,
        location: true
      }
    });

    expect(item).toBeDefined();
    expect(item?.location).toBe('ZONE-B1');
  });
}); 