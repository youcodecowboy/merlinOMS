import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateQRCode } from "@/lib/utils/qr";

const createItemSchema = z.object({
  sku: z.string().regex(/^[A-Z]{2}-\d{2}-[A-Z]-\d{2}-[A-Z]{3}$/, {
    message: "Invalid SKU format. Expected format: ST-32-X-32-RAW"
  }),
  status1: z.enum(['STOCK', 'PRODUCTION']),
  status2: z.enum(['UNCOMMITTED', 'COMMITTED', 'ASSIGNED']),
  location: z.string().min(1),
  bin_id: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export async function GET(req: NextRequest) {
  try {
    console.log('Fetching inventory items...');
    
    const items = await prisma.inventoryItem.findMany({
      include: {
        current_bin: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`Found ${items.length} inventory items`);
    
    return NextResponse.json({
      success: true,
      items
    });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch inventory items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('Creating inventory item...');
    const body = await req.json();
    const validatedData = createItemSchema.parse(body);

    // Generate QR code
    const qr_code = generateQRCode();
    console.log('Generated QR code:', qr_code);

    // Create or find bin if bin_id not provided
    if (!validatedData.bin_id) {
      const bin = await prisma.bin.upsert({
        where: { code: 'TEST-BIN-A1' },
        update: {},
        create: {
          code: 'TEST-BIN-A1',
          sku: 'TEST-BIN-A1',
          type: 'STORAGE',
          zone: 'TEST',
          capacity: 100,
          current_count: 0,
          is_active: true
        }
      });
      validatedData.bin_id = bin.id;
    }

    // Create inventory item
    const item = await prisma.inventoryItem.create({
      data: {
        ...validatedData,
        qr_code
      },
      include: {
        current_bin: true
      }
    });

    console.log('Created inventory item:', item);

    return NextResponse.json({
      success: true,
      item
    });

  } catch (error) {
    console.error('Error creating inventory item:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.errors[0].message
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create inventory item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 