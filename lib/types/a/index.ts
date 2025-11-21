// Files: lib/types/a/index.ts
// ===========================================================
// ADMIN TYPES - Based on Prisma Schema
// ===========================================================

import {
  Role,
  Gender,
  AuditAction,
  ResourceType,
  SessionSecurityLevel,
  NotificationType,
} from "@prisma/client";
import { BaseUser } from "@/lib/types/shared/index";
// ===========================================================
// User Management Types
// ===========================================================

export interface AdminUser extends BaseUser {
  role: "ADMIN"; // Use enum instead of string literal
  firstName: string;
  surname: string;
  otherName?: string | null;
  gender: Gender;
  teacherId: string;
  department: string;
  institution: string;
  dateJoined: Date;
  isActive: boolean;
  passportUrl?: string | null;
  address?: string | null;
  phone?: string | null;

  // Admin specific fields can be added here
  qualification?: string | null;
  specialization?: string | null;
  experience?: string | null;
}

export interface User {
  id: string;
  name?: string | null;
  phone?: string | null;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  role: Role;
  isActive: boolean;
  lastLoginAt?: Date | null;
  loginCount: number;
  failedLoginAttempts: number;
  lastFailedLoginAt?: Date | null;
  accountLocked: boolean;
  lockedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  emailVerificationRequired: boolean;
  emailVerificationAttempts: number;
}

export interface UserWithProfile extends User {
  student?: StudentProfile | null;
  teacher?: TeacherProfile | null;
}

export interface UserFormData {
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  password?: string;
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
  accountLocked?: boolean;
}

// User statistics
export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  locked: number;
  byRole: {
    students: number;
    teachers: number;
    admins: number;
  };
  newThisMonth: number;
  loginActivity: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

// ===========================================================
// Profile Types (Simplified for Admin View)
// ===========================================================

export interface StudentProfile {
  id: string;
  matricNumber: string;
  firstName: string;
  surname: string;
  otherName?: string | null;
  email: string;
  phone: string;
  department: string;
  college: string;
  course: string;
  dateEnrolled: Date;
  isActive: boolean;
  userId: string;
}

export interface TeacherProfile {
  id: string;
  teacherId: string;
  firstName: string;
  surname: string;
  otherName?: string | null;
  email: string;
  phone: string;
  department: string;
  institution: string;
  qualification?: string | null;
  dateJoined: Date;
  isActive: boolean;
  userId: string;
}

// ===========================================================
// Audit Log Types
// ===========================================================

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: AuditAction;
  resourceType?: ResourceType | null;
  resourceId?: string | null;
  details?: any; // JSON
  ipAddress?: string | null;
  userAgent?: string | null;
  securityLevel?: SessionSecurityLevel | null;
  createdAt: Date;
}

export interface AuditLogWithUser extends AuditLog {
  user?: {
    id: string;
    name?: string | null;
    email: string;
    role: Role;
  } | null;
}

export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  resourceType?: ResourceType;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  securityLevel?: SessionSecurityLevel;
}

export interface AuditLogStats {
  totalLogs: number;
  byAction: Record<string, number>;
  byResourceType: Record<string, number>;
  bySecurityLevel: Record<string, number>;
  recentHighSeverity: number;
  suspiciousActivities: number;
}

// ===========================================================
// Security Event Types
// ===========================================================

export interface SecurityEvent {
  id: string;
  userId?: string | null;
  eventType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any; // JSON
  resolved: boolean;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  createdAt: Date;
}

export interface SecurityEventWithUser extends SecurityEvent {
  user?: {
    id: string;
    name?: string | null;
    email: string;
    role: Role;
  } | null;
}

export interface SecurityEventFilters {
  userId?: string;
  eventType?: string;
  severity?: "low" | "medium" | "high" | "critical";
  resolved?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface SecurityStats {
  totalEvents: number;
  unresolved: number;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  recentCritical: number;
  topThreats: Array<{
    type: string;
    count: number;
  }>;
}

// ===========================================================
// Session Management Types
// ===========================================================

export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  createdAt: Date;
  updatedAt: Date;
  deviceFingerprint?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  securityLevel: SessionSecurityLevel;
  lastAccessedAt: Date;
  refreshCount: number;
}

export interface SessionWithUser extends Session {
  user: {
    id: string;
    name?: string | null;
    email: string;
    role: Role;
  };
}

export interface ActiveSession {
  session: SessionWithUser;
  isCurrentSession: boolean;
  device: string;
  location: string;
  duration: string;
  lastActivity: string;
}

// ===========================================================
// Report Types
// ===========================================================

export interface SystemReport {
  id: string;
  type: "users" | "enrollment" | "performance" | "security" | "activity";
  title: string;
  description?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  generatedAt: Date;
  generatedBy: string;
  data: any; // JSON report data
}

export interface UserReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    lockedAccounts: number;
  };
  byRole: {
    students: number;
    teachers: number;
    admins: number;
  };
  loginActivity: {
    totalLogins: number;
    uniqueUsers: number;
    averageSessionDuration: number;
  };
  growthRate: number;
}

export interface EnrollmentReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalEnrollments: number;
    newEnrollments: number;
    completedEnrollments: number;
    activeEnrollments: number;
  };
  byDepartment: Record<string, number>;
  byLevel: Record<string, number>;
  topCourses: Array<{
    courseCode: string;
    courseTitle: string;
    enrollments: number;
  }>;
  completionRate: number;
}

export interface PerformanceReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    averageGPA: number;
    passRate: number;
    totalGradesIssued: number;
  };
  gradeDistribution: Record<string, number>;
  byDepartment: Record<
    string,
    {
      averageGPA: number;
      passRate: number;
    }
  >;
  topPerformers: Array<{
    studentId: string;
    name: string;
    gpa: number;
  }>;
}

export interface ActivityReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalActivities: number;
    uniqueUsers: number;
    averageActivitiesPerUser: number;
  };
  byAction: Record<string, number>;
  byHour: Record<string, number>;
  byDay: Record<string, number>;
  peakUsageTimes: Array<{
    hour: number;
    count: number;
  }>;
}

// ===========================================================
// System Configuration Types
// ===========================================================

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description?: string | null;
  category: string;
  isPublic: boolean;
  updatedAt: Date;
  updatedBy?: string | null;
}

export interface SystemConfigFormData {
  key: string;
  value: string;
  description?: string;
  category: string;
  isPublic: boolean;
}

export interface SystemConfigCategory {
  name: string;
  configs: SystemConfig[];
}

// ===========================================================
// Metrics Types
// ===========================================================

export interface Metric {
  id: string;
  name: string;
  value: number;
  tags?: any; // JSON
  timestamp: Date;
  userId?: string | null;
}

export interface MetricSummary {
  name: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: "up" | "down" | "stable";
}

export interface MetricsData {
  timestamp: Date;
  metrics: Record<string, number>;
}

// ===========================================================
// Dashboard Types
// ===========================================================

export interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
    newToday: number;
    newThisWeek: number;
  };
  students: {
    total: number;
    active: number;
    enrolled: number;
  };
  teachers: {
    total: number;
    active: number;
  };
  courses: {
    total: number;
    active: number;
  };
  enrollments: {
    total: number;
    thisMonth: number;
  };
  security: {
    activeThreats: number;
    resolvedThreats: number;
    criticalEvents: number;
  };
  system: {
    uptime: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

export interface RecentActivity {
  id: string;
  type: "user" | "enrollment" | "security" | "system";
  action: string;
  description: string;
  timestamp: Date;
  severity?: "low" | "medium" | "high" | "critical";
  userId?: string;
  userName?: string;
}

export interface AdminDashboard {
  stats: AdminDashboardStats;
  recentActivities: RecentActivity[];
  securityAlerts: SecurityEvent[];
  systemHealth: {
    status: "healthy" | "warning" | "critical";
    services: Array<{
      name: string;
      status: "running" | "stopped" | "error";
      uptime: number;
    }>;
  };
  quickStats: Array<{
    label: string;
    value: number | string;
    change?: number;
    trend?: "up" | "down" | "stable";
  }>;
}

// ===========================================================
// Notification Management Types
// ===========================================================

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject: string;
  message: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkNotification {
  title: string;
  message: string;
  type: NotificationType;
  priority: number;
  actionUrl?: string;
  recipients: {
    userIds?: string[];
    roles?: Role[];
    departments?: string[];
  };
  scheduleAt?: Date;
}

// ===========================================================
// Data Export Types
// ===========================================================

export interface ExportRequest {
  type:
    | "users"
    | "students"
    | "teachers"
    | "enrollments"
    | "grades"
    | "audit_logs";
  format: "csv" | "excel" | "pdf" | "json";
  filters?: any;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface ExportJob {
  id: string;
  type: string;
  format: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  fileUrl?: string;
  error?: string;
  requestedBy: string;
  createdAt: Date;
  completedAt?: Date;
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
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ===========================================================
// Filter & Search Types
// ===========================================================

export interface SearchFilters {
  query?: string;
  role?: Role;
  isActive?: boolean;
  department?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ===========================================================
// Export all enums from Prisma
// ===========================================================

export {
  Role,
  Gender,
  AuditAction,
  ResourceType,
  SessionSecurityLevel,
  NotificationType,
} from "@prisma/client";
