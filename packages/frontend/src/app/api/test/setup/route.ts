import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export async function POST() {
  console.log('Starting test setup...');
  
  try {
    // Test database connection with timeout
    try {
      console.log('Testing database connection...');
      const connectionPromise = prisma.$queryRaw`SELECT current_database()`;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      );
      
      const dbName = await Promise.race([connectionPromise, timeoutPromise]);
      console.log('Database connection successful, connected to:', dbName);
    } catch (connError) {
      console.error('Database connection failed:', {
        error: connError,
        message: connError instanceof Error ? connError.message : 'Unknown connection error',
        stack: connError instanceof Error ? connError.stack : undefined
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed',
          details: connError instanceof Error ? connError.message : 'Unknown connection error'
        },
        { status: 500 }
      );
    }

    // Check if we can query the User table
    try {
      console.log('Testing User table access...');
      const userCount = await prisma.user.count();
      console.log('Current user count:', userCount);
    } catch (tableError) {
      console.error('Failed to query User table:', {
        error: tableError,
        message: tableError instanceof Error ? tableError.message : 'Unknown table error',
        stack: tableError instanceof Error ? tableError.stack : undefined
      });
      
      // Check if this is a schema sync issue
      if (tableError instanceof PrismaClientKnownRequestError && tableError.code === 'P2021') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Database schema not synchronized',
            details: 'Please run prisma generate and prisma db push'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to access User table',
          details: tableError instanceof Error ? tableError.message : 'Unknown table error'
        },
        { status: 500 }
      );
    }

    console.log('Creating test user...');
    // Create test user if it doesn't exist
    const user = await prisma.user.upsert({
      where: { email: 'test-operator@oms.dev' },
      update: {},
      create: {
        email: 'test-operator@oms.dev',
        password: 'test-password-hash',
        role: 'WAREHOUSE',
        profile: {
          create: {
            firstName: 'Test',
            lastName: 'Operator',
            settings: {}
          }
        }
      },
      include: {
        profile: true
      }
    });

    console.log('Test user created successfully:', user);
    return NextResponse.json({
      success: true,
      message: 'Test setup completed',
      user
    });
  } catch (error) {
    // Log the full error details
    if (error instanceof PrismaClientKnownRequestError) {
      const errorDetails = {
        code: error.code,
        message: error.message,
        meta: error.meta,
        stack: error.stack
      };
      console.error('Prisma error:', errorDetails);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database operation failed',
          details: errorDetails
        },
        { status: 500 }
      );
    }

    // Generic error handling
    const errorMessage = error instanceof Error ? {
      message: error.message,
      stack: error.stack
    } : 'Unknown error';
    
    console.error('Unknown error:', errorMessage);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to setup test environment',
        details: errorMessage
      },
      { status: 500 }
    );
  } finally {
    try {
      await prisma.$disconnect();
      console.log('Database disconnected');
    } catch (disconnectError) {
      console.error('Error disconnecting from database:', disconnectError);
    }
  }
} 