// File: app/components/teacher/types.ts
export interface TeacherUser {
  id: string;
  name: string;
  email: string;
  role: "TEACHER" | "LECTURER" | "STUDENT" | "ADMIN";
  isActive: boolean;
  lastLoginAt?: Date;
  profile?: {
    firstName: string;
    lastName: string;
    department: string;
    college: string;
    employeeId: string;
    academicRank: string;
    photo?: string;
    phone?: string;
    dateEmployed?: string;
  };
}

export interface AuthState {
  user: TeacherUser | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}