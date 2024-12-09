import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        profile: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.email
      }))
    });

  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to list users'
      },
      { status: 500 }
    );
  }
} 