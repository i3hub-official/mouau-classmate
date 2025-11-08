"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TeacherCourseService } from "@/lib/services/teachers/courseService";
import { TeacherAssignmentService } from "@/lib/services/teachers/assignmentService";
import { ArrowLeft, Calendar, FileText, Clock, CheckCircle, AlertCircle, BarChart3, Plus, Users, Edit, Eye, EyeOff } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  dueDate: Date;
  maxScore: number;
  isPublished: boolean;
  allowLateSubmission: boolean;
  allowedAttempts: number;
  assignmentUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  submissions: any[];
  _count?: {
    submissions: number;
  };
}

export default function TeacherCourseAssignmentsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'grading'>('all');

  useEffect(() => {
    loadCourseAndAssignments();
  }, [courseId]);

  const loadCourseAndAssignments = async () => {
    try {
      const teacherId = "temp-teacher-id"; // Replace with actual teacher ID from auth
      const courseData = await TeacherCourseService.getCourseDetails(courseId, teacherId);
      
      if (courseData) {
        setCourse(courseData);
        setAssignments(courseData.assignments || []);
      }
    } catch (error) {
      console.error("Failed to load course assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignmentPublish = async (assignmentId: string, publish: boolean) => {
    try {
      const teacherId = "temp-teacher-id"; // Replace with actual teacher ID from auth
      await TeacherAssignmentService.toggleAssignmentPublish(assignmentId, teacherId, publish);
      
      // Update local state
      setAssignments(prev => prev.map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, isPublished: publish }
          : assignment
      ));
    } catch (error) {
      console.error("Failed to toggle assignment publish status:", error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (dueDate: Date) => {
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    
    if (diff <= 0) return { text: "Overdue", color: "text-red-600" };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return { text: `${days}d left`, color: "text-green-600" };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return { text: `${hours}h left`, color: "text-amber-600" };
  };

  const getAssignmentStats = (assignment: Assignment) => {
    const totalSubmissions = assignment.submissions?.length || 0;
    const gradedSubmissions = assignment.submissions?.filter(sub => sub.isGraded).length || 0;
    const pendingGrading = totalSubmissions - gradedSubmissions;
    const submissionRate = course?.stats?.totalStudents ? (totalSubmissions / course.stats.totalStudents) * 100 : 0;

    return {
      totalSubmissions,
      gradedSubmissions,
      pendingGrading,
      submissionRate: Math.round(submissionRate)
    };
  };

  const filteredAssignments = assignments.filter(assignment => {
    switch (filter) {
      case 'published':
        return assignment.isPublished;
      case 'draft':
        return !assignment.isPublished;
      case 'grading':
        return assignment.isPublished && getAssignmentStats(assignment).pendingGrading > 0;
      default:
        return true;
    }
  });

  const stats = {
    total: assignments.length,
    published: assignments.filter(a => a.isPublished).length,
    draft: assignments.filter(a => !a.isPublished).length,
    needGrading: assignments.filter(a => 
      a.isPublished && getAssignmentStats(a).pendingGrading > 0
    ).length,
    totalSubmissions: assignments.reduce((acc, assignment) => 
      acc + (assignment.submissions?.length || 0), 0
    ),
    gradedSubmissions: assignments.reduce((acc, assignment) => 
      acc + (assignment.submissions?.filter(sub => sub.isGraded).length || 0), 0
    ),
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
        <h1 className="text-2xl font-bold text-foreground">Course Not Found</h1>
        <p className="text-muted-foreground mt-2">The course you're looking for doesn't exist.</p>
        <Link href="/teacher/courses" className="mt-4 inline-block text-primary hover:underline">
          Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/teacher/courses/${courseId}`}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Course Assignments
            </h1>
            <p className="text-muted-foreground mt-1">
              {course.code} • {course.title}
            </p>
          </div>
        </div>
        <Link
          href={`/teacher/assignments/create?courseId=${courseId}`}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          Create Assignment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.published}</div>
          <div className="text-sm text-muted-foreground">Published</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.draft}</div>
          <div className="text-sm text-muted-foreground">Draft</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.needGrading}</div>
          <div className="text-sm text-muted-foreground">Need Grading</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.totalSubmissions}</div>
          <div className="text-sm text-muted-foreground">Submissions</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border text-foreground hover:bg-muted'
          }`}
        >
          All ({stats.total})
        </button>
        <button
          onClick={() => setFilter('published')}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            filter === 'published'
              ? 'bg-green-100 text-green-800 border-green-200'
              : 'bg-card border-border text-foreground hover:bg-muted'
          }`}
        >
          Published ({stats.published})
        </button>
        <button
          onClick={() => setFilter('draft')}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            filter === 'draft'
              ? 'bg-amber-100 text-amber-800 border-amber-200'
              : 'bg-card border-border text-foreground hover:bg-muted'
          }`}
        >
          Draft ({stats.draft})
        </button>
        <button
          onClick={() => setFilter('grading')}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            filter === 'grading'
              ? 'bg-blue-100 text-blue-800 border-blue-200'
              : 'bg-card border-border text-foreground hover:bg-muted'
          }`}
        >
          Need Grading ({stats.needGrading})
        </button>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {filter === 'all' ? 'No Assignments' : `No ${filter} Assignments`}
            </h3>
            <p className="text-muted-foreground mb-4">
              {filter === 'all' 
                ? 'Create your first assignment for this course.' 
                : `There are no ${filter} assignments.`}
            </p>
            <Link
              href={`/teacher/assignments/create?courseId=${courseId}`}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create Assignment
            </Link>
          </div>
        ) : (
          filteredAssignments.map((assignment) => {
            const stats = getAssignmentStats(assignment);
            const timeRemaining = getTimeRemaining(assignment.dueDate);
            const isOverdue = new Date() > assignment.dueDate;

            return (
              <div
                key={assignment.id}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        assignment.isPublished 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {assignment.title}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            assignment.isPublished 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {assignment.isPublished ? 'Published' : 'Draft'}
                          </span>
                          {isOverdue && assignment.isPublished && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                              Overdue
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground line-clamp-2">
                          {assignment.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Due: {formatDate(assignment.dueDate)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BarChart3 size={14} />
                            <span>Max Score: {assignment.maxScore}</span>
                          </div>
                          {assignment.isPublished && (
                            <div className="flex items-center gap-1">
                              <Users size={14} />
                              <span>{stats.submissionRate}% submitted</span>
                            </div>
                          )}
                          {assignment.isPublished && (
                            <span className={timeRemaining.color}>
                              {timeRemaining.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Assignment Stats */}
                    {assignment.isPublished && (
                      <div className="bg-muted rounded-lg p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-semibold text-foreground">{stats.totalSubmissions}</div>
                            <div className="text-muted-foreground">Submissions</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-green-600">{stats.gradedSubmissions}</div>
                            <div className="text-muted-foreground">Graded</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-blue-600">{stats.pendingGrading}</div>
                            <div className="text-muted-foreground">Pending</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-purple-600">{stats.submissionRate}%</div>
                            <div className="text-muted-foreground">Submission Rate</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Link
                      href={`/teacher/assignments/${assignment.id}`}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-center text-sm"
                    >
                      View Details
                    </Link>
                    
                    <div className="flex gap-1">
                      <Link
                        href={`/teacher/assignments/${assignment.id}/edit`}
                        className="flex-1 px-3 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors text-center text-sm"
                        title="Edit Assignment"
                      >
                        <Edit size={14} className="inline" />
                      </Link>
                      
                      {assignment.isPublished ? (
                        <button
                          onClick={() => toggleAssignmentPublish(assignment.id, false)}
                          className="flex-1 px-3 py-2 border border-border text-amber-600 rounded-lg hover:bg-amber-50 transition-colors text-center text-sm"
                          title="Unpublish Assignment"
                        >
                          <EyeOff size={14} className="inline" />
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleAssignmentPublish(assignment.id, true)}
                          className="flex-1 px-3 py-2 border border-border text-green-600 rounded-lg hover:bg-green-50 transition-colors text-center text-sm"
                          title="Publish Assignment"
                        >
                          <Eye size={14} className="inline" />
                        </button>
                      )}
                    </div>

                    {assignment.isPublished && stats.pendingGrading > 0 && (
                      <Link
                        href={`/teacher/assignments/${assignment.id}/submissions`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center text-sm"
                      >
                        Grade ({stats.pendingGrading})
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}