import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  try {
    const requestData = await prisma.request.findUnique({
      where: {
        id: params.requestId,
      },
      include: {
        item: true,
        order: {
          include: {
            customer: {
              include: {
                profile: true,
              },
            },
          },
        },
        assignedUser: {
          include: {
            profile: true
          }
        }
      },
    });

    if (!requestData) {
      return new NextResponse('Request not found', { status: 404 });
    }

    return NextResponse.json(requestData);
  } catch (error) {
    console.error('Error fetching request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 