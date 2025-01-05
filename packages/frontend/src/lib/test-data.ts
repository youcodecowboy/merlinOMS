// Test customer data
export const TEST_CUSTOMERS = [
  {
    id: 'cust_01',
    email: 'sarah.miller@example.com',
    profile: {
      firstName: 'Sarah',
      lastName: 'Miller',
      phone: '+1 (555) 123-4567',
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105'
      }
    }
  },
  {
    id: 'cust_02',
    email: 'james.wilson@example.com',
    profile: {
      firstName: 'James',
      lastName: 'Wilson',
      phone: '+1 (555) 234-5678',
      address: {
        street: '456 Market St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94103'
      }
    }
  }
] as const;

// Test SKU patterns
export const TEST_SKUS = {
  // Standard items
  STANDARD: {
    RAW: 'ST-32-X-36-RAW', // Raw standard item
    STARDUST: 'ST-32-X-36-STA', // After Stardust wash
    INDIGO: 'ST-32-X-36-IND', // After Indigo wash
    ONYX: 'ST-32-X-36-ONX', // After Onyx wash
    JAGGER: 'ST-32-X-36-JAG', // After Jagger wash
  },
  // Slim fit items
  SLIM: {
    RAW: 'SL-30-X-34-RAW',
    STARDUST: 'SL-30-X-34-STA',
    INDIGO: 'SL-30-X-34-IND',
    ONYX: 'SL-30-X-34-ONX',
    JAGGER: 'SL-30-X-34-JAG',
  }
} as const;

// Test order data
export const createTestOrder = (options: {
  customerId: string;
  items: Array<{
    sku: string;
    quantity: number;
    target_sku?: string;
  }>;
}) => {
  const orderNumber = `WO-${Date.now().toString().slice(-6)}`;
  const shopifyId = `${Math.floor(Math.random() * 9000000) + 1000000}`;

  return {
    id: `order_${Date.now()}`,
    order_number: orderNumber,
    shopify_id: shopifyId,
    customer_id: options.customerId,
    status: 'PENDING',
    items: options.items.map((item, index) => ({
      id: `item_${Date.now()}_${index}`,
      sku: item.sku,
      quantity: item.quantity,
      target_sku: item.target_sku || item.sku,
      status: 'PENDING'
    })),
    metadata: {
      created_at: new Date().toISOString(),
      source: 'shopify',
      priority: 'normal'
    }
  };
};

// Test wash request data
export const createTestWashRequest = (options: {
  itemId: string;
  assignedTo: string;
  targetWash: 'STARDUST' | 'INDIGO' | 'ONYX' | 'JAGGER';
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
}) => {
  return {
    type: 'WASH',
    status: 'PENDING',
    item_id: options.itemId,
    assigned_to: options.assignedTo,
    metadata: {
      requires_bin_assignment: true,
      requires_qr_scan: true,
      target_wash: options.targetWash,
      order_id: options.orderId,
      order_number: options.orderNumber,
      customer_name: options.customerName,
      assigned_at: new Date().toISOString()
    }
  };
};

// Test production request data
export const createTestProductionRequest = (options: {
  sku: string;
  quantity: number;
  orderIds: string[];
  customerNames?: string[];
}) => {
  return {
    type: 'PRODUCTION',
    status: 'PENDING',
    metadata: {
      sku: options.sku,
      quantity: options.quantity,
      order_ids: options.orderIds,
      customer_names: options.customerNames,
      universal_sku: options.sku.split('-').slice(0, -1).join('-'),
      created_at: new Date().toISOString()
    }
  };
};

// Test inventory item data
export const createTestInventoryItem = (options: {
  sku: string;
  status1?: 'STOCK' | 'PRODUCTION' | 'WASH';
  status2?: 'UNCOMMITTED' | 'COMMITTED' | 'ASSIGNED';
  location?: string;
  binId?: string;
}) => {
  return {
    sku: options.sku,
    status1: options.status1 || 'STOCK',
    status2: options.status2 || 'UNCOMMITTED',
    location: options.location || 'WAREHOUSE',
    bin_id: options.binId,
    qr_code: `QR-${Date.now()}`,
    metadata: {
      created_at: new Date().toISOString(),
      test_item: true
    }
  };
}; 