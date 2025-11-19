// File: lib/services/a/auditService.ts

import { prisma } from "@/lib/server/prisma";
import {
  AuditLog,
  AuditLogWithUser,
  AuditLogFilters,
  AuditLogStats,
} from "@/lib/types/a/index";
import {
  AuditAction,
  ResourceType,
  SessionSecurityLevel,
} from "@prisma/client";

export class AdminAuditService {
  /**
   * Get audit logs with pagination
   */
  static async getAuditLogs(
    page: number = 1,
    limit: number = 10,
    filters?: AuditLogFilters
  ) {
    try {
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (filters?.userId) where.userId = filters.userId;
      if (filters?.action) where.action = filters.action;
      if (filters?.resourceType) where.resourceType = filters.resourceType;
      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }
      if (filters?.ipAddress) where.ipAddress = filters.ipAddress;
      if (filters?.securityLevel) where.securityLevel = filters.securityLevel;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.auditLog.count({ where }),
      ]);

      // Decrypt user emails
      const decryptedLogs = await Promise.all(
        logs.map(async (log) => ({
          ...log,
          user: log.user
            ? {
                ...log.user,
                email:
                  await require("@/lib/security/dataProtection").unprotectData(
                    log.user.email,
                    "email"
                  ),
              }
            : null,
        }))
      );

      return {
        logs: decryptedLogs as AuditLogWithUser[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting audit logs:", error);
      throw error;
    }
  }

  /**
   * Get audit log by ID
   */
  static async getAuditLogById(id: string): Promise<AuditLogWithUser | null> {
    try {
      const log = await prisma.auditLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!log) return null;

      // Decrypt user email
      const decryptedLog = {
        ...log,
        user: log.user
          ? {
              ...log.user,
              email:
                await require("@/lib/security/dataProtection").unprotectData(
                  log.user.email,
                  "email"
                ),
            }
          : null,
      };

      return decryptedLog as AuditLogWithUser;
    } catch (error) {
      console.error("Error getting audit log by ID:", error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserAuditLogs(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: { userId },
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.auditLog.count({ where: { userId } }),
      ]);

      // Decrypt user emails
      const decryptedLogs = await Promise.all(
        logs.map(async (log) => ({
          ...log,
          user: log.user
            ? {
                ...log.user,
                email:
                  await require("@/lib/security/dataProtection").unprotectData(
                    log.user.email,
                    "email"
                  ),
              }
            : null,
        }))
      );

      return {
        logs: decryptedLogs as AuditLogWithUser[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting user audit logs:", error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific resource
   */
  static async getResourceAuditLogs(
    resourceType: ResourceType,
    resourceId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: {
            resourceType,
            resourceId,
          },
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.auditLog.count({
          where: {
            resourceType,
            resourceId,
          },
        }),
      ]);

      // Decrypt user emails
      const decryptedLogs = await Promise.all(
        logs.map(async (log) => ({
          ...log,
          user: log.user
            ? {
                ...log.user,
                email:
                  await require("@/lib/security/dataProtection").unprotectData(
                    log.user.email,
                    "email"
                  ),
              }
            : null,
        }))
      );

      return {
        logs: decryptedLogs as AuditLogWithUser[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting resource audit logs:", error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditLogStats> {
    try {
      // Build date filter
      const dateFilter = {};
      if (startDate || endDate) {
        (dateFilter as any).createdAt = {};
        if (startDate) (dateFilter as any).createdAt.gte = startDate;
        if (endDate) (dateFilter as any).createdAt.lte = endDate;
      }

      // Get total logs
      const totalLogs = await prisma.auditLog.count({
        where: dateFilter,
      });

      // Get logs by action
      const logsByAction = await prisma.auditLog.groupBy({
        by: ["action"],
        where: dateFilter,
        _count: {
          action: true,
        },
      });

      const byAction = logsByAction.reduce((acc, item) => {
        acc[item.action] = item._count.action;
        return acc;
      }, {} as Record<string, number>);

      // Get logs by resource type
      const logsByResourceType = await prisma.auditLog.groupBy({
        by: ["resourceType"],
        where: dateFilter,
        _count: {
          resourceType: true,
        },
      });

      const byResourceType = logsByResourceType.reduce((acc, item) => {
        acc[item.resourceType || "unknown"] = item._count.resourceType;
        return acc;
      }, {} as Record<string, number>);

      // Get logs by security level
      const logsBySecurityLevel = await prisma.auditLog.groupBy({
        by: ["securityLevel"],
        where: dateFilter,
        _count: {
          securityLevel: true,
        },
      });

      const bySecurityLevel = logsBySecurityLevel.reduce((acc, item) => {
        acc[item.securityLevel || "unknown"] = item._count.securityLevel;
        return acc;
      }, {} as Record<string, number>);

      // Get recent high severity logs
      const recentHighSeverity = await prisma.auditLog.count({
        where: {
          ...dateFilter,
          securityLevel: "HIGH",
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      // Get suspicious activities
      const suspiciousActivities = await prisma.auditLog.count({
        where: {
          ...dateFilter,
          action: {
            in: [
              "USER_LOGIN_FAILED",
              "SUSPICIOUS_ACTIVITY_DETECTED",
              "RATE_LIMIT_EXCEEDED",
              "DEVICE_FINGERPRINT_MISMATCH",
            ],
          },
        },
      });

      return {
        totalLogs,
        byAction,
        byResourceType,
        bySecurityLevel,
        recentHighSeverity,
        suspiciousActivities,
      };
    } catch (error) {
      console.error("Error getting audit statistics:", error);
      throw error;
    }
  }

  /**
   * Create audit log entry
   */
  static async createAuditLog(data: {
    userId?: string;
    action: AuditAction;
    resourceType?: ResourceType;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    securityLevel?: SessionSecurityLevel;
  }) {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          ...data,
          createdAt: new Date(),
        },
      });

      return auditLog;
    } catch (error) {
      console.error("Error creating audit log:", error);
      throw error;
    }
  }

  /**
   * Search audit logs
   */
  static async searchAuditLogs(
    query: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: {
            OR: [
              { details: { path: [], string_contains: query } },
              { ipAddress: { contains: query, mode: "insensitive" } },
              { userAgent: { contains: query, mode: "insensitive" } },
            ],
          },
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.auditLog.count({
          where: {
            OR: [
              { details: { path: [], string_contains: query } },
              { ipAddress: { contains: query, mode: "insensitive" } },
              { userAgent: { contains: query, mode: "insensitive" } },
            ],
          },
        }),
      ]);

      // Decrypt user emails
      const decryptedLogs = await Promise.all(
        logs.map(async (log) => ({
          ...log,
          user: log.user
            ? {
                ...log.user,
                email:
                  await require("@/lib/security/dataProtection").unprotectData(
                    log.user.email,
                    "email"
                  ),
              }
            : null,
        }))
      );

      return {
        logs: decryptedLogs as AuditLogWithUser[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error searching audit logs:", error);
      throw error;
    }
  }

  /**
   * Export audit logs
   */
  static async exportAuditLogs(
    filters?: AuditLogFilters,
    format: "csv" | "excel" | "json" = "csv"
  ) {
    try {
      // Build where clause
      const where: any = {};
      if (filters?.userId) where.userId = filters.userId;
      if (filters?.action) where.action = filters.action;
      if (filters?.resourceType) where.resourceType = filters.resourceType;
      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }
      if (filters?.ipAddress) where.ipAddress = filters.ipAddress;
      if (filters?.securityLevel) where.securityLevel = filters.securityLevel;

      // Get all logs matching filters (no pagination for export)
      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Decrypt user emails
      const decryptedLogs = await Promise.all(
        logs.map(async (log) => ({
          ...log,
          user: log.user
            ? {
                ...log.user,
                email:
                  await require("@/lib/security/dataProtection").unprotectData(
                    log.user.email,
                    "email"
                  ),
              }
            : null,
        }))
      );

      // Log the export
      await this.createAuditLog({
        action: "DATA_EXPORT_REQUESTED",
        resourceType: "AUDIT_LOG",
        details: {
          format,
          filterCount: Object.keys(filters || {}).length,
          recordCount: logs.length,
        },
      });

      return {
        success: true,
        data: decryptedLogs as AuditLogWithUser[],
        format,
        message: `Audit logs exported successfully in ${format.toUpperCase()} format`,
      };
    } catch (error) {
      console.error("Error exporting audit logs:", error);
      throw error;
    }
  }
}
