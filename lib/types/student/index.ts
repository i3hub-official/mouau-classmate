// Files: lib/types/student/index.ts
// ===========================================================
// STUDENT TYPES - Based on Prisma Schema
// ===========================================================

import { Gender, MaritalStatus, Grade, NotificationType } from "@prisma/client";

// ===========================================================
// Core Student Types
// ===========================================================

export interface Student {
  id: string;
  matricNumber: string;
  jambRegNumber: string;
  nin?: string | null;
  firstName: string;
  lastName: string;
  otherName?: string | null;
  gender?: Gender | null;
  phone: string;
  passportUrl?: string | null;
  email: string;
  department: string;
  course: string;
  college: string;
  state: string;
  lga: string;
  maritalStatus?: MaritalStatus | null;
  dateEnrolled: Date;
  isActive: boolean;
  admissionYear?: number | null;
  dateOfBirth?: Date | null;
  updatedAt: Date;
  lastActivityAt?: Date | null;
  userId: string;
}

// Safe student type (without sensitive data)
export interface StudentProfile {
  id: string;
  matricNumber: string;
  firstName: string;
  lastName: string;
  otherName?: string | null;  
  email: string;
  phone: string;
  passportUrl?: string | null;
  department: string;
  course: string;
  college: string;
  dateEnrolled: Date;
  role: string;
  isActive: boolean;
}

// Student registration data
export interface StudentRegistrationData {
  // Personal Information
  firstName: string;
  lastName: string;
  otherName?: string;
  gender?: Gender;
  dateOfBirth?: Date;
  maritalStatus?: MaritalStatus;

  // Contact Information
  email: string;
  phone: string;

  // Academic Information
  matricNumber: string;
  jambRegNumber: string;
  nin?: string;
  department: string;
  course: string;
  college: string;
  admissionYear?: number;

  // Location
  state: string;
  lga: string;

  // Account
  password: string;
  confirmPassword: string;
}

// ===========================================================
// Course & Enrollment Types
// ===========================================================

export interface Course {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  credits: number;
  level: number;
  semester: number;
  courseOutline?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  instructorId?: string | null;
  creatorId?: string | null;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  dateEnrolled: Date;
  isCompleted: boolean;
  completionDate?: Date | null;
  grade?: Grade | null;
  score?: number | null;
  progress: number;
  lastAccessedAt?: Date | null;
  updatedAt: Date;
  course?: Course;
}

export interface EnrollmentWithCourse extends Enrollment {
  course: Course;
}

// ===========================================================
// Assignment Types
// ===========================================================

export interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  dueDate: Date;
  maxScore: number;
  allowedAttempts: number;
  assignmentUrl?: string | null;
  isPublished: boolean;
  allowLateSubmission: boolean;
  createdAt: Date;
  updatedAt: Date;
  courseId: string;
  teacherId?: string | null;
}

export interface AssignmentSubmission {
  id: string;
  submissionUrl?: string | null;
  content?: string | null;
  submittedAt: Date;
  score?: number | null;
  feedback?: string | null;
  isGraded: boolean;
  isLate: boolean;
  attemptNumber: number;
  studentId: string;
  assignmentId: string;
}

export interface AssignmentWithSubmission extends Assignment {
  submissions: AssignmentSubmission[];
  course?: Course;
}

// Assignment submission form data
export interface AssignmentSubmissionData {
  assignmentId: string;
  content?: string;
  submissionUrl?: string;
  attemptNumber: number;
}

// ===========================================================
// Lecture & Submission Types
// ===========================================================

export interface Lecture {
  id: string;
  title: string;
  description?: string | null;
  content?: any; // JSON
  duration?: number | null;
  orderIndex: number;
  isPublished: boolean;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  courseId: string;
}

export interface Submission {
  id: string;
  content?: any; // JSON
  submittedAt: Date;
  isGraded: boolean;
  score?: number | null;
  feedback?: string | null;
  studentId: string;
  lectureId: string;
}

export interface LectureWithSubmission extends Lecture {
  submission?: Submission | null;
}

// ===========================================================
// Grade & Performance Types
// ===========================================================

export interface GradeInfo {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  grade?: Grade | null;
  score?: number | null;
  gradePoint?: number;
  semester: number;
  level: number;
}

export interface SemesterGrades {
  semester: number;
  level: number;
  courses: GradeInfo[];
  totalCredits: number;
  totalGradePoints: number;
  gpa: number;
}

export interface AcademicTranscript {
  student: StudentProfile;
  semesters: SemesterGrades[];
  cumulativeGPA: number;
  totalCredits: number;
  generatedAt: Date;
}

// Grade statistics
export interface GradeStatistics {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  averageScore: number;
  gpa: number;
  cgpa: number;
  gradeDistribution: Record<Grade, number>;
}

// ===========================================================
// Portfolio Types
// ===========================================================

export interface Portfolio {
  id: string;
  title: string;
  description?: string | null;
  projectUrl?: string | null;
  imageUrl?: string | null;
  technologies: string[];
  isPublished: boolean;
  submittedAt: Date;
  updatedAt: Date;
  courseId: string;
  studentId: string;
}

export interface PortfolioWithCourse extends Portfolio {
  course: Course;
}

export interface PortfolioFormData {
  title: string;
  description?: string;
  projectUrl?: string;
  imageUrl?: string;
  technologies: string[];
  courseId: string;
  isPublished: boolean;
}

// ===========================================================
// Notification Types
// ===========================================================

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: Date;
  readAt?: Date | null;
  priority: number;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  assignmentReminders: boolean;
  gradeAlerts: boolean;
  lectureReminders: boolean;
}

// ===========================================================
// Schedule & Calendar Types
// ===========================================================

export interface ScheduleItem {
  id: string;
  type: "lecture" | "assignment" | "exam";
  title: string;
  courseCode: string;
  courseTitle: string;
  date: Date;
  dueDate?: Date;
  location?: string;
  description?: string;
}

export interface WeeklySchedule {
  monday: ScheduleItem[];
  tuesday: ScheduleItem[];
  wednesday: ScheduleItem[];
  thursday: ScheduleItem[];
  friday: ScheduleItem[];
  saturday: ScheduleItem[];
  sunday: ScheduleItem[];
}

// ===========================================================
// Dashboard Types
// ===========================================================

export interface DashboardStats {
  totalCourses: number;
  activeCourses: number;
  completedCourses: number;
  pendingAssignments: number;
  upcomingDeadlines: number;
  currentGPA: number;
  totalCredits: number;
  unreadNotifications: number;
}

export interface RecentActivity {
  id: string;
  type: "enrollment" | "submission" | "grade" | "assignment" | "lecture";
  title: string;
  description: string;
  timestamp: Date;
  metadata?: any;
}

export interface UpcomingDeadline {
  id: string;
  assignmentId: string;
  title: string;
  courseCode: string;
  courseTitle: string;
  dueDate: Date;
  daysRemaining: number;
  isSubmitted: boolean;
  isLate: boolean;
}

export interface StudentDashboard {
  student: StudentProfile;
  stats: DashboardStats;
  recentActivities: RecentActivity[];
  upcomingDeadlines: UpcomingDeadline[];
  currentEnrollments: EnrollmentWithCourse[];
  recentGrades: GradeInfo[];
}

// ===========================================================
// API Response Types
// ===========================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===========================================================
// Form Validation Types
// ===========================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState {
  isSubmitting: boolean;
  isValid: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

// ===========================================================
// Export all enums from Prisma
// ===========================================================

export { Gender, MaritalStatus, Grade, NotificationType } from "@prisma/client";
