import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean database before all tests
  await prisma.$connect();
  await prisma.$transaction([
    prisma.event.deleteMany(),
    prisma.request.deleteMany(),
    prisma.order.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.inventoryItem.deleteMany(),
    prisma.user.deleteMany()
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean specific tables before each test
  await prisma.$transaction([
    prisma.event.deleteMany(),
    prisma.request.deleteMany()
  ]);
}); 