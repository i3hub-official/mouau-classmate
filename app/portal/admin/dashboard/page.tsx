// app/portal/admin/page.tsx
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
import {
  Users,
  BookOpen,
  FileText,
  Activity,
  Shield,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Clock,
  Home,
  Settings,
  BarChart3,
  UserCheck,
  UserX,
  Eye,
  MousePointer,
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

export const metadata: Metadata = {
  title: "Admin Dashboard | Admin Portal",
  description: "Admin dashboard overview and statistics",
};

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  totalCourses: number;
  totalAssignments: number;
  recentLogins: number;
  failedLogins: number;
  securityAlerts: number;
}

interface RecentActivity {
  id: string;
  action: string;
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  resourceType?: string | null;
  createdAt: Date;
}

interface SystemHealth {
  databaseStatus: "healthy" | "warning" | "error";
  lastBackup?: Date;
  diskUsage?: number;
  memoryUsage?: number;
}

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
};

export default async function AdminDashboardPage() {
  // Check if user is authenticated and is an admin
  const session = (await getServerSession()) as { user?: SessionUser } | null;
  if (!session || session.user?.role !== "ADMIN") {
    redirect("/auth/signin");
  }

  // Get dashboard statistics
  const stats = await getDashboardStats();
  const recentActivity = await getRecentActivity();
  const systemHealth = await getSystemHealth();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Home className="h-4 w-4" />
          <span>Admin Portal</span>
          <span>/</span>
          <span>Dashboard</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System overview and management
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Users
              </p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
            <span className="text-green-500">
              +{stats.activeUsers} active today
            </span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Students
              </p>
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
            </div>
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <UserCheck className="h-4 w-4 mr-1 text-blue-500" />
            <span className="text-blue-500">
              {Math.round((stats.totalStudents / stats.totalUsers) * 100)}% of
              users
            </span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Teachers
              </p>
              <p className="text-2xl font-bold">{stats.totalTeachers}</p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <UserCheck className="h-4 w-4 mr-1 text-purple-500" />
            <span className="text-purple-500">
              {Math.round((stats.totalTeachers / stats.totalUsers) * 100)}% of
              users
            </span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Courses
              </p>
              <p className="text-2xl font-bold">{stats.totalCourses}</p>
            </div>
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <FileText className="h-4 w-4 mr-1 text-orange-500" />
            <span className="text-orange-500">
              {stats.totalAssignments} assignments
            </span>
          </div>
        </div>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Recent Logins
              </p>
              <p className="text-2xl font-bold">{stats.recentLogins}</p>
            </div>
            <Shield className="h-8 w-8 text-green-500" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Last 24 hours</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Failed Logins
              </p>
              <p className="text-2xl font-bold text-red-500">
                {stats.failedLogins}
              </p>
            </div>
            <Shield className="h-8 w-8 text-red-500" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Last 24 hours</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Security Alerts
              </p>
              <p className="text-2xl font-bold text-orange-500">
                {stats.securityAlerts}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Need attention</p>
        </div>
      </div>

      {/* System Health */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          System Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <div
              className={`h-3 w-3 rounded-full ${
                systemHealth.databaseStatus === "healthy"
                  ? "bg-green-500"
                  : systemHealth.databaseStatus === "warning"
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
            />
            <span className="text-sm">Database</span>
            <span
              className={`text-sm font-medium ${
                systemHealth.databaseStatus === "healthy"
                  ? "text-green-500"
                  : systemHealth.databaseStatus === "warning"
                  ? "text-yellow-500"
                  : "text-red-500"
              }`}
            >
              {systemHealth.databaseStatus}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-sm">Disk Usage</span>
            <span className="text-sm font-medium">
              {systemHealth.diskUsage || 45}%
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-purple-500" />
            <span className="text-sm">Memory</span>
            <span className="text-sm font-medium">
              {systemHealth.memoryUsage || 62}%
            </span>
          </div>
        </div>
        {systemHealth.lastBackup && (
          <div className="mt-4 flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            Last backup: {format(systemHealth.lastBackup, "PPP")}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Activity
          </h2>
          <a
            href="/portal/admin/audits"
            className="text-sm text-blue-500 hover:underline flex items-center"
          >
            View all
            <Eye className="h-4 w-4 ml-1" />
          </a>
        </div>
        <div className="space-y-4">
          {recentActivity.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No recent activity
            </p>
          ) : (
            recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-sm font-medium">
                      {activity.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user?.name || activity.user?.email || "System"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {format(activity.createdAt, "MMM dd, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(activity.createdAt, "HH:mm:ss")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/portal/admin/users"
            className="flex items-center justify-center rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <Users className="h-6 w-6 mr-2" />
            <span className="text-sm font-medium">Manage Users</span>
          </a>
          <a
            href="/portal/admin/courses"
            className="flex items-center justify-center rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <BookOpen className="h-6 w-6 mr-2" />
            <span className="text-sm font-medium">Manage Courses</span>
          </a>
          <a
            href="/portal/admin/audits"
            className="flex items-center justify-center rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <Eye className="h-6 w-6 mr-2" />
            <span className="text-sm font-medium">View Logs</span>
          </a>
          <a
            href="/portal/admin/settings"
            className="flex items-center justify-center rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <Settings className="h-6 w-6 mr-2" />
            <span className="text-sm font-medium">Settings</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// Server-side data fetching functions
async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const yesterday = subDays(now, 1);
  const last24Hours = subDays(now, 1);

  const [
    totalUsers,
    activeUsers,
    totalStudents,
    totalTeachers,
    totalAdmins,
    totalCourses,
    totalAssignments,
    recentLogins,
    failedLogins,
    securityAlerts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        lastLoginAt: {
          gte: yesterday,
        },
      },
    }),
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.admin.count(),
    prisma.course.count(),
    prisma.assignment.count(),
    prisma.auditLog.count({
      where: {
        action: "USER_LOGGED_IN",
        createdAt: {
          gte: last24Hours,
        },
      },
    }),
    prisma.auditLog.count({
      where: {
        action: "USER_LOGIN_FAILED",
        createdAt: {
          gte: last24Hours,
        },
      },
    }),
    prisma.securityEvent.count({
      where: {
        resolved: false,
        createdAt: {
          gte: last24Hours,
        },
      },
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    totalStudents,
    totalTeachers,
    totalAdmins,
    totalCourses,
    totalAssignments,
    recentLogins,
    failedLogins,
    securityAlerts,
  };
}

async function getRecentActivity(
  limit: number = 10
): Promise<RecentActivity[]> {
  return prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: subDays(new Date(), 7),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function getSystemHealth(): Promise<SystemHealth> {
  // In a real implementation, you would check actual system health
  // For now, we'll return mock data
  return {
    databaseStatus: "healthy",
    lastBackup: subDays(new Date(), 1),
    diskUsage: 45,
    memoryUsage: 62,
  };
}
