// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { DashboardService } from "@/lib/services/students/dashboardService";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get user ID from session
    const sessionToken = request.cookies.get("session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Find session and user
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: true,
      },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // Get dashboard data
    const dashboardData = await DashboardService.getStudentDashboard(
      session.userId
    );

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
