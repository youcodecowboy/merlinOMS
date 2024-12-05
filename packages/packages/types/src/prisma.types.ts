import { PrismaClient } from '@prisma/client';

export type PrismaTransaction = Omit<
  ReturnType<typeof PrismaClient['prototype']['$transaction']>,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
>;

export type PrismaClientType = ReturnType<typeof PrismaClient['prototype']>;

export interface TransactionCallback<T> {
  (tx: PrismaTransaction): Promise<T>;
}

// Re-export Prisma model types
export type {
  User,
  Order,
  Customer,
  InventoryItem,
  Request,
  Event,
  Bin,
  BinHistory,
  Problem,
  ProductionBatch,
  PatternRequest,
  FinishingRequest,
  CustomerProfile,
  CustomerMeasurement,
  TimingMetric,
  WashRequest
} from '@prisma/client'; 