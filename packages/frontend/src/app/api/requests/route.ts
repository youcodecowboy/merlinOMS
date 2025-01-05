import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json(
        { error: 'Request type is required', requests: [] },
        { status: 400 }
      );
    }

    console.log('API: Fetching requests of type:', type);

    const requests = await prisma.request.findMany({
      where: {
        type: type,
        status: {
          not: 'COMPLETED'
        }
      },
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            qr_code: true,
            location: true,
            status1: true,
            status2: true
          }
        },
        order: {
          select: {
            id: true,
            shopify_id: true,
            status: true,
            customer: {
              select: {
                email: true,
                profile: {
                  select: {
                    metadata: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log('API: Raw database requests:', JSON.stringify(requests, null, 2));

    // For cutting requests, ensure proper metadata formatting
    if (type === 'CUTTING') {
      const formattedRequests = requests.map(request => {
        console.log('API: Processing cutting request:', request.id);
        
        // Ensure metadata is an object
        const metadata = typeof request.metadata === 'string' 
          ? JSON.parse(request.metadata) 
          : request.metadata || {};

        // Ensure sku_groups is properly formatted
        const sku_groups = Array.isArray(metadata.sku_groups) 
          ? metadata.sku_groups.map(group => ({
              sku: String(group.sku || ''),
              quantity: Number(group.quantity || 0),
              pattern_requests: Array.isArray(group.pattern_requests) ? group.pattern_requests : []
            }))
          : [];

        return {
          id: request.id,
          status: request.status || 'PENDING',
          created_at: request.created_at.toISOString(),
          metadata: {
            pattern_request_ids: Array.isArray(metadata.pattern_request_ids) ? metadata.pattern_request_ids : [],
            sku_groups,
            item_ids: Array.isArray(metadata.item_ids) ? metadata.item_ids : [],
            started_at: metadata.started_at,
            completion: metadata.completion
          }
        };
      });

      console.log('API: Final formatted cutting requests:', JSON.stringify(formattedRequests, null, 2));
      return NextResponse.json({ requests: formattedRequests });
    }

    // For pattern requests, handle SKU aggregation
    const skuMap = new Map<string, any>();
    
    requests.forEach(request => {
      const metadata = typeof request.metadata === 'string' 
        ? JSON.parse(request.metadata) 
        : (request.metadata || {});
      const { ...rest } = request;
      const sku = metadata?.sku || metadata?.universal_sku;
      
      if (type === 'PATTERN' && sku) {
        if (skuMap.has(sku)) {
          const existing = skuMap.get(sku);
          existing.metadata.quantity += Number(metadata.quantity) || 0;
          existing.metadata.order_ids = [
            ...(existing.metadata.order_ids || []),
            ...(metadata.order_ids || [])
          ];
          if (new Date(request.created_at) < new Date(existing.created_at)) {
            existing.created_at = request.created_at;
          }
        } else {
          skuMap.set(sku, {
            ...rest,
            metadata: {
              ...metadata,
              quantity: Number(metadata.quantity) || 0,
              order_ids: metadata.order_ids || []
            }
          });
        }
      } else {
        skuMap.set(request.id, {
          ...rest,
          metadata: metadata
        });
      }
    });

    return NextResponse.json({
      requests: Array.from(skuMap.values())
    });
  } catch (error) {
    console.error('API Error fetching requests:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch requests',
        requests: []
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, status, metadata } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Request type is required' },
        { status: 400 }
      );
    }

    const newRequest = await prisma.request.create({
      data: {
        type,
        status: status || 'PENDING',
        metadata
      }
    });

    return NextResponse.json({
      success: true,
      request: newRequest
    });

  } catch (error) {
    console.error('Error creating request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create request'
      },
      { status: 500 }
    );
  }
} 