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
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get("session-token")?.value;

      if (!sessionToken) {
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

      if (!session || session.expires < new Date()) {
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

      return userData;
    } catch (error) {
      console.error("Error fetching user from session:", error);
      return null;
    }
  }

  /**
   * Verify user has access to student data (Server-side only)
   */
  static async verifyStudentAccess(studentId: string): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUserFromSession();

      if (!currentUser) {
        return false;
      }

      // If user is a student, they can only access their own data
      if (currentUser.role === "STUDENT") {
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          select: { userId: true },
        });

        return student?.userId === currentUser.id;
      }

      // Teachers and admins can access student data
      return true;
    } catch (error) {
      console.error("Error verifying student access:", error);
      return false;
    }
  }

  /**
   * Get student ID for current user (Server-side only)
   */
  static async getCurrentStudentId(): Promise<string | null> {
    try {
      const currentUser = await this.getCurrentUserFromSession();

      if (!currentUser || currentUser.role !== "STUDENT") {
        return null;
      }

      const student = await prisma.student.findFirst({
        where: { userId: currentUser.id },
        select: { id: true },
      });

      return student?.id || null;
    } catch (error) {
      console.error("Error getting current student ID:", error);
      return null;
    }
  }
}
