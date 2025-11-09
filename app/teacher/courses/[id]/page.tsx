// app/teacher/courses/[id]/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import {
  ArrowLeft,
  BookOpen,
  Users,
  BookOpenCheck,
  BarChart3,
  Calendar,
  Edit,
  Plus,
  FileText,
  Eye,
} from "lucide-react";

interface CourseDetails {
  id: string;
  code: string;
  title: string;
  description?: string;
  credits: number;
  level: number;
  semester: number;
  courseOutline?: string;
  isActive: boolean;
  instructor?: any;
  enrollments: any[];
  assignments: any[];
  lectures: any[];
  portfolios: any[];
  stats: any;
}

export default function CourseDetailsPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadCourseDetails();
  }, [courseId]);

  const loadCourseDetails = async () => {
   
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Course not found
        </h3>
        <p className="text-muted-foreground mb-4">
          The course you're looking for doesn't exist or you don't have access
          to it.
        </p>
        <Link
          href="/teacher/courses"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <ArrowLeft size={16} />
          Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/teacher/courses"
            className="p-2 hover:bg-muted rounded-lg transition-colors mt-1"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {course.code}
              </h1>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  course.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {course.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-lg text-foreground font-medium">
              {course.title}
            </p>
            <p className="text-muted-foreground mt-1">
              Level {course.level} •{" "}
              {course.semester === 1 ? "First" : "Second"} Semester •{" "}
              {course.credits} Credit Units
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-4 sm:mt-0">
          <Link
            href={`/teacher/courses/${courseId}/edit`}
            className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <Edit size={16} />
            Edit
          </Link>
          <Link
            href={`/teacher/courses/${courseId}/assignments/create`}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            New Assignment
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={course.stats.totalStudents}
          color="blue"
        />
        <StatCard
          icon={BookOpenCheck}
          label="Assignments"
          value={course.stats.totalAssignments}
          color="purple"
        />
        <StatCard
          icon={FileText}
          label="Lectures"
          value={course.stats.totalLectures}
          color="green"
        />
        <StatCard
          icon={BarChart3}
          label="Avg Score"
          value={`${course.stats.averageScore}%`}
          color="orange"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {[
            { id: "overview", label: "Overview" },
            {
              id: "students",
              label: `Students (${course.enrollments.length})`,
            },
            {
              id: "assignments",
              label: `Assignments (${course.assignments.length})`,
            },
            { id: "lectures", label: `Lectures (${course.lectures.length})` },
            {
              id: "portfolios",
              label: `Portfolios (${course.portfolios.length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === "overview" && <OverviewTab course={course} />}
        {activeTab === "students" && (
          <StudentsTab enrollments={course.enrollments} />
        )}
        {activeTab === "assignments" && (
          <AssignmentsTab
            assignments={course.assignments}
            courseId={courseId}
          />
        )}
        {activeTab === "lectures" && (
          <LecturesTab lectures={course.lectures} courseId={courseId} />
        )}
        {activeTab === "portfolios" && (
          <PortfoliosTab portfolios={course.portfolios} />
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: "blue" | "purple" | "green" | "orange";
}) {
  const colorClasses: Record<"blue" | "purple" | "green" | "orange", string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    purple: "bg-purple-50 border-purple-200 text-purple-600",
    green: "bg-green-50 border-green-200 text-green-600",
    orange: "bg-orange-50 border-orange-200 text-orange-600",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ course }: { course: CourseDetails }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Course Description */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Course Description
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {course.description || "No description provided."}
          </p>
        </div>

        {/* Course Outline */}
        {course.courseOutline && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Course Outline
            </h3>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-muted-foreground">
                {course.courseOutline}
              </pre>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Enrollment Statistics */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Enrollment Stats
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Students:</span>
              <span className="font-medium">
                {course.stats.enrollmentStats.total}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed:</span>
              <span className="font-medium">
                {course.stats.enrollmentStats.completed}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">In Progress:</span>
              <span className="font-medium">
                {course.stats.enrollmentStats.inProgress}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completion Rate:</span>
              <span className="font-medium">
                {Math.round(course.stats.enrollmentStats.completionRate)}%
              </span>
            </div>
          </div>
        </div>

        {/* Assignment Statistics */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Assignment Stats
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Assignments:</span>
              <span className="font-medium">
                {course.stats.assignmentStats.total}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Published:</span>
              <span className="font-medium">
                {course.stats.assignmentStats.published}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Submissions:</span>
              <span className="font-medium">
                {course.stats.assignmentStats.totalSubmissions}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Grading Progress:</span>
              <span className="font-medium">
                {Math.round(course.stats.assignmentStats.gradingProgress)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentsTab({ enrollments }: { enrollments: any[] }) {
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">
          Enrolled Students ({enrollments.length})
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 font-medium text-foreground">
                Student
              </th>
              <th className="text-left p-4 font-medium text-foreground">
                Matric Number
              </th>
              <th className="text-left p-4 font-medium text-foreground">
                Progress
              </th>
              <th className="text-left p-4 font-medium text-foreground">
                Grade
              </th>
              <th className="text-left p-4 font-medium text-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((enrollment) => (
              <tr
                key={enrollment.id}
                className="border-b border-border hover:bg-muted/50"
              >
                <td className="p-4">
                  <div>
                    <p className="font-medium text-foreground">
                      {enrollment.student.firstName}{" "}
                      {enrollment.student.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {enrollment.student.email}
                    </p>
                  </div>
                </td>
                <td className="p-4 text-foreground">
                  {enrollment.student.matricNumber}
                </td>
                <td className="p-4">
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${enrollment.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-muted-foreground mt-1">
                    {Math.round(enrollment.progress)}%
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      enrollment.grade === "A"
                        ? "bg-green-100 text-green-800"
                        : enrollment.grade === "B"
                        ? "bg-blue-100 text-blue-800"
                        : enrollment.grade === "C"
                        ? "bg-yellow-100 text-yellow-800"
                        : enrollment.grade === "D"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {enrollment.grade || "N/A"}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      enrollment.isCompleted
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {enrollment.isCompleted ? "Completed" : "In Progress"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {enrollments.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No students enrolled in this course yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AssignmentsTab({
  assignments,
  courseId,
}: {
  assignments: any[];
  courseId: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">
          Course Assignments ({assignments.length})
        </h3>
        <Link
          href={`/teacher/courses/${courseId}/assignments/create`}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus size={16} />
          New Assignment
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-semibold text-foreground">
                {assignment.title}
              </h4>
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  assignment.isPublished
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {assignment.isPublished ? "Published" : "Draft"}
              </span>
            </div>

            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {assignment.description || "No description"}
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date:</span>
                <span className="font-medium">
                  {new Date(assignment.dueDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submissions:</span>
                <span className="font-medium">
                  {assignment.submissions.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Score:</span>
                <span className="font-medium">{assignment.maxScore}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Link
                href={`/teacher/assignments/${assignment.id}`}
                className="flex-1 text-center py-2 px-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm"
              >
                View
              </Link>
              <Link
                href={`/teacher/assignments/${assignment.id}/edit`}
                className="flex-1 text-center py-2 px-3 border border-border text-foreground rounded-lg hover:bg-muted text-sm"
              >
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-12">
          <BookOpenCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            No assignments created for this course yet.
          </p>
          <Link
            href={`/teacher/courses/${courseId}/assignments/create`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus size={16} />
            Create First Assignment
          </Link>
        </div>
      )}
    </div>
  );
}

function LecturesTab({
  lectures,
  courseId,
}: {
  lectures: any[];
  courseId: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">
          Course Lectures ({lectures.length})
        </h3>
        <Link
          href={`/teacher/courses/${courseId}/lectures/create`}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus size={16} />
          New Lecture
        </Link>
      </div>

      <div className="space-y-3">
        {lectures.map((lecture) => (
          <div
            key={lecture.id}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                    Lecture {lecture.orderIndex + 1}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      lecture.isPublished
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {lecture.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                <h4 className="font-semibold text-foreground mb-2">
                  {lecture.title}
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {lecture.description || "No description"}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {lecture.duration && (
                    <span>Duration: {lecture.duration} mins</span>
                  )}
                  <span>Submissions: {lecture.submissions.length}</span>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Link
                  href={`/teacher/lectures/${lecture.id}`}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Eye size={16} />
                </Link>
                <Link
                  href={`/teacher/lectures/${lecture.id}/edit`}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Edit size={16} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {lectures.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            No lectures created for this course yet.
          </p>
          <Link
            href={`/teacher/courses/${courseId}/lectures/create`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus size={16} />
            Create First Lecture
          </Link>
        </div>
      )}
    </div>
  );
}

function PortfoliosTab({ portfolios }: { portfolios: any[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        Student Portfolios ({portfolios.length})
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {portfolios.map((portfolio) => (
          <div
            key={portfolio.id}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="mb-3">
              <h4 className="font-semibold text-foreground mb-1">
                {portfolio.title}
              </h4>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {portfolio.description || "No description"}
              </p>
            </div>

            <div className="space-y-2 text-sm mb-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Student:</span>
                <span className="font-medium">
                  {portfolio.student.firstName} {portfolio.student.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submitted:</span>
                <span className="font-medium">
                  {new Date(portfolio.submittedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    portfolio.isPublished
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {portfolio.isPublished ? "Published" : "Draft"}
                </span>
              </div>
            </div>

            {portfolio.technologies && portfolio.technologies.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {portfolio.technologies
                  .slice(0, 3)
                  .map((tech: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs"
                    >
                      {tech}
                    </span>
                  ))}
                {portfolio.technologies.length > 3 && (
                  <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                    +{portfolio.technologies.length - 3} more
                  </span>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {portfolio.projectUrl && (
                <a
                  href={portfolio.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2 px-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm"
                >
                  View Project
                </a>
              )}
              <button className="flex-1 py-2 px-3 border border-border text-foreground rounded-lg hover:bg-muted text-sm">
                Review
              </button>
            </div>
          </div>
        ))}
      </div>

      {portfolios.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No portfolio submissions yet.</p>
        </div>
      )}
    </div>
  );
}
