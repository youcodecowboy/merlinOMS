import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay()) // Start of current week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0)

    // Get active requests (PENDING or IN_PROGRESS)
    const activeRequests = await prisma.request.count({
      where: {
        assigned_to: userId,
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      }
    })

    // Get requests completed today
    const completedToday = await prisma.request.count({
      where: {
        assigned_to: userId,
        status: 'COMPLETED',
        updated_at: {
          gte: startOfToday
        }
      }
    })

    // Get requests completed this week
    const completedThisWeek = await prisma.request.count({
      where: {
        assigned_to: userId,
        status: 'COMPLETED',
        updated_at: {
          gte: startOfWeek
        }
      }
    })

    // Get late requests (older than 24 hours and not completed)
    const oneDayAgo = new Date(now)
    oneDayAgo.setHours(now.getHours() - 24)
    
    const lateRequests = await prisma.request.count({
      where: {
        assigned_to: userId,
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        },
        created_at: {
          lt: oneDayAgo
        }
      }
    })

    return NextResponse.json({
      success: true,
      metrics: {
        activeRequests,
        completedToday,
        completedThisWeek,
        lateRequests
      }
    })

  } catch (error) {
    console.error("Failed to fetch user metrics:", error)
    return NextResponse.json(
      { error: "Failed to fetch user metrics" },
      { status: 500 }
    )
  }
} 