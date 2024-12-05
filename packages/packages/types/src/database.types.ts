import { Prisma } from '@prisma/client';

// Re-export Prisma enums
export const {
  UserRole,
  BinType,
  RequestType,
  RequestStatus,
  RequestPriority,
  WashRequestStatus
} = Prisma;

// Re-export Prisma namespace
export type { Prisma };

// Define common database types
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
}

export interface WithTimestamps {
  created_at: Date;
  updated_at: Date;
}

export interface WithMetadata {
  metadata?: Record<string, any>;
}

export interface WithActor {
  actor_id: string;
  actor?: {
    id: string;
    email: string;
    role: string;
  };
} 