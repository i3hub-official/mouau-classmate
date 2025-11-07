// lib/services/userService.server.ts
import { prisma } from "@/lib/server/prisma";
import { cookies } from "next/headers";

export interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: string;
  matricNumber?: string;
  department?: string;
  college?: string;
  course?: string;
}

export class UserServiceServer {
  /**
   * Get current user data from session (Server-side only)
   */
  static async getCurrentUserFromSession(): Promise<UserData | null> {
    try {
      // FIX: await the cookies() function
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get("session-token")?.value;

      if (!sessionToken) {
        console.log("❌ No session token found");
        return null;
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

      if (!session) {
        console.log("❌ Session not found");
        return null;
      }

      if (session.expires < new Date()) {
        console.log("❌ Session expired");
        return null;
      }

      const user = session.user;

      let userData: UserData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
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
      } else if (user.role === "TEACHER" && user.teacher) {
        userData = {
          ...userData,
          matricNumber: user.teacher.employeeId,
          department: user.teacher.department,
          course: "Lecturer",
        };
      }

      // console.log("✅ User data retrieved successfully");
      return userData;
    } catch (error) {
      console.error("Error fetching user from session:", error);
      return null;
    }
  }

  /**
   * Enhanced verifyStudentAccess that handles both studentId and userId
   */
  static async verifyStudentAccess(requestedId: string): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUserFromSession();

      console.log("🔍 verifyStudentAccess - Current User:", {
        userId: currentUser?.id,
        role: currentUser?.role,
        requestedId: requestedId,
      });

      if (!currentUser) {
        console.log("❌ No current user found");
        return false;
      }

      // If user is a student, they can only access their own data
      if (currentUser.role === "STUDENT") {
        // Get the student record for the current user
        const student = await prisma.student.findFirst({
          where: {
            userId: currentUser.id,
          },
          select: {
            id: true,
            userId: true,
          },
        });

        console.log("🔍 Student record found for current user:", {
          studentId: student?.id,
          studentUserId: student?.userId,
          currentUserId: currentUser.id,
          requestedId: requestedId,
          isUserIdMatch: requestedId === currentUser.id,
          isStudentIdMatch: student?.id === requestedId,
        });

        // Check if the requested ID matches either:
        // 1. The current student's ID, OR
        // 2. The current user's ID (common mistake from frontend)
        return student?.id === requestedId || currentUser.id === requestedId;
      }

      // Teachers and admins can access student data
      console.log("✅ User is teacher/admin, granting access");
      return true;
    } catch (error) {
      console.error("Error verifying student access:", error);
      return false;
    }
  }

  /**
   * Get the correct student ID for API calls
   */
  static async getCorrectStudentId(
    requestedId?: string
  ): Promise<string | null> {
    try {
      const currentUser = await this.getCurrentUserFromSession();

      if (!currentUser) {
        return null;
      }

      // If user is a student, get their actual student ID
      if (currentUser.role === "STUDENT") {
        const student = await prisma.student.findFirst({
          where: { userId: currentUser.id },
          select: { id: true },
        });

        return student?.id || null;
      }

      // For teachers/admins, use the requested ID if provided
      return requestedId || null;
    } catch (error) {
      console.error("Error getting correct student ID:", error);
      return null;
    }
  }

  /**
   * Get current student data (Server-side only)
   */
  static async getCurrentStudent() {
    try {
      const currentUser = await this.getCurrentUserFromSession();

      if (!currentUser || currentUser.role !== "STUDENT") {
        return null;
      }

      const student = await prisma.student.findFirst({
        where: { userId: currentUser.id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return student;
    } catch (error) {
      console.error("Error getting current student:", error);
      return null;
    }
  }
}
