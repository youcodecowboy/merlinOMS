import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_WASH_BINS = [
  {
    name: 'STARDUST',
    type: 'WASH_BIN',
    status: 'ACTIVE',
    metadata: {
      capacity: 100,
      description: 'Stardust wash process bin',
      items: []
    }
  },
  {
    name: 'INDIGO',
    type: 'WASH_BIN',
    status: 'ACTIVE',
    metadata: {
      capacity: 100,
      description: 'Indigo wash process bin',
      items: []
    }
  },
  {
    name: 'ONYX',
    type: 'WASH_BIN',
    status: 'ACTIVE',
    metadata: {
      capacity: 100,
      description: 'Onyx wash process bin',
      items: []
    }
  },
  {
    name: 'JAGGER',
    type: 'WASH_BIN',
    status: 'ACTIVE',
    metadata: {
      capacity: 100,
      description: 'Jagger wash process bin',
      items: []
    }
  }
];

export async function POST() {
  try {
    console.log('Starting bin initialization...');

    // First check if we have any existing wash bins
    const existingBins = await prisma.location.findMany({
      where: {
        type: 'WASH_BIN'
      }
    });

    console.log(`Found ${existingBins.length} existing wash bins`);

    // Delete all existing wash bins first
    if (existingBins.length > 0) {
      await prisma.location.deleteMany({
        where: {
          type: 'WASH_BIN'
        }
      });
      console.log('Deleted existing wash bins');
    }

    // Create all wash bins in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const bins = [];
      
      for (const bin of DEFAULT_WASH_BINS) {
        try {
          // Create new bin
          const newBin = await tx.location.create({
            data: bin
          });
          bins.push(newBin);
          console.log(`Created bin: ${bin.name}`, newBin);
        } catch (error) {
          console.error(`Error creating bin ${bin.name}:`, error);
          throw error;
        }
      }

      return bins;
    });

    console.log('Successfully created all bins:', result);

    return NextResponse.json({
      success: true,
      message: 'Wash bins initialized successfully',
      data: result
    });

  } catch (error) {
    console.error('Error initializing wash bins:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to initialize wash bins'
      },
      { status: 500 }
    );
  }
} 