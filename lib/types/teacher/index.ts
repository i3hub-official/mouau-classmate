// Files: lib/types/teacher/index.ts
// ===========================================================
// TEACHER TYPES - Based on Prisma Schema
// ===========================================================

import { Gender, Grade } from "@prisma/client";

// ===========================================================
// Core Teacher Types
// ===========================================================

export interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  otherName?: string | null;
  gender?: Gender | null;
  phone: string;
  email: string;
  institution: string;
  department: string;
  qualification?: string | null;
  specialization?: string | null;
  experience?: string | null;
  dateJoined: Date;
  isActive: boolean;
  photo?: string | null;
  updatedAt: Date;
  lastActivityAt?: Date | null;
  userId: string;
}

// Safe teacher profile (without sensitive data)
export interface TeacherProfile {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  otherName?: string | null;
  email: string;
  phone: string;
  photo?: string | null;
  department: string;
  qualification?: string | null;
  specialization?: string | null;
  institution: string;
  dateJoined: Date;
}

// Teacher registration data
export interface TeacherRegistrationData {
  firstName: string;
  lastName: string;
  otherName?: string;
  gender?: Gender;
  email: string;
  phone: string;
  employeeId: string;
  institution: string;
  department: string;
  qualification?: string;
  specialization?: string;
  experience?: string;
  password: string;
  confirmPassword: string;
}

// ===========================================================
// Course & Class Management Types
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

export interface CourseWithStats extends Course {
  enrollmentCount: number;
  activeStudents: number;
  completionRate: number;
  averageScore: number;
}

export interface CourseFormData {
  code: string;
  title: string;
  description?: string;
  credits: number;
  level: number;
  semester: number;
  courseOutline?: string;
  isActive: boolean;
}

// ===========================================================
// Student & Enrollment Types (Teacher View)
// ===========================================================

export interface StudentBasicInfo {
  id: string;
  matricNumber: string;
  firstName: string;
  lastName: string;
  otherName?: string | null;
  email: string;
  phone: string;
  department: string;
  college: string;
  passportUrl?: string | null;
}

export interface EnrolledStudent extends StudentBasicInfo {
  enrollmentId: string;
  dateEnrolled: Date;
  progress: number;
  lastAccessedAt?: Date | null;
  isCompleted: boolean;
  grade?: Grade | null;
  score?: number | null;
}

export interface StudentPerformance {
  student: StudentBasicInfo;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  enrollmentDate: Date;
  attendance: {
    total: number;
    present: number;
    absent: number;
    percentage: number;
  };
  assignments: {
    total: number;
    submitted: number;
    graded: number;
    averageScore: number;
  };
  currentGrade?: Grade | null;
  currentScore?: number | null;
  progressPercentage: number;
}

// ===========================================================
// Assignment Types (Teacher View)
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

export interface AssignmentFormData {
  title: string;
  description?: string;
  instructions?: string;
  dueDate: Date;
  maxScore: number;
  allowedAttempts: number;
  assignmentUrl?: string;
  allowLateSubmission: boolean;
  isPublished: boolean;
  courseId: string;
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
  student?: StudentBasicInfo;
}

export interface AssignmentWithSubmissions extends Assignment {
  course: Course;
  submissions: AssignmentSubmission[];
  submissionStats: {
    total: number;
    submitted: number;
    graded: number;
    pending: number;
    late: number;
    averageScore: number;
  };
}

// Grading data
export interface GradingData {
  submissionId: string;
  score: number;
  feedback?: string;
}

export interface BulkGradingData {
  submissions: GradingData[];
}

// ===========================================================
// Attendance Types
// ===========================================================

export interface AttendanceRecord {
  id: string;
  studentId: string;
  courseId: string;
  date: Date;
  status: "present" | "absent" | "excused" | "late";
  remarks?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  date: Date;
  topic?: string;
  records: AttendanceRecordWithStudent[];
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

export interface AttendanceRecordWithStudent extends AttendanceRecord {
  student: StudentBasicInfo;
}

export interface AttendanceFormData {
  courseId: string;
  date: Date;
  topic?: string;
  records: {
    studentId: string;
    status: "present" | "absent" | "excused" | "late";
    remarks?: string;
  }[];
}

export interface StudentAttendanceSummary {
  student: StudentBasicInfo;
  courseId: string;
  totalSessions: number;
  present: number;
  absent: number;
  excused: number;
  late: number;
  attendanceRate: number;
}

// ===========================================================
// Lecture Management Types
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

export interface LectureFormData {
  title: string;
  description?: string;
  content?: any;
  duration?: number;
  orderIndex: number;
  isPublished: boolean;
  courseId: string;
}

export interface LectureWithProgress extends Lecture {
  viewCount: number;
  completionRate: number;
  averageTimeSpent: number;
}

// ===========================================================
// Grading & Results Types
// ===========================================================

export interface GradeEntry {
  studentId: string;
  courseId: string;
  score: number;
  grade: Grade;
  remarks?: string;
}

export interface BulkGradeUpload {
  courseId: string;
  grades: GradeEntry[];
}

export interface GradeDistribution {
  grade: Grade;
  count: number;
  percentage: number;
}

export interface CourseGradingStats {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  totalStudents: number;
  gradedStudents: number;
  pendingGrades: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  distribution: GradeDistribution[];
}

// ===========================================================
// Class Management Types
// ===========================================================

export interface ClassInfo {
  course: Course;
  enrolledStudents: EnrolledStudent[];
  totalEnrollments: number;
  activeStudents: number;
  completedStudents: number;
  averageProgress: number;
  averageGrade: number;
  attendanceRate: number;
}

export interface ClassSchedule {
  id: string;
  courseId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  location?: string;
  isActive: boolean;
}

// ===========================================================
// Dashboard Types (Teacher View)
// ===========================================================

export interface TeacherDashboardStats {
  totalCourses: number;
  activeCourses: number;
  totalStudents: number;
  activeStudents: number;
  pendingGradings: number;
  upcomingClasses: number;
  totalAssignments: number;
  recentSubmissions: number;
}

export interface RecentActivity {
  id: string;
  type: "submission" | "enrollment" | "query" | "attendance";
  title: string;
  description: string;
  timestamp: Date;
  studentName?: string;
  courseName?: string;
}

export interface UpcomingClass {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  date: Date;
  startTime: string;
  endTime: string;
  location?: string;
  topic?: string;
}

export interface TeacherDashboard {
  teacher: TeacherProfile;
  stats: TeacherDashboardStats;
  courses: CourseWithStats[];
  recentActivities: RecentActivity[];
  upcomingClasses: UpcomingClass[];
  pendingSubmissions: AssignmentSubmission[];
}

// ===========================================================
// Report Types
// ===========================================================

export interface StudentProgressReport {
  student: StudentBasicInfo;
  course: Course;
  enrollment: {
    dateEnrolled: Date;
    progress: number;
    lastAccessed?: Date | null;
  };
  attendance: {
    total: number;
    present: number;
    rate: number;
  };
  assignments: {
    total: number;
    submitted: number;
    averageScore: number;
  };
  currentGrade?: Grade | null;
  currentScore?: number | null;
  recommendations: string[];
}

export interface CourseReport {
  course: Course;
  period: {
    startDate: Date;
    endDate: Date;
  };
  enrollment: {
    total: number;
    active: number;
    completed: number;
    dropped: number;
  };
  performance: {
    averageScore: number;
    passRate: number;
    gradeDistribution: GradeDistribution[];
  };
  attendance: {
    averageRate: number;
    totalSessions: number;
  };
  assignments: {
    total: number;
    averageSubmissionRate: number;
    averageScore: number;
  };
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
// Export all enums from Prisma
// ===========================================================

export { Gender, Grade } from "@prisma/client";
