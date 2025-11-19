// app/p/s/grades/page.tsx
import { Metadata } from "next";
import { checkStudentSession } from "@/lib/services/s/sessionService";
import { prisma } from "@/lib/server/prisma";
import {
  BookOpen,
  Calendar,
  TrendingUp,
  FilterIcon,
  ChevronDown,
  ChevronRight,
  Home,
  Award,
  BarChart3,
  FileText,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { format, isPast, subDays } from "date-fns";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Grades | Student Portal",
  description: "View your course grades and academic performance",
};

interface GradeWithDetails {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  courseCode: string;
  courseTitle: string;
  score: number;
  maxScore: number;
  grade: string;
  gradePoint: number;
  gradedAt: Date;
  feedback?: string | null;
  assignment: {
    dueDate: Date;
    maxScore: number;
    weight: number;
  };
}

interface CourseGrades {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  assignments: GradeWithDetails[];
  averageScore: number;
  averageGradePoint: number;
  totalWeight: number;
  earnedWeight: number;
  gradedAssignments: number;
  finalGrade?: string | null;
  finalGradePoint?: number | null;
}

interface GradeStats {
  gpa: number;
  totalCourses: number;
  completedCourses: number;
  currentSemester: number;
  totalCredits: number;
  earnedCredits: number;
  academicStanding: string;
}

export default async function StudentGradesPage({
  searchParams,
}: {
  searchParams: {
    course?: string;
    semester?: string;
    year?: string;
    page?: string;
  };
}) {
  // Check if user is authenticated and is a student
  const session = await checkStudentSession();

  // Get student's grades with filters
  if (!session.user) {
    throw new Error("User session not found.");
  }
  const gradesData = await getGradesData(session.user.id, searchParams);
  const gradeStats = await getGradeStats(session.user.id);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Home className="h-4 w-4" />
            <span>Student Portal</span>
            <span>/</span>
            <span>Grades</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold">My Grades</h1>
            <p className="text-muted-foreground">
              View your course grades and academic performance
            </p>
          </div>
        </div>

        {/* Grade Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">GPA</p>
                <p className="text-3xl font-bold text-blue-600">
                  {gradeStats.gpa.toFixed(2)}
                </p>
              </div>
              <Award className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Academic Standing
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {gradeStats.academicStanding}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Completed Courses
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {gradeStats.completedCourses}/{gradeStats.totalCourses}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Current Semester
                </p>
                <p className="text-2xl font-bold text-amber-600">
                  {gradeStats.currentSemester}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-amber-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Credits
                </p>
                <p className="text-2xl font-bold text-indigo-600">
                  {gradeStats.earnedCredits}/{gradeStats.totalCredits}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FilterIcon className="h-5 w-5 mr-2" />
            Filters
          </h2>
          <form
            action="/p/s/grades"
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
                {gradesData.courses.map((course) => (
                  <option key={course.courseId} value={course.courseId}>
                    {course.courseCode} - {course.courseTitle}
                  </option>
                ))}
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
              <label htmlFor="year" className="text-sm font-medium">
                Academic Year
              </label>
              <select
                id="year"
                name="year"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={searchParams.year || ""}
              >
                <option value="">All Years</option>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year.toString()}>
                      {year}/{year + 1}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => (window.location.href = "/p/s/grades")}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                Clear Filters
              </button>
            </div>
          </form>
        </div>

        {/* Course Grades */}
        <div className="space-y-6">
          {gradesData.courses.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No grades found matching the current filters.
              </p>
            </div>
          ) : (
            gradesData.courses.map((course) => (
              <div
                key={course.courseId}
                className="bg-white rounded-xl shadow-lg overflow-hidden"
              >
                {/* Course Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {course.courseCode}
                      </h3>
                      <p className="text-blue-100">{course.courseTitle}</p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center bg-white/20 rounded-full px-3 py-1 text-white text-sm font-medium">
                        {course.averageScore.toFixed(1)}/
                        {course.averageGradePoint.toFixed(1)}
                      </div>
                      <div className="text-white text-sm mt-1">
                        {course.finalGrade || "In Progress"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Course Stats */}
                <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {course.assignments.length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Assignments
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {course.gradedAssignments}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Graded Assignments
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {course.averageGradePoint.toFixed(1)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Avg. Grade Points
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="p-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Course Progress</span>
                      <span>
                        {course.totalWeight > 0
                          ? Math.round(
                              (course.earnedWeight / course.totalWeight) * 100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 bg-blue-600 rounded-full"
                        style={{
                          width: `${
                            course.totalWeight > 0
                              ? Math.round(
                                  (course.earnedWeight / course.totalWeight) *
                                    100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Assignment Grades Table */}
                <div className="p-6">
                  <h4 className="text-lg font-semibold mb-4">
                    Assignment Grades
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">
                            Assignment
                          </th>
                          <th className="text-left p-2 font-medium">
                            Due Date
                          </th>
                          <th className="text-left p-2 font-medium">Score</th>
                          <th className="text-left p-2 font-medium">Grade</th>
                          <th className="text-left p-2 font-medium">
                            Grade Points
                          </th>
                          <th className="text-left p-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {course.assignments.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="text-center p-4 text-muted-foreground"
                            >
                              No assignments found for this course.
                            </td>
                          </tr>
                        ) : (
                          course.assignments.map((assignment) => (
                            <tr
                              key={assignment.id}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="p-3">
                                <div className="font-medium">
                                  {assignment.assignmentTitle}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {assignment.assignment.weight > 0 &&
                                    `Weight: ${assignment.assignment.weight}%`}
                                </div>
                              </td>
                              <td className="p-3">
                                <div
                                  className={cn(
                                    "text-sm",
                                    isPast(assignment.assignment.dueDate) &&
                                      "text-red-500"
                                  )}
                                >
                                  {format(
                                    assignment.assignment.dueDate,
                                    "MMM dd, yyyy"
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="font-medium">
                                  {assignment.score}/{assignment.maxScore}
                                </div>
                              </td>
                              <td className="p-3">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                                    assignment.grade === "A" &&
                                      "bg-green-100 text-green-800",
                                    assignment.grade === "B" &&
                                      "bg-blue-100 text-blue-800",
                                    assignment.grade === "C" &&
                                      "bg-yellow-100 text-yellow-800",
                                    assignment.grade === "D" &&
                                      "bg-orange-100 text-orange-800",
                                    assignment.grade === "F" &&
                                      "bg-red-100 text-red-800"
                                  )}
                                >
                                  {assignment.grade}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="font-medium">
                                  {assignment.gradePoint}
                                </span>
                              </td>
                              <td className="p-3">
                                <button
                                  onClick={() => {
                                    window.location.href = `/p/s/assignments/${assignment.assignmentId}`;
                                  }}
                                  className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-1 text-sm"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Server-side data fetching functions
async function getGradesData(
  studentId: string,
  filters: { course?: string; semester?: string; year?: string }
): Promise<{ courses: CourseGrades[] }> {
  // Build where clause based on filters
  const where: any = {
    assignmentSubmissions: {
      some: {
        studentId,
        isGraded: true,
      },
    },
  };

  if (filters.course) {
    where.courseId = filters.course;
  }

  if (filters.semester) {
    where.course = {
      ...where.course,
      semester: parseInt(filters.semester),
    };
  }

  if (filters.year) {
    where.course = {
      ...where.course,
      assignments: {
        some: {
          createdAt: {
            gte: new Date(`${filters.year}-01-01`),
            lt: new Date(`${parseInt(filters.year) + 1}-01-01`),
          },
        },
      },
    };
  }

  // Get all courses with their assignments and grades
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId,
    },
    include: {
      course: {
        include: {
          assignments: {
            select: {
              id: true,
              title: true,
              dueDate: true,
              maxScore: true,
              weight: true,
              submissions: {
                where: {
                  studentId,
                  isGraded: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Process the data to calculate course statistics
  const courses: CourseGrades[] = enrollments.map((enrollment) => {
    const assignments = enrollment.course.assignments;
    const gradedAssignments = assignments.filter((assignment) =>
      assignment.submissions.some((submission) => submission.isGraded)
    );

    // Calculate average score and grade points
    let totalScore = 0;
    let totalGradePoints = 0;
    let totalWeight = 0;
    let earnedWeight = 0;

    const gradesWithDetails: GradeWithDetails[] = [];

    gradedAssignments.forEach((assignment) => {
      const submission = assignment.submissions.find((s) => s.isGraded);
      if (submission) {
        totalScore += submission.score || 0;
        // If 'grade' does not exist, compute it from the score and maxScore
        const grade =
          (submission as any).grade ??
          (assignment.maxScore && submission.score !== null
            ? getGradeFromScore(submission.score, assignment.maxScore)
            : "F");
        totalGradePoints += getGradePoints(grade);
        totalWeight += assignment.weight || 0;
        earnedWeight +=
          (submission.score || 0) >= assignment.maxScore * 0.6
            ? assignment.weight || 0
            : 0;

        gradesWithDetails.push({
          id: submission.id,
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          courseCode: enrollment.course.code,
          courseTitle: enrollment.course.title,
          score: submission.score || 0,
          maxScore: assignment.maxScore,
          grade:
            assignment.maxScore && submission.score !== null
              ? getGradeFromScore(submission.score, assignment.maxScore)
              : "F",
          gradePoint:
            assignment.maxScore && submission.score !== null
              ? getGradePoints(
                  getGradeFromScore(submission.score, assignment.maxScore)
                )
              : 0,
          gradedAt: submission.gradedAt || new Date(),
          feedback: submission.feedback,
          assignment: {
            dueDate: assignment.dueDate,
            maxScore: assignment.maxScore,
            weight: assignment.weight || 0,
          },
        });
      }
    });

    // Determine final grade based on earned weight
    let finalGrade = null;
    let finalGradePoint = null;

    if (totalWeight > 0) {
      const percentage = (earnedWeight / totalWeight) * 100;
      if (percentage >= 90) {
        finalGrade = "A";
        finalGradePoint = 4.0;
      } else if (percentage >= 80) {
        finalGrade = "B";
        finalGradePoint = 3.0;
      } else if (percentage >= 70) {
        finalGrade = "C";
        finalGradePoint = 2.0;
      } else if (percentage >= 60) {
        finalGrade = "D";
        finalGradePoint = 1.0;
      } else {
        finalGrade = "F";
        finalGradePoint = 0.0;
      }
    }

    return {
      courseId: enrollment.course.id,
      courseCode: enrollment.course.code,
      courseTitle: enrollment.course.title,
      assignments: gradesWithDetails,
      averageScore:
        gradedAssignments.length > 0
          ? totalScore / gradedAssignments.length
          : 0,
      averageGradePoint:
        gradedAssignments.length > 0
          ? totalGradePoints / gradedAssignments.length
          : 0,
      totalWeight,
      earnedWeight,
      gradedAssignments: gradedAssignments.length,
      finalGrade,
      finalGradePoint,
    };
  });

  return { courses };
}

async function getGradeStats(studentId: string): Promise<GradeStats> {
  // Get all enrollments for the student
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: {
      course: {
        include: {
          assignments: {
            include: {
              submissions: {
                where: {
                  studentId,
                  isGraded: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Calculate overall statistics
  let totalCourses = enrollments.length;
  let completedCourses = 0;
  let currentSemester = 1;
  let totalCredits = 0;
  let earnedCredits = 0;
  let totalGradePoints = 0;

  enrollments.forEach((enrollment) => {
    if (enrollment.isCompleted) {
      completedCourses++;
    }

    // Determine current semester (simplified)
    if (enrollment.course.semester > currentSemester) {
      currentSemester = enrollment.course.semester;
    }

    // Calculate credits
    totalCredits += enrollment.course.credits || 0;
    if (enrollment.isCompleted) {
      earnedCredits += enrollment.course.credits || 0;
    }

    // Calculate grade points
    enrollment.course.assignments.forEach((assignment) => {
      const submission = assignment.submissions.find((s) => s.isGraded);
      if (submission) {
        const grade =
          assignment.maxScore && submission.score !== null
            ? getGradeFromScore(submission.score, assignment.maxScore)
            : "F";
        totalGradePoints += getGradePoints(grade);
      }
    });
  });

  // Calculate GPA (simplified)
  const gpa = totalGradePoints > 0 ? totalGradePoints / totalCourses : 0;

  // Determine academic standing
  let academicStanding = "Excellent";
  if (gpa >= 3.7) {
    academicStanding = "Excellent";
  } else if (gpa >= 3.0) {
    academicStanding = "Very Good";
  } else if (gpa >= 2.7) {
    academicStanding = "Good";
  } else if (gpa >= 2.0) {
    academicStanding = "Satisfactory";
  } else {
    academicStanding = "Needs Improvement";
  }

  return {
    gpa,
    totalCourses,
    completedCourses,
    currentSemester,
    totalCredits,
    earnedCredits,
    academicStanding,
  };
}

function getGradePoints(grade: string): number {
  switch (grade) {
    case "A":
      return 4.0;
    case "B":
      return 3.0;
    case "C":
      return 2.0;
    case "D":
      return 1.0;
    case "F":
      return 0.0;
    default:
      return 0.0;
  }
}

function getGradeFromScore(score: number, maxScore: number): any {
  throw new Error("Function not implemented.");
}
