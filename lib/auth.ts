// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/server/prisma";
import { verifyPassword } from "@/lib/security/passwordUtils";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        try {
          // Find user
          const user = await prisma.user.findFirst({
            where: { email: credentials.email },
            include: {
              student: {
                select: {
                  matricNumber: true,
                  department: true,
                },
              },
              teacher: {
                select: {
                  employeeId: true,
                  department: true,
                },
              },
            },
          });

          if (!user) {
            // Log failed login attempt
            await prisma.auditLog.create({
              data: {
                action: "USER_LOGIN_FAILED",
                resourceType: "USER",
                details: {
                  email: credentials.email,
                  reason: "user_not_found",
                },
                ipAddress: "unknown", // Would be set by middleware
                userAgent: "unknown",
              },
            });
            throw new Error("Invalid email or password");
          }

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
                },
                ipAddress: "unknown",
                userAgent: "unknown",
              },
            });
            throw new Error(
              "Account is temporarily locked. Please try again later."
            );
          }

          // Verify password
          const isValidPassword = await verifyPassword(
            credentials.password,
            user.passwordHash!
          );

          if (!isValidPassword) {
            // Increment failed login attempts
            const failedAttempts = user.failedLoginAttempts + 1;
            const updateData: any = {
              failedAttempts,
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
                },
                ipAddress: "unknown",
                userAgent: "unknown",
              },
            });

            throw new Error("Invalid email or password");
          }

          // Check if email is verified
          if (!user.isActive || !user.emailVerified) {
            throw new Error("Please verify your email before signing in");
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

          // Log successful login
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "USER_LOGGED_IN",
              resourceType: "USER",
              ipAddress: "unknown",
              userAgent: "unknown",
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            matricNumber:
              user.student?.matricNumber || user.teacher?.employeeId,
            department: user.student?.department || user.teacher?.department,
          };
        } catch (error) {
          console.error("Auth error:", error);
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
        // guard property existence before assigning to token
        if ("role" in user) token.role = (user as any).role;
        if ("matricNumber" in user)
          token.matricNumber = (user as any).matricNumber;
        if ("department" in user) token.department = (user as any).department;
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
