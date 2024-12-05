import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    console.log('Fetching customers...');
    
    const customers = await prisma.customer.findMany({
      include: {
        profile: true,
        orders: {
          include: {
            order_items: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Calculate customer metrics
    const customersWithMetrics = customers.map(customer => {
      const totalOrders = customer.orders.length;
      const lastOrder = customer.orders[0]; // Orders are sorted by created_at desc
      const lifetimeValue = customer.orders.reduce((sum, order) => {
        // In a real app, you'd calculate this based on order items' prices
        return sum + (order.order_items.length * 100) // Placeholder: $100 per item
      }, 0);

      return {
        ...customer,
        profile: {
          ...customer.profile,
          metadata: {
            ...customer.profile?.metadata,
            totalOrders,
            lastOrderDate: lastOrder?.created_at,
            lifetimeValue
          }
        }
      };
    });

    console.log(`Found ${customers.length} customers`);
    
    return NextResponse.json({
      success: true,
      customers: customersWithMetrics
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch customers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 