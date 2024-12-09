import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, role, firstName, lastName } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Create user and profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          email,
          password: 'test123', // Simple test password
          role,
          profile: {
            create: {
              firstName: firstName || 'Test',
              lastName: lastName || 'User',
              settings: {
                theme: 'light',
                notifications: true
              }
            }
          }
        },
        include: {
          profile: true
        }
      });

      return user;
    });

    return NextResponse.json({
      success: true,
      user: {
        id: result.id,
        email: result.email,
        role: result.role,
        profile: result.profile
      }
    });

  } catch (error) {
    console.error('Error creating test user:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create test user'
      },
      { status: 500 }
    );
  }
} 