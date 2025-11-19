// app/p/s/dashboard/page.tsx
import { Metadata } from "next";
import { checkStudentSession } from "@/lib/services/s/sessionService";
import { prisma } from "@/lib/server/prisma";
import {
  BookOpen,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Play,
  Star,
  BarChart3,
  Home,
  User,
  Award,
  FileText,
  Users,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { format, isPast, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Student Dashboard | Student Portal",
  description: "Track your courses, assignments, and progress",
};

interface DashboardStats {
  totalCourses: number;
  inProgressCourses: number;
  completedCourses: number;
  pendingAssignments: number;
  upcomingDeadlines: number;
  recentGrades: number;
  averageGrade: number;
  totalCredits: number;
  earnedCredits: number;
}

interface CourseWithProgress {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  credits: number;
  level: number;
  semester: number;
  progress: number;
  lastAccessedAt?: Date | null;
  instructor?: {
    id: string;
    firstName?: string | null;
    surname?: string | null;
    photo?: string | null;
  } | null;
  _count: {
    assignments: number;
    lectures: number;
    portfolios: number;
  };
}

interface AssignmentWithDeadline {
  id: string;
  title: string;
  dueDate: Date;
  courseCode: string;
  courseTitle: string;
  isSubmitted: boolean;
  isGraded: boolean;
  score?: number | null;
  maxScore: number;
}

interface RecentGrade {
  id: string;
  assignmentTitle: string;
  courseCode: string;
  courseTitle: string;
  score: number;
  maxScore: number;
  grade: string;
  gradedAt: Date;
}

export default async function StudentDashboardPage() {
  // Check if user is authenticated and is a student
  const session = await checkStudentSession();

  // Get dashboard statistics
  const stats = await getDashboardStats(session.user?.id || "");
  const courses = await getEnrolledCourses(session.user?.id || "");
  const upcomingAssignments = await getUpcomingAssignments(
    session.user?.id || ""
  );
  const recentGrades = await getRecentGrades(session.user?.id || "");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-slate-900">
                Welcome back, {session.user?.name?.split(" ")[0] || "Student"}
              </h1>
              <p className="text-slate-500">
                Here's what's happening with your courses today
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/p/s/profile"
                className="relative flex items-center rounded-full bg-slate-200 p-1 text-slate-700 hover:bg-slate-300 transition-colors"
              >
                {session.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || "Student"}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <User className="h-6 w-6 text-slate-600" />
                )}
              </Link>
              <Link
                href="/p/s/settings"
                className="relative p-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
              >
                <Settings className="h-5 w-5" />
              </Link>
              <button className="relative p-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Courses
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.totalCourses}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  In Progress
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.inProgressCourses}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Completed</p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.completedCourses}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Pending Assignments
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.pendingAssignments}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Upcoming Deadlines
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.upcomingDeadlines}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Courses Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-900">
                  My Courses
                </h2>
                <Link
                  href="/p/s/courses"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                >
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>

              <div className="space-y-4">
                {courses.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-500">
                      You're not enrolled in any courses yet
                    </p>
                    <Link
                      href="/p/s/courses"
                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors mt-4"
                    >
                      Browse Courses
                    </Link>
                  </div>
                ) : (
                  courses.slice(0, 3).map((course) => (
                    <div
                      key={course.id}
                      className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {course.title}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {course.code} • Level {course.level}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-semibold">
                            {course.progress}% Complete
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="h-2 bg-blue-600 rounded-full"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-3 text-sm text-slate-600">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-1" />
                          {course._count.assignments} Assignments
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {course._count.lectures} Lectures
                        </div>
                      </div>

                      {course.lastAccessedAt && (
                        <div className="flex items-center text-xs text-slate-500 mt-2">
                          <Clock className="h-3 w-3 mr-1" />
                          Last accessed{" "}
                          {format(course.lastAccessedAt, "MMM d, yyyy")}
                        </div>
                      )}

                      <Link
                        href={`/p/s/courses/${course.id}`}
                        className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium mt-3"
                      >
                        Continue Learning
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Assignments */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">
                  Upcoming Assignments
                </h2>
                <Link
                  href="/p/s/assignments"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                >
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>

              <div className="space-y-3">
                {upcomingAssignments.length === 0 ? (
                  <div className="text-center py-6">
                    <FileText className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-500">No upcoming assignments</p>
                  </div>
                ) : (
                  upcomingAssignments.slice(0, 3).map((assignment) => (
                    <div
                      key={assignment.id}
                      className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {assignment.title}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {assignment.courseCode} • {assignment.courseTitle}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              isPast(assignment.dueDate)
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            )}
                          >
                            {isPast(assignment.dueDate)
                              ? "Overdue"
                              : format(assignment.dueDate, "MMM d")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 text-sm text-slate-600">
                        <div className="flex items-center">
                          <BarChart3 className="h-4 w-4 mr-1" />
                          {assignment.maxScore} points
                        </div>
                        {assignment.isSubmitted ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Submitted
                          </div>
                        ) : (
                          <div className="flex items-center text-amber-600">
                            <Clock className="h-4 w-4 mr-1" />
                            Pending
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/p/s/assignments/${assignment.id}`}
                        className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium mt-3"
                      >
                        {assignment.isSubmitted
                          ? "View Submission"
                          : "Submit Assignment"}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Grades */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">
                  Recent Grades
                </h2>
                <Link
                  href="/p/s/grades"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                >
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>

              <div className="space-y-3">
                {recentGrades.length === 0 ? (
                  <div className="text-center py-6">
                    <Award className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-500">No grades available yet</p>
                  </div>
                ) : (
                  recentGrades.slice(0, 3).map((grade) => (
                    <div
                      key={grade.id}
                      className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {grade.assignmentTitle}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {grade.courseCode} • {grade.courseTitle}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-2.5 py-0.5 text-xs font-semibold">
                            {grade.grade}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 text-sm text-slate-600">
                        <div className="flex items-center">
                          <BarChart3 className="h-4 w-4 mr-1" />
                          {grade.score}/{grade.maxScore} points
                        </div>
                        <div className="flex items-center text-slate-500">
                          <Clock className="h-4 w-4 mr-1" />
                          {format(grade.gradedAt, "MMM d, yyyy")}
                        </div>
                      </div>

                      <Link
                        href={`/p/s/grades/${grade.id}`}
                        className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium mt-3"
                      >
                        View Details
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Quick Actions
              </h2>

              <div className="space-y-3">
                <Link
                  href="/p/s/courses"
                  className="flex items-center p-3 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <BookOpen className="h-5 w-5 mr-3 text-blue-600" />
                  <span className="font-medium text-slate-900">
                    Browse Courses
                  </span>
                </Link>

                <Link
                  href="/p/s/assignments"
                  className="flex items-center p-3 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <FileText className="h-5 w-5 mr-3 text-blue-600" />
                  <span className="font-medium text-slate-900">
                    View Assignments
                  </span>
                </Link>

                <Link
                  href="/p/s/calendar"
                  className="flex items-center p-3 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <Calendar className="h-5 w-5 mr-3 text-blue-600" />
                  <span className="font-medium text-slate-900">
                    Academic Calendar
                  </span>
                </Link>

                <Link
                  href="/p/s/resources"
                  className="flex items-center p-3 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <Star className="h-5 w-5 mr-3 text-blue-600" />
                  <span className="font-medium text-slate-900">
                    Learning Resources
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Server-side data fetching functions
async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [
    totalCourses,
    inProgressCourses,
    completedCourses,
    pendingAssignments,
    upcomingDeadlines,
    recentGrades,
    averageGrade,
    totalCredits,
    earnedCredits,
  ] = await Promise.all([
    prisma.enrollment.count({
      where: { studentId: userId },
    }),
    prisma.enrollment.count({
      where: {
        studentId: userId,
        progress: { gt: 0, lt: 100 },
      },
    }),
    prisma.enrollment.count({
      where: {
        studentId: userId,
        isCompleted: true,
      },
    }),
    prisma.assignment.count({
      where: {
        course: {
          enrollments: {
            some: {
              studentId: userId,
            },
          },
        },
        isPublished: true,
        submissions: {
          none: {
            studentId: userId,
          },
        },
        dueDate: {
          gte: new Date(),
        },
      },
    }),
    prisma.assignment.count({
      where: {
        course: {
          enrollments: {
            some: {
              studentId: userId,
            },
          },
        },
        isPublished: true,
        submissions: {
          none: {
            studentId: userId,
          },
        },
        dueDate: {
          gte: new Date(),
          lte: addDays(new Date(), 7),
        },
      },
    }),
    prisma.assignmentSubmission.findMany({
      where: {
        assignment: {
          course: {
            enrollments: {
              some: {
                studentId: userId,
              },
            },
          },
        },
        studentId: userId,
        isGraded: true,
      },
      include: {
        assignment: {
          select: {
            title: true,
            maxScore: true,
            course: {
              select: {
                code: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: { isGraded: "desc" },
      take: 5,
    }),
    prisma.enrollment.aggregate({
      where: { studentId: userId },
      _avg: { score: true },
      _sum: { score: true },
    }),
    prisma.course.aggregate({
      where: {
        enrollments: {
          some: {
            studentId: userId,
          },
        },
      },
      _sum: { credits: true },
    }),
    prisma.enrollment.aggregate({
      where: {
        studentId: userId,
        isCompleted: true,
      },
      _sum: { score: true },
    }),
  ]);

  return {
    totalCourses,
    inProgressCourses,
    completedCourses,
    pendingAssignments,
    upcomingDeadlines,
    recentGrades: recentGrades.length,
    averageGrade: averageGrade._avg.score || 0,
    totalCredits: totalCredits._sum.credits || 0,
    earnedCredits: earnedCredits._sum.score || 0,
  };
}

async function getEnrolledCourses(
  userId: string
): Promise<CourseWithProgress[]> {
  const courses = await prisma.enrollment.findMany({
    where: { studentId: userId },
    include: {
      course: {
        include: {
          instructor: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              photo: true,
            },
          },
          _count: {
            select: {
              assignments: true,
              lectures: true,
              portfolios: true,
            },
          },
        },
      },
    },
    orderBy: { lastAccessedAt: "desc" },
  });

  return courses.map((enrollment) => ({
    ...enrollment.course,
    progress: enrollment.progress,
    lastAccessedAt: enrollment.lastAccessedAt,
    instructor: enrollment.course.instructor,
    _count: enrollment.course._count,
  }));
}

async function getUpcomingAssignments(
  userId: string
): Promise<AssignmentWithDeadline[]> {
  const assignments = await prisma.assignment.findMany({
    where: {
      course: {
        enrollments: {
          some: {
            studentId: userId,
          },
        },
      },
      isPublished: true,
      dueDate: {
        gte: new Date(),
      },
    },
    include: {
      course: {
        select: {
          code: true,
          title: true,
        },
      },
      submissions: {
        where: {
          studentId: userId,
        },
        take: 1,
        orderBy: { submittedAt: "desc" },
      },
    },
    orderBy: { dueDate: "asc" },
    take: 5,
  });

  return assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    dueDate: assignment.dueDate,
    courseCode: assignment.course.code,
    courseTitle: assignment.course.title,
    isSubmitted: assignment.submissions.length > 0,
    isGraded: assignment.submissions[0]?.isGraded || false,
    score: assignment.submissions[0]?.score || null,
    maxScore: assignment.maxScore,
  }));
}

async function getRecentGrades(userId: string): Promise<RecentGrade[]> {
  const submissions = await prisma.assignmentSubmission.findMany({
    where: {
      assignment: {
        course: {
          enrollments: {
            some: {
              studentId: userId,
            },
          },
        },
      },
      studentId: userId,
      isGraded: true,
    },
    orderBy: { submittedAt: "desc" },
    take: 5,
    select: {
      id: true,
      submissionUrl: true,
      content: true,
      submittedAt: true,
      score: true,
      isGraded: true,
      assignmentId: true,
      gradedAt: true,
      assignment: {
        select: {
          title: true,
          maxScore: true,
          course: {
            select: {
              code: true,
              title: true,
            },
          },
        },
      },
    },
  });

  // Add gradedAt to each submission by querying it directly
  // If gradedAt is already a field on assignmentSubmission, add it to the select above:
  // select: { ..., gradedAt: true }

  return submissions.map((submission) => ({
    id: submission.id,
    assignmentTitle: submission.assignment.title,
    courseCode: submission.assignment.course.code,
    courseTitle: submission.assignment.course.title,
    score: submission.score || 0,
    maxScore: submission.assignment.maxScore,
    grade: submission.score
      ? submission.score >= submission.assignment.maxScore * 0.9
        ? "A"
        : submission.score >= submission.assignment.maxScore * 0.8
        ? "B"
        : submission.score >= submission.assignment.maxScore * 0.7
        ? "C"
        : submission.score >= submission.assignment.maxScore * 0.6
        ? "D"
        : "F"
      : "F",
    gradedAt: submission.gradedAt || new Date(),
  }));
}
