import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    // Get the dev user ID from the request header
    const devUserId = request.headers.get('x-dev-user-id')
    console.log('API - Dev user ID:', devUserId)

    // If no dev user ID, get the first user
    const user = devUserId ? 
      await prisma.user.findUnique({ where: { id: devUserId } }) :
      await prisma.user.findFirst()

    console.log('API - Found user:', user?.id)

    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 })
    }

    const notifications = await prisma.notification.findMany({
      where: {
        user_id: user.id,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 50,
    })

    console.log('API - Found notifications:', notifications.length)

    // Let's also check all notifications in the system
    const allNotifications = await prisma.notification.findMany({
      take: 5,
      orderBy: {
        created_at: "desc"
      }
    })

    console.log('API - Recent notifications in system:', 
      allNotifications.map(n => ({
        id: n.id,
        user_id: n.user_id,
        message: n.message
      }))
    )

    return NextResponse.json({
      notifications,
      debug: {
        requestedUserId: devUserId,
        foundUserId: user.id,
        notificationCount: notifications.length,
        recentNotifications: allNotifications.length
      }
    })
  } catch (error) {
    console.error("Failed to fetch notifications:", error)
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    )
  }
} 