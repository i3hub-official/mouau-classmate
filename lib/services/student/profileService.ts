// lib/services/profileService.ts
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  matricNumber?: string;
  department?: string;
  college?: string;
  course?: string;
  phone?: string;
  state?: string;
  lga?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  admissionYear?: number;
  dateEnrolled?: string;
}

export interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  assignmentReminders: boolean;
  gradeAlerts: boolean;
  lectureReminders: boolean;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  state?: string;
  lga?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
}

export class ProfileService {
  /**
   * Get user profile data
   */
  static async getProfile(): Promise<UserProfile | null> {
    try {
      const response = await fetch("/api/profile", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - Please sign in");
        }
        if (response.status === 404) {
          throw new Error("Profile API route not found");
        }
        throw new Error(`Failed to fetch profile: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(profileData: UpdateProfileData): Promise<boolean> {
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - Please sign in");
        }
        if (response.status === 404) {
          throw new Error("Profile update API route not found");
        }
        throw new Error(`Failed to update profile: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  static async changePassword(
    securitySettings: SecuritySettings
  ): Promise<boolean> {
    try {
      const response = await fetch("/api/profile/security/password", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: securitySettings.currentPassword,
          newPassword: securitySettings.newPassword,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - Please sign in");
        }
        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Invalid current password");
        }
        if (response.status === 404) {
          throw new Error("Password change API route not found");
        }
        throw new Error(`Failed to change password: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  }

  /**
   * Get notification settings
   */
  static async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const response = await fetch("/api/profile/notifications", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - Please sign in");
        }
        if (response.status === 404) {
          throw new Error("Notification settings API route not found");
        }
        throw new Error(
          `Failed to fetch notification settings: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      throw error;
    }
  }

  /**
   * Update notification settings
   */
  static async updateNotificationSettings(
    settings: NotificationSettings
  ): Promise<boolean> {
    try {
      const response = await fetch("/api/profile/notifications", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - Please sign in");
        }
        if (response.status === 404) {
          throw new Error("Notification settings update API route not found");
        }
        throw new Error(
          `Failed to update notification settings: ${response.statusText}`
        );
      }

      return true;
    } catch (error) {
      console.error("Error updating notification settings:", error);
      throw error;
    }
  }

  /**
   * Get user activity log
   */
  static async getActivityLog(limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(`/api/profile/activity?limit=${limit}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - Please sign in");
        }
        if (response.status === 404) {
          throw new Error("Activity log API route not found");
        }
        throw new Error(`Failed to fetch activity log: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching activity log:", error);
      throw error;
    }
  }

  /**
   * Upload profile picture
   */
  static async uploadProfilePicture(file: File): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append("profilePicture", file);

      const response = await fetch("/api/profile/picture", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - Please sign in");
        }
        if (response.status === 404) {
          throw new Error("Profile picture upload API route not found");
        }
        throw new Error(
          `Failed to upload profile picture: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      throw error;
    }
  }

  /**
   * Delete account
   */
  static async deleteAccount(confirmation: string): Promise<boolean> {
    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmation }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - Please sign in");
        }
        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Invalid confirmation");
        }
        if (response.status === 404) {
          throw new Error("Delete account API route not found");
        }
        throw new Error(`Failed to delete account: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<{
    totalLogins: number;
    lastLogin: string | null;
    accountAge: number;
    profileCompletion: number;
  }> {
    try {
      const response = await fetch("/api/profile/stats", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - Please sign in");
        }
        if (response.status === 404) {
          throw new Error("User stats API route not found");
        }
        throw new Error(`Failed to fetch user stats: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching user stats:", error);
      throw error;
    }
  }

  /**
   * Export user data
   */
  static async exportUserData(): Promise<any> {
    try {
      const response = await fetch("/api/profile/export", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - Please sign in");
        }
        if (response.status === 404) {
          throw new Error("Export data API route not found");
        }
        throw new Error(`Failed to export user data: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error exporting user data:", error);
      throw error;
    }
  }

  /**
   * Request account deletion
   */
  static async requestAccountDeletion(reason?: string): Promise<boolean> {
    try {
      const response = await fetch("/api/profile/deletion-request", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - Please sign in");
        }
        if (response.status === 404) {
          throw new Error("Account deletion API route not found");
        }
        throw new Error(
          `Failed to request account deletion: ${response.statusText}`
        );
      }

      return true;
    } catch (error) {
      console.error("Error requesting account deletion:", error);
      throw error;
    }
  }

  /**
   * Default notification settings
   */
  private static getDefaultNotificationSettings(): NotificationSettings {
    return {
      emailNotifications: true,
      pushNotifications: true,
      assignmentReminders: true,
      gradeAlerts: true,
      lectureReminders: true,
    };
  }
}
