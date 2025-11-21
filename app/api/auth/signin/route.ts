// app/api/auth/signout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/server/prisma";

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id?: string;
  role?: string;
  matricNumber?: string;
  teacherId?: string;
};

export async function POST(request: NextRequest) {
  try {
    // Get session (works for Student, Lecturer, Admin — all use same authOptions)
    const session = (await getServerSession(authOptions)) as {
      user?: SessionUser;
    } | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Log the logout — with full context
    await prisma.auditLog.create({
      data: {
        userId,
        action: "USER_LOGGED_OUT",
        resourceType: "USER",
        resourceId: userId,
        details: {
          role: session.user.role,
          identifier:
            session.user.matricNumber ||
            session.user.teacherId ||
            session.user.email,
        },
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      },
    });

    // Let NextAuth clear the session cookie automatically
    const response = NextResponse.json(
      { success: true, message: "Signed out successfully" },
      { status: 200 }
    );

    // This is the correct way: use NextAuth's built-in cookie clearing
    response.cookies.set({
      name: "next-auth.session-token",
      value: "",
      path: "/",
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
    });

    // Also clear __Secure-next-auth.session-token if using secure cookies
    response.cookies.set({
      name: "__Secure-next-auth.session-token",
      value: "",
      path: "/",
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    console.error("Sign out error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sign out" },
      { status: 500 }
    );
  }
}
