import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export * from '@prisma/client';

// Re-export specific types and enums
export { Prisma } from '@prisma/client';
export type {
  User,
  Customer,
  Order,
  OrderItem,
  InventoryItem,
  Bin,
  Event,
  Request,
  Notification,
  UserProfile,
  CustomerProfile,
} from '@prisma/client'; 