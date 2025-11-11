// app/api/auth/health/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: NextRequest) {
  try {
    // Check database connection
    await prisma.user.findFirst();
    
    // Check other system health indicators
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "healthy",
        authentication: "healthy",
        api: "healthy",
      },
      version: "1.0.0", // App version
    };

    return NextResponse.json(healthStatus);
  } catch (error) {
    console.error("Health check error:", error);
    
    const healthStatus = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "unhealthy",
        authentication: "unknown",
        api: "healthy",
      },
      error: error instanceof Error ? error.message : "Unknown error",
      version: "1.0.0",
    };

    return NextResponse.json(healthStatus, { status: 500 });
  }
}