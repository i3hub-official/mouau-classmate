// app/api/admin/email-test/connection/route.ts - FIXED
import { NextRequest, NextResponse } from "next/server";
import { emailService } from "@/lib/services/students/emailService";

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Starting connection test...");

    // Test the actual connection
    const connectionVerified = await emailService.verifyConnection();
    const connectionStatus = emailService.getConnectionStatus();

    console.log("📊 Connection test result:", {
      verified: connectionVerified,
      status: connectionStatus,
    });

    if (connectionVerified) {
      return NextResponse.json({
        success: true,
        connectionVerified: true,
        connectionStatus,
        message: "Email connection verified successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          connectionVerified: false,
          connectionStatus,
          error:
            "Email connection verification failed - check SMTP configuration",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Connection test error:", error);

    const connectionStatus = emailService.getConnectionStatus();

    return NextResponse.json(
      {
        success: false,
        connectionVerified: false,
        connectionStatus,
        error:
          error instanceof Error ? error.message : "Connection test failed",
        details:
          process.env.NODE_ENV === "development"
            ? { stack: error instanceof Error ? error.stack : "No stack trace" }
            : undefined,
      },
      { status: 500 }
    );
  }
}
