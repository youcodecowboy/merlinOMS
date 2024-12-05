import { PrismaClient } from '@prisma/client';
import { prisma } from '../../utils/prisma';

/**
 * Creates an auth token for testing
 * @param userId - The user ID to create token for
 * @returns The token string
 */
export async function createAuthToken(userId: string): Promise<string> {
  // First verify the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error(`User not found with id: ${userId}`);
  }

  // Create token with user relationship
  const token = await prisma.authToken.create({
    data: {
      user_id: userId,
      token: `test_${Math.random().toString(36).slice(2)}`,
      type: 'access',
      expires_at: new Date(Date.now() + 3600000),
      revoked: false
    }
  });

  // Verify token was created with user
  const verifiedToken = await prisma.authToken.findUnique({
    where: { token: token.token },
    include: { user: true }
  });

  if (!verifiedToken?.user) {
    throw new Error('Token created but user relationship missing');
  }

  return token.token;
}

/**
 * Cleans up test database between tests
 */
export async function cleanupDatabase(): Promise<void> {
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname='public'
  `;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`);

  try {
    if (tables.length > 0) {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${tables.join(', ')} CASCADE;`
      );
    }
  } catch (error) {
    console.error('Error cleaning database:', error);
    throw error;
  }
}

/**
 * Verifies database state after test
 */
export async function verifyDatabaseState(
  requestId: string,
  expectedStatus: string,
  expectedLocation: string
): Promise<void> {
  const request = await prisma.request.findUnique({
    where: { id: requestId }
  });

  if (!request) {
    throw new Error('Request not found');
  }

  if (request.status !== expectedStatus) {
    throw new Error(
      `Request status mismatch. Expected ${expectedStatus}, got ${request.status}`
    );
  }

  const item = await prisma.inventoryItem.findFirst({
    where: { qr_code: 'ITEM-123' }
  });

  if (!item) {
    throw new Error('Item not found');
  }

  if (item.location !== expectedLocation) {
    throw new Error(
      `Item location mismatch. Expected ${expectedLocation}, got ${item.location}`
    );
  }
} 