// app/courses/[id]/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  BookOpen,
  Calendar,
  FileText,
  Users,
  Clock,
  Download,
  PlayCircle,
  ChevronRight,
  BarChart3,
  MessageCircle,
  Star,
} from "lucide-react";
import { DashboardHeader } from "@/app/components/DashboardHeader";

interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  instructor: string;
  credits: number;
  level: number;
  semester: number;
  progress: number;
  color: string;
}

interface Lecture {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: "video" | "reading" | "assignment";
  completed: boolean;
  resources: number;
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  status: "pending" | "submitted" | "graded";
  score?: number;
  maxScore: number;
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeTab, setActiveTab] = useState("lectures");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      // Simulate API calls
      setTimeout(() => {
        const mockCourse: Course = {
          id: courseId,
          code: "CSC 401",
          title: "Advanced Programming",
          description:
            "This course covers advanced programming concepts including object-oriented programming, data structures, algorithms, and software design patterns. Students will learn to develop complex applications using modern programming paradigms.",
          instructor: "Dr. Johnson",
          credits: 3,
          level: 400,
          semester: 1,
          progress: 75,
          color: "blue",
        };

        const mockLectures: Lecture[] = [
          {
            id: "1",
            title: "Introduction to OOP",
            description: "Understanding object-oriented programming principles",
            duration: "45 min",
            type: "video",
            completed: true,
            resources: 3,
          },
          {
            id: "2",
            title: "Data Structures Overview",
            description: "Arrays, Linked Lists, Stacks, and Queues",
            duration: "60 min",
            type: "video",
            completed: true,
            resources: 2,
          },
          {
            id: "3",
            title: "Algorithm Analysis",
            description: "Time and space complexity analysis",
            duration: "50 min",
            type: "reading",
            completed: false,
            resources: 4,
          },
          {
            id: "4",
            title: "Programming Assignment 1",
            description: "Implement a linked list with basic operations",
            duration: "Assignment",
            type: "assignment",
            completed: false,
            resources: 1,
          },
        ];

        const mockAssignments: Assignment[] = [
          {
            id: "1",
            title: "Linked List Implementation",
            dueDate: "2024-01-15",
            status: "submitted",
            score: 85,
            maxScore: 100,
          },
          {
            id: "2",
            title: "Algorithm Analysis Report",
            dueDate: "2024-01-22",
            status: "pending",
            maxScore: 100,
          },
          {
            id: "3",
            title: "Final Project Proposal",
            dueDate: "2024-02-01",
            status: "pending",
            maxScore: 50,
          },
        ];

        setCourse(mockCourse);
        setLectures(mockLectures);
        setAssignments(mockAssignments);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error fetching course data:", error);
      setLoading(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: "from-blue-500 to-blue-600",
      green: "from-green-500 to-green-600",
      purple: "from-purple-500 to-purple-600",
      orange: "from-orange-500 to-orange-600",
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const getStatusColor = (status: string) => {
    const statusMap = {
      pending: "bg-yellow-100 text-yellow-800",
      submitted: "bg-blue-100 text-blue-800",
      graded: "bg-green-100 text-green-800",
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  // Loading state
 if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardHeader />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">
              Loading courses...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Course not found
          </h3>
          <p className="text-muted-foreground">
            The course you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="w-full px-6 xl:px-8 py-8">
        {/* Course Header */}
        <div
          className={`bg-linear-to-r ${getColorClasses(
            course.color
          )} rounded-2xl p-8 text-white mb-8`}
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                <span>Level {course.level}</span>
                <span>•</span>
                <span>{course.credits} Credits</span>
                <span>•</span>
                <span>Semester {course.semester}</span>
              </div>
              <h1 className="text-3xl font-bold mb-2">{course.code}</h1>
              <h2 className="text-xl text-white/90 mb-4">{course.title}</h2>
              <p className="text-white/80 max-w-2xl">{course.description}</p>
            </div>
            <div className="mt-4 lg:mt-0 lg:ml-8">
              <div className="bg-white/20 rounded-lg p-4 text-center">
                <p className="text-sm text-white/80 mb-1">Course Progress</p>
                <p className="text-2xl font-bold">{course.progress}%</p>
                <div className="w-full bg-white/30 rounded-full h-2 mt-2">
                  <div
                    className="bg-white h-2 rounded-full"
                    style={{ width: `${course.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructor Info */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Instructor</h3>
              <p className="text-muted-foreground">{course.instructor}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-border mb-8">
          <nav className="flex space-x-8">
            {[
              { id: "lectures", label: "Lectures", icon: PlayCircle },
              { id: "assignments", label: "Assignments", icon: FileText },
              { id: "grades", label: "Grades", icon: BarChart3 },
              { id: "discussion", label: "Discussion", icon: MessageCircle },
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-3">
            {activeTab === "lectures" && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground mb-6">
                  Course Lectures
                </h3>
                {lectures.map((lecture) => (
                  <div
                    key={lecture.id}
                    className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          lecture.completed
                            ? "bg-green-100 text-green-600"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {lecture.type === "video" && (
                          <PlayCircle className="h-6 w-6" />
                        )}
                        {lecture.type === "reading" && (
                          <BookOpen className="h-6 w-6" />
                        )}
                        {lecture.type === "assignment" && (
                          <FileText className="h-6 w-6" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-foreground">
                            {lecture.title}
                          </h4>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                              {lecture.duration}
                            </span>
                            {lecture.completed && (
                              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-muted-foreground text-sm mb-3">
                          {lecture.description}
                        </p>
                        <div className="flex items-center gap-4">
                          <button className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium">
                            <PlayCircle className="h-4 w-4" />
                            Start{" "}
                            {lecture.type === "video"
                              ? "Lecture"
                              : lecture.type === "reading"
                              ? "Reading"
                              : "Assignment"}
                          </button>
                          {lecture.resources > 0 && (
                            <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
                              <Download className="h-4 w-4" />
                              Resources ({lecture.resources})
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "assignments" && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground mb-6">
                  Assignments
                </h3>
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">
                          {assignment.title}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Due: {assignment.dueDate}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            Max Score: {assignment.maxScore}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          assignment.status
                        )}`}
                      >
                        {assignment.status.charAt(0).toUpperCase() +
                          assignment.status.slice(1)}
                      </span>
                    </div>
                    {assignment.score && (
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            Your Score
                          </span>
                          <span className="text-lg font-bold text-primary">
                            {assignment.score}/{assignment.maxScore}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3 mt-4">
                      <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                        {assignment.status === "pending"
                          ? "Submit Assignment"
                          : "View Submission"}
                      </button>
                      <button className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors">
                        Download Instructions
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add other tab contents similarly */}
            {activeTab === "grades" && (
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Grades Overview
                </h3>
                <p className="text-muted-foreground">
                  Your grades and performance analytics will appear here.
                </p>
              </div>
            )}

            {activeTab === "discussion" && (
              <div className="text-center py-12">
                <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Course Discussion
                </h3>
                <p className="text-muted-foreground">
                  Join the conversation with your classmates and instructor.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h4 className="font-semibold text-foreground mb-4">
                Quick Actions
              </h4>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 p-3 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors text-left">
                  <Download className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Download Syllabus</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors text-left">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">
                    Contact Instructor
                  </span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors text-left">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Class Forum</span>
                </button>
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h4 className="font-semibold text-foreground mb-4">
                Upcoming Deadlines
              </h4>
              <div className="space-y-3">
                {assignments
                  .filter((a) => a.status === "pending")
                  .slice(0, 3)
                  .map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg"
                    >
                      <FileText className="h-4 w-4 text-amber-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {assignment.title}
                        </p>
                        <p className="text-xs text-amber-600">
                          Due: {assignment.dueDate}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
