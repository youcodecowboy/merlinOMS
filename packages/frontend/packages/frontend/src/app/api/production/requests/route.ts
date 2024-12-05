import { NextResponse } from 'next/server';import { prisma } from '@/lib/prisma';export async function GET() {try {const requests = await prisma.productionRequest.findMany({where: {status: 'PENDING'},orderBy: {createdAt: 'desc'}});const formattedRequests = requests.map(request => ({...request,orderIds: JSON.parse(request.orderIdsJson)}));return NextResponse.json({success: true,requests: formattedRequests})} catch (error) {console.error('Error fetching production requests:', error);return NextResponse.json({success: false,error: 'Failed to fetch production requests'}, { status: 500 })}}
