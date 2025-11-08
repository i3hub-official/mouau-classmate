// app/api/admin/email-test/send/route.ts - FIXED
import { NextRequest, NextResponse } from "next/server";
import { emailService } from "@/lib/services/students/emailService";

export async function POST(request: NextRequest) {
  try {
    const { testEmail } = await request.json();

    if (!testEmail) {
      return NextResponse.json(
        {
          success: false,
          connectionVerified: false,
          error: "Test email address is required",
        },
        { status: 400 }
      );
    }

    console.log("🔄 Testing email sending to:", testEmail);

    // First verify connection
    const connectionVerified = await emailService.verifyConnection();

    if (!connectionVerified) {
      return NextResponse.json(
        {
          success: false,
          connectionVerified: false,
          error:
            "Cannot send email - SMTP connection failed. Check your configuration.",
          connectionStatus: emailService.getConnectionStatus(),
        },
        { status: 500 }
      );
    }

    // Now try to send the test email
    const testResult = await emailService.sendEmail({
      to: testEmail,
      subject: "Test Email from MOUAU ClassMate",
      template: "email-verification",
      context: {
        name: "Test User",
        verificationLink:
          "https://mouaucm.vercel.app/auth/verify?token=test-token-123",
      },
    });

    if (testResult) {
      return NextResponse.json({
        success: true,
        connectionVerified: true,
        message: "Test email sent successfully",
        testEmail,
        connectionStatus: emailService.getConnectionStatus(),
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          connectionVerified: false,
          error: "Email service failed to send test email",
          connectionStatus: emailService.getConnectionStatus(),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Send test email error:", error);

    return NextResponse.json(
      {
        success: false,
        connectionVerified: false,
        error:
          error instanceof Error ? error.message : "Failed to send test email",
        connectionStatus: emailService.getConnectionStatus(),
        details:
          process.env.NODE_ENV === "development"
            ? { stack: error instanceof Error ? error.stack : "No stack trace" }
            : undefined,
      },
      { status: 500 }
    );
  }
}
