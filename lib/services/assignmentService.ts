// lib/services/assignmentService.ts

export interface Course {
  id: string;
  code: string;
  title: string;
  description?: string;
  credits?: number;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department?: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: Date;
  content?: string;
  fileUrl?: string;
  score?: number;
  feedback?: string;
  isGraded: boolean;
  attemptNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  dueDate: Date;
  maxScore: number;
  courseId: string;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentWithRelations extends Assignment {
  course: Course;
  teacher: Teacher;
  submissions: Submission[];
}

export interface AssignmentStats {
  total: number;
  pending: number;
  submitted: number;
  overdue: number;
  graded: number;
}

export interface AssignmentSubmissionData {
  assignmentId: string;
  submissionText?: string;
  submittedAt: string;
  files?: File[];
}

export class AssignmentService {
  /**
   * Get all assignments for a specific user
   */
  static async getAssignmentsByUserId(
    userId: string
  ): Promise<AssignmentWithRelations[]> {
    try {
      if (!userId) {
        throw new Error("User ID is required to fetch assignments");
      }

      const response = await fetch(`/api/assignments/user/${userId}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("You must be logged in to view assignments");
        }
        if (response.status === 404) {
          console.warn("No assignments found for user");
          return [];
        }
        throw new Error(`Failed to fetch assignments: ${response.statusText}`);
      }

      const assignments = await response.json();

      // Ensure dates are properly parsed
      return assignments.map((assignment: any) => ({
        ...assignment,
        dueDate: new Date(assignment.dueDate),
        createdAt: new Date(assignment.createdAt),
        updatedAt: new Date(assignment.updatedAt),
        submissions: assignment.submissions.map((sub: any) => ({
          ...sub,
          submittedAt: sub.submittedAt ? new Date(sub.submittedAt) : null,
          createdAt: new Date(sub.createdAt),
          updatedAt: new Date(sub.updatedAt),
        })),
      }));
    } catch (error) {
      console.error("Error fetching assignments by user ID:", error);
      throw error;
    }
  }

  /**
   * Get a single assignment by ID
   */
  static async getAssignmentById(
    assignmentId: string
  ): Promise<AssignmentWithRelations | null> {
    try {
      if (!assignmentId) {
        throw new Error("Assignment ID is required");
      }

      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn("Assignment not found");
          return null;
        }
        throw new Error(`Failed to fetch assignment: ${response.statusText}`);
      }

      const assignment = await response.json();

      // Parse dates
      return {
        ...assignment,
        dueDate: new Date(assignment.dueDate),
        createdAt: new Date(assignment.createdAt),
        updatedAt: new Date(assignment.updatedAt),
        submissions: assignment.submissions.map((sub: any) => ({
          ...sub,
          submittedAt: sub.submittedAt ? new Date(sub.submittedAt) : null,
          createdAt: new Date(sub.createdAt),
          updatedAt: new Date(sub.updatedAt),
        })),
      };
    } catch (error) {
      console.error("Error fetching assignment by ID:", error);
      throw error;
    }
  }

  /**
   * Get assignments for a specific course
   */
  static async getAssignmentsByCourseId(
    courseId: string
  ): Promise<AssignmentWithRelations[]> {
    try {
      if (!courseId) {
        throw new Error("Course ID is required");
      }

      const response = await fetch(`/api/assignments/course/${courseId}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn("No assignments found for course");
          return [];
        }
        throw new Error(
          `Failed to fetch course assignments: ${response.statusText}`
        );
      }

      const assignments = await response.json();

      return assignments.map((assignment: any) => ({
        ...assignment,
        dueDate: new Date(assignment.dueDate),
        createdAt: new Date(assignment.createdAt),
        updatedAt: new Date(assignment.updatedAt),
        submissions:
          assignment.submissions?.map((sub: any) => ({
            ...sub,
            submittedAt: sub.submittedAt ? new Date(sub.submittedAt) : null,
            createdAt: new Date(sub.createdAt),
            updatedAt: new Date(sub.updatedAt),
          })) || [],
      }));
    } catch (error) {
      console.error("Error fetching assignments by course ID:", error);
      throw error;
    }
  }

  /**
   * Calculate assignment statistics
   */
  static calculateStats(
    assignments: AssignmentWithRelations[]
  ): AssignmentStats {
    const now = new Date();

    const stats = {
      total: assignments.length,
      pending: 0,
      submitted: 0,
      overdue: 0,
      graded: 0,
    };

    assignments.forEach((assignment) => {
      const hasSubmission = assignment.submissions.length > 0;
      const isGraded = assignment.submissions.some((sub) => sub.isGraded);
      const dueDate = new Date(assignment.dueDate);
      const isOverdue = dueDate < now && !hasSubmission;

      if (isGraded) {
        stats.graded++;
      } else if (hasSubmission) {
        stats.submitted++;
      } else if (isOverdue) {
        stats.overdue++;
      } else {
        stats.pending++;
      }
    });

    return stats;
  }

  /**
   * Get assignment status
   */
  static getAssignmentStatus(assignment: AssignmentWithRelations): string {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);

    const hasSubmission = assignment.submissions.length > 0;
    const isGraded = assignment.submissions.some((sub) => sub.isGraded);
    const isOverdue = dueDate < now && !hasSubmission;

    if (isGraded) return "graded";
    if (hasSubmission) return "submitted";
    if (isOverdue) return "overdue";
    return "pending";
  }

  /**
   * Get days left until assignment is due
   */
  static getDaysLeft(dueDate: Date): number {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Get submission information for an assignment
   */
  static getSubmissionInfo(assignment: AssignmentWithRelations) {
    const latestSubmission = assignment.submissions[0] || null;
    const isSubmitted = !!latestSubmission?.submittedAt;
    const isGraded = !!latestSubmission?.isGraded;
    const score = latestSubmission?.score ?? null;
    const feedback = latestSubmission?.feedback ?? null;

    return { latestSubmission, isSubmitted, isGraded, score, feedback };
  }

  /**
   * Extract unique courses from assignments
   */
  static extractCourses(assignments: AssignmentWithRelations[]): string[] {
    return Array.from(
      new Set(
        assignments.map(
          (assignment) =>
            `${assignment.course.code} - ${assignment.course.title}`
        )
      )
    );
  }

  /**
   * Filter assignments by search term
   */
  static filterBySearchTerm(
    assignments: AssignmentWithRelations[],
    searchTerm: string
  ): AssignmentWithRelations[] {
    if (!searchTerm.trim()) return assignments;

    const lowerSearchTerm = searchTerm.toLowerCase();

    return assignments.filter(
      (assignment) =>
        assignment.title.toLowerCase().includes(lowerSearchTerm) ||
        assignment.course.title.toLowerCase().includes(lowerSearchTerm) ||
        assignment.course.code.toLowerCase().includes(lowerSearchTerm) ||
        assignment.description?.toLowerCase().includes(lowerSearchTerm) ||
        assignment.teacher?.firstName.toLowerCase().includes(lowerSearchTerm) ||
        assignment.teacher?.lastName.toLowerCase().includes(lowerSearchTerm)
    );
  }

  /**
   * Filter assignments by status
   */
  static filterByStatus(
    assignments: AssignmentWithRelations[],
    status: string
  ): AssignmentWithRelations[] {
    if (status === "all") return assignments;

    return assignments.filter((assignment) => {
      return this.getAssignmentStatus(assignment) === status;
    });
  }

  /**
   * Filter assignments by course
   */
  static filterByCourse(
    assignments: AssignmentWithRelations[],
    courseFilter: string
  ): AssignmentWithRelations[] {
    if (courseFilter === "all") return assignments;

    return assignments.filter(
      (assignment) =>
        `${assignment.course.code} - ${assignment.course.title}` ===
        courseFilter
    );
  }

  /**
   * Apply all filters to assignments
   */
  static applyFilters(
    assignments: AssignmentWithRelations[],
    filters: {
      searchTerm?: string;
      status?: string;
      course?: string;
    }
  ): AssignmentWithRelations[] {
    let filtered = [...assignments];

    if (filters.searchTerm) {
      filtered = this.filterBySearchTerm(filtered, filters.searchTerm);
    }

    if (filters.status && filters.status !== "all") {
      filtered = this.filterByStatus(filtered, filters.status);
    }

    if (filters.course && filters.course !== "all") {
      filtered = this.filterByCourse(filtered, filters.course);
    }

    return filtered;
  }

  /**
   * Sort assignments by due date
   */
  static sortByDueDate(
    assignments: AssignmentWithRelations[],
    ascending: boolean = true
  ): AssignmentWithRelations[] {
    return [...assignments].sort((a, b) => {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  /**
   * Submit an assignment with file upload support
   */
  static async submitAssignmentWithFiles(
    submissionData: AssignmentSubmissionData
  ): Promise<{ success: boolean; submission?: Submission; message: string }> {
    try {
      const formData = new FormData();
      formData.append("assignmentId", submissionData.assignmentId);
      formData.append("submissionText", submissionData.submissionText || "");
      formData.append("submittedAt", submissionData.submittedAt);

      if (submissionData.files) {
        submissionData.files.forEach((file: File) => {
          formData.append("files", file);
        });
      }

      const response = await fetch("/api/assignments/submit", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            `Failed to submit assignment: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error submitting assignment with files:", error);
      throw error;
    }
  }

  /**
   * Get assignment submission status
   */
  static async getSubmissionStatus(
    assignmentId: string,
    studentId: string
  ): Promise<Submission | null> {
    try {
      // This would typically query your database
      // For now, return null to indicate no previous submission
      return null;
    } catch (error) {
      console.error("Error fetching submission status:", error);
      throw error;
    }
  }

  /**
   * Check if assignment submission is allowed (before deadline, etc.)
   */
  static async validateSubmission(
    assignmentId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const assignment = await this.getAssignmentById(assignmentId);

      if (!assignment) {
        return { allowed: false, reason: "Assignment not found" };
      }

      const now = new Date();
      const dueDate = new Date(assignment.dueDate);

      if (now > dueDate) {
        return { allowed: false, reason: "Assignment deadline has passed" };
      }

      // Add other validation rules as needed
      // - Maximum attempts
      // - Prerequisites
      // - etc.

      return { allowed: true };
    } catch (error) {
      console.error("Error validating submission:", error);
      return { allowed: false, reason: "Validation failed" };
    }
  }

  /**
   * Submit an assignment
   */
  static async submitAssignment(
    assignmentId: string,
    data: {
      content?: string;
      fileUrl?: string;
    }
  ): Promise<Submission> {
    try {
      const response = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            `Failed to submit assignment: ${response.statusText}`
        );
      }

      const submission = await response.json();

      return {
        ...submission,
        submittedAt: new Date(submission.submittedAt),
        createdAt: new Date(submission.createdAt),
        updatedAt: new Date(submission.updatedAt),
      };
    } catch (error) {
      console.error("Error submitting assignment:", error);
      throw error;
    }
  }
}

// Export convenient methods
export const {
  getAssignmentsByUserId,
  getAssignmentById,
  getAssignmentsByCourseId,
  calculateStats,
  getAssignmentStatus,
  getDaysLeft,
  getSubmissionInfo,
  extractCourses,
  filterBySearchTerm,
  filterByStatus,
  filterByCourse,
  applyFilters,
  sortByDueDate,
  submitAssignment,
} = AssignmentService;
