import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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