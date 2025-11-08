// app/teacher/assignments/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { TeacherAssignmentService } from "@/lib/services/teachers/assignmentService";
import { 
  Plus, 
  Search, 
  Filter, 
  BookOpenIcon, 
  BookOpen, 
  Calendar,
  Users,
  MoreVertical,
  Edit,
  Eye,
  Download
} from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  maxScore: number;
  isPublished: boolean;
  course: {
    id: string;
    code: string;
    title: string;
  };
  submissions: any[];
}

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    courseId: "",
    isPublished: "",
    status: "" // upcoming, overdue, graded
  });

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const teacherId = "temp-teacher-id";
      const response = await TeacherAssignmentService.getTeacherAssignments(teacherId);
      setAssignments(
        response.assignments.map((a: any) => ({
          ...a,
          description: a.description === null ? undefined : a.description,
        }))
      );
    } catch (error) {
      console.error("Failed to load assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.course.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = !filters.courseId || assignment.course.id === filters.courseId;
    const matchesPublished = !filters.isPublished || 
                           (filters.isPublished === "published" && assignment.isPublished) ||
                           (filters.isPublished === "draft" && !assignment.isPublished);
    
    const now = new Date();
    const matchesStatus = !filters.status || 
                         (filters.status === "upcoming" && assignment.dueDate > now) ||
                         (filters.status === "overdue" && assignment.dueDate < now && assignment.submissions.some(s => !s.isGraded)) ||
                         (filters.status === "graded" && assignment.submissions.every(s => s.isGraded));

    return matchesSearch && matchesCourse && matchesPublished && matchesStatus;
  });

  const courses = Array.from(new Set(assignments.map(a => a.course)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Assignments
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage assignments for your courses
          </p>
        </div>
        <Link
          href="/teacher/assignments/create"
          className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          Create Assignment
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <input
            type="text"
            placeholder="Search assignments by title or course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={filters.courseId}
            onChange={(e) => setFilters(prev => ({ ...prev, courseId: e.target.value }))}
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
          >
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.code}
              </option>
            ))}
          </select>

          <select
            value={filters.isPublished}
            onChange={(e) => setFilters(prev => ({ ...prev, isPublished: e.target.value }))}
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
          >
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
          >
            <option value="">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="overdue">Overdue</option>
            <option value="graded">Graded</option>
          </select>
        </div>
      </div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssignments.map((assignment) => (
          <AssignmentCard key={assignment.id} assignment={assignment} />
        ))}
      </div>

      {filteredAssignments.length === 0 && (
        <div className="text-center py-12">
          <BookOpenIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No assignments found</h3>
          <p className="text-muted-foreground">
            {assignments.length === 0 
              ? "You haven't created any assignments yet. Get started by creating your first assignment."
              : "No assignments match your search criteria."
            }
          </p>
          {assignments.length === 0 && (
            <Link
              href="/teacher/assignments/create"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus size={20} />
              Create Your First Assignment
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const totalSubmissions = assignment.submissions.length;
  const gradedSubmissions = assignment.submissions.filter(s => s.isGraded).length;
  const pendingGrading = totalSubmissions - gradedSubmissions;
  const isOverdue = new Date(assignment.dueDate) < new Date() && pendingGrading > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-foreground text-lg">{assignment.title}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              assignment.isPublished 
                ? "bg-green-100 text-green-800" 
                : "bg-gray-100 text-gray-800"
            }`}>
              {assignment.isPublished ? "Published" : "Draft"}
            </span>
            {isOverdue && (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                Overdue
              </span>
            )}
          </div>
          <p className="text-foreground font-medium">{assignment.course.code}</p>
          <p className="text-sm text-muted-foreground mt-1">{assignment.course.title}</p>
        </div>
        
        <div className="dropdown">
          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
            <MoreVertical size={16} />
          </button>
          <div className="dropdown-menu">
            <Link href={`/teacher/assignments/${assignment.id}`} className="dropdown-item">
              <Eye size={16} />
              View Details
            </Link>
            <Link href={`/teacher/assignments/${assignment.id}/edit`} className="dropdown-item">
              <Edit size={16} />
              Edit Assignment
            </Link>
            <Link href={`/teacher/assignments/${assignment.id}/submissions`} className="dropdown-item">
              <Download size={16} />
              View Submissions
            </Link>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
        {assignment.description || "No description provided."}
      </p>

      {/* Assignment Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Due Date</span>
          </div>
          <p className="font-semibold text-foreground text-sm">
            {new Date(assignment.dueDate).toLocaleDateString()}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Submissions</span>
          </div>
          <p className="font-semibold text-foreground">{totalSubmissions}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <BookOpen size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Graded</span>
          </div>
          <p className="font-semibold text-foreground">{gradedSubmissions}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <BookOpenIcon size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Max Score</span>
          </div>
          <p className="font-semibold text-foreground">{assignment.maxScore}</p>
        </div>
      </div>

      {/* Progress Bar */}
      {totalSubmissions > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Grading Progress</span>
            <span>{Math.round((gradedSubmissions / totalSubmissions) * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all" 
              style={{ width: `${(gradedSubmissions / totalSubmissions) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Link
          href={`/teacher/assignments/${assignment.id}/submissions`}
          className="flex-1 text-center py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          {pendingGrading > 0 ? `Grade (${pendingGrading})` : 'View'}
        </Link>
        <Link
          href={`/teacher/assignments/${assignment.id}`}
          className="flex-1 text-center py-2 px-4 border border-border text-foreground rounded-lg hover:bg-muted transition-colors text-sm font-medium"
        >
          Details
        </Link>
      </div>
    </div>
  );
}