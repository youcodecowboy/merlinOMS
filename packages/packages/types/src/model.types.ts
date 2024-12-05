import type { Customer, Bin } from '@prisma/client';

export interface OrderModel {
  id: string;
  shopifyId: string;
  status: string;
  customer: Customer;
  // ... other fields
}

export interface InventoryItemModel {
  id: string;
  sku: string;
  status1: string;
  status2: string;
  current_bin?: Bin;
  // ... other fields
}