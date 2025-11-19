// app/p/s/courses/page.tsx
import { Metadata } from "next";
import { getServerSession, Session } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
import {
  BookOpen,
  Calendar,
  Clock,
  Users,
  Play,
  CheckCircle,
  Star,
  TrendingUp,
  Search,
  FilterIcon,
  Home,
  User,
  Award,
  BarChart3,
} from "lucide-react";
import { format, isPast, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Courses | Student Portal",
  description: "View your enrolled courses and track progress",
};

interface CourseWithDetails {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  credits: number;
  level: number;
  semester: number;
  courseOutline?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  instructor?: {
    id: string;
    firstName?: string | null;
    surname?: string | null;
    otherName?: string | null;
    photo?: string | null;
  } | null;
  enrollment: {
    id: string;
    dateEnrolled: Date;
    isCompleted: boolean;
    completionDate?: Date | null;
    grade?: string | null;
    score?: number | null;
    progress: number;
    lastAccessedAt?: Date | null;
  };
  _count: {
    lectures: number;
    assignments: number;
    portfolios: number;
  };
}

export default async function StudentCoursesPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    level?: string;
    semester?: string;
    status?: string;
    page?: string;
  };
}) {
  // Check if user is authenticated and is a student
  const session = (await getServerSession()) as Session & {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      id?: string;
    };
  };

  if (!session || session.user?.role !== "STUDENT") {
    redirect("/signin");
  }

  // Get student's enrolled courses
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: {
      enrollments: {
        include: {
          course: {
            include: {
              instructor: {
                select: {
                  id: true,
                  firstName: true,
                  surname: true,
                  otherName: true,
                  photo: true,
                },
              },
              _count: {
                select: {
                  lectures: true,
                  assignments: true,
                  portfolios: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!student) {
    redirect("/signin");
  }

  // Extract courses from enrollments
  const allCourses = student.enrollments.map((enrollment) => ({
    ...enrollment.course,
    enrollment: enrollment,
    instructor: enrollment.course.instructor,
    _count: enrollment.course._count,
  }));

  // Apply filters
  const filteredCourses = filterCourses(allCourses, searchParams);
  const paginatedCourses = paginateCourses(filteredCourses, searchParams.page);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Home className="h-4 w-4" />
          <span>Student Portal</span>
          <span>/</span>
          <span>Courses</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">
            View your enrolled courses and track progress
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Enrolled Courses
              </p>
              <p className="text-2xl font-bold">{allCourses.length}</p>
            </div>
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                In Progress
              </p>
              <p className="text-2xl font-bold text-blue-500">
                {allCourses.filter((c) => !c.enrollment.isCompleted).length}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Completed
              </p>
              <p className="text-2xl font-bold text-green-500">
                {allCourses.filter((c) => c.enrollment.isCompleted).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Average Progress
              </p>
              <p className="text-2xl font-bold text-purple-500">
                {allCourses.length > 0
                  ? Math.round(
                      allCourses.reduce(
                        (sum, c) => sum + c.enrollment.progress,
                        0
                      ) / allCourses.length
                    )
                  : 0}
                %
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <FilterIcon className="h-5 w-5 mr-2" />
          Filters
        </h2>
        <form
          action="/p/s/courses"
          method="GET"
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div className="space-y-2">
            <label htmlFor="search" className="text-sm font-medium">
              Search Courses
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="search"
                name="search"
                type="text"
                placeholder="Search by title or code..."
                className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm"
                defaultValue={searchParams.search || ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="level" className="text-sm font-medium">
              Level
            </label>
            <select
              id="level"
              name="level"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={searchParams.level || ""}
            >
              <option value="">All Levels</option>
              <option value="100">100 Level</option>
              <option value="200">200 Level</option>
              <option value="300">300 Level</option>
              <option value="400">400 Level</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="semester" className="text-sm font-medium">
              Semester
            </label>
            <select
              id="semester"
              name="semester"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={searchParams.semester || ""}
            >
              <option value="">All Semesters</option>
              <option value="1">First Semester</option>
              <option value="2">Second Semester</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <select
              id="status"
              name="status"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={searchParams.status || ""}
            >
              <option value="">All Status</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="not-started">Not Started</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => (window.location.href = "/p/s/courses")}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              Clear Filters
            </button>
          </div>
        </form>
      </div>

      {/* Courses Grid */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-6">Courses</h2>

        {paginatedCourses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No courses found matching the current filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredCourses.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 border-t bg-card">
          <div className="text-sm text-muted-foreground">
            Showing {paginatedCourses.length} of {filteredCourses.length}{" "}
            courses
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const page = parseInt(searchParams.page || "1", 10);
                if (page > 1) {
                  const params = new URLSearchParams(window.location.search);
                  params.set("page", (page - 1).toString());
                  window.location.href = `/p/s/courses?${params.toString()}`;
                }
              }}
              disabled={parseInt(searchParams.page || "1", 10) <= 1}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm px-3">
              Page {searchParams.page || "1"}
            </span>
            <button
              onClick={() => {
                const page = parseInt(searchParams.page || "1", 10);
                const totalPages = Math.ceil(filteredCourses.length / 9);
                if (page < totalPages) {
                  const params = new URLSearchParams(window.location.search);
                  params.set("page", (page + 1).toString());
                  window.location.href = `/p/s/courses?${params.toString()}`;
                }
              }}
              disabled={
                parseInt(searchParams.page || "1", 10) >=
                Math.ceil(filteredCourses.length / 9)
              }
              className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: CourseWithDetails }) {
  const isInProgress =
    !course.enrollment.isCompleted && course.enrollment.progress > 0;
  const isCompleted = course.enrollment.isCompleted;
  const isNotStarted = course.enrollment.progress === 0;

  const getProgressColor = () => {
    if (isCompleted) return "bg-green-500";
    if (isInProgress) return "bg-blue-500";
    return "bg-gray-500";
  };

  const getStatusText = () => {
    if (isCompleted) return "Completed";
    if (isInProgress) return "In Progress";
    return "Not Started";
  };

  return (
    <div className="group rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      {/* Course Header */}
      <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative h-full flex items-center justify-center">
          <BookOpen className="h-16 w-16 text-white/80" />
        </div>
      </div>

      {/* Course Info */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-semibold">
                {course.code}
              </span>
              <h3 className="text-lg font-semibold line-clamp-1">
                {course.title}
              </h3>
            </div>

            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Award className="h-4 w-4" />
                <span>{course.credits} Credits</span>
              </div>
              <div className="flex items-center space-x-1">
                <BarChart3 className="h-4 w-4" />
                <span>Level {course.level}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Semester {course.semester}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-400" fill="currentColor" />
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
        </div>

        <p className="text-muted-foreground mb-4 line-clamp-2">
          {course.description}
        </p>

        {/* Instructor Info */}
        {course.instructor && (
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 mb-4">
            {course.instructor.photo ? (
              <Image
                src={course.instructor.photo}
                alt={course.instructor.firstName || "Instructor"}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-5 w-5 text-gray-500" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium">
                {course.instructor.firstName} {course.instructor.surname}
              </p>
              <p className="text-xs text-muted-foreground">Instructor</p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{course.enrollment.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                getProgressColor()
              )}
              style={{ width: `${course.enrollment.progress}%` }}
            />
          </div>
        </div>

        {/* Course Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-500">
              {course._count.lectures}
            </p>
            <p className="text-xs text-muted-foreground">Lectures</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-500">
              {course._count.assignments}
            </p>
            <p className="text-xs text-muted-foreground">Assignments</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">
              {course._count.portfolios}
            </p>
            <p className="text-xs text-muted-foreground">Portfolios</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => {
              window.location.href = `/p/s/courses/${course.id}`;
            }}
            className="flex-1 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <Play className="h-4 w-4 mr-2" />
            Continue Learning
          </button>
          <button
            onClick={() => {
              window.location.href = `/p/s/courses/${course.id}/progress`;
            }}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Progress
          </button>
        </div>
      </div>
    </div>
  );
}

function filterCourses(
  courses: CourseWithDetails[],
  searchParams: {
    search?: string;
    level?: string;
    semester?: string;
    status?: string;
  }
): CourseWithDetails[] {
  let filtered = courses;

  // Filter by search
  if (searchParams.search) {
    const searchLower = searchParams.search.toLowerCase();
    filtered = filtered.filter(
      (course) =>
        course.title.toLowerCase().includes(searchLower) ||
        course.code.toLowerCase().includes(searchLower) ||
        course.description?.toLowerCase().includes(searchLower)
    );
  }

  // Filter by level
  if (searchParams.level) {
    filtered = filtered.filter(
      (c) => c.level.toString() === searchParams.level
    );
  }

  // Filter by semester
  if (searchParams.semester) {
    filtered = filtered.filter(
      (c) => c.semester.toString() === searchParams.semester
    );
  }

  // Filter by status
  if (searchParams.status) {
    filtered = filtered.filter((course) => {
      switch (searchParams.status) {
        case "in-progress":
          return (
            !course.enrollment.isCompleted && course.enrollment.progress > 0
          );
        case "completed":
          return course.enrollment.isCompleted;
        case "not-started":
          return course.enrollment.progress === 0;
        default:
          return true;
      }
    });
  }

  return filtered;
}

function paginateCourses(
  courses: CourseWithDetails[],
  pageParam?: string
): CourseWithDetails[] {
  const page = parseInt(pageParam || "1", 10);
  const limit = 9;
  const startIndex = (page - 1) * limit;

  return courses.slice(startIndex, startIndex + limit);
}
