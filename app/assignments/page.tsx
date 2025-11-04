// app/assignments/page.tsx
"use client";
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import {
  Search,
  Filter,
  Plus,
  Calendar,
  Clock,
  FileText,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  Download,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import {
  AssignmentService,
  AssignmentWithRelations,
} from "@/lib/services/assignmentServices";

interface UserData {
  name?: string;
  matricNumber?: string;
  department?: string;
  email?: string;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentWithRelations[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<
    AssignmentWithRelations[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    submitted: 0,
    overdue: 0,
  });

  // Sample courses for filter (you can fetch these from your API)
  const courses = [
    "CSC 101 - Introduction to Computer Science",
    "MTH 101 - Elementary Mathematics",
    "PHY 101 - General Physics",
    "CHM 101 - Basic Chemistry",
    "STA 101 - Statistics",
  ];

  useEffect(() => {
    fetchAssignments();
    fetchUserData();
  }, []);

  useEffect(() => {
    filterAssignments();
    updateStats();
  }, [assignments, searchTerm, statusFilter, courseFilter]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      // This would come from your session/context
      const studentId = "student-id-from-session";
      const assignments = await AssignmentService.getAssignmentsByStudent(
        studentId
      );
      setAssignments(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      // Simulate user data fetch - replace with actual API call
      setUserData({
        name: "John Doe",
        matricNumber: "MOUAU/20/CS/001",
        department: "Computer Science",
        email: "john.doe@student.mouau.edu.ng",
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const filterAssignments = () => {
    let filtered = assignments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (assignment) =>
          assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assignment.course.title
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          assignment.course.code
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((assignment) => {
        const status = getAssignmentStatus(assignment);
        return status === statusFilter;
      });
    }

    // Course filter
    if (courseFilter !== "all") {
      filtered = filtered.filter(
        (assignment) => assignment.course.code === courseFilter.split(" - ")[0]
      );
    }

    setFilteredAssignments(filtered);
  };

  const updateStats = () => {
    const total = assignments.length;
    const pending = assignments.filter(
      (a) => getAssignmentStatus(a) === "pending"
    ).length;
    const submitted = assignments.filter(
      (a) => getAssignmentStatus(a) === "submitted"
    ).length;
    const overdue = assignments.filter(
      (a) => getAssignmentStatus(a) === "overdue"
    ).length;

    setStats({ total, pending, submitted, overdue });
  };

  const getAssignmentStatus = (assignment: AssignmentWithRelations): string => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);

    // Check if assignment has submissions
    const hasSubmission = assignment.submissions.length > 0;
    const isGraded = assignment.submissions.some((sub) => sub.isGraded);
    const isOverdue = dueDate < now && !hasSubmission;

    if (isGraded) return "graded";
    if (hasSubmission) return "submitted";
    if (isOverdue) return "overdue";
    return "pending";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "submitted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200";
      case "graded":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "submitted":
        return <CheckCircle2 className="h-4 w-4" />;
      case "overdue":
        return <AlertCircle className="h-4 w-4" />;
      case "graded":
        return <FileText className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDaysLeft = (dueDate: Date) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleSubmitAssignment = async (assignmentId: string) => {
    try {
      // This would open a submission modal or navigate to submission page
      console.log("Submit assignment:", assignmentId);
      // Implementation for submission would go here
    } catch (error) {
      console.error("Error submitting assignment:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader userData={userData ?? undefined} />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
     <DashboardHeader userData={userData ?? undefined} />

      {/* Main Content */}
      <main className="w-full px-6 xl:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Assignments
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage and track your academic assignments
            </p>
          </div>
          <button className="mt-4 lg:mt-0 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Submission
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.total}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Assignments
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.pending}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.submitted}
                </p>
                <p className="text-sm text-muted-foreground">Submitted</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.overdue}
                </p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Search assignments, courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="overdue">Overdue</option>
              <option value="graded">Graded</option>
            </select>

            {/* Course Filter */}
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>

            <button className="px-4 py-2 border border-border rounded-lg bg-background hover:bg-muted transition-colors flex items-center gap-2">
              <Filter className="h-4 w-4" />
              More Filters
            </button>
          </div>
        </div>

        {/* Assignments List */}
        <div className="space-y-4">
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No assignments found
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" || courseFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "You don't have any assignments yet"}
              </p>
            </div>
          ) : (
            filteredAssignments.map((assignment) => {
              const status = getAssignmentStatus(assignment);
              const dueDate = new Date(assignment.dueDate);
              const isOverdue = dueDate < new Date() && status === "pending";
              const daysLeft = getDaysLeft(assignment.dueDate);
              const submission = assignment.submissions[0];

              return (
                <div
                  key={assignment.id}
                  className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold text-foreground mb-1">
                            {assignment.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              <span>
                                {assignment.course.code} -{" "}
                                {assignment.course.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>Max Score: {assignment.maxScore}</span>
                            </div>
                            {assignment.teacher && (
                              <div className="flex items-center gap-1">
                                <span>
                                  By: {assignment.teacher.firstName}{" "}
                                  {assignment.teacher.lastName}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(
                              status
                            )}`}
                          >
                            {getStatusIcon(status)}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {assignment.description && (
                        <p className="text-muted-foreground mb-4 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Due: {formatDate(assignment.dueDate)} at{" "}
                              {formatTime(assignment.dueDate)}
                            </span>
                          </div>
                          {isOverdue ? (
                            <span className="text-red-600 font-medium">
                              Overdue
                            </span>
                          ) : status === "pending" ? (
                            <span className="text-orange-600 font-medium">
                              {daysLeft} days left
                            </span>
                          ) : submission?.score ? (
                            <span className="text-green-600 font-medium">
                              Grade: {submission.score}%
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                          {status === "pending" && (
                            <button
                              onClick={() =>
                                handleSubmitAssignment(assignment.id)
                              }
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Submit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
