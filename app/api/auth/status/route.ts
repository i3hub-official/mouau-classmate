// app/api/auth/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// NOTE: This is a placeholder for actual role determination logic.
// You must replace this with secure code that retrieves the role from your backend/token.
function getRoleFromToken(
  token: string
): "admin" | "student" | "teacher" | null {
  // In a real application, you would securely verify and decode the JWT token.
  // For demonstration, we'll assign a role based on a simple check or retrieve it from a session.
  if (token.startsWith("admin_")) return "admin";
  if (token.startsWith("teacher_")) return "teacher";
  if (token.startsWith("student_")) return "student";
  return "student"; // Default role if token is present but role is unknown
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore =await cookies();
    const authToken = cookieStore.get("auth-token");

    if (authToken?.value) {
      // 1. Determine the user's role
      const userRole = getRoleFromToken(authToken.value);

      if (userRole) {
        return NextResponse.json({
          authenticated: true,
          // 2. Return the role in the response
          role: userRole,
          user: { id: "user-id" },
        });
      }
    }

    return NextResponse.json({
      authenticated: false,
    });
  } catch (error) {
    console.error("Auth status check error:", error);
    return NextResponse.json(
      {
        authenticated: false,
        error: "Authentication check failed",
      },
      { status: 500 }
    );
  }
}
