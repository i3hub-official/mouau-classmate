// app/api/user/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { cookies } from "next/headers";

// Time-based greetings
const timeBasedGreetings = {
  night: [
    "Burning midnight oil, {surname}?",
    "Late night studying session, {surname}?",
    "Night owl mode activated, {surname}!",
    "Pushing through night, {surname}!",
    "Dedication knows no time, {surname}!",
    "The quiet hours are perfect for focus, {surname}!",
  ],
  morning: [
    "Rise and shine, {surname}! Ready to conquer today?",
    "Good morning, {surname}! Let's make today count!",
    "Early bird catches knowledge, {surname}!",
    "Morning motivation, {surname}! Time to excel!",
    "Fresh start to a productive day, {surname}!",
    "Hello {surname}! Ready to learn something new?",
  ],
  afternoon: [
    "Good afternoon, {surname}! Keeping up the great work!",
    "Afternoon focus session, {surname}!",
    "Halfway through the day, {surname}! Stay strong!",
    "Afternoon productivity boost, {surname}!",
    "Hello {surname}! How's your academic day going?",
    "Afternoon vibes, {surname}! Time to tackle those assignments!",
  ],
  evening: [
    "Good evening, {surname}! Time to review today's progress!",
    "Evening study session, {surname}?",
    "Winding down with some learning, {surname}?",
    "Evening reflections, {surname}! What did you achieve today?",
    "Hello {surname}! Ready for some evening studying?",
    "Evening dedication, {surname}! Almost there!",
  ],
};

// Helper function to determine time period
const getTimePeriod = (): keyof typeof timeBasedGreetings => {
  const now = new Date();
  const hours = now.getHours();

  if (hours >= 0 && hours < 6) {
    return "night";
  } else if (hours >= 6 && hours < 12) {
    return "morning";
  } else if (hours >= 12 && hours < 18) {
    return "afternoon";
  } else {
    return "evening";
  }
};

// Helper function to get next change time
const getNextChangeTime = (): Date => {
  const now = new Date();
  const hours = now.getHours();

  if (hours >= 0 && hours < 6) {
    // Next change at 6am
    const nextChange = new Date(now);
    nextChange.setHours(6, 0, 0, 0);
    if (nextChange <= now) {
      nextChange.setDate(nextChange.getDate() + 1);
    }
    return nextChange;
  } else if (hours >= 6 && hours < 12) {
    // Next change at 12pm
    const nextChange = new Date(now);
    nextChange.setHours(12, 0, 0, 0);
    return nextChange;
  } else if (hours >= 12 && hours < 18) {
    // Next change at 6pm
    const nextChange = new Date(now);
    nextChange.setHours(18, 0, 0, 0);
    return nextChange;
  } else {
    // Next change at 12am (midnight)
    const nextChange = new Date(now);
    nextChange.setHours(24, 0, 0, 0);
    return nextChange;
  }
};

// Helper function to generate a new greeting
const generateNewGreeting = (): { greeting: string; nextChange: Date } => {
  const timePeriod = getTimePeriod();
  const greetings = timeBasedGreetings[timePeriod];
  const randomIndex = Math.floor(Math.random() * greetings.length);
  const newGreeting = greetings[randomIndex];
  const nextChange = getNextChangeTime();

  console.log(
    `[GREETING] Generated new ${timePeriod} greeting: "${newGreeting}" | Next change: ${nextChange.toISOString()}`
  );

  return {
    greeting: newGreeting,
    nextChange: nextChange,
  };
};

// Check if greeting fields exist in the database
const checkGreetingFieldsExist = async (): Promise<boolean> => {
  try {
    // Try to query with greeting fields to see if they exist
    await prisma.user.findFirst({
      select: {
        greeting: true,
        greetingNextChange: true,
      },
      where: {
        id: "non-existent-id-just-for-schema-check",
      },
    });
    return true;
  } catch (error) {
    console.log(
      `[USER_ME] Greeting fields check: Fields don't exist in schema`
    );
    return false;
  }
};

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log(`[USER_ME] GET request started at ${new Date().toISOString()}`);

  try {
    // Get session token from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session-token")?.value;

    console.log(`[USER_ME] Session token found: ${!!sessionToken}`);

    if (!sessionToken) {
      console.log(`[USER_ME] Authentication failed: No session token`);
      return NextResponse.json(
        { error: "Not authenticated", code: "NO_SESSION" },
        { status: 401 }
      );
    }

    // Find session and user
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: {
          include: {
            student: true,
            teacher: true,
          },
        },
      },
    });

    console.log(`[USER_ME] Session found: ${!!session}`);

    if (!session) {
      console.log(`[USER_ME] Authentication failed: Session not found`);
      return NextResponse.json(
        { error: "Session not found", code: "SESSION_NOT_FOUND" },
        { status: 401 }
      );
    }

    if (session.expires < new Date()) {
      console.log(
        `[USER_ME] Authentication failed: Session expired at ${session.expires.toISOString()}`
      );
      return NextResponse.json(
        { error: "Session expired", code: "SESSION_EXPIRED" },
        { status: 401 }
      );
    }

    const user = session.user;
    const now = new Date();
    console.log(
      `[USER_ME] User authenticated: ${user.email} (${user.id}) | Role: ${user.role}`
    );

    // Check if greeting fields exist in the database
    const greetingFieldsExist = await checkGreetingFieldsExist();

    // Initialize greeting data
    let greetingData = {
      greeting: greetingFieldsExist ? user.greeting : null,
      greetingNextChange: greetingFieldsExist ? user.greetingNextChange : null,
    };

    console.log(
      `[USER_ME] Current greeting: ${
        greetingData.greeting || "None"
      } | Next change: ${
        greetingData.greetingNextChange?.toISOString() || "None"
      }`
    );

    // Generate new greeting if needed and fields exist
    if (
      greetingFieldsExist &&
      (!user.greeting ||
        !user.greetingNextChange ||
        new Date(user.greetingNextChange) <= now)
    ) {
      console.log(`[USER_ME] Generating new greeting for user ${user.id}`);

      // Generate new greeting
      const newGreetingData = generateNewGreeting();

      try {
        // Update user with new greeting
        await prisma.user.update({
          where: { id: user.id },
          data: {
            greeting: newGreetingData.greeting,
            greetingNextChange: newGreetingData.nextChange,
          },
        });

        greetingData = {
          greeting: newGreetingData.greeting,
          greetingNextChange: newGreetingData.nextChange,
        };

        console.log(
          `[USER_ME] Updated greeting for user ${user.id}: "${newGreetingData.greeting}"`
        );
      } catch (error) {
        console.error(`[USER_ME] Failed to update greeting:`, error);
        // Fall back to generating a new greeting without persisting
        const tempGreeting = generateNewGreeting();
        greetingData = {
          greeting: tempGreeting.greeting,
          greetingNextChange: tempGreeting.nextChange,
        };
      }
    } else if (!greetingFieldsExist) {
      console.log(
        `[USER_ME] Greeting fields don't exist, generating temporary greeting`
      );
      // Generate a temporary greeting without persisting
      const tempGreeting = generateNewGreeting();
      greetingData = {
        greeting: tempGreeting.greeting,
        greetingNextChange: tempGreeting.nextChange,
      };
    } else {
      console.log(`[USER_ME] Using existing greeting for user ${user.id}`);
    }

    type UserData = {
      id: string;
      email: string;
      name: string | null;
      role: string;
      matricNumber?: string;
      department?: string;
      college?: string;
      course?: string;
      greeting?: string;
      greetingNextChange?: string;
    };

    let userData: UserData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      greeting: greetingData.greeting || undefined,
      greetingNextChange: greetingData.greetingNextChange?.toISOString(),
    };

    // Add role-specific data
    if (user.role === "STUDENT" && user.student) {
      userData = {
        ...userData,
        matricNumber: user.student.matricNumber,
        department: user.student.department,
        college: user.student.college,
        course: user.student.course,
      };
      console.log(
        `[USER_ME] Added student data for ${user.email}: Matric ${user.student.matricNumber}`
      );
    } else if (user.role === "TEACHER" && user.teacher) {
      userData = {
        ...userData,
        matricNumber: user.teacher.employeeId,
        department: user.teacher.department,
        course: "Lecturer",
      };
      console.log(
        `[USER_ME] Added teacher data for ${user.email}: Employee ID ${user.teacher.employeeId}`
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[USER_ME] Successfully returned user data for ${user.email} in ${duration}ms`
    );

    return NextResponse.json(userData);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[USER_ME] Error fetching user data after ${duration}ms:`,
      error
    );

    // Return proper JSON error response
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST handler to update greeting
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`[USER_ME] POST request started at ${new Date().toISOString()}`);

  try {
    // Get session token from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session-token")?.value;

    console.log(`[USER_ME] Session token found: ${!!sessionToken}`);

    if (!sessionToken) {
      console.log(`[USER_ME] Authentication failed: No session token`);
      return NextResponse.json(
        { error: "Not authenticated", code: "NO_SESSION" },
        { status: 401 }
      );
    }

    // Find session and user
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: true,
      },
    });

    console.log(`[USER_ME] Session found: ${!!session}`);

    if (!session) {
      console.log(`[USER_ME] Authentication failed: Session not found`);
      return NextResponse.json(
        { error: "Session not found", code: "SESSION_NOT_FOUND" },
        { status: 401 }
      );
    }

    if (session.expires < new Date()) {
      console.log(
        `[USER_ME] Authentication failed: Session expired at ${session.expires.toISOString()}`
      );
      return NextResponse.json(
        { error: "Session expired", code: "SESSION_EXPIRED" },
        { status: 401 }
      );
    }

    // Check if greeting fields exist in the database
    const greetingFieldsExist = await checkGreetingFieldsExist();

    if (!greetingFieldsExist) {
      console.log(`[USER_ME] Greeting fields don't exist, cannot update`);
      return NextResponse.json(
        {
          error: "Greeting fields not available in database",
          code: "FIELDS_NOT_AVAILABLE",
        },
        { status: 400 }
      );
    }

    const { greeting, nextChange } = await request.json();
    console.log(
      `[USER_ME] Updating greeting for user ${session.user.id}: "${greeting}" | Next change: ${nextChange}`
    );

    // Update user's greeting in database
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        greeting: greeting,
        greetingNextChange: nextChange ? new Date(nextChange) : null,
      },
    });

    const duration = Date.now() - startTime;
    console.log(
      `[USER_ME] Successfully updated greeting for user ${session.user.email} in ${duration}ms`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[USER_ME] Error updating greeting after ${duration}ms:`,
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
