// lib/services/userService.ts
export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  matricNumber?: string;
  department?: string;
  college?: string;
  course?: string;
  studentId?: string;
  teacherId?: string;
}

class UserService {
  private static instance: UserService;

  private constructor() {}

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Get current user from session
   */
  async getCurrentUser(): Promise<CurrentUser | null> {
    try {
      const response = await fetch("/api/user/me", {
        method: "GET",
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn("User not authenticated");
          return null;
        }
        throw new Error(`Failed to fetch user data: ${response.statusText}`);
      }

      const userData = await response.json();
      return this.transformUserData(userData);
    } catch (error) {
      console.error("Error fetching current user:", error);
      return null;
    }
  }

  /**
   * Check if current user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Check if current user has specific role
   */
  async hasRole(role: CurrentUser["role"]): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Get current student ID (if user is a student)
   */
  async getCurrentStudentId(): Promise<string | null> {
    const user = await this.getCurrentUser();
    return user?.studentId || null;
  }

  /**
   * Get current teacher ID (if user is a teacher)
   */
  async getCurrentTeacherId(): Promise<string | null> {
    const user = await this.getCurrentUser();
    return user?.teacherId || null;
  }

  /**
   * Transform API response to standardized format
   */
  private transformUserData(userData: any): CurrentUser {
    const baseUser: CurrentUser = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
    };

    // Add role-specific data
    if (userData.role === "STUDENT") {
      return {
        ...baseUser,
        matricNumber: userData.matricNumber,
        department: userData.department,
        college: userData.college,
        course: userData.course,
        studentId: userData.studentId,
      };
    } else if (userData.role === "TEACHER") {
      return {
        ...baseUser,
        matricNumber: userData.matricNumber,
        department: userData.department,
        course: userData.course || "Lecturer",
        teacherId: userData.teacherId,
      };
    }

    return baseUser;
  }
}

export const userService = UserService.getInstance();
