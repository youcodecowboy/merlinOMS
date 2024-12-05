import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

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
    console.log('Starting inventory item creation...');
    
    // Get SKU from request or generate random
    const { sku } = await req.json().catch(() => ({}));
    const finalSku = sku || generateRandomSKU();
    console.log('Using SKU:', finalSku);
    
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
    console.log('Creating inventory item with data:', {
      sku: finalSku,
      status1: 'STOCK',
      status2: 'UNCOMMITTED',
      location: 'WAREHOUSE',
      bin_id: bin.id
    });

    const item = await prisma.inventoryItem.create({
      data: {
        sku: finalSku,
        status1: 'STOCK',
        status2: 'UNCOMMITTED',
        location: 'WAREHOUSE',
        current_bin: {
          connect: { id: bin.id }
        }
      },
      include: {
        current_bin: true
      }
    });
    console.log('Inventory item created:', item);

    // Update bin count
    console.log('Updating bin count...');
    await prisma.bin.update({
      where: { id: bin.id },
      data: {
        current_count: {
          increment: 1
        }
      }
    });
    console.log('Bin count updated');

    return NextResponse.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Error creating test inventory item:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create test inventory item'
      },
      { status: 500 }
    );
  }
} 