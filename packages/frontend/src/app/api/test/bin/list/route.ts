import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const bins = await prisma.bin.findMany({
      where: {
        metadata: {
          path: ['test_bin'],
          equals: true
        }
      },
      orderBy: {
        code: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      bins
    });

  } catch (error) {
    console.error('Error listing test bins:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to list test bins'
      },
      { status: 500 }
    );
  }
} 