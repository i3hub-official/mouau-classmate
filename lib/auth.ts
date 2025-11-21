// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/server/prisma";
import {
  verifyPassword,
  protectData,
  generateSearchableHash,
} from "@/lib/security/dataProtection";
import { title } from "process";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "Matric/Staff ID or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials, req) {
        if (!credentials?.identifier || !credentials?.password) return null;

        const identifier = credentials.identifier.trim();
        const password = credentials.password;

        try {
          // Determine if identifier is email or ID number
          const isEmail = identifier.includes("@");
          let user = null;

          if (isEmail) {
            // For email login, we need to use search hash to find the encrypted email
            const protectedEmail = await protectData(identifier, "email");
            const emailSearchHash = protectedEmail.searchHash;

            user = await prisma.user.findFirst({
              where: {
                student: {
                  emailSearchHash: emailSearchHash,
                },
              },
              include: {
                student: {
                  select: {
                    id: true,
                    matricNumber: true,
                    department: true,
                    college: true,
                    course: true,
                    firstName: true,
                    surname: true,
                    otherName: true,
                  },
                },
                teacher: {
                  select: {
                    id: true,
                    department: true,
                    title: true,
                    firstName: true,
                    surname: true,
                  },
                },
                admin: {
                  select: {
                    firstName: true,
                    surname: true,
                  },
                },
              },
            });
          } else {
            // For matric/staff ID login
            user = await prisma.user.findFirst({
              where: {
                OR: [
                  {
                    student: {
                      matricNumber: { equals: identifier.toUpperCase() },
                    },
                  },
                  {
                    teacher: {
                      teacherId: { equals: identifier.toUpperCase() },
                    },
                  },
                  {
                    admin: { adminId: { equals: identifier.toUpperCase() } },
                  },
                ],
              },
              include: {
                student: {
                  select: {
                    id: true,
                    matricNumber: true,
                    department: true,
                    college: true,
                    course: true,
                    firstName: true,
                    surname: true,
                    otherName: true,
                  },
                },
                teacher: {
                  select: {
                    teacherId: true,
                    department: true,
                    title: true,
                    firstName: true,
                    surname: true,
                  },
                },
                admin: {
                  select: {
                    adminId: true,
                    firstName: true,
                    surname: true,
                  },
                },
              },
            });
          }

          if (!user) {
            await logFailed("not_found", identifier, req);
            return null;
          }

          // Account checks
          if (!user.isActive) {
            await logFailed("inactive", identifier, req, user.id);
            return null;
          }

          if (!user.emailVerified) {
            await logFailed("email_not_verified", identifier, req, user.id);
            return null;
          }

          if (
            user.accountLocked &&
            user.lockedUntil &&
            user.lockedUntil > new Date()
          ) {
            await logFailed("account_locked", identifier, req, user.id);
            return null;
          }

          // Verify password
          const isValidPassword = user.passwordHash
            ? await verifyPassword(password, user.passwordHash)
            : false;

          if (!isValidPassword) {
            await handleFailedLogin(user, identifier, req);
            return null;
          }

          // Reset failed attempts on successful login
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

          // Format user name based on role
          let userName = "";
          let fullName = "";

          if (user.student) {
            // Decrypt name fields for student (you might want to cache this or handle differently)
            // For now, we'll use a placeholder or matric number
            userName = user.student.matricNumber;
            fullName = `${user.student.surname} ${user.student.firstName}`;
          } else if (user.teacher) {
            userName = user.teacher.title
              ? `${user.teacher.title} ${userName}`
              : userName;
            fullName = user.teacher.title
              ? `${user.teacher.title} ${fullName}`
              : fullName;
          } else if (user.admin) {
            userName = user.admin.surname + " " + user.admin.firstName;
            fullName = `${user.admin.surname} ${user.admin.firstName}`;
          }

          // Create audit log for successful login
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "USER_LOGGED_IN",
              resourceType: "USER",
              details: {
                role: user.role,
                identifier,
                loginMethod: "credentials",
                userAgent: req?.headers?.["user-agent"] ?? "unknown",
              },
              ipAddress: getIp(req),
              userAgent: req?.headers?.["user-agent"] ?? "unknown",
            },
          });

          return {
            id: user.id,
            email: user.email, // This is encrypted, but NextAuth needs it
            name: fullName || userName,
            role: user.role,

            // Student specific
            matricNumber: user.student?.matricNumber ?? null,
            college: user.student?.college ?? null,
            course: user.student?.course ?? null,
            department:
              user.student?.department ?? user.teacher?.department ?? null,

            // Staff specific
            adminId: "adminId" in (user.admin ?? {}) ? user.admin?.firstName ?? null : null,
            title: user.teacher?.title ?? null,

            // Additional info
            fullName: fullName,
            userName: userName,
          };
        } catch (error) {
          console.error("Auth error:", error);
          await prisma.auditLog.create({
            data: {
              action: "AUTH_ERROR",
              resourceType: "USER",
              details: {
                identifier,
                error: error instanceof Error ? error.message : "Unknown",
                stack: error instanceof Error ? error.stack : undefined,
              },
              ipAddress: getIp(req),
              userAgent: req?.headers?.["user-agent"] ?? "unknown",
            },
          });
          return null;
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
      if (user) {
        token.role = user.role;
        token.matricNumber = user.matricNumber;
        token.teacherId = user.teacherId;
        token.department = user.department;
        token.college = user.college;
        token.course = user.course;
        token.title = user.title;
        token.fullName = user.fullName;
        token.userName = user.userName;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      session.user.role = token.role as string;
      session.user.matricNumber = token.matricNumber as string | null;
      session.user.teacherId = token.teacherId as string | null;
      session.user.department = token.department as string | null;
      session.user.college = token.college as string | null;
      session.user.course = token.course as string | null;
      session.user.title = token.title as string | null;
      session.user.fullName = token.fullName as string | null;
      session.user.userName = token.userName as string | null;
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: "/signin",
    signOut: "/signout",
    error: "/auth/error",
  },

  // Security settings
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === "production",
};

// Helper functions
function getIp(req: any): string {
  try {
    return (
      req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req?.headers?.["x-real-ip"] ||
      req?.socket?.remoteAddress ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

async function logFailed(
  reason: string,
  identifier: string,
  req: any,
  userId?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: "USER_LOGIN_FAILED",
        resourceType: "USER",
        details: {
          identifier,
          reason,
          timestamp: new Date().toISOString(),
        },
        ipAddress: getIp(req),
        userAgent: req?.headers?.["user-agent"] ?? "unknown",
      },
    });
  } catch (error) {
    console.error("Failed to log failed login attempt:", error);
  }
}

async function handleFailedLogin(user: any, identifier: string, req: any) {
  try {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const lock = attempts >= 5;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lastFailedLoginAt: new Date(),
        ...(lock && {
          accountLocked: true,
          lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_LOGIN_FAILED",
        resourceType: "USER",
        details: {
          identifier,
          reason: "invalid_password",
          attempts,
          locked: lock,
          lockedUntil: lock
            ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
            : undefined,
        },
        ipAddress: getIp(req),
        userAgent: req?.headers?.["user-agent"] ?? "unknown",
      },
    });
  } catch (error) {
    console.error("Failed to handle failed login:", error);
  }
}

// Extend NextAuth types
declare module "next-auth" {
  interface User {
    role: string;
    matricNumber?: string | null;
    teacherId?: string | null;
    department?: string | null;
    college?: string | null;
    course?: string | null;
    title?: string | null;
    fullName?: string | null;
    userName?: string | null;
    student?: {
      id: string;
      matricNumber: string;
      department: string;
      college: string;
      course: string;
      firstName: string;
      surname: string;
      otherName: string;
    } | null;
    teacher?: {
      teacherId: string;
      department: string;
      title: string;
      firstName: string;
      surname: string;
    } | null;
    admin?: {
      adminId?: string;
      firstName: string;
      surname: string;
    } | null;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: string;
      matricNumber?: string | null;
      teacherId?: string | null;
      department?: string | null;
      college?: string | null;
      course?: string | null;
      title?: string | null;
      fullName?: string | null;
      userName?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    matricNumber?: string | null;
    teacherId?: string | null;
    department?: string | null;
    college?: string | null;
    course?: string | null;
    title?: string | null;
    fullName?: string | null;
    userName?: string | null;
  }
}
