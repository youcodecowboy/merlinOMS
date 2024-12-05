import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper functions
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

async function createTestInventory() {
  console.log('Creating test inventory...');

  // Create some STOCK items
  const stockItems = await Promise.all(
    Array.from({ length: 10 }).map(async () => {
      const sku = generateRandomSKU();
      return prisma.inventoryItem.create({
        data: {
          sku,
          status1: 'STOCK',
          status2: 'UNCOMMITTED',
          location: 'STORAGE',
          qr_code: `QR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          metadata: {
            created_by: 'system',
            test_data: true
          }
        }
      });
    })
  );
  console.log(`Created ${stockItems.length} STOCK items`);

  // Create some PRODUCTION items
  const productionItems = await Promise.all(
    Array.from({ length: 5 }).map(async () => {
      const sku = generateRandomSKU();
      return prisma.inventoryItem.create({
        data: {
          sku,
          status1: 'PRODUCTION',
          status2: 'UNCOMMITTED',
          location: 'PRODUCTION',
          qr_code: `QR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          metadata: {
            created_by: 'system',
            test_data: true
          }
        }
      });
    })
  );
  console.log(`Created ${productionItems.length} PRODUCTION items`);

  // Create some universal SKUs (RAW and BRW)
  const universalItems = await Promise.all(
    Array.from({ length: 5 }).map(async () => {
      const style = 'ST';
      const waist = ['32', '34'][Math.floor(Math.random() * 2)];
      const shape = 'X';
      const length = '36';
      const wash = ['RAW', 'BRW'][Math.floor(Math.random() * 2)];
      const sku = `${style}-${waist}-${shape}-${length}-${wash}`;

      return prisma.inventoryItem.create({
        data: {
          sku,
          status1: 'STOCK',
          status2: 'UNCOMMITTED',
          location: 'STORAGE',
          qr_code: `QR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          metadata: {
            created_by: 'system',
            test_data: true,
            universal: true
          }
        }
      });
    })
  );
  console.log(`Created ${universalItems.length} universal items`);

  return {
    stockItems,
    productionItems,
    universalItems
  };
}

export async function POST(req: NextRequest) {
  try {
    console.log('Starting database reset...');

    // Delete all existing data in reverse order of dependencies
    console.log('Deleting existing data...');

    try {
      await prisma.event.deleteMany();
      console.log('Deleted all events');

      await prisma.request.deleteMany();
      console.log('Deleted all requests');

      await prisma.orderItem.deleteMany();
      console.log('Deleted all order items');

      await prisma.order.deleteMany();
      console.log('Deleted all orders');

      await prisma.customerProfile.deleteMany();
      console.log('Deleted all customer profiles');

      await prisma.customer.deleteMany();
      console.log('Deleted all customers');

      await prisma.bin.deleteMany();
      console.log('Deleted all bins');

      await prisma.inventoryItem.deleteMany();
      console.log('Deleted all inventory items');

      await prisma.operator.deleteMany();
      console.log('Deleted all operators');
    } catch (deleteError) {
      console.error('Error during deletion:', {
        error: deleteError,
        message: deleteError instanceof Error ? deleteError.message : 'Unknown error'
      });
      throw deleteError;
    }

    // Create test operator
    console.log('Creating test operator...');
    const operator = await prisma.operator.create({
      data: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'System',
        email: 'system@example.com',
        role: 'ADMIN'
      }
    });
    console.log('Created test operator:', operator);

    // Create test inventory
    const inventory = await createTestInventory();
    console.log('Created test inventory:', {
      stockItemCount: inventory.stockItems.length,
      productionItemCount: inventory.productionItems.length,
      universalItemCount: inventory.universalItems.length
    });

    // Create test bins
    console.log('Creating test bins...');
    const bins = await Promise.all([
      prisma.bin.create({
        data: {
          name: 'Storage Bin 1',
          capacity: 50,
          current_count: 0,
          location: 'STORAGE'
        }
      }),
      prisma.bin.create({
        data: {
          name: 'Production Bin 1',
          capacity: 30,
          current_count: 0,
          location: 'PRODUCTION'
        }
      })
    ]);
    console.log('Created test bins:', bins);

    return NextResponse.json({
      success: true,
      message: 'Database reset successful',
      data: {
        operator,
        inventory: {
          stockItems: inventory.stockItems.length,
          productionItems: inventory.productionItems.length,
          universalItems: inventory.universalItems.length
        },
        bins: bins.length
      }
    });

  } catch (error) {
    console.error('Error resetting database:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reset database'
      },
      { status: 500 }
    );
  }
} 