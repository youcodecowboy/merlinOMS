import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: { notificationId: string } }
) {
  try {
    // Get the dev user ID from the request header
    const devUserId = request.headers.get('x-dev-user-id')

    // If no dev user ID, get the first user
    const user = devUserId ? 
      await prisma.user.findUnique({ where: { id: devUserId } }) :
      await prisma.user.findFirst()

    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 })
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id: params.notificationId,
        user_id: user.id,
      },
    })

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      )
    }

    await prisma.notification.update({
      where: {
        id: params.notificationId,
      },
      data: {
        read: true,
      },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Failed to mark notification as read:", error)
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    )
  }
} 