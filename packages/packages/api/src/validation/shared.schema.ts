import { z } from 'zod';
import { RequestStatus, RequestType, UserRole, BinType } from '@prisma/client';

// Base schemas that are commonly used across routes
export const baseRequestSchema = z.object({
  requestId: z.string().uuid(),
  operatorId: z.string().uuid(),
  notes: z.string().optional()
});

export const qrCodeSchema = z.object({
  qrCode: z.string().regex(/^[A-Z0-9-]+$/)
});

export const binSchema = z.object({
  binQrCode: z.string().regex(/^[A-Z0-9-]+$/),
  type: z.nativeEnum(BinType),
  notes: z.string().optional()
});

export const measurementSchema = z.object({
  waist: z.number().positive(),
  hip: z.number().positive(),
  thigh: z.number().positive(),
  inseam: z.number().positive(),
  outseam: z.number().optional(),
  frontRise: z.number().optional(),
  backRise: z.number().optional(),
  kneeWidth: z.number().optional()
});

export const visualInspectionSchema = z.object({
  stitchingQuality: z.enum(['GOOD', 'FAIR', 'POOR']),
  fabricQuality: z.enum(['GOOD', 'FAIR', 'POOR']),
  washQuality: z.enum(['GOOD', 'FAIR', 'POOR']),
  defects: z.array(z.object({
    type: z.string(),
    severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']),
    location: z.string(),
    notes: z.string().optional()
  })).optional(),
  notes: z.string().optional()
});

// Common response schemas
export const timelineResponseSchema = z.array(z.object({
  step: z.string(),
  status: z.nativeEnum(RequestStatus),
  timestamp: z.date(),
  operator: z.object({
    id: z.string(),
    email: z.string().email()
  }),
  metadata: z.record(z.any()).optional()
}));

export const requestResponseSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(RequestType),
  status: z.nativeEnum(RequestStatus),
  item: z.object({
    id: z.string(),
    sku: z.string(),
    qrCode: z.string().optional()
  }).optional(),
  timeline: timelineResponseSchema,
  metadata: z.record(z.any()).optional()
});

// Reusable validation functions
export const validateRequestAccess = (
  requestType: RequestType,
  userRole: UserRole
): boolean => {
  const rolePermissions: Record<UserRole, RequestType[]> = {
    [UserRole.ADMIN]: Object.values(RequestType),
    [UserRole.MANAGER]: Object.values(RequestType),
    [UserRole.WAREHOUSE]: [RequestType.MOVE, RequestType.PACKING],
    [UserRole.QC_TEAM]: [RequestType.QC],
    [UserRole.PATTERN_MAKER]: [RequestType.PATTERN],
    [UserRole.CUTTING_TEAM]: [RequestType.CUTTING],
    [UserRole.SEWING_TEAM]: [],
    [UserRole.WASH_TEAM]: [RequestType.WASH]
  };

  return rolePermissions[userRole]?.includes(requestType) ?? false;
}; 