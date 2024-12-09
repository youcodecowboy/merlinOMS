import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const user = await prisma.user.findFirst()

    if (!user) {
      return NextResponse.json({ error: "No users found" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error("Failed to fetch first user:", error)
    return NextResponse.json(
      { error: "Failed to fetch first user" },
      { status: 500 }
    )
  }
} 