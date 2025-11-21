// app/p/s/assignments/page.tsx
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  FilterIcon,
  Search,
  ChevronDown,
  User,
  Home,
} from "lucide-react";
import { format, isPast, isFuture, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import AssignmentCard from "@/app/components/p/s/AssignmentCard";

export const metadata: Metadata = {
  title: "Assignments | Student Portal",
  description: "View and submit your course assignments",
};

interface AssignmentWithDetails {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  dueDate: Date;
  maxScore: number;
  allowedAttempts: number;
  assignmentUrl?: string | null;
  isPublished: boolean;
  allowLateSubmission: boolean;
  createdAt: Date;
  updatedAt: Date;
  course: {
    id: string;
    code: string;
    title: string;
  };
  submissions: Array<{
    id: string;
    submittedAt: Date;
    score?: number | null;
    feedback?: string | null;
    isGraded: boolean;
    isLate: boolean;
    attemptNumber: number;
  }>;
  _count: {
    submissions: number;
  };
}

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
};

type Session = {
  user?: SessionUser;
};

export default async function StudentAssignmentsPage({
  searchParams,
}: {
  searchParams: {
    course?: string;
    status?: string;
    search?: string;
    page?: string;
  };
}) {
  // Check if user is authenticated and is a student
  const session = (await getServerSession()) as Session;
  if (!session || session.user?.role !== "STUDENT") {
    redirect("/signin");
  }

  // Get student's enrollments
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: {
      enrollments: {
        include: {
          course: {
            include: {
              assignments: {
                where: { isPublished: true },
                include: {
                  submissions: {
                    where: { studentId: session.user.id },
                  },
                  _count: {
                    select: {
                      submissions: {
                        where: { studentId: session.user.id },
                      },
                    },
                  },
                },
                orderBy: { dueDate: "asc" },
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

  // Extract all assignments from enrolled courses
  const allAssignments = student.enrollments.flatMap((enrollment) =>
    enrollment.course.assignments.map((assignment) => ({
      ...assignment,
      course: enrollment.course,
      submissions: assignment.submissions ?? [], // Ensure submissions array exists
    }))
  );

  // Apply filters
  const filteredAssignments = filterAssignments(allAssignments, searchParams);
  const paginatedAssignments = paginateAssignments(
    filteredAssignments,
    searchParams.page
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Home className="h-4 w-4" />
          <span>Student Portal</span>
          <span>/</span>
          <span>Assignments</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold">My Assignments</h1>
          <p className="text-muted-foreground">
            View and submit your course assignments
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Assignments
              </p>
              <p className="text-2xl font-bold">{allAssignments.length}</p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Pending Submissions
              </p>
              <p className="text-2xl font-bold text-yellow-500">
                {
                  allAssignments.filter((a) => a._count.submissions === 0)
                    .length
                }
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Submitted
              </p>
              <p className="text-2xl font-bold text-blue-500">
                {allAssignments.filter((a) => a._count.submissions > 0).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Overdue
              </p>
              <p className="text-2xl font-bold text-red-500">
                {
                  allAssignments.filter(
                    (a) =>
                      isPast(new Date(a.dueDate)) && a._count.submissions === 0
                  ).length
                }
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
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
          action="/p/s/assignments"
          method="GET"
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div className="space-y-2">
            <label htmlFor="course" className="text-sm font-medium">
              Course
            </label>
            <select
              id="course"
              name="course"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={searchParams.course || ""}
            >
              <option value="">All Courses</option>
              {Array.from(new Set(allAssignments.map((a) => a.course.id))).map(
                (courseId) => {
                  const course = allAssignments.find(
                    (a) => a.course.id === courseId
                  )?.course;
                  return (
                    <option key={courseId} value={courseId}>
                      {course ? `${course.code} - ${course.title}` : courseId}
                    </option>
                  );
                }
              )}
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
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="graded">Graded</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="search" className="text-sm font-medium">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="search"
                name="search"
                type="text"
                placeholder="Search assignments..."
                className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm"
                defaultValue={searchParams.search || ""}
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => (window.location.href = "/p/s/assignments")}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              Clear Filters
            </button>
          </div>
        </form>
      </div>

      {/* Assignments List */}
      <div className="rounded-lg border bg-card">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Assignments</h2>

          {paginatedAssignments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No assignments found matching the current filters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedAssignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  studentId={session.user!.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredAssignments.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {paginatedAssignments.length} of{" "}
              {filteredAssignments.length} assignments
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const page = parseInt(searchParams.page || "1", 10);
                  if (page > 1) {
                    const params = new URLSearchParams(window.location.search);
                    params.set("page", (page - 1).toString());
                    window.location.href = `/p/s/assignments?${params.toString()}`;
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
                  const totalPages = Math.ceil(filteredAssignments.length / 10);
                  if (page < totalPages) {
                    const params = new URLSearchParams(window.location.search);
                    params.set("page", (page + 1).toString());
                    window.location.href = `/p/s/assignments?${params.toString()}`;
                  }
                }}
                disabled={
                  parseInt(searchParams.page || "1", 10) >=
                  Math.ceil(filteredAssignments.length / 10)
                }
                className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function filterAssignments(
  assignments: AssignmentWithDetails[],
  searchParams: { course?: string; status?: string; search?: string }
): AssignmentWithDetails[] {
  let filtered = assignments;

  // Filter by course
  if (searchParams.course) {
    filtered = filtered.filter((a) => a.course.id === searchParams.course);
  }

  // Filter by status
  if (searchParams.status) {
    const now = new Date();
    filtered = filtered.filter((assignment) => {
      switch (searchParams.status) {
        case "pending":
          return (
            assignment._count.submissions === 0 && !isPast(assignment.dueDate)
          );
        case "submitted":
          return (
            assignment._count.submissions > 0 &&
            !assignment.submissions[0]?.isGraded
          );
        case "graded":
          return assignment.submissions[0]?.isGraded;
        case "overdue":
          return (
            isPast(assignment.dueDate) && assignment._count.submissions === 0
          );
        default:
          return true;
      }
    });
  }

  // Filter by search
  if (searchParams.search) {
    const searchLower = searchParams.search.toLowerCase();
    filtered = filtered.filter(
      (assignment) =>
        assignment.title.toLowerCase().includes(searchLower) ||
        assignment.description?.toLowerCase().includes(searchLower) ||
        assignment.course.title.toLowerCase().includes(searchLower) ||
        assignment.course.code.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
}

function paginateAssignments(
  assignments: AssignmentWithDetails[],
  pageParam?: string
): AssignmentWithDetails[] {
  const page = parseInt(pageParam || "1", 10);
  const limit = 10;
  const startIndex = (page - 1) * limit;

  return assignments.slice(startIndex, startIndex + limit);
}
