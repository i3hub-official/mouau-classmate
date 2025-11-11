// app/portal/admin/reports/page.tsx
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
import {
  BarChart3,
  FileText,
  Download,
  Calendar,
  Users,
  BookOpen,
  TrendingUp,
  Home,
  Settings,
  FilterIcon,
  RotateCcw,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

export const metadata: Metadata = {
  title: "Reports | Admin Portal",
  description: "Generate and view system reports",
};

interface ReportData {
  userGrowth: Array<{
    date: string;
    users: number;
    students: number;
    teachers: number;
  }>;
  courseEnrollment: Array<{
    courseName: string;
    enrolled: number;
    completed: number;
  }>;
  loginActivity: Array<{ date: string; logins: number; uniqueUsers: number }>;
  securityEvents: Array<{ type: string; count: number; severity: string }>;
  assignmentStats: Array<{
    course: string;
    total: number;
    submitted: number;
    late: number;
  }>;
}

interface FilterOptions {
  dateRange: "7d" | "30d" | "90d" | "1y" | "custom";
  dateFrom?: string;
  dateTo?: string;
  reportType: string;
  format: "pdf" | "excel" | "csv";
}

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
};


export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: {
    dateRange?: string;
    dateFrom?: string;
    dateTo?: string;
    reportType?: string;
    format?: string;
  };
}) {
  // Check if user is authenticated and is an admin
  const session = (await getServerSession()) as { user?: SessionUser } | null;
  if (!session || session.user?.role !== "ADMIN") {
    redirect("/auth/signin");
  }

  // Parse filter options
  const filters: FilterOptions = {
    dateRange: (searchParams.dateRange as any) || "30d",
    dateFrom: searchParams.dateFrom,
    dateTo: searchParams.dateTo,
    reportType: searchParams.reportType || "overview",
    format: (searchParams.format as any) || "pdf",
  };

  // Get date range
  const { from, to } = getDateRange(filters);

  // Fetch report data
  const reportData = await getReportData(
    filters.reportType || "overview",
    from,
    to
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Home className="h-4 w-4" />
          <span>Admin Portal</span>
          <span>/</span>
          <span>Reports</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold">System Reports</h1>
          <p className="text-muted-foreground">
            Generate and analyze system reports
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <FilterIcon className="h-5 w-5 mr-2" />
          Report Filters
        </h2>
        <form
          action="/portal/admin/reports"
          method="GET"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          <div className="space-y-2">
            <label htmlFor="dateRange" className="text-sm font-medium">
              Date Range
            </label>
            <select
              id="dateRange"
              name="dateRange"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={filters.dateRange}
              onChange={(e) => {
                if (e.target.value !== "custom") {
                  // Hide custom date inputs
                  document
                    .getElementById("customDateRange")
                    ?.classList.add("hidden");
                } else {
                  // Show custom date inputs
                  document
                    .getElementById("customDateRange")
                    ?.classList.remove("hidden");
                }
              }}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="custom">Custom range</option>
            </select>
          </div>

          <div
            id="customDateRange"
            className={filters.dateRange === "custom" ? "" : "hidden"}
          >
            <div className="space-y-2">
              <label htmlFor="dateFrom" className="text-sm font-medium">
                From Date
              </label>
              <input
                id="dateFrom"
                name="dateFrom"
                type="date"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={filters.dateFrom}
              />
            </div>
          </div>

          <div
            id="customDateRange"
            className={filters.dateRange === "custom" ? "" : "hidden"}
          >
            <div className="space-y-2">
              <label htmlFor="dateTo" className="text-sm font-medium">
                To Date
              </label>
              <input
                id="dateTo"
                name="dateTo"
                type="date"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={filters.dateTo}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="reportType" className="text-sm font-medium">
              Report Type
            </label>
            <select
              id="reportType"
              name="reportType"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={filters.reportType}
            >
              <option value="overview">System Overview</option>
              <option value="users">User Statistics</option>
              <option value="courses">Course Analytics</option>
              <option value="assignments">Assignment Reports</option>
              <option value="security">Security Summary</option>
              <option value="activity">User Activity</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="format" className="text-sm font-medium">
              Export Format
            </label>
            <select
              id="format"
              name="format"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={filters.format}
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <div className="flex items-end space-x-2 lg:col-span-5">
            <button
              type="button"
              onClick={() => (window.location.href = "/portal/admin/reports")}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </button>
          </div>
        </form>
      </div>

      {/* Report Content */}
      {filters.reportType === "overview" && (
        <OverviewReport
          data={reportData}
          dateRange={{ from, to }}
        />
      )}
      {filters.reportType === "users" && (
        <UserReport
          data={reportData}
          dateRange={{ from, to }}
        />
      )}
      {filters.reportType === "courses" && (
        <CourseReport
          data={reportData}
          dateRange={{ from, to }}
        />
      )}
      {filters.reportType === "assignments" && (
        <AssignmentReport
          data={reportData}
          dateRange={{ from, to }}
        />
      )}
      {filters.reportType === "security" && (
        <SecurityReport
          data={reportData}
          dateRange={{ from, to }}
        />
      )}
      {filters.reportType === "activity" && (
        <ActivityReport
          data={reportData}
          dateRange={{ from, to }}
        />
      )}
    </div>
  );
}

// Report Components
function OverviewReport({
  data,
  dateRange,
}: {
  data: ReportData;
  dateRange: { from: Date; to: Date };
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">User Growth</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Total Users</span>
              <span className="font-bold">
                {data.userGrowth[data.userGrowth.length - 1]?.users || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">New Students</span>
              <span className="font-bold text-green-500">
                +{data.userGrowth[data.userGrowth.length - 1]?.students || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">New Teachers</span>
              <span className="font-bold text-blue-500">
                +{data.userGrowth[data.userGrowth.length - 1]?.teachers || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Course Statistics</h3>
          <div className="space-y-2">
            {data.courseEnrollment.slice(0, 5).map((course) => (
              <div key={course.courseName} className="flex justify-between">
                <span className="text-sm truncate">{course.courseName}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    {course.enrolled} enrolled
                  </span>
                  <span className="text-xs text-green-500">
                    {course.completed} completed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Security Summary</h3>
          <div className="space-y-2">
            {data.securityEvents.slice(0, 5).map((event) => (
              <div
                key={event.type}
                className="flex justify-between items-center"
              >
                <span className="text-sm">{event.type}</span>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs font-medium ${
                      event.severity === "high"
                        ? "text-red-500"
                        : event.severity === "medium"
                        ? "text-yellow-500"
                        : "text-blue-500"
                    }`}
                  >
                    {event.count}
                  </span>
                  <div
                    className={`h-2 w-2 rounded-full ${
                      event.severity === "high"
                        ? "bg-red-500"
                        : event.severity === "medium"
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Login Activity Trend</h3>
        <div className="space-y-2">
          {data.loginActivity.slice(0, 7).map((day) => (
            <div key={day.date} className="flex justify-between">
              <span className="text-sm">
                {format(new Date(day.date), "MMM dd")}
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">
                  {day.logins} logins
                </span>
                <span className="text-xs text-blue-500">
                  {day.uniqueUsers} unique
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserReport({
  data,
  dateRange,
}: {
  data: ReportData;
  dateRange: { from: Date; to: Date };
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">User Statistics</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">New Users</th>
              <th className="text-left p-2">Active Users</th>
              <th className="text-left p-2">Students</th>
              <th className="text-left p-2">Teachers</th>
            </tr>
          </thead>
          <tbody>
            {data.userGrowth.map((row) => (
              <tr key={row.date} className="border-b">
                <td className="p-2">
                  {format(new Date(row.date), "MMM dd, yyyy")}
                </td>
                <td className="p-2">{row.users}</td>
                <td className="p-2">
                  {row.users - (row.students + row.teachers)}
                </td>
                <td className="p-2">{row.students}</td>
                <td className="p-2">{row.teachers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CourseReport({
  data,
  dateRange,
}: {
  data: ReportData;
  dateRange: { from: Date; to: Date };
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">Course Analytics</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.courseEnrollment.map((course) => (
            <div key={course.courseName} className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2">{course.courseName}</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Enrolled
                  </span>
                  <span className="font-bold">{course.enrolled}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Completed
                  </span>
                  <span className="font-bold text-green-500">
                    {course.completed}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Completion Rate
                  </span>
                  <span className="font-bold text-blue-500">
                    {course.enrolled > 0
                      ? Math.round((course.completed / course.enrolled) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssignmentReport({
  data,
  dateRange,
}: {
  data: ReportData;
  dateRange: { from: Date; to: Date };
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">Assignment Statistics</h3>
      <div className="space-y-4">
        {data.assignmentStats.map((stat) => (
          <div key={stat.course} className="rounded-lg border p-4">
            <h4 className="font-semibold mb-2">{stat.course}</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{stat.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">
                  {stat.submitted}
                </p>
                <p className="text-sm text-muted-foreground">Submitted</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-500">
                  {stat.late}
                </p>
                <p className="text-sm text-muted-foreground">Late</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">
                  {stat.total > 0
                    ? Math.round((stat.submitted / stat.total) * 100)
                    : 0}
                  %
                </p>
                <p className="text-sm text-muted-foreground">Submission Rate</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecurityReport({
  data,
  dateRange,
}: {
  data: ReportData;
  dateRange: { from: Date; to: Date };
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">Security Events</h3>
      <div className="space-y-4">
        {data.securityEvents.map((event) => (
          <div key={event.type} className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">{event.type}</h4>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-lg font-bold ${
                    event.severity === "high"
                      ? "text-red-500"
                      : event.severity === "medium"
                      ? "text-yellow-500"
                      : "text-blue-500"
                  }`}
                >
                  {event.count}
                </span>
                <div
                  className={`h-3 w-3 rounded-full ${
                    event.severity === "high"
                      ? "bg-red-500"
                      : event.severity === "medium"
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                  }`}
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {event.severity === "high"
                ? "Critical security events requiring immediate attention"
                : event.severity === "medium"
                ? "Security events that should be investigated"
                : "Informational security events"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityReport({
  data,
  dateRange,
}: {
  data: ReportData;
  dateRange: { from: Date; to: Date };
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">User Activity Summary</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Login Activity</h4>
            {data.loginActivity.slice(0, 5).map((day) => (
              <div key={day.date} className="flex justify-between">
                <span className="text-sm">
                  {format(new Date(day.date), "MMM dd")}
                </span>
                <span className="text-sm font-medium">{day.logins} logins</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">Active Users</h4>
            {data.loginActivity.slice(0, 5).map((day) => (
              <div key={day.date} className="flex justify-between">
                <span className="text-sm">
                  {format(new Date(day.date), "MMM dd")}
                </span>
                <span className="text-sm font-medium">
                  {day.uniqueUsers} users
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getDateRange(filters: FilterOptions): { from: Date; to: Date } {
  const now = new Date();

  if (filters.dateRange === "custom" && filters.dateFrom && filters.dateTo) {
    return {
      from: new Date(filters.dateFrom),
      to: new Date(filters.dateTo),
    };
  }

  const ranges = {
    "7d": subDays(now, 7),
    "30d": subDays(now, 30),
    "90d": subDays(now, 90),
    "1y": subDays(now, 365),
  };

  return {
    from: ranges[filters.dateRange as keyof typeof ranges] || ranges["30d"],
    to: now,
  };
}

async function getReportData(
  reportType: string,
  dateFrom: Date,
  dateTo: Date
): Promise<ReportData> {
  switch (reportType) {
    case "overview":
      return getOverviewData(dateFrom, dateTo);
    case "users":
      return getUserData(dateFrom, dateTo);
    case "courses":
      return getCourseData(dateFrom, dateTo);
    case "assignments":
      return getAssignmentData(dateFrom, dateTo);
    case "security":
      return getSecurityData(dateFrom, dateTo);
    case "activity":
      return getActivityData(dateFrom, dateTo);
    default:
      return getOverviewData(dateFrom, dateTo);
  }
}

async function getOverviewData(
  dateFrom: Date,
  dateTo: Date
): Promise<ReportData> {
  const [userGrowth, courseEnrollment, loginActivity, securityEvents] =
    await Promise.all([
      getUserGrowthData(dateFrom, dateTo),
      getCourseEnrollmentData(dateFrom, dateTo),
      getLoginActivityData(dateFrom, dateTo),
      getSecurityEventData(dateFrom, dateTo),
    ]);

  return {
    userGrowth,
    courseEnrollment,
    loginActivity,
    securityEvents,
    assignmentStats: [],
  };
}

async function getUserGrowthData(dateFrom: Date, dateTo: Date) {
  // Group users by creation date
  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
    include: {
      student: true,
      teacher: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by day
  const grouped = users.reduce((acc, user) => {
    const date = format(user.createdAt, "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = { users: 0, students: 0, teachers: 0 };
    }
    acc[date].users++;
    if (user.student) acc[date].students++;
    if (user.teacher) acc[date].teachers++;
    return acc;
  }, {} as Record<string, { users: number; students: number; teachers: number }>);

  return Object.entries(grouped).map(([date, data]) => ({ date, ...data }));
}

async function getCourseEnrollmentData(dateFrom: Date, dateTo: Date) {
  const courses = await prisma.course.findMany({
    include: {
      enrollments: {
        where: {
          dateEnrolled: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
      },
      _count: {
        select: {
          enrollments: {
            where: {
              isCompleted: true,
              dateEnrolled: {
                gte: dateFrom,
                lte: dateTo,
              },
            },
          },
        },
      },
    },
  });

  return courses.map((course) => ({
    courseName: course.title,
    enrolled: course.enrollments.length,
    completed: course._count.enrollments,
  }));
}

async function getLoginActivityData(dateFrom: Date, dateTo: Date) {
  const logins = await prisma.auditLog.findMany({
    where: {
      action: "USER_LOGGED_IN",
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by day
  const grouped = logins.reduce((acc, login) => {
    const date = format(login.createdAt, "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = { logins: 0, uniqueUsers: new Set() };
    }
    acc[date].logins++;
    if (login.userId) acc[date].uniqueUsers.add(login.userId);
    return acc;
  }, {} as Record<string, { logins: number; uniqueUsers: Set<string> }>);

  return Object.entries(grouped).map(([date, data]) => ({
    date,
    logins: data.logins,
    uniqueUsers: data.uniqueUsers.size,
  }));
}

async function getSecurityEventData(dateFrom: Date, dateTo: Date) {
  const events = await prisma.securityEvent.findMany({
    where: {
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by event type
  const grouped = events.reduce((acc, event) => {
    if (!acc[event.eventType]) {
      acc[event.eventType] = { count: 0, severity: event.severity };
    }
    acc[event.eventType].count++;
    return acc;
  }, {} as Record<string, { count: number; severity: string }>);

  return Object.entries(grouped).map(([type, data]) => ({
    type,
    count: data.count,
    severity: data.severity,
  }));
}

async function getUserData(dateFrom: Date, dateTo: Date): Promise<ReportData> {
  const userGrowth = await getUserGrowthData(dateFrom, dateTo);
  return {
    userGrowth,
    courseEnrollment: [],
    loginActivity: [],
    securityEvents: [],
    assignmentStats: [],
  };
}

async function getCourseData(
  dateFrom: Date,
  dateTo: Date
): Promise<ReportData> {
  const courseEnrollment = await getCourseEnrollmentData(dateFrom, dateTo);
  return {
    userGrowth: [],
    courseEnrollment,
    loginActivity: [],
    securityEvents: [],
    assignmentStats: [],
  };
}

async function getAssignmentData(
  dateFrom: Date,
  dateTo: Date
): Promise<ReportData> {
  const assignments = await prisma.assignment.findMany({
    where: {
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
    include: {
      course: true,
      submissions: {
        where: {
          submittedAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
      },
      _count: {
        select: {
          submissions: {
            where: {
              isLate: true,
              submittedAt: {
                gte: dateFrom,
                lte: dateTo,
              },
            },
          },
        },
      },
    },
  });

  const assignmentStats = assignments.map((assignment) => ({
    course: assignment.course.title,
    total: assignment.submissions.length,
    submitted: assignment.submissions.length,
    late: assignment._count.submissions,
  }));

  return {
    userGrowth: [],
    courseEnrollment: [],
    loginActivity: [],
    securityEvents: [],
    assignmentStats,
  };
}

async function getSecurityData(
  dateFrom: Date,
  dateTo: Date
): Promise<ReportData> {
  const securityEvents = await getSecurityEventData(dateFrom, dateTo);
  return {
    userGrowth: [],
    courseEnrollment: [],
    loginActivity: [],
    securityEvents,
    assignmentStats: [],
  };
}

async function getActivityData(
  dateFrom: Date,
  dateTo: Date
): Promise<ReportData> {
  const loginActivity = await getLoginActivityData(dateFrom, dateTo);
  return {
    userGrowth: [],
    courseEnrollment: [],
    loginActivity,
    securityEvents: [],
    assignmentStats: [],
  };
}
