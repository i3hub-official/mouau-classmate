// lib/types/s/index.ts
// ===========================================================
// STUDENT TYPES - 2025 MOUAU CLASSMATE (Fully Type-Safe)
// Aligned with Prisma schema + dataProtection.ts encryption tiers
// ===========================================================
import {
  Gender,
  MaritalStatus,
  Grade,
  NotificationType,
  AttendanceStatus,
  ExamType,
  ExamFormat,
  ExamRemark,
  Role,
} from "@prisma/client";

// ===========================================================
// Core Student (DB-level)
// ===========================================================
export interface Student {
  id: string;
  userId: string;
  // Academic Identifiers (encrypted + searchable)
  matricNumber: string;
  jambRegNumber: string;
  nin: string | null;
  // Personal (encrypted)
  firstName: string;
  surname: string;
  otherName: string | null;
  gender: Gender | null;
  dateOfBirth: Date | null;
  // Contact (encrypted + searchable)
  email: string;
  phone: string;
  // Location (encrypted)
  state: string;
  lga: string;
  // Academic
  department: string;
  college: string;
  course: string; // This field is used in registration service
  admissionYear: number | null;
  maritalStatus: MaritalStatus | null;
  // Profile
  passportUrl: string | null;
  // Status
  isActive: boolean;
  lastActivityAt: Date | null;
  dateEnrolled: Date;
  createdAt: Date;
  updatedAt: Date;
  // Search hashes (used in registration service)
  emailSearchHash?: string;
  phoneSearchHash?: string;
  jambRegSearchHash?: string;
  ninSearchHash?: string;
  // Relations (optional in selects)
  user?: User;
  enrollments?: Enrollment[];
  examResults?: ExamResult[];
}

// Safe public profile (for dashboards, APIs, transcripts)
export interface StudentProfile {
  id: string;
  matricNumber: string;
  fullName: string; // surname + firstName + otherName
  firstName: string;
  surname: string;
  otherName: string | null;
  email: string;
  phone: string;
  passportUrl: string | null;
  department: string;
  college: string;
  course: string;
  admissionYear: number | null;
  gender: Gender | null;
  dateOfBirth: Date | null;
  state: string;
  lga: string;
  isActive: boolean;
  role: "STUDENT";
  createdAt: Date;
}

// ===========================================================
// Registration & Forms
// ===========================================================
export interface StudentRegistrationData {
  // Personal Information (Required)
  firstName: string;
  surname: string;
  otherName?: string;
  gender?: Gender;
  dateOfBirth?: string; // String for form input, converted to Date in service
  email: string;
  phone: string;

  // Academic Information (Required)
  nin: string;
  jambRegNumber: string;
  matricNumber?: string;
  department: string;
  college: string;
  course: string; // Added missing field
  admissionYear?: number;

  // Location Information
  state?: string;
  lga?: string;

  // Authentication
  password: string;
  confirmPassword: string;

  // Profile
  passportUrl?: string;
}

// Alternative registration data without confirmPassword for internal use
export interface StudentRegistrationInput {
  firstName: string;
  surname: string;
  otherName?: string;
  gender?: Gender;
  dateOfBirth?: Date; // Use Date for internal processing
  email: string;
  phone: string;
  nin: string;
  jambRegNumber: string;
  matricNumber?: string;
  department: string;
  college: string;
  course: string;
  admissionYear?: number;
  state?: string;
  lga?: string;
  password: string;
  passportUrl?: string;
}

// Registration response type
export interface StudentRegistrationResponse {
  success: boolean;
  userId: string;
  studentId: string;
  verificationToken: string;
  usedDefaultProfile: boolean;
  message: string;
}

// Email verification types
export interface EmailVerificationData {
  token: string;
}

export interface ResendVerificationData {
  email: string;
}

// Availability check types
export interface AvailabilityCheckResponse {
  available: boolean;
  message?: string;
}

// ===========================================================
// User & Auth
// ===========================================================
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
  emailVerified: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  student?: Student;
  teacher?: Teacher;
  admin?: Admin;
}

// ===========================================================
// Course & Enrollment (with full relations)
// ===========================================================
export interface Course {
  id: string;
  code: string;
  title: string;
  description: string | null;
  credits: number;
  level: number;
  semester: number;
  courseOutline?: string | null;
  isActive: boolean;
  color?: string | null;
  createdAt: Date;
  updatedAt: Date;
  instructor?: Teacher | null;
  creator?: Teacher | null;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  dateEnrolled: Date;
  grade: Grade | null;
  score: number | null;
  progress: number;
  isCompleted: boolean;
  completionDate: Date | null;
  lastAccessedAt: Date | null;
  updatedAt: Date;
  // Populated
  course?: Course;
  student?: Student;
}

export interface EnrollmentWithCourse extends Enrollment {
  course: Course;
}

// ===========================================================
// ASSIGNMENT TYPES – Fully Type-Safe + Relation Ready
// ===========================================================
export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  dueDate: Date;
  maxScore: number;
  weight: number;
  allowedAttempts: number;
  assignmentUrl?: string | null;
  isPublished: boolean;
  allowLateSubmission: boolean;
  scheduledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  // Foreign keys
  courseId: string;
  teacherId?: string | null;
  // Optional relations (use with ?.)
  course?: Course | null;
  teacher?: Teacher | null;
  submissions?: AssignmentSubmission[]; // All submissions (for teacher view)
}

/**
 * Assignment with guaranteed course relation
 * Use when you fetch with include: { course: true }
 */
export interface AssignmentWithCourse extends Assignment {
  course: Course; // Non-nullable
}

/**
 * Assignment with student's own submissions included
 * Perfect for student dashboard: shows if submitted, score, attempts left, etc.
 */
export interface AssignmentWithStudentSubmission extends Assignment {
  course: Course;
  submissions: AssignmentSubmission[]; // Only this student's submissions
  latestSubmission?: AssignmentSubmission | null;
  bestScore?: number | null;
  attemptsUsed: number;
  canSubmit: boolean;
  isOverdue: boolean;
}

/**
 * Full assignment for teacher/admin view
 * Includes all student submissions
 */
export interface AssignmentWithAllSubmissions extends Assignment {
  course: Course;
  submissions: (AssignmentSubmission & {
    student: Pick<Student, "id" | "matricNumber" | "surname" | "firstName">;
  })[];
}

// Submission from DB
export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  content?: string | null;
  submissionUrl?: string | null;
  submittedAt: Date;
  score?: number | null;
  feedback?: string | null;
  isGraded: boolean;
  isLate: boolean;
  attemptNumber: number;
  gradedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Optional populated fields
  assignment?: Assignment;
  student?: Pick<
    Student,
    "id" | "matricNumber" | "surname" | "firstName" | "otherName"
  >;
}

// Input when student submits
export interface AssignmentSubmissionData {
  assignmentId: string;
  content?: string;
  submissionUrl?: string;
}

// ===========================================================
// Exam & Exam Result (New!)
// ===========================================================
export interface Exam {
  id: string;
  title: string;
  description?: string | null;
  courseId: string;
  date: Date;
  duration: number;
  totalMarks: number;
  venue: string;
  type: ExamType;
  format: ExamFormat;
  isPublished: boolean;
  publishedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  course: Course;
  results?: ExamResult[];
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  courseId: string;
  score?: number | null;
  percentage?: number | null;
  grade?: Grade | null;
  remark: ExamRemark;
  isPublished: boolean;
  publishedAt?: Date | null;
  recordedBy?: string | null;
  recordedAt: Date;
  updatedAt: Date;
  scriptUrl?: string | null;
  feedback?: string | null;
  // Relations
  exam: Exam;
  student: Student;
  course: Course;
  recorder?: User | null;
}

// ===========================================================
// Lecture & Attendance
// ===========================================================
export interface Lecture {
  id: string;
  title: string;
  description?: string | null;
  content?: any;
  duration?: number | null;
  orderIndex: number;
  isPublished: boolean;
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  courseId: string;
  course?: Course;
}

export interface Attendance {
  id: string;
  studentId: string;
  courseId: string;
  lectureId: string;
  status: AttendanceStatus;
  markedAt: Date;
  markedBy?: string | null;
  notes?: string | null;
  verified: boolean;
  student?: Student;
  course?: Course;
  lecture?: Lecture;
  markedByUser?: User | null;
}

// ===========================================================
// Teacher & Admin
// ===========================================================
export interface Teacher {
  id: string;
  teacherId: string;
  surname: string;
  firstName: string;
  otherName?: string | null;
  email: string;
  phone: string;
  department: string;
  qualification?: string | null;
  specialization?: string | null;
  isActive: boolean;
  userId: string;
  user?: User;
}

export interface Admin {
  id: string;
  teacherId: string;
  surname: string;
  firstName: string;
  otherName?: string | null;
  email: string;
  phone: string;
  department: string;
  isActive: boolean;
  userId: string;
  user?: User;
}

// ===========================================================
// Portfolio
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
  course?: Course;
  student?: Student;
}

// ===========================================================
// Notifications & Dashboard
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

export interface DashboardStats {
  totalCourses: number;
  enrolledCourses: number;
  totalEnrolledCourses: number;
  totalCredits: number;
  activeCourses: number;
  completedCourses: number;
  pendingAssignments: number;
  upcomingExams: number;
  upcomingDeadlines: number;
  currentGPA: number;
  unreadNotifications: number;
  totalCreditsEarned: number;
}

export interface UpcomingDeadline {
  id: string;
  title: string;
  courseCode: string;
  courseTitle: string;
  dueDate: Date;
  daysRemaining: number;
  type: "assignment" | "exam" | "portfolio";
  isOverdue: boolean;
}

export interface RecentActivity {
  id: string;
  activityType:
    | "assignment_submitted"
    | "exam_taken"
    | "course_completed"
    | "notification_read";
  title: string;
  description?: string | null;
  date: Date;
}

// ===========================================================
// API & Pagination
// ===========================================================
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ===========================================================
// Service-specific types
// ===========================================================
export interface StudentProfileUpdateData {
  firstName?: string;
  surname?: string;
  otherName?: string;
  gender?: Gender;
  dateOfBirth?: Date;
  email?: string;
  phone?: string;
  department?: string;
  college?: string;
  course?: string;
  admissionYear?: number;
  passportUrl?: string;
  state?: string;
  lga?: string;
}

export interface StudentProfileResponse {
  success: boolean;
  student: Student & {
    user: {
      id: string;
      email: string;
      emailVerified: Date | null;
      isActive: boolean;
      createdAt: Date;
    };
  };
}

// ===========================================================
// Grade & Academic Types
// ===========================================================
export interface GradeInfo {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  grade: Grade | null;
  score: number | null;
  gradePoint: number;
  semester: number;
  level: number;
  isCompleted?: boolean;
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
  student: {
    id: string;
    matricNumber: string;
    firstName: string;
    surname: string;
    otherName: string | null;
    email: string;
    phone: string;
    passportUrl: string | null;
    department: string;
    course: string;
    college: string;
    dateEnrolled: Date;
    isActive: boolean;
    role: "STUDENT";
  };
  semesters: SemesterGrades[];
  cumulativeGPA: number;
  totalCredits: number;
  generatedAt: Date;
}

export interface GradeStatistics {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  averageScore: number;
  gpa: number;
  cgpa: number;
  gradeDistribution: Record<Grade, number>;
}

export interface GradeProgression {
  semester: string;
  gpa: number;
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

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface NotificationCount {
  total: number;
  unread: number;
  byType?: Record<NotificationType, number>;
}

export interface CreateNotificationData {
  title: string;
  message: string;
  type?: NotificationType;
  actionUrl?: string;
  priority?: number;
}

// ===========================================================
// Profile Service Types
// ===========================================================
export interface ProfileUpdateData {
  firstName?: string;
  surname?: string;
  otherName?: string;
  phone?: string;
  passportUrl?: string;
  state?: string;
  lga?: string;
}

export interface ProfileResponse {
  success: boolean;
  profile: StudentProfile;
  message: string;
}

export interface EmailUpdateResponse {
  success: boolean;
  verificationToken: string;
  message: string;
}

export interface AccountActionResponse {
  success: boolean;
  message: string;
}

export interface ProfileCompletion {
  completed: boolean;
  completionPercentage: number;
  missingFields: string[];
}

// Define the missing types
export interface ScheduleItem {
  id: string;
  type: "assignment" | "lecture" | "exam";
  scheduledAt: Date;
  dueDate?: Date;
  title: string;
  courseCode: string;
  courseTitle: string;
  description?: string;
  venue?: string;
  duration?: number;
  format?: string;
}

export interface WeeklySchedule {
  weekStart: Date;
  weekEnd: Date;
  items: ScheduleItem[];
  monday: ScheduleItem[];
  tuesday: ScheduleItem[];
  wednesday: ScheduleItem[];
  thursday: ScheduleItem[];
  friday: ScheduleItem[];
  saturday: ScheduleItem[];
  sunday: ScheduleItem[];
}

export interface ScheduleResponse {
  success: boolean;
  schedule: WeeklySchedule;
  message?: string;
}

export interface UpcomingItemsResponse {
  success: boolean;
  items: ScheduleItem[];
  total: number;
  message?: string;
}

// ===========================================================
// Re-exports
// ===========================================================
export {
  Gender,
  MaritalStatus,
  Grade,
  NotificationType,
  AttendanceStatus,
  ExamType,
  ExamFormat,
  ExamRemark,
  Role,
} from "@prisma/client";
