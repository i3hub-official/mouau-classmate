// File: app/components/t/types.ts
export interface TeacherUser {
  id: string;
  name: string;
  email: string;
  role: "TEACHER" | "LECTURER" | "STUDENT" | "ADMIN";
  isActive: boolean;
  lastLoginAt?: Date;
  profile?: {
    firstName: string;
    surname: string;
    department: string;
    college: string;
    teacherId: string;
    academicRank: string;
    passportUrl?: string;
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
