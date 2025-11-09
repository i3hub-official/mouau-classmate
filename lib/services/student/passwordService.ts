// lib/services/passwordService.ts
import {
  protectData,
  verifyPassword as verifyPasswordSecurity,
  validatePasswordStrength,
} from "@/lib/security/dataProtection";

export class PasswordService {
  /**
   * Verify password without importing the entire student registration service
   */
  static async verifyPasswordForAuth(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    // Use your existing security function directly
    return await verifyPasswordSecurity(plainPassword, hashedPassword);
  }

  /**
   * Change password with all validation
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
    getUserFn: (
      userId: string
    ) => Promise<{ passwordHash: string; email: string } | null>
  ): Promise<boolean> {
    // Validate new password matches confirmation
    if (newPassword !== confirmPassword) {
      throw new Error("New passwords do not match");
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(
        passwordValidation.errors[0] ||
          "Password does not meet security requirements"
      );
    }

    // Get user with password hash
    const user = await getUserFn(userId);
    if (!user || !user.passwordHash) {
      throw new Error("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await this.verifyPasswordForAuth(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const protectedPassword = await protectData(newPassword, "password");

    // You may want to save protectedPassword.encrypted to the database here

    return true;
  }
}
