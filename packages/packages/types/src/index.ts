// Import Prisma types
import type { 
  PrismaClient,
  User,
  Order,
  Customer,
  InventoryItem,
  Request,
  Event,
  Bin,
  BinHistory,
  UserRole,
  BinType,
  RequestType,
  RequestStatus,
  Notification,
  UserProfile,
  CustomerProfile
} from '@prisma/client';

// Re-export Prisma types
export type {
  User,
  Order,
  Customer,
  InventoryItem,
  Request,
  Event,
  Bin,
  BinHistory,
  UserRole,
  BinType,
  RequestType,
  RequestStatus,
  Notification,
  UserProfile,
  CustomerProfile
};

// Basic service response type
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Export Prisma transaction type
export type PrismaTransaction = Omit<
  ReturnType<typeof PrismaClient['prototype']['$transaction']>,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
>;

// Event types
export enum EventType {
  // Order events
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  
  // Item events
  ITEM_CREATED = 'ITEM_CREATED',
  ITEM_UPDATED = 'ITEM_UPDATED',
  ITEM_MOVED = 'ITEM_MOVED',
  ITEM_ASSIGNED = 'ITEM_ASSIGNED',
  ITEM_STATUS_CHANGED = 'ITEM_STATUS_CHANGED',
  
  // Request events
  REQUEST_CREATED = 'REQUEST_CREATED',
  REQUEST_UPDATED = 'REQUEST_UPDATED',
  REQUEST_COMPLETED = 'REQUEST_COMPLETED',
  
  // Production events
  PRODUCTION_REQUEST_CREATED = 'PRODUCTION_REQUEST_CREATED',
  PRODUCTION_REQUEST_ACCEPTED = 'PRODUCTION_REQUEST_ACCEPTED',
  CUTTING_REQUEST_CREATED = 'CUTTING_REQUEST_CREATED',
  PATTERN_REQUEST_CREATED = 'PATTERN_REQUEST_CREATED',
  
  // QC events
  QC_REQUEST_CREATED = 'QC_REQUEST_CREATED',
  QC_MEASUREMENTS_RECORDED = 'QC_MEASUREMENTS_RECORDED',
  DEFECT_REPORTED = 'DEFECT_REPORTED',
  
  // Wash events
  WASH_REQUEST_CREATED = 'WASH_REQUEST_CREATED',
  
  // Bin events
  BIN_CREATED = 'BIN_CREATED',
  BIN_UPDATED = 'BIN_UPDATED',
  BIN_DEACTIVATED = 'BIN_DEACTIVATED',
  BIN_SCAN_FAILED = 'BIN_SCAN_FAILED',
  BIN_SCAN_SUCCESSFUL = 'BIN_SCAN_SUCCESSFUL',
  
  // User events
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  ROLE_UPDATED = 'ROLE_UPDATED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  PREFERENCES_UPDATED = 'PREFERENCES_UPDATED',
  
  // Notification events
  NOTIFICATION_CREATED = 'NOTIFICATION_CREATED',
  NOTIFICATION_ACKNOWLEDGED = 'NOTIFICATION_ACKNOWLEDGED',
  
  // Inventory events
  INVENTORY_ASSIGNED = 'INVENTORY_ASSIGNED',
  
  // Other events
  SHIPPING_LABEL_CREATED = 'SHIPPING_LABEL_CREATED',
  PACKING_REQUEST_CREATED = 'PACKING_REQUEST_CREATED',
  PACKING_STEP_VALIDATED = 'PACKING_STEP_VALIDATED',
  FINISHING_REQUEST_CREATED = 'FINISHING_REQUEST_CREATED',
  FINISHING_OPERATION_COMPLETED = 'FINISHING_OPERATION_COMPLETED'
}

// Notification types
export enum NotificationType {
  LABEL_CREATED = 'LABEL_CREATED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  CUTTING_PICKUP_READY = 'CUTTING_PICKUP_READY',
  QC_REQUIRED = 'QC_REQUIRED',
  DEFECT_REPORTED = 'DEFECT_REPORTED',
  PRODUCTION_COMPLETED = 'PRODUCTION_COMPLETED',
  WASH_COMPLETED = 'WASH_COMPLETED'
}

// Event metadata
export interface EventMetadata {
  [key: string]: any;
}