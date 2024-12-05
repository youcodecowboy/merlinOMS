import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { generateQRCode } from "@/lib/utils/qr";

// Use the same SKU generation logic as orders
function generateRandomSKU() {
  const styles = ['ST'];
  const waists = ['28', '30', '32', '34', '36', '38', '39'];
  const shapes = ['X', 'Y'];
  const lengths = ['30', '32', '34'];
  const washes = ['RAW', 'BRW', 'STA', 'IND', 'ONX', 'JAG'];

  const style = styles[Math.floor(Math.random() * styles.length)];
  const waist = waists[Math.floor(Math.random() * waists.length)];
  const shape = shapes[Math.floor(Math.random() * shapes.length)];
  const length = lengths[Math.floor(Math.random() * lengths.length)];
  const wash = washes[Math.floor(Math.random() * washes.length)];

  return `${style}-${waist}-${shape}-${length}-${wash}`;
}

export async function POST(req: NextRequest) {
  try {
    console.log('Starting test setup...');
    
    // Get parameters from request
    const { 
      sku, 
      status1 = 'STOCK', 
      status2 = 'UNCOMMITTED',
      skipInventory = false,
      createOrder = true,
      orderSku = null
    } = await req.json().catch(() => ({}));
    
    const finalSku = sku || generateRandomSKU();
    const targetSku = orderSku || finalSku;
    
    console.log('Test parameters:', {
      inventorySku: finalSku,
      orderSku: targetSku,
      status1,
      status2,
      skipInventory,
      createOrder
    });

    let item = null;
    
    // Create inventory item unless skipInventory is true
    if (!skipInventory) {
      // Create or find test bin
      console.log('Creating/finding test bin...');
      const bin = await prisma.bin.upsert({
        where: { code: 'TEST-BIN-A1' },
        update: {},
        create: {
          code: 'TEST-BIN-A1',
          sku: 'TEST-BIN-A1',
          type: 'STORAGE',
          zone: 'TEST',
          capacity: 100,
          current_count: 0
        }
      });
      console.log('Bin created/found:', bin);

      // Create inventory item
      console.log('Creating inventory item...');
      item = await prisma.inventoryItem.create({
        data: {
          sku: finalSku,
          status1,
          status2,
          location: status1 === 'PRODUCTION' ? 'PRODUCTION' : 'WAREHOUSE',
          qr_code: generateQRCode(),
          current_bin: {
            connect: { id: bin.id }
          }
        },
        include: {
          current_bin: true
        }
      });
      console.log('Inventory item created:', item);
    }

    let order = null;
    if (createOrder) {
      // Create and process an order for this item
      console.log('Creating test order...');
      const customer = await prisma.customer.findFirst({
        where: { email: 'test@example.com' }
      }) || await prisma.customer.create({
        data: {
          email: 'test@example.com',
          profile: {
            create: {
              metadata: {
                firstName: 'Test',
                lastName: 'Customer',
                phone: '+1234567890',
                address: '123 Test St',
                city: 'Test City',
                state: 'TS',
                zip: '12345'
              }
            }
          }
        }
      });

      order = await prisma.order.create({
        data: {
          shopify_id: `TEST-${Date.now()}`,
          customer_id: customer.id,
          status: 'NEW',
          order_items: {
            create: [{
              target_sku: targetSku,
              quantity: 1,
              status: 'NEW'
            }]
          }
        },
        include: {
          order_items: true
        }
      });

      // Process the order
      console.log('Processing test order...');
      const processResponse = await fetch(`${req.nextUrl.origin}/api/orders/${order.id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operatorId: '00000000-0000-0000-0000-000000000000', // System operator ID
        }),
      });

      const processResult = await processResponse.json();
      order = {
        ...order,
        processing: processResult
      };
    }

    return NextResponse.json({
      success: true,
      item,
      order
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create test data" },
      { status: 500 }
    );
  }
} 