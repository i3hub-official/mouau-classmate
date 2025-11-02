// app/api/admin/email-test/reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const resetSuccess = await emailService.resetConnection();
    const connectionStatus = emailService.getConnectionStatus();

    if (resetSuccess) {
      return NextResponse.json({
        success: true,
        message: 'Email connection reset successfully',
        connectionStatus
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to reset email connection',
          connectionStatus
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Reset connection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset connection',
        connectionStatus: emailService.getConnectionStatus()
      },
      { status: 500 }
    );
  }
}