import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    console.log('Fetching orders...');
    
    const orders = await prisma.order.findMany({
      include: {
        order_items: true,
        customer: {
          include: {
            profile: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`Found ${orders.length} orders`);
    
    return NextResponse.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 