import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper functions
function generateRandomCustomerData() {
  const characters = [
    { firstName: 'Luke', lastName: 'Skywalker' },
    { firstName: 'Leia', lastName: 'Organa' },
    { firstName: 'Han', lastName: 'Solo' },
    { firstName: 'Rey', lastName: 'Skywalker' },
    { firstName: 'Finn', lastName: 'Storm' }
  ];
  const character = characters[Math.floor(Math.random() * characters.length)];
  return {
    firstName: character.firstName,
    lastName: character.lastName,
    email: `${character.firstName.toLowerCase()}.${character.lastName.toLowerCase()}@resistance.com`,
    phone: '+1234567890',
    address: '123 Rebel Base',
    city: 'Yavin',
    state: 'IV',
    zip: '12345'
  };
}

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
    // Get customer email and SKU from request or generate random
    const { email, sku } = await req.json().catch(() => ({}));
    const customerData = email ? undefined : generateRandomCustomerData();
    const finalEmail = email || customerData!.email;
    const finalSku = sku || generateRandomSKU();

    // Find or create customer by email
    const customer = await prisma.customer.findUnique({
      where: { email: finalEmail },
      include: { profile: true }
    }) || await prisma.customer.create({
      data: {
        email: finalEmail,
        profile: {
          create: {
            metadata: customerData || {
              firstName: finalEmail.split('@')[0],
              lastName: 'Customer',
              phone: '+1234567890',
              address: '123 Test St',
              city: 'Test City',
              state: 'TS',
              zip: '12345'
            }
          }
        }
      },
      include: { profile: true }
    });

    // Create order
    const order = await prisma.order.create({
      data: {
        shopify_id: `TEST-${Date.now()}`,
        customer_id: customer.id,
        status: 'NEW',
        order_items: {
          create: [{
            target_sku: finalSku,
            quantity: 1,
            status: 'NEW'
          }]
        }
      },
      include: {
        order_items: true,
        customer: {
          include: {
            profile: true
          }
        }
      }
    });

    // Automatically process the order
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

    return NextResponse.json({
      success: true,
      message: 'Test order created and processed successfully',
      customer,
      order: {
        ...order,
        status: processResult.order?.status || order.status,
        processing: processResult
      }
    });

  } catch (error) {
    console.error('Error creating test order:', error);
    
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
        error: 'Failed to create test order'
      },
      { status: 500 }
    );
  }
} 