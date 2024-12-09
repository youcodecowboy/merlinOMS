import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, type, capacity, sku } = body;

    if (!code || !type) {
      return NextResponse.json(
        { error: 'Code and type are required' },
        { status: 400 }
      );
    }

    // Create test bin
    const bin = await prisma.bin.create({
      data: {
        code,
        type,
        sku: sku || 'TEST-SKU-MOVE-2', // Match the test item SKU
        zone: 'TEST', // Default zone for test bins
        capacity: capacity || 10,
        current_count: 0,
        metadata: {
          created_at: new Date().toISOString(),
          test_bin: true
        }
      }
    });

    return NextResponse.json({
      success: true,
      bin
    });

  } catch (error) {
    console.error('Error creating test bin:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create test bin'
      },
      { status: 500 }
    );
  }
} 