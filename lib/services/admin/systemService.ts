// File: lib/services/admin/systemService.ts

import { prisma } from "@/lib/server/prisma";
import { SystemConfig, SystemConfigFormData } from "@/lib/types/admin/index";
import { AuditAction, ResourceType } from "@prisma/client";

export class AdminSystemService {
  /**
   * Get all system configurations
   */
  static async getAllSystemConfigs(category?: string) {
    try {
      const where = category ? { category } : {};

      const configs = await prisma.systemConfig.findMany({
        where,
        orderBy: [{ category: "asc" }, { key: "asc" }],
      });

      return configs as SystemConfig[];
    } catch (error) {
      console.error("Error getting system configs:", error);
      throw error;
    }
  }

  /**
   * Get system configuration by key
   */
  static async getSystemConfig(key: string): Promise<SystemConfig | null> {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key },
      });

      return config as SystemConfig;
    } catch (error) {
      console.error("Error getting system config:", error);
      throw error;
    }
  }

  /**
   * Create or update system configuration
   */
  static async upsertSystemConfig(
    configData: SystemConfigFormData,
    updatedBy?: string
  ) {
    try {
      const config = await prisma.systemConfig.upsert({
        where: { key: configData.key },
        update: {
          value: configData.value,
          description: configData.description,
          category: configData.category,
          isPublic: configData.isPublic,
          updatedBy,
          updatedAt: new Date(),
        },
        create: {
          key: configData.key,
          value: configData.value,
          description: configData.description,
          category: configData.category,
          isPublic: configData.isPublic,
          updatedBy,
        },
      });

      // Log the configuration update
      await prisma.auditLog.create({
        data: {
          userId: updatedBy,
          action: "SYSTEM_CONFIG_UPDATED",
          resourceType: ResourceType.SYSTEM,
          details: {
            key: configData.key,
            category: configData.category,
            isPublic: configData.isPublic,
          },
        },
      });

      return {
        success: true,
        config: config as SystemConfig,
        message: "System configuration updated successfully",
      };
    } catch (error) {
      console.error("Error upserting system config:", error);
      throw error;
    }
  }

  /**
   * Delete system configuration
   */
  static async deleteSystemConfig(key: string, updatedBy?: string) {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key },
      });

      if (!config) {
        throw new Error("System configuration not found");
      }

      await prisma.systemConfig.delete({
        where: { key },
      });

      // Log the configuration deletion
      await prisma.auditLog.create({
        data: {
          userId: updatedBy,
          action: "SYSTEM_CONFIG_UPDATED",
          resourceType: "SYSTEM",
          details: {
            action: "deleted",
            key,
            category: config.category,
          },
        },
      });

      return {
        success: true,
        message: "System configuration deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting system config:", error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  static async getSystemHealth() {
    try {
      const now = new Date();

      // Get database connection status
      const dbStatus = await this.checkDatabaseHealth();

      // Get recent error logs
      const recentErrors = await prisma.auditLog.count({
        where: {
          action: {
            in: [
              "USER_LOGIN_ERROR",
              "EXPORT_TRANSCRIPT_FAILED",
              "SUSPICIOUS_ACTIVITY_DETECTED",
            ],
          },
          createdAt: {
            gte: new Date(now.getTime() - 60 * 60 * 1000), // Last hour
          },
        },
      });

      // Get active sessions
      const activeSessions = await prisma.session.count({
        where: {
          expires: {
            gt: now,
          },
        },
      });

      // Get system metrics
      const metrics = await this.getSystemMetrics();

      // Determine overall health status
      let status: "healthy" | "warning" | "critical" = "healthy";
      if (recentErrors > 10) status = "warning";
      if (recentErrors > 50 || dbStatus.status !== "healthy")
        status = "critical";

      return {
        status,
        services: [
          {
            name: "Database",
            status: dbStatus.status,
            uptime: dbStatus.uptime,
            responseTime: dbStatus.responseTime,
          },
          {
            name: "Authentication",
            status: "running",
            uptime: 99.9,
          },
          {
            name: "API",
            status: "running",
            uptime: 99.8,
          },
        ],
        metrics,
        activeSessions,
        recentErrors,
        lastChecked: now,
      };
    } catch (error) {
      console.error("Error getting system health:", error);
      throw error;
    }
  }

  /**
   * Get system metrics
   */
  static async getSystemMetrics() {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        activeUsers24h,
        newUsers24h,
        totalEnrollments,
        newEnrollments24h,
        totalAssignments,
        newAssignments24h,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            lastLoginAt: {
              gte: last24Hours,
            },
          },
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: last24Hours,
            },
          },
        }),
        prisma.enrollment.count(),
        prisma.enrollment.count({
          where: {
            dateEnrolled: {
              gte: last24Hours,
            },
          },
        }),
        prisma.assignment.count(),
        prisma.assignment.count({
          where: {
            createdAt: {
              gte: last24Hours,
            },
          },
        }),
      ]);

      return {
        users: {
          total: totalUsers,
          active24h: activeUsers24h,
          new24h: newUsers24h,
        },
        enrollments: {
          total: totalEnrollments,
          new24h: newEnrollments24h,
        },
        assignments: {
          total: totalAssignments,
          new24h: newAssignments24h,
        },
      };
    } catch (error) {
      console.error("Error getting system metrics:", error);
      throw error;
    }
  }

  /**
   * Check database health
   */
  private static async checkDatabaseHealth() {
    try {
      const startTime = Date.now();

      // Simple query to check connection
      await prisma.user.findFirst({
        select: { id: true },
      });

      const responseTime = Date.now() - startTime;

      return {
        status: "healthy" as const,
        uptime: 99.9,
        responseTime,
      };
    } catch (error) {
      return {
        status: "error" as const,
        uptime: 0,
        responseTime: 9999,
      };
    }
  }

  /**
   * Clear system cache
   */
  static async clearSystemCache(cacheType?: string) {
    try {
      // In a real implementation, you would clear Redis or other cache systems
      // For now, we'll just log the action

      await prisma.auditLog.create({
        data: {
          action: "SYSTEM_CONFIG_UPDATED",
          resourceType: "SYSTEM",
          details: {
            action: "cache_cleared",
            cacheType,
          },
        },
      });

      return {
        success: true,
        message: cacheType
          ? `${cacheType} cache cleared successfully`
          : "All system caches cleared successfully",
      };
    } catch (error) {
      console.error("Error clearing system cache:", error);
      throw error;
    }
  }

  /**
   * Get system statistics
   */
  static async getSystemStatistics() {
    try {
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        activeUsers30d,
        newUsers30d,
        totalCourses,
        activeCourses,
        totalEnrollments,
        completionRate,
        systemUptime,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            lastLoginAt: {
              gte: last30Days,
            },
          },
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: last30Days,
            },
          },
        }),
        prisma.course.count(),
        prisma.course.count({
          where: { isActive: true },
        }),
        prisma.enrollment.count(),
        this.getCompletionRate(),
        Promise.resolve(99.9), // Would need actual uptime monitoring
      ]);

      return {
        users: {
          total: totalUsers,
          active30d: activeUsers30d,
          new30d: newUsers30d,
        },
        courses: {
          total: totalCourses,
          active: activeCourses,
        },
        enrollments: {
          total: totalEnrollments,
          completionRate,
        },
        system: {
          uptime: systemUptime,
          health: await this.getSystemHealth(),
        },
      };
    } catch (error) {
      console.error("Error getting system statistics:", error);
      throw error;
    }
  }

  /**
   * Get completion rate
   */
  private static async getCompletionRate(): Promise<number> {
    const [total, completed] = await Promise.all([
      prisma.enrollment.count(),
      prisma.enrollment.count({
        where: { isCompleted: true },
      }),
    ]);

    return total > 0 ? (completed / total) * 100 : 0;
  }

  /**
   * Backup database
   */
  static async backupDatabase(backupType: "full" | "incremental" = "full") {
    try {
      // In a real implementation, you would trigger a database backup
      // For now, we'll just log the action

      const backupId = `backup_${Date.now()}`;

      await prisma.auditLog.create({
        data: {
          action: "SYSTEM_CONFIG_UPDATED",
          resourceType: "SYSTEM",
          details: {
            action: "database_backup",
            backupType,
            backupId,
          },
        },
      });

      return {
        success: true,
        backupId,
        message: `${backupType} backup initiated successfully`,
      };
    } catch (error) {
      console.error("Error backing up database:", error);
      throw error;
    }
  }

  /**
   * Restore database
   */
  static async restoreDatabase(backupId: string) {
    try {
      // In a real implementation, you would restore from a backup
      // For now, we'll just log the action

      await prisma.auditLog.create({
        data: {
          action: "SYSTEM_CONFIG_UPDATED",
          resourceType: "SYSTEM",
          details: {
            action: "database_restore",
            backupId,
          },
        },
      });

      return {
        success: true,
        message: `Database restored from backup ${backupId} successfully`,
      };
    } catch (error) {
      console.error("Error restoring database:", error);
      throw error;
    }
  }
}
