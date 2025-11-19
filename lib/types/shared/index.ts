// Files: lib/types/shared/index.ts
// ===========================================================
// SHARED TYPES - Common types used across all roles
// ===========================================================

import { Role } from "@prisma/client";

// ===========================================================
// Authentication Types
// ===========================================================

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
  image?: string | null;
  emailVerified?: Date | null;
}

export interface AuthSession {
  user: AuthUser;
  sessionToken: string;
  expires: Date;
}

export interface BaseUser {
  id: string;
  email: string;
  name: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  isActive: boolean;
  emailVerified: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface StudentUser extends BaseUser {
  role: "STUDENT";
  matricNumber: string;
  department: string;
  college: string;
  course: string;
  firstName: string;
  surname: string;
  phone: string;
  admissionYear?: number;
}

export interface SignInCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  role: Role;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
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
  metadata?: Record<string, any>;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  message?: string;
}

// ===========================================================
// Form & Validation Types
// ===========================================================

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormError {
  [key: string]: string | string[];
}

export interface FormState<T = any> {
  data: T;
  errors: FormError;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

// ===========================================================
// File Upload Types
// ===========================================================

export interface FileUploadResponse {
  success: boolean;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface FileUploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "failed";
  error?: string;
}

// ===========================================================
// Search & Filter Types
// ===========================================================

export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
  took: number; // milliseconds
}

export interface FilterOption {
  label: string;
  value: string | number | boolean;
  count?: number;
}

export interface FilterGroup {
  name: string;
  label: string;
  options: FilterOption[];
  type: "checkbox" | "radio" | "select" | "range" | "date";
}

// ===========================================================
// Date & Time Types
// ===========================================================

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

export interface ScheduleSlot extends TimeSlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  title?: string;
  location?: string;
}

// ===========================================================
// Notification Types (Shared)
// ===========================================================

export interface NotificationCount {
  total: number;
  unread: number;
  byType: Record<string, number>;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
}

// ===========================================================
// UI State Types
// ===========================================================

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
  details?: any;
}

export interface ModalState {
  isOpen: boolean;
  title?: string;
  content?: any;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ===========================================================
// Table & List Types
// ===========================================================

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string | number;
}

export interface TableState {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page: number;
  limit: number;
  filters: Record<string, any>;
}

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  icon?: string;
}

// ===========================================================
// Chart & Statistics Types
// ===========================================================

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: any;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface StatCard {
  label: string;
  value: number | string;
  change?: number;
  changePercent?: number;
  trend?: "up" | "down" | "stable";
  icon?: string;
  color?: string;
}

// ===========================================================
// Permission & Access Types
// ===========================================================

export interface Permission {
  resource: string;
  actions: ("create" | "read" | "update" | "delete")[];
}

export interface RolePermissions {
  role: Role;
  permissions: Permission[];
}

export interface AccessControl {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
}

// ===========================================================
// Theme & Preference Types
// ===========================================================

export interface ThemePreferences {
  mode: "light" | "dark" | "system";
  primaryColor: string;
  fontSize: "sm" | "md" | "lg";
  compactMode: boolean;
}

export interface UserPreferences {
  theme: ThemePreferences;
  notifications: NotificationSettings;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
}

// ===========================================================
// Activity & Audit Types (Shared)
// ===========================================================

export interface Activity {
  id: string;
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  description: string;
  timestamp: Date;
  metadata?: any;
}

export interface ActivityGroup {
  date: string; // YYYY-MM-DD
  activities: Activity[];
}

// ===========================================================
// Breadcrumb & Navigation Types
// ===========================================================

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
  isCurrentPage?: boolean;
}

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: number | string;
  children?: NavItem[];
  isActive?: boolean;
  permission?: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

// ===========================================================
// Analytics Types
// ===========================================================

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

export interface PageView {
  path: string;
  title: string;
  referrer?: string;
  timestamp: Date;
  duration?: number;
}

// ===========================================================
// Utility Types
// ===========================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type Nullable<T> = T | null;

export type Awaitable<T> = T | Promise<T>;

// ===========================================================
// HTTP & Network Types
// ===========================================================

export interface RequestConfig {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
}

export interface NetworkError {
  message: string;
  code: string;
  status?: number;
  statusText?: string;
  data?: any;
}

// ===========================================================
// Export common Prisma enums
// ===========================================================

export { Role } from "@prisma/client";
