// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/server/prisma";
import { StudentRegistrationService } from "@/lib/services/studentRegistrationService";
import { verifyPassword } from "@/lib/security/dataProtection";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        matricNumber: { label: "Matric Number", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.matricNumber || !credentials?.password) {
          throw new Error("Matric number and password are required");
        }

        try {
          // Normalize matric number
          const normalizedMatric = credentials.matricNumber
            .trim()
            .toUpperCase();

          // Find student by matric number
          const student = await prisma.student.findFirst({
            where: {
              matricNumber: normalizedMatric,
            },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  role: true,
                  passwordHash: true,
                  isActive: true,
                  emailVerified: true,
                  accountLocked: true,
                  lockedUntil: true,
                  failedLoginAttempts: true,
                  lastLoginAt: true,
                  loginCount: true,
                },
              },
            },
          });

          if (!student || !student.user) {
            // Log failed login attempt
            await prisma.auditLog.create({
              data: {
                action: "USER_LOGIN_FAILED",
                resourceType: "USER",
                details: {
                  matricNumber: normalizedMatric,
                  reason: "student_not_found",
                },
                ipAddress: "unknown",
                userAgent: "unknown",
              },
            });
            throw new Error("StudentNotFound");
          }

          const user = student.user;

          // Check if account is locked
          if (
            user.accountLocked &&
            user.lockedUntil &&
            user.lockedUntil > new Date()
          ) {
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                action: "USER_LOGIN_FAILED",
                resourceType: "USER",
                details: {
                  reason: "account_locked",
                  lockedUntil: user.lockedUntil,
                  matricNumber: normalizedMatric,
                },
                ipAddress: "unknown",
                userAgent: "unknown",
              },
            });
            throw new Error("AccountLocked");
          }

          // Verify password using StudentRegistrationService
          const isValidPassword =
            await StudentRegistrationService.verifyPasswordForAuth(
              credentials.password,
              user.passwordHash!
            );

          if (!isValidPassword) {
            // Increment failed login attempts
            const failedAttempts = user.failedLoginAttempts + 1;
            const updateData: any = {
              failedLoginAttempts: failedAttempts,
              lastFailedLoginAt: new Date(),
            };

            // Lock account after 5 failed attempts for 30 minutes
            if (failedAttempts >= 5) {
              updateData.accountLocked = true;
              updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
            }

            await prisma.user.update({
              where: { id: user.id },
              data: updateData,
            });

            await prisma.auditLog.create({
              data: {
                userId: user.id,
                action: "USER_LOGIN_FAILED",
                resourceType: "USER",
                details: {
                  failedAttempts,
                  locked: failedAttempts >= 5,
                  matricNumber: normalizedMatric,
                },
                ipAddress: "unknown",
                userAgent: "unknown",
              },
            });

            throw new Error("CredentialsSignin");
          }

          // Check if email is verified and account is active
          if (!user.isActive) {
            throw new Error("AccountInactive");
          }

          if (!user.emailVerified) {
            throw new Error("AccountNotVerified");
          }

          // Reset failed login attempts on successful login
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              accountLocked: false,
              lockedUntil: null,
              lastLoginAt: new Date(),
              loginCount: { increment: 1 },
            },
          });

          // Decrypt student data for session
          const studentData = await StudentRegistrationService.getStudentData(
            normalizedMatric
          );

          // Log successful login
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "USER_LOGGED_IN",
              resourceType: "USER",
              details: {
                matricNumber: normalizedMatric,
                department: student?.department,
              },
              ipAddress: "unknown",
              userAgent: "unknown",
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            matricNumber: student.matricNumber,
            department: studentData?.department || student.department,
            college: studentData?.college || student.college,
            course: studentData?.course || student.course,
          };
        } catch (error) {
          console.error("Auth error:", error);

          // Log unexpected errors
          await prisma.auditLog.create({
            data: {
              action: "USER_LOGIN_ERROR",
              resourceType: "USER",
              details: {
                matricNumber: credentials.matricNumber,
                error: error instanceof Error ? error.message : "Unknown error",
              },
              ipAddress: "unknown",
              userAgent: "unknown",
            },
          });

          throw error;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user && typeof user === "object") {
        // Add user properties to token
        token.role = (user as any).role;
        token.matricNumber = (user as any).matricNumber;
        token.department = (user as any).department;
        token.college = (user as any).college;
        token.course = (user as any).course;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        const user = session.user ?? (session.user = {} as any);
        if (token.sub) user.id = token.sub;
        if (token.role) user.role = token.role as string;
        if (token.matricNumber)
          user.matricNumber = token.matricNumber as string;
        if (token.department) user.department = token.department as string;
        if (token.college) user.college = token.college as string;
        if (token.course) user.course = token.course as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-email",
    error: "/auth/error",
  },
  events: {
    async signOut({ token }) {
      if (token?.sub) {
        await prisma.auditLog.create({
          data: {
            userId: token.sub,
            action: "USER_LOGGED_OUT",
            resourceType: "USER",
            ipAddress: "unknown",
            userAgent: "unknown",
          },
        });
      }
    },
  },
};
