import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // For development, get the first user
    const user = await prisma.user.findFirst({
      include: {
        profile: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: {
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        email: user.email,
        phoneNumber: user.profile?.phoneNumber,
        photoUrl: user.profile?.photoUrl,
        settings: user.profile?.settings
      }
    })
  } catch (error) {
    console.error("Failed to fetch profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()
    
    // For development, update the first user
    const user = await prisma.user.findFirst()
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Update user email
    await prisma.user.update({
      where: { id: user.id },
      data: { email: data.email }
    })

    // Update or create profile
    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        photoUrl: data.photoUrl,
        settings: {
          bio: data.bio
        }
      },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        photoUrl: data.photoUrl,
        settings: {
          bio: data.bio
        }
      }
    })

    return NextResponse.json({
      success: true,
      profile
    })
  } catch (error) {
    console.error("Failed to update profile:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
} 