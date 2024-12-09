import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    console.log('Starting storage bin initialization...');

    // First delete all existing storage bins
    await prisma.bin.deleteMany({
      where: {
        type: 'STORAGE'
      }
    });

    console.log('Cleaned up existing storage bins');

    // Create test bins
    const timestamp = Date.now();
    const bins = await Promise.all([
      // SKU-specific bins
      prisma.bin.create({
        data: {
          code: 'STORAGE-A1',
          type: 'STORAGE',
          zone: 'A',
          is_active: true,
          capacity: 50,
          current_count: 0,
          sku: `TEST-SKU-${timestamp}-1`,
          metadata: {
            description: 'Test SKU-specific storage bin'
          }
        }
      }),
      prisma.bin.create({
        data: {
          code: 'STORAGE-A2',
          type: 'STORAGE',
          zone: 'A',
          is_active: true,
          capacity: 50,
          current_count: 0,
          sku: `TEST-SKU-${timestamp}-2`,
          metadata: {
            description: 'Test SKU-specific storage bin'
          }
        }
      }),
      // General storage bins (with GENERAL prefix)
      prisma.bin.create({
        data: {
          code: 'STORAGE-B1',
          type: 'STORAGE',
          zone: 'B',
          is_active: true,
          capacity: 100,
          current_count: 0,
          sku: `GENERAL-${timestamp}-1`,
          metadata: {
            description: 'Test general storage bin'
          }
        }
      }),
      prisma.bin.create({
        data: {
          code: 'STORAGE-B2',
          type: 'STORAGE',
          zone: 'B',
          is_active: true,
          capacity: 100,
          current_count: 0,
          sku: `GENERAL-${timestamp}-2`,
          metadata: {
            description: 'Test general storage bin'
          }
        }
      })
    ]);

    console.log('Created test storage bins:', bins);

    return NextResponse.json({
      success: true,
      data: bins
    });

  } catch (error) {
    console.error('Error initializing storage bins:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to initialize storage bins'
      },
      { status: 500 }
    );
  }
} 