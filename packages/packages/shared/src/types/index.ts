export interface InventoryItem {
  id: string;
  sku: string;
  status1: Status1;
  status2: Status2;
  location: string;
  created_at: Date;
  updated_at: Date;
}

export type Status1 = 'PRODUCTION' | 'STOCK' | 'WASH';
export type Status2 = 'UNCOMMITTED' | 'COMMITTED' | 'ASSIGNED';

export interface Order {
  id: string;
  target_sku: string;
  status: OrderStatus;
  customer_id: string;
  created_at: Date;
  updated_at: Date;
}

export type OrderStatus = 
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'IN_PRODUCTION'
  | 'IN_WASH'
  | 'COMPLETED';

export interface Request {
  id: string;
  type: RequestType;
  status: RequestStatus;
  item_id: string;
  order_id: string;
  created_at: Date;
  updated_at: Date;
  metadata: Record<string, unknown>;
}

export type RequestType = 
  | 'WASH'
  | 'MOVE'
  | 'PATTERN'
  | 'QR_ACTIVATION'
  | 'CUTTING'
  | 'QC'
  | 'FINISHING'
  | 'PACKING';

export type RequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'; 