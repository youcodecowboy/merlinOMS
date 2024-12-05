import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });

const prisma = new PrismaClient();
const schemaPath = path.resolve(__dirname, '../../../../database/prisma/schema.prisma');

beforeAll(async () => {
  try {
    // Force disconnect all users from test database
    execSync(`PGUSER=codecowboy PGDATABASE=postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='oms_test';"`);
    
    // Drop and recreate database
    execSync(`PGUSER=codecowboy PGDATABASE=postgres psql -c "DROP DATABASE IF EXISTS oms_test;"`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for DB to be dropped
    execSync(`PGUSER=codecowboy PGDATABASE=postgres psql -c "CREATE DATABASE oms_test;"`);

    // Apply migrations
    execSync(`DATABASE_URL="postgresql://codecowboy@localhost:5432/oms_test" pnpm prisma migrate deploy --schema=${schemaPath}`);

    // Verify database setup
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;
    console.log('Available tables:', tables.map(t => t.tablename));

  } catch (error) {
    console.error('Database setup error:', error);
    throw error;
  }
});

beforeEach(async () => {
  // Clean all tables except _prisma_migrations
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  for (const { tablename } of tables) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function seedTestData() {
  // Create test users with string literals
  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      password: 'hashed_password',
      role: 'ADMIN'
    }
  });

  const operator = await prisma.user.create({
    data: {
      email: 'operator@test.com', 
      password: 'hashed_password',
      role: 'WAREHOUSE'
    }
  });

  // Create test inventory items
  const item = await prisma.inventoryItem.create({
    data: {
      sku: 'TEST-SKU-001',
      status1: 'AVAILABLE',
      status2: 'NEW',
      location: 'WAREHOUSE-A',
      qr_code: 'ITEM-123'
    }
  });

  // Create test bins
  const bin = await prisma.bin.create({
    data: {
      code: 'BIN-001',
      sku: 'TEST-SKU-001',
      type: 'STORAGE',
      zone: 'A1',
      capacity: 10,
      current_count: 0,
      is_active: true
    }
  });

  return {
    users: { admin, operator },
    items: { item },
    bins: { bin }
  };
} 