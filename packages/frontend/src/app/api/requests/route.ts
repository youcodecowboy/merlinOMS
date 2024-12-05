import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RequestType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json(
        { error: 'Request type is required' },
        { status: 400 }
      );
    }

    // Validate request type
    if (!Object.values(RequestType).includes(type as RequestType)) {
      return NextResponse.json(
        { error: `Invalid request type: ${type}` },
        { status: 400 }
      );
    }

    const requests = await prisma.request.findMany({
      where: {
        type: type as RequestType,
        status: {
          not: 'COMPLETED'
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Type-safe mapping with metadata handling
    const formattedRequests = requests.map(request => {
      const { metadata, ...rest } = request;
      return {
        ...rest,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
      };
    });

    return NextResponse.json(formattedRequests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 