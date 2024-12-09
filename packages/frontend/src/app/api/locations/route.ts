import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Create a new PrismaClient instance with the correct database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error'],
});

// Test the connection
prisma.$connect().then(() => {
  console.log('Successfully connected to database');
}).catch((error: Error) => {
  console.error('Failed to connect to database:', error);
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json(
        { error: 'Location type is required' },
        { status: 400 }
      );
    }

    // Validate type
    if (type !== 'WASH_BIN') {
      return NextResponse.json(
        { error: 'Invalid location type' },
        { status: 400 }
      );
    }

    try {
      // First check if we have any locations
      const existingLocations = await prisma.location.findMany({
        where: {
          type: type
        },
        orderBy: {
          name: 'asc'
        }
      });

      console.log('Raw locations from database:', JSON.stringify(existingLocations, null, 2));
      console.log(`Found ${existingLocations.length} existing ${type} locations`);

      // If no locations exist, initialize them
      if (existingLocations.length === 0) {
        console.log('No locations found, initializing...');
        
        try {
          const result = await prisma.$transaction(async (tx: PrismaClient) => {
            // Delete all existing wash bins first
            await tx.location.deleteMany({
              where: {
                type: 'WASH_BIN'
              }
            });

            const bins = [];
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
            
            for (const bin of DEFAULT_WASH_BINS) {
              try {
                const newBin = await tx.location.create({
                  data: {
                    name: bin.name,
                    type: bin.type,
                    status: bin.status,
                    metadata: bin.metadata
                  }
                });
                bins.push(newBin);
                console.log(`Created bin: ${bin.name}`, newBin);
              } catch (error) {
                console.error(`Failed to create bin ${bin.name}:`, error);
                if (error instanceof Error) {
                  console.error('Error details:', {
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                  });
                }
                throw error;
              }
            }

            return bins;
          });

          console.log('Successfully created bins:', result);

          return NextResponse.json({
            success: true,
            locations: result
          });
        } catch (error) {
          console.error('Error during initialization:', error);
          if (error instanceof Error) {
            console.error('Error details:', {
              message: error.message,
              name: error.name,
              stack: error.stack
            });
          }
          throw error;
        }
      }

      return NextResponse.json({
        success: true,
        locations: existingLocations
      });

    } catch (error) {
      console.error('Database operation error:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      throw error;
    }

  } catch (error) {
    console.error('Error in locations endpoint:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch locations'
      },
      { status: 500 }
    );
  }
} 