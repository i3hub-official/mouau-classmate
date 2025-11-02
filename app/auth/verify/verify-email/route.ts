// app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { StudentRegistrationService } from '@/lib/services/studentRegistrationService';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string' || token.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: {
            code: 'MISSING_TOKEN',
            message: 'Verification token is required'
          }
        },
        { status: 400 }
      );
    }

    const result = await StudentRegistrationService.verifyEmail(token);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now sign in.',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name
      }
    });
  } catch (error: any) {
    console.error('Email verification error:', error);

    if (error.name === 'ValidationError' || error.name === 'StudentRegistrationError') {
      return NextResponse.json(
        { 
          success: false, 
          error: {
            code: error.code || 'VERIFICATION_FAILED',
            message: error.message
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: {
          code: 'SERVER_ERROR',
          message: 'Email verification failed. Please try again.'
        }
      },
      { status: 500 }
    );
  }
}