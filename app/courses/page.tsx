// app/courses/page.tsx
"use client";
import { useState, useEffect } from "react";
import {
  BookOpen,
  Calendar,
  Users,
  Clock,
  Search,
  Filter,
  PlayCircle,
  FileText,
  BarChart3,
  Plus,
  CheckCircle,
} from "lucide-react";
import { DashboardHeader } from "@/app/components/DashboardHeader";

interface Course {
  id: string;
  code: string;
  title: string;
  description: string | null;
  credits: number;
  level: number;
  semester: number;
  instructor: {
    firstName: string;
    lastName: string;
    otherName: string | null;
  } | null;
  enrollments: Array<{
    progress: number;
    isCompleted: boolean;
    studentId: string;
  }>;
  assignments: Array<{
    dueDate: Date;
    isPublished: boolean;
    submissions: Array<{
      submittedAt: Date | null;
      isGraded: boolean;
    }>;
  }>;
  _count: {
    lectures: number;
    assignments: number;
  };
}

interface CoursesResponse {
  enrolledCourses: Course[];
  availableCourses: Course[];
  departmentCourses: Course[];
}

export default function CoursesPage() {
  const [coursesData, setCoursesData] = useState<CoursesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");
  const [activeTab, setActiveTab] = useState<"enrolled" | "available">(
    "enrolled"
  );
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses");
      if (response.ok) {
        const data = await response.json();
        setCoursesData(data);
      } else {
        console.error("Failed to fetch courses");
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    setEnrolling(courseId);
    try {
      const response = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId }),
      });

      if (response.ok) {
        // Refresh courses data
        await fetchCourses();
      } else {
        console.error("Failed to enroll in course");
      }
    } catch (error) {
      console.error("Error enrolling in course:", error);
    } finally {
      setEnrolling(null);
    }
  };

  const getColorClasses = (level: number) => {
    const colorMap = {
      100: "from-blue-500 to-blue-600",
      200: "from-green-500 to-green-600",
      300: "from-purple-500 to-purple-600",
      400: "from-orange-500 to-orange-600",
      500: "from-red-500 to-red-600",
    };
    return colorMap[level as keyof typeof colorMap] || colorMap[100];
  };

  const getInstructorName = (instructor: Course["instructor"]) => {
    if (!instructor) return "TBA";
    return `${instructor.firstName} ${instructor.lastName}${
      instructor.otherName ? ` ${instructor.otherName}` : ""
    }`;
  };

  const getCourseProgress = (course: Course) => {
    if (course.enrollments.length === 0) return 0;
    return course.enrollments[0].progress;
  };

  const getPendingAssignments = (course: Course) => {
    return course.assignments.filter((assignment) => {
      const hasSubmission = assignment.submissions.length > 0;
      const isDue = new Date(assignment.dueDate) > new Date();
      return assignment.isPublished && !hasSubmission && isDue;
    }).length;
  };

  const getNextLecture = (course: Course) => {
    // This would typically come from a schedule service
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const randomDay = days[Math.floor(Math.random() * days.length)];
    const times = ["8:00 AM", "10:00 AM", "1:00 PM", "3:00 PM"];
    const randomTime = times[Math.floor(Math.random() * times.length)];
    return `${randomDay}, ${randomTime}`;
  };

  const filteredCourses = () => {
    const courses =
      activeTab === "enrolled"
        ? coursesData?.enrolledCourses
        : coursesData?.availableCourses;

    if (!courses) return [];

    return courses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel =
        filterLevel === "all" || course.level.toString() === filterLevel;
      const matchesSemester =
        filterSemester === "all" ||
        course.semester.toString() === filterSemester;

      return matchesSearch && matchesLevel && matchesSemester;
    });
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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="w-full px-6 xl:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            My Courses
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage and access all your enrolled courses
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => setActiveTab("enrolled")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "enrolled"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Enrolled Courses ({coursesData?.enrolledCourses.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("available")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "available"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Available Courses ({coursesData?.availableCourses.length || 0})
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Search courses by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Levels</option>
                <option value="100">100 Level</option>
                <option value="200">200 Level</option>
                <option value="300">300 Level</option>
                <option value="400">400 Level</option>
              </select>

              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                className="px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Semesters</option>
                <option value="1">First Semester</option>
                <option value="2">Second Semester</option>
              </select>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCourses().map((course) => (
            <div
              key={course.id}
              className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 group"
            >
              {/* Course Header */}
              <div
                className={`bg-linear-to-r ${getColorClasses(
                  course.level
                )} p-6 text-white`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{course.code}</h3>
                    <p className="text-white/80 text-sm">{course.title}</p>
                  </div>
                  <div className="bg-white/20 rounded-lg px-3 py-1 text-xs font-medium">
                    {course.credits} Credits
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{getInstructorName(course.instructor)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" />
                    <span>Level {course.level}</span>
                  </div>
                </div>
              </div>

              {/* Course Content */}
              <div className="p-6">
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {course.description || "No description available."}
                </p>

                {/* Course Stats */}
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{course._count.lectures} lectures</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>{course._count.assignments} assignments</span>
                  </div>
                </div>

                {/* Progress Bar (for enrolled courses) */}
                {activeTab === "enrolled" && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-foreground">
                        Progress
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {getCourseProgress(course)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${getCourseProgress(course)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Course Info */}
                <div className="space-y-3 mb-6">
                  {activeTab === "enrolled" && (
                    <>
                      <div className="flex items-center gap-3 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">
                          Next: {getNextLecture(course)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">
                          {getPendingAssignments(course)} assignment
                          {getPendingAssignments(course) !== 1 ? "s" : ""} due
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {activeTab === "enrolled" ? (
                    <>
                      <a
                        href={`/courses/${course.id}`}
                        className="flex-1 bg-primary text-white py-2 px-4 rounded-lg text-center font-medium hover:bg-primary/90 transition-colors"
                      >
                        Enter Course
                      </a>
                      <button className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors">
                        <PlayCircle className="h-5 w-5 text-foreground" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrolling === course.id}
                      className="flex-1 bg-primary text-white py-2 px-4 rounded-lg text-center font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {enrolling === course.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Enrolling...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Enroll Now
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredCourses().length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {activeTab === "enrolled"
                ? "No enrolled courses"
                : "No available courses"}
            </h3>
            <p className="text-muted-foreground">
              {activeTab === "enrolled"
                ? "You haven't enrolled in any courses yet. Check the available courses tab to get started."
                : "No courses available for enrollment at the moment."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
