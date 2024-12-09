import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RequestType, RequestStatus } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, itemId, assignedTo } = body;

    if (!type || !itemId) {
      return NextResponse.json(
        { error: 'Type and itemId are required' },
        { status: 400 }
      );
    }

    // Start a transaction to create both request and notification
    const result = await prisma.$transaction(async (tx) => {
      // Create test request
      const request = await tx.request.create({
        data: {
          type: type as RequestType,
          status: 'PENDING' as RequestStatus,
          item_id: itemId,
          assigned_to: assignedTo,
          metadata: assignedTo ? {
            assigned_at: new Date().toISOString(),
            requires_bin_assignment: true,
            requires_qr_scan: true
          } : undefined
        },
        include: {
          item: {
            select: {
              id: true,
              sku: true,
              location: true
            }
          },
          assignedUser: {
            select: {
              id: true,
              email: true,
              role: true
            }
          }
        }
      });

      // If request is assigned, create a notification
      if (assignedTo) {
        await tx.notification.create({
          data: {
            type: 'REQUEST_ASSIGNED',
            message: `You have been assigned a new ${type.toLowerCase()} request${request.item ? ` for item ${request.item.sku}` : ""}`,
            user_id: assignedTo,
            request_id: request.id,
            read: false,
            metadata: {
              request_type: type,
              item_id: request.item?.id,
              item_sku: request.item?.sku,
            }
          }
        });
      }

      return request;
    });

    return NextResponse.json({
      success: true,
      request: result
    });

  } catch (error) {
    console.error('Error creating test request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create test request'
      },
      { status: 500 }
    );
  }
} 