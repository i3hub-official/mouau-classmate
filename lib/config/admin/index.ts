/**
 * Admin Configuration for MOUAU CLASSMATE
 * Updated to match Prisma schema structure
 */

export const adminConfig = {
  // System-wide settings
  system: {
    institution: {
      name: "Michael Okpara University of Agriculture, Umudike",
      acronym: "MOUAU",
      academicYear: "2024/2025",
      currentSemester: 1 as 1 | 2,
      semesters: [1, 2] as const,
    },
    maintenance: {
      enableMaintenanceMode: false,
      allowedIps: ["127.0.0.1", "::1"],
      maintenanceMessage: "System under maintenance. Please check back later.",
    },
    backup: {
      autoBackup: true,
      backupInterval: 24, // hours
      retentionDays: 30,
      backupPath: "/backups",
    },
  },

  // Security & Access Control
  security: {
    session: {
      adminSessionTimeout: 60, // minutes
      maxLoginAttempts: 5,
      lockoutDuration: 30, // minutes
      securityLevels: ["LOW", "MEDIUM", "HIGH"] as const,
    },
    password: {
      minLength: 12,
      requireSpecialChars: true,
      requireNumbers: true,
      requireUppercase: true,
      expiryDays: 90,
    },
    audit: {
      logRetentionDays: 365,
      enableRealTimeMonitoring: true,
      sensitiveOperations: [
        "USER_DELETION",
        "ROLE_CHANGE",
        "SYSTEM_CONFIG_UPDATED",
        "DATA_EXPORT_REQUESTED",
        "ACCOUNT_DELETION",
      ] as const,
    },
  },

  // User Management
  users: {
    roles: {
      available: ["STUDENT", "TEACHER", "ADMIN"] as const,
      permissions: {
        ADMIN: ["*"] as Permission[],
        TEACHER: [
          "COURSE_MANAGEMENT",
          "ASSIGNMENT_CREATION",
          "GRADE_ASSIGNMENT",
          "STUDENT_MANAGEMENT",
        ] as Permission[],
        STUDENT: [
          "COURSE_ENROLLMENT",
          "ASSIGNMENT_SUBMISSION",
          "PORTFOLIO_CREATION",
        ] as Permission[],
      },
    },
    profile: {
      gender: ["MALE", "FEMALE", "OTHER"] as const,
      maritalStatus: ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"] as const,
    },
    bulkOperations: {
      maxUsersPerBatch: 100,
      allowedFileTypes: [".csv", ".xlsx"],
      maxFileSize: 10 * 1024 * 1024, // 10MB
    },
  },

  // Academic Management
  academic: {
    courses: {
      maxCreditsPerSemester: 24,
      minCreditsPerSemester: 15,
      courseCodeFormat: /^[A-Z]{3}[0-9]{3}$/, // e.g., CSC401
      levels: [100, 200, 300, 400, 500, 600] as const,
      defaultCredits: 3,
    },
    grading: {
      system: {
        A: { min: 70, max: 100, points: 5.0, grade: "A" },
        B: { min: 60, max: 69, points: 4.0, grade: "B" },
        C: { min: 50, max: 59, points: 3.0, grade: "C" },
        D: { min: 45, max: 49, points: 2.0, grade: "D" },
        E: { min: 40, max: 44, points: 1.0, grade: "E" },
        F: { min: 0, max: 39, points: 0.0, grade: "F" },
      },
      cgpa: {
        classification: {
          "First Class": { min: 4.5, max: 5.0 },
          "Second Class Upper": { min: 3.5, max: 4.49 },
          "Second Class Lower": { min: 2.5, max: 3.49 },
          "Third Class": { min: 1.5, max: 2.49 },
          Pass: { min: 1.0, max: 1.49 },
          Fail: { min: 0.0, max: 0.99 },
        },
      },
    },
    enrollment: {
      minimumAttendance: 0.75, // 75% required
      autoFlagThreshold: 0.6, // Flag at 60%
      maxConcurrentCourses: 8,
    },
    assignments: {
      defaultMaxScore: 100,
      defaultAllowedAttempts: 1,
      allowLateSubmission: false,
    },
  },

  // Dashboard & Reporting
  dashboard: {
    refreshInterval: 300, // seconds
    metrics: {
      retentionPeriod: 30, // days
      updateFrequency: 60, // minutes
    },
    widgets: {
      enabled: [
        "system_health",
        "user_activity",
        "academic_performance",
        "security_alerts",
        "enrollment_stats",
      ],
      layout: {
        default: "grid",
        available: ["grid", "list", "custom"] as const,
      },
    },
  },

  // Audit & Compliance
  audit: {
    enabled: true,
    logLevel: "info" as "error" | "warn" | "info" | "debug",
    resourceTypes: [
      "USER",
      "STUDENT",
      "TEACHER",
      "COURSE",
      "LECTURE",
      "ASSIGNMENT",
      "ENROLLMENT",
      "PORTFOLIO",
      "SESSION",
      "NOTIFICATION",
    ] as const,
    retention: {
      securityLogs: 365, // days
      userActivity: 180,
      systemEvents: 90,
    },
  },

  // Notifications & Alerts
  notifications: {
    types: ["INFO", "SUCCESS", "WARNING", "ERROR", "SECURITY"] as const,
    email: {
      enabled: true,
      templates: {
        security_alert: "security-alert",
        system_notification: "system-notification",
        academic_update: "academic-update",
      },
    },
    inApp: {
      enabled: true,
      retentionDays: 30,
      priorityLevels: [1, 2, 3] as const, // 1=low, 2=medium, 3=high
    },
    alerts: {
      systemHealth: {
        cpu: 80, // percentage
        memory: 85,
        disk: 90,
      },
      security: {
        failedLogins: 10, // per hour
        suspiciousActivity: true,
      },
    },
  },

  // File Upload & Storage
  storage: {
    limits: {
      profileImage: 5 * 1024 * 1024, // 5MB
      assignments: 50 * 1024 * 1024, // 50MB
      portfolios: 100 * 1024 * 1024, // 100MB
    },
    allowedTypes: {
      images: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ] as string[],
      documents: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ] as string[],
      archives: ["application/zip", "application/x-rar-compressed"] as string[],
    },
    paths: {
      profiles: "/uploads/profiles",
      assignments: "/uploads/assignments",
      portfolios: "/uploads/portfolios",
      backups: "/backups",
    },
  },

  // API & Integration
  api: {
    rateLimiting: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
    },
    caching: {
      enabled: true,
      duration: 300, // seconds
      excludedEndpoints: [
        "/api/admin/audits/live",
        "/api/admin/reports/real-time",
      ],
    },
  },

  // Feature Flags
  features: {
    enableAdvancedAnalytics: true,
    enableBulkOperations: true,
    enableRealTimeMonitoring: true,
    enableExportFunctionality: true,
    enableAPIAccess: true,
    enablePortfolioSystem: true,
    enableAttendanceTracking: true,
  },
} as const;

// Type exports based on Prisma schema
export type AdminConfig = typeof adminConfig;
export type UserRole = (typeof adminConfig.users.roles.available)[number];
export type Permission =
  | "*"
  | "COURSE_MANAGEMENT"
  | "ASSIGNMENT_CREATION"
  | "GRADE_ASSIGNMENT"
  | "STUDENT_MANAGEMENT"
  | "COURSE_ENROLLMENT"
  | "ASSIGNMENT_SUBMISSION"
  | "PORTFOLIO_CREATION";
export type Gender = (typeof adminConfig.users.profile.gender)[number];
export type MaritalStatus =
  (typeof adminConfig.users.profile.maritalStatus)[number];
export type NotificationType = (typeof adminConfig.notifications.types)[number];
export type ResourceType = (typeof adminConfig.audit.resourceTypes)[number];
export type SessionSecurityLevel =
  (typeof adminConfig.security.session.securityLevels)[number];
export type AcademicLevel =
  (typeof adminConfig.academic.courses.levels)[number];

// Utility functions
export const adminUtils = {
  // Check if user has permission
  hasPermission: (userRole: UserRole, permission: string): boolean => {
    const rolePermissions = adminConfig.users.roles.permissions[userRole];
    return (
      rolePermissions.includes("*") ||
      rolePermissions.includes(permission as Permission)
    );
  },

  // Validate course code format
  isValidCourseCode: (code: string): boolean => {
    return adminConfig.academic.courses.courseCodeFormat.test(code);
  },

  // Calculate grade from score
  calculateGrade: (score: number): { grade: string; points: number } => {
    const grading = adminConfig.academic.grading.system;

    for (const [key, range] of Object.entries(grading)) {
      if (score >= range.min && score <= range.max) {
        return { grade: range.grade, points: range.points };
      }
    }

    return { grade: "F", points: 0.0 };
  },

  // Get CGPA classification
  getCGPAClassification: (cgpa: number): string => {
    const classification = adminConfig.academic.grading.cgpa.classification;

    for (const [classname, range] of Object.entries(classification)) {
      if (cgpa >= range.min && cgpa <= range.max) {
        return classname;
      }
    }

    return "Fail";
  },

  // Check if assignment submission is late
  isSubmissionLate: (dueDate: Date, submittedAt: Date): boolean => {
    return submittedAt > dueDate;
  },

  // Calculate progress percentage
  calculateProgress: (completed: number, total: number): number => {
    return total > 0 ? (completed / total) * 100 : 0;
  },

  // Validate file upload
  validateFileUpload: (
    file: { size: number; type: string },
    category: "images" | "documents" | "archives"
  ): boolean => {
    const config = adminConfig.storage;
    const maxSize =
      config.limits[
        category === "images"
          ? "profileImage"
          : category === "documents"
          ? "assignments"
          : "portfolios"
      ];

    return (
      file.size <= maxSize && config.allowedTypes[category].includes(file.type)
    );
  },
};

// Default export
export default adminConfig;
