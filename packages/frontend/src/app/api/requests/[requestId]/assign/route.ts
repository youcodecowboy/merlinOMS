import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get the request details first
    const existingRequest = await prisma.request.findUnique({
      where: { id: params.requestId },
      include: {
        item: true
      }
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Update the request with assignment
    const updatedRequest = await prisma.request.update({
      where: { id: params.requestId },
      data: {
        assigned_to: userId,
        metadata: {
          ...existingRequest.metadata,
          assigned_at: new Date().toISOString(),
        },
      },
      include: {
        item: true,
        assignedUser: true
      }
    });

    // Create a notification for the assigned user
    await prisma.notification.create({
      data: {
        type: 'REQUEST_ASSIGNED',
        message: `You have been assigned a new ${existingRequest.type.toLowerCase()} request${existingRequest.item ? ` for item ${existingRequest.item.sku}` : ""}`,
        user_id: userId,
        request_id: params.requestId,
        read: false,
        metadata: {
          request_type: existingRequest.type,
          item_id: existingRequest.item?.id,
          item_sku: existingRequest.item?.sku,
        }
      }
    });

    return NextResponse.json({
      success: true,
      request: updatedRequest
    });

  } catch (error) {
    console.error('Error assigning request:', error);
    return NextResponse.json(
      { error: 'Failed to assign request' },
      { status: 500 }
    );
  }
} 