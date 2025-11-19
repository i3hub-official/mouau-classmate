/**
 * Teacher Configuration for MOUAU CLASSMATE
 * Aligned with Prisma schema
 */

export const teacherConfig = {
  // Course management
  courses: {
    maxCoursesPerSemester: 4,
    minStudentsPerCourse: 5,
    maxStudentsPerCourse: 100,
    defaultCredits: 3,
    levels: [100, 200, 300, 400, 500, 600] as const,
  },

  // Assignment management
  assignments: {
    maxAssignmentsPerCourse: 10,
    defaultMaxScore: 100,
    allowedAttempts: [1, 2, 3] as const,
    grading: {
      defaultRubric: {
        content: 40,
        structure: 20,
        originality: 20,
        presentation: 20,
      },
      feedbackTemplates: [
        "Excellent work!",
        "Good effort, but needs improvement in...",
        "Please review the requirements and resubmit.",
      ],
    },
    submission: {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: [".pdf", ".doc", ".docx", ".txt", ".zip"],
      allowLateSubmission: false,
      gracePeriod: 15, // minutes
    },
  },

  // Grading system
  grading: {
    system: {
      A: { min: 70, max: 100, points: 5.0 },
      B: { min: 60, max: 69, points: 4.0 },
      C: { min: 50, max: 59, points: 3.0 },
      D: { min: 45, max: 49, points: 2.0 },
      E: { min: 40, max: 44, points: 1.0 },
      F: { min: 0, max: 39, points: 0.0 },
    },
    policies: {
      regradeRequests: true,
      regradeDeadline: 7, // days
      gradePublication: "AUTO" as "AUTO" | "MANUAL",
    },
  },

  // Lecture management
  lectures: {
    maxLecturesPerCourse: 30,
    defaultDuration: 60, // minutes
    content: {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedTypes: [
        "video/mp4",
        "video/mpeg",
        "audio/mpeg",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
    },
  },

  // Student management
  students: {
    attendance: {
      minimumRequired: 0.75, // 75%
      autoFlagThreshold: 0.6, // 60%
      tracking: {
        enabled: true,
        method: "AUTOMATIC" as "AUTOMATIC" | "MANUAL",
      },
    },
    performance: {
      warningThreshold: 40, // percentage
      failureThreshold: 39, // percentage
    },
  },

  // Notifications
  notifications: {
    types: ["INFO", "SUCCESS", "WARNING", "ERROR", "SECURITY"] as const,
    defaults: {
      emailNotifications: true,
      pushNotifications: true,
      submissionAlerts: true,
      enrollmentRequests: true,
      systemUpdates: false,
    },
    alerts: {
      lateSubmissions: true,
      poorPerformance: true,
      attendanceIssues: true,
    },
  },

  // Dashboard & Analytics
  dashboard: {
    widgets: {
      enabled: [
        "course_overview",
        "student_performance",
        "submission_status",
        "recent_activity",
        "quick_actions",
      ],
      layout: "grid" as "grid" | "list" | "custom",
    },
    analytics: {
      retention: 90, // days
      updateFrequency: 60, // minutes
    },
  },

  // Security & Access
  security: {
    session: {
      timeout: 120, // minutes
      maxConcurrentSessions: 3,
    },
    data: {
      exportLimits: {
        maxStudents: 100,
        maxCourses: 10,
      },
    },
  },
} as const;

// Type exports
export type TeacherConfig = typeof teacherConfig;
export type AcademicLevel = (typeof teacherConfig.courses.levels)[number];
export type NotificationType =
  (typeof teacherConfig.notifications.types)[number];
export type AllowedAttempts =
  (typeof teacherConfig.assignments.allowedAttempts)[number];

// Utility functions
export const teacherUtils = {
  calculateCourseStatistics: (enrollments: Array<{ score?: number }>) => {
    const scores = enrollments
      .filter((e) => e.score !== undefined)
      .map((e) => e.score!);
    const total = scores.length;

    if (total === 0) return { average: 0, highest: 0, lowest: 0, passing: 0 };

    const average = scores.reduce((sum, score) => sum + score, 0) / total;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const passing = scores.filter((score) => score >= 40).length;

    return { average, highest, lowest, passing, total };
  },

  generateGradeDistribution: (scores: number[]) => {
    const grading = teacherConfig.grading.system;
    const distribution: Record<string, number> = {};

    Object.keys(grading).forEach((grade) => {
      distribution[grade] = 0;
    });

    scores.forEach((score) => {
      for (const [grade, range] of Object.entries(grading)) {
        if (score >= range.min && score <= range.max) {
          distribution[grade]++;
          break;
        }
      }
    });

    return distribution;
  },

  validateAssignmentSettings: (assignment: any): string[] => {
    const errors: string[] = [];

    if (assignment.maxScore > 100 || assignment.maxScore < 1) {
      errors.push("Max score must be between 1 and 100");
    }

    if (
      !teacherConfig.assignments.allowedAttempts.includes(
        assignment.allowedAttempts
      )
    ) {
      errors.push("Invalid number of allowed attempts");
    }

    if (assignment.dueDate && new Date(assignment.dueDate) <= new Date()) {
      errors.push("Due date must be in the future");
    }

    return errors;
  },

  calculateAttendanceRate: (present: number, total: number): number => {
    return total > 0 ? (present / total) * 100 : 0;
  },

  getPerformanceStatus: (score: number): string => {
    if (score >= 70) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 50) return "Average";
    if (score >= 40) return "Needs Improvement";
    return "Failing";
  },
};

export default teacherConfig;
