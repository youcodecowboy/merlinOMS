import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    // Get requests assigned to the user
    const requests = await prisma.request.findMany({
      where: {
        assigned_to: userId,
        ...(type && { type: type as any }),
        ...(status && { status: status as any })
      },
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            location: true
          }
        },
        order: {
          select: {
            id: true,
            shopify_id: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      requests: requests.map(request => ({
        id: request.id,
        type: request.type,
        status: request.status,
        item: request.item || {
          id: request.metadata?.item_id as string || 'UNKNOWN',
          sku: request.metadata?.sku as string || 'UNKNOWN',
          location: request.metadata?.source as string || 'UNKNOWN'
        },
        order: request.order,
        assignedUser: request.assignedUser,
        created_at: request.created_at,
        metadata: {
          source: request.metadata?.source || request.item?.location || 'UNKNOWN',
          destination: request.metadata?.destination_name || request.metadata?.destination || 'TBD',
          destination_id: request.metadata?.destination_id || '',
          notes: request.metadata?.notes || request.metadata?.reason || '',
          assigned_at: request.metadata?.assigned_at || null
        }
      }))
    });

  } catch (error) {
    console.error('Error fetching user requests:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch user requests'
      },
      { status: 500 }
    );
  }
} 