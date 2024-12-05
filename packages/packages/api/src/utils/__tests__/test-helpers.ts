import { User, Request, RequestType, RequestStatus, BinType, UserRole, Prisma } from '@prisma/client'
import { MetricsService } from '../metrics'

type JsonValue = Prisma.JsonValue;

// Define order status type
type OrderStatus = 'PENDING' | 'READY_FOR_PACKING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export const mockUser: Omit<User, 'active'> = {
  id: 'test-user-id',
  email: 'test@example.com',
  password: 'hashed_password',
  role: UserRole.ADMIN,
  created_at: new Date(),
  updated_at: new Date()
}

export const mockRequest: Request = {
  id: 'test-request-id',
  type: 'MOVE' as RequestType,
  status: 'PENDING' as RequestStatus,
  item_id: null,
  order_id: null,
  batch_id: null,
  metadata: {} as JsonValue,
  created_at: new Date(),
  updated_at: new Date()
}

export const createMockRequestTimeline = (overrides: Partial<any> = {}) => ({
  id: 'test-timeline-id',
  request_id: 'test-request-id',
  step: 'ITEM_SCAN',
  status: 'COMPLETED',
  operator_id: mockUser.id,
  metadata: {} as Prisma.JsonValue,
  startedAt: new Date(),
  completedAt: new Date(),
  updatedAt: new Date(),
  created_at: new Date(),
  ...overrides
});

export const mockBin = {
  id: 'test-bin-id',
  code: 'BIN-001',
  sku: 'SKU-001',
  type: 'STORAGE' as BinType,
  zone: 'A1',
  capacity: 100,
  current_count: 0,
  is_active: true,
  qr_code: null,
  metadata: {} as JsonValue,
  created_at: new Date(),
  updated_at: new Date()
}

// Helper function to create mock objects with custom overrides
export const createMockObject = <T extends object>(base: T, overrides: Partial<T> = {}): T => {
  return {
    ...base,
    ...overrides
  }
}

// Helper to create mock inventory items
export const createMockInventoryItem = (overrides: Partial<any> = {}) => ({
  id: 'test-item-id',
  sku: 'TEST-SKU-001',
  status1: 'AVAILABLE',
  status2: 'NEW',
  location: 'WAREHOUSE-A',
  qr_code: null,
  bin_id: null,
  metadata: {} as JsonValue,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
})

// Helper to create mock auth tokens
export const createMockAuthToken = (overrides: Partial<any> = {}) => ({
  id: 'test-token-id',
  user_id: mockUser.id,
  token: 'test-token-value',
  type: 'access',
  expires_at: new Date(Date.now() + 3600000),
  revoked: false,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
})

// Helper to create mock events
export const createMockEvent = (overrides: Partial<any> = {}) => ({
  id: 'test-event-id',
  type: 'TEST_EVENT',
  actor_id: mockUser.id,
  item_id: null,
  order_id: null,
  request_id: null,
  metadata: {} as JsonValue,
  created_at: new Date(),
  ...overrides
})

// Helper to create mock notifications
export const createMockNotification = (overrides: Partial<any> = {}) => ({
  id: 'test-notification-id',
  type: 'TEST_NOTIFICATION',
  message: 'Test notification message',
  user_id: mockUser.id,
  request_id: null,
  read: false,
  metadata: {} as JsonValue,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
})

// Add helper for creating mock users since it's used in auth tests
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  ...mockUser,
  ...overrides
})

export const mockMetrics: MetricsService = {
  incrementCounter: jest.fn(),
  recordMetric: jest.fn(),
  record: jest.fn(),
  getMetrics: jest.fn(),
  trackDuration: jest.fn()
};

export const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn()
};

// Add this helper function
export const createMockRequest = (overrides: Partial<Request> = {}): Request => ({
  id: 'test-request-id',
  type: 'MOVE' as RequestType,
  status: 'PENDING' as RequestStatus,
  item_id: null,
  order_id: null,
  batch_id: null,
  metadata: {} as JsonValue,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
})

// Add a helper function for creating bins
export const createMockBin = (overrides: Partial<any> = {}) => ({
  id: 'test-bin-id',
  code: 'BIN-001',
  sku: 'SKU-001',
  type: 'STORAGE' as BinType,
  zone: 'A1',
  capacity: 100,
  current_count: 0,
  is_active: true,
  qr_code: null,
  metadata: {} as JsonValue,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
})

// Add a mock batch helper
export const createMockBatch = (overrides: Partial<any> = {}) => ({
  id: 'test-batch-id',
  status: 'READY',
  style: 'ST',
  quantity: 50,
  metadata: {} as JsonValue,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
});

// Update Order mock helper with proper typing
export const createMockOrder = (overrides: Partial<any> = {}) => ({
  id: 'test-order-id',
  status: 'READY_FOR_PACKING' as OrderStatus,
  customer_id: 'test-customer-id',
  shopify_id: 'test-shopify-id',
  sku: 'TEST-SKU-001',
  quantity: 10,
  priority: 1,
  metadata: {} as JsonValue,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
});
  