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

interface Assignment {
  id: string;
  title: string;
  course: string;
  courseCode: string;
  dueDate: string;
  dueTime: string;
  status: "pending" | "submitted" | "overdue" | "graded";
  description: string;
  points: number;
  submitted?: boolean;
  submissionDate?: string;
  grade?: number;
  attachments: number;
}

interface UserData {
  name?: string;
  matricNumber?: string;
  department?: string;
  email?: string;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [userData, setUserData] = useState<UserData | null>(null);

  // Sample courses for filter
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
  }, [assignments, searchTerm, statusFilter, courseFilter]);

  const fetchAssignments = async () => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Sample data
      const sampleAssignments: Assignment[] = [
        {
          id: "1",
          title: "Data Structures Implementation",
          course: "Introduction to Computer Science",
          courseCode: "CSC 101",
          dueDate: "2024-12-15",
          dueTime: "23:59",
          status: "pending",
          description:
            "Implement linked list and binary search tree data structures with proper documentation.",
          points: 100,
          attachments: 2,
        },
        {
          id: "2",
          title: "Calculus Problem Set",
          course: "Elementary Mathematics",
          courseCode: "MTH 101",
          dueDate: "2024-12-10",
          dueTime: "17:00",
          status: "overdue",
          description:
            "Solve the following calculus problems involving derivatives and integrals.",
          points: 50,
          attachments: 1,
        },
        {
          id: "3",
          title: "Physics Lab Report",
          course: "General Physics",
          courseCode: "PHY 101",
          dueDate: "2024-12-20",
          dueTime: "14:00",
          status: "submitted",
          description:
            "Write a comprehensive lab report on Newton's Laws of Motion experiment.",
          points: 75,
          submitted: true,
          submissionDate: "2024-12-18",
          attachments: 3,
        },
        {
          id: "4",
          title: "Chemical Bonding Assignment",
          course: "Basic Chemistry",
          courseCode: "CHM 101",
          dueDate: "2024-12-12",
          dueTime: "16:30",
          status: "graded",
          description:
            "Explain different types of chemical bonds with examples and diagrams.",
          points: 60,
          submitted: true,
          submissionDate: "2024-12-10",
          grade: 85,
          attachments: 2,
        },
        {
          id: "5",
          title: "Statistical Analysis",
          course: "Statistics",
          courseCode: "STA 101",
          dueDate: "2024-12-25",
          dueTime: "23:59",
          status: "pending",
          description:
            "Analyze the given dataset and provide statistical insights using R or Python.",
          points: 100,
          attachments: 4,
        },
      ];

      setAssignments(sampleAssignments);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      // Simulate user data fetch
      await new Promise((resolve) => setTimeout(resolve, 500));
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
          assignment.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assignment.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (assignment) => assignment.status === statusFilter
      );
    }

    // Course filter
    if (courseFilter !== "all") {
      filtered = filtered.filter(
        (assignment) => assignment.courseCode === courseFilter.split(" - ")[0]
      );
    }

    setFilteredAssignments(filtered);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = (dueDate: string, dueTime: string) => {
    const due = new Date(`${dueDate}T${dueTime}`);
    return due < new Date();
  };

  const getDaysLeft = (dueDate: string, dueTime: string) => {
    const due = new Date(`${dueDate}T${dueTime}`);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
                  {assignments.length}
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
                  {assignments.filter((a) => a.status === "pending").length}
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
                  {
                    assignments.filter(
                      (a) => a.status === "submitted" || a.status === "graded"
                    ).length
                  }
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
                  {assignments.filter((a) => a.status === "overdue").length}
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
            filteredAssignments.map((assignment) => (
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
                              {assignment.courseCode} - {assignment.course}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            <span>{assignment.attachments} file(s)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Points: {assignment.points}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(
                            assignment.status
                          )}`}
                        >
                          {getStatusIcon(assignment.status)}
                          {assignment.status.charAt(0).toUpperCase() +
                            assignment.status.slice(1)}
                        </span>
                        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {assignment.description}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Due: {formatDate(assignment.dueDate)} at{" "}
                            {assignment.dueTime}
                          </span>
                        </div>
                        {isOverdue(assignment.dueDate, assignment.dueTime) ? (
                          <span className="text-red-600 font-medium">
                            Overdue
                          </span>
                        ) : assignment.status === "pending" ? (
                          <span className="text-orange-600 font-medium">
                            {getDaysLeft(
                              assignment.dueDate,
                              assignment.dueTime
                            )}{" "}
                            days left
                          </span>
                        ) : assignment.grade ? (
                          <span className="text-green-600 font-medium">
                            Grade: {assignment.grade}%
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                        {assignment.status === "pending" && (
                          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Submit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
