import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../utils/prisma';
import { createAuthToken } from '../helpers';
import { UserRole, RequestType, RequestStatus } from '@prisma/client';

describe('Pattern Workflow', () => {
  let patternMakerId: string;
  let authToken: string;
  let orderId: string;

  beforeAll(async () => {
    // Create pattern maker user
    const user = await prisma.user.create({
      data: {
        email: 'pattern.maker@test.com',
        password: 'hashed_password',
        role: 'PATTERN_MAKER'
      },
      select: {
        id: true,
        email: true,
        role: true
      }
    });
    patternMakerId = user.id;

    // Create test order with explicit selects
    const order = await prisma.order.create({
      data: {
        shopify_id: 'TEST-ORDER-001',
        status: 'NEW',
        customer: {
          create: {
            email: 'test.customer@example.com'
          }
        },
        order_items: {
          create: {
            target_sku: 'TEST-SKU-001',
            status: 'NEW'
          }
        }
      },
      select: {
        id: true,
        status: true,
        shopify_id: true
      }
    });
    orderId = order.id;

    authToken = await createAuthToken(patternMakerId);
  });

  beforeEach(async () => {
    // Clean tables except User, AuthToken, Order, Customer, OrderItem
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    for (const { tablename } of tables) {
      if (!['_prisma_migrations', 'User', 'AuthToken', 'Order', 'Customer', 'OrderItem'].includes(tablename)) {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
      }
    }
  });

  it('should complete full pattern workflow successfully', async () => {
    // Step 1: Create pattern request
    const createResponse = await request(app)
      .post('/pattern/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        orderId,
        notes: 'Test pattern request'
      });

    console.log('Create response:', createResponse.status, createResponse.body);
    expect(createResponse.status).toBe(201);
    const requestId = createResponse.body.id;

    // Step 2: Complete pattern
    const completeResponse = await request(app)
      .put(`/pattern/${requestId}/complete`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        notes: 'Pattern completed successfully'
      });

    console.log('Complete response:', completeResponse.status, completeResponse.body);
    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.success).toBe(true);

    // Verify final state with explicit selects
    const finalRequest = await prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        type: true,
        metadata: true
      }
    });

    expect(finalRequest).toBeDefined();
    expect(finalRequest?.status).toBe('COMPLETED');
    expect(finalRequest?.type).toBe('PATTERN');

    // Verify order status updated
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true
      }
    });

    expect(order).toBeDefined();
    expect(order?.status).toBe('PATTERN_COMPLETED');
  });
}); 