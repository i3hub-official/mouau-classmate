// lib/services/userService.ts
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

export class UserService {
  /**
   * Get current user data (Client-side)
   */
  static async getCurrentUser(): Promise<UserData | null> {
    try {
      const response = await fetch("/api/user/me", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
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
      return userData;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  }

  /**
   * Get simplified user data for header display (Client-side)
   */
  static async getHeaderUserData(): Promise<{
    name?: string;
    matricNumber?: string;
    department?: string;
    email?: string;
  } | null> {
    try {
      const userData = await this.getCurrentUser();

      if (!userData) {
        return null;
      }

      return {
        name: userData.name || undefined,
        matricNumber: userData.matricNumber,
        department: userData.department,
        email: userData.email,
      };
    } catch (error) {
      console.error("Error fetching header user data:", error);
      return null;
    }
  }

  /**
   * Check if user is authenticated (Client-side)
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const userData = await this.getCurrentUser();
      return userData !== null;
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
  }

  /**
   * Get user role (Client-side)
   */
  static async getUserRole(): Promise<string | null> {
    try {
      const userData = await this.getCurrentUser();
      return userData?.role || null;
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  }
}

export const {
  getCurrentUser,
  getHeaderUserData,
  isAuthenticated,
  getUserRole,
} = UserService;
