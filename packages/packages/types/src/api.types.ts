export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface OrderCreationRequest {
  shopify_id: string;
  customer_id: string;
  items: Array<{
    target_sku: string;
    quantity: number;
  }>;
  metadata?: Record<string, any>;
}

export interface InventoryAssignmentRequest {
  order_id: string;
  actor_id: string;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    [key: string]: any;
  };
}

export interface PaginatedResponse<T> extends ServiceResponse<T> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
} 