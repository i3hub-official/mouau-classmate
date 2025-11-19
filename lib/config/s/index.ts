/**
 * Student Configuration for MOUAU CLASSMATE
 * Aligned with Prisma schema
 */

export const studentConfig = {
  // Academic settings
  academic: {
    maxCoursesPerSemester: 8,
    minCoursesPerSemester: 4,
    maxCreditLoad: 24,
    minCreditLoad: 15,
    gradingSystem: {
      A: { min: 70, max: 100, points: 5.0 },
      B: { min: 60, max: 69, points: 4.0 },
      C: { min: 50, max: 59, points: 3.0 },
      D: { min: 45, max: 49, points: 2.0 },
      E: { min: 40, max: 44, points: 1.0 },
      F: { min: 0, max: 39, points: 0.0 },
    },
    levels: [100, 200, 300, 400, 500, 600] as const,
  },

  // Assignment settings
  assignments: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFileTypes: [
      ".pdf",
      ".doc",
      ".docx",
      ".txt",
      ".zip",
      ".rar",
      ".jpg",
      ".png",
    ],
    defaultAllowedAttempts: 1,
    lateSubmissionPenalty: 0.1, // 10% penalty
    submissionWindow: {
      gracePeriod: 15, // minutes
      bufferTime: 30, // minutes before deadline warning
    },
  },

  // Portfolio settings
  portfolio: {
    maxProjectsPerCourse: 5,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedMediaTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "video/mp4",
      "audio/mpeg",
    ],
    requiredFields: ["title", "description", "technologies"],
  },

  // Enrollment settings
  enrollment: {
    autoEnrollment: false,
    enrollmentPeriod: {
      start: "2024-09-01", // Example date
      end: "2024-09-30",
    },
    withdrawalDeadline: 14, // days from enrollment
  },

  // Progress tracking
  progress: {
    minimumPassingGrade: 40,
    completionThreshold: 0.75, // 75% for course completion
    activityTracking: {
      updateFrequency: 5, // minutes
      idleTimeout: 30, // minutes
    },
  },

  // Notifications
  notifications: {
    types: ["INFO", "SUCCESS", "WARNING", "ERROR", "SECURITY"] as const,
    defaults: {
      emailNotifications: true,
      pushNotifications: true,
      assignmentReminders: true,
      gradeAlerts: true,
      lectureReminders: true,
    },
    reminderIntervals: {
      assignmentDue: [24, 2], // hours before due: 24h, 2h
      lectureUpcoming: 60, // minutes before
    },
  },

  // Security & Privacy
  security: {
    session: {
      timeout: 120, // minutes
      refreshThreshold: 15, // minutes
    },
    data: {
      allowDataExport: true,
      autoDeleteInactive: 730, // days (2 years)
    },
  },

  // Dashboard features
  dashboard: {
    widgets: {
      enabled: [
        "academic_progress",
        "upcoming_deadlines",
        "recent_grades",
        "course_overview",
        "quick_actions",
      ],
      layout: "grid" as "grid" | "list" | "custom",
    },
    refresh: {
      intervals: {
        grades: 300, // seconds
        assignments: 180,
        notifications: 60,
      },
    },
  },
} as const;

// Type exports
export type StudentConfig = typeof studentConfig;
export type AcademicLevel = (typeof studentConfig.academic.levels)[number];
export type NotificationType =
  (typeof studentConfig.notifications.types)[number];

// Utility functions
export const studentUtils = {
  calculateGPA: (
    grades: Array<{ points: number; credits: number }>
  ): number => {
    if (grades.length === 0) return 0;

    const totalPoints = grades.reduce(
      (sum, grade) => sum + grade.points * grade.credits,
      0
    );
    const totalCredits = grades.reduce((sum, grade) => sum + grade.credits, 0);

    return totalCredits > 0 ? totalPoints / totalCredits : 0;
  },

  isAssignmentLate: (dueDate: Date, submittedAt: Date): boolean => {
    return submittedAt > dueDate;
  },

  calculateLatePenalty: (
    originalScore: number,
    penaltyRate: number = 0.1
  ): number => {
    return Math.max(0, originalScore * (1 - penaltyRate));
  },

  getAcademicStatus: (gpa: number): string => {
    if (gpa >= 4.5) return "First Class";
    if (gpa >= 3.5) return "Second Class Upper";
    if (gpa >= 2.5) return "Second Class Lower";
    if (gpa >= 1.5) return "Third Class";
    return "Probation";
  },

  validatePortfolio: (portfolio: any): string[] => {
    const errors: string[] = [];
    const required = studentConfig.portfolio.requiredFields;

    required.forEach((field) => {
      if (!portfolio[field] || portfolio[field].trim() === "") {
        errors.push(`${field} is required`);
      }
    });

    return errors;
  },
};

export default studentConfig;
