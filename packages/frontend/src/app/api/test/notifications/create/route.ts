import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, type, userId } = body;

    if (!message || !type) {
      return NextResponse.json(
        { error: 'Message and type are required' },
        { status: 400 }
      );
    }

    // Get the specified user or first user as fallback
    const user = userId ? 
      await prisma.user.findUnique({ where: { id: userId } }) :
      await prisma.user.findFirst();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create test notification
    const notification = await prisma.notification.create({
      data: {
        type,
        message,
        user_id: user.id,
        read: false,
        metadata: {
          test: true,
          created_at: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error creating test notification:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create test notification'
      },
      { status: 500 }
    );
  }
} 