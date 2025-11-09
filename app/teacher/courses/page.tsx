// app/teacher/courses/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

import {
  Plus,
  Search,
  Filter,
  BookOpen,
  Users,
  BookOpenCheck,
  BarChart3,
  MoreVertical,
  Edit,
  Eye,
} from "lucide-react";

interface Course {
  id: string;
  code: string;
  title: string;
  description?: string;
  credits: number;
  level: number;
  semester: number;
  isActive: boolean;
  stats: {
    totalStudents: number;
    totalAssignments: number;
    totalSubmissions: number;
    averageScore: number;
    completionRate: number;
  };
}

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    level: "",
    semester: "",
    isActive: "",
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
  
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel =
      !filters.level || course.level === parseInt(filters.level);
    const matchesSemester =
      !filters.semester || course.semester === parseInt(filters.semester);
    const matchesActive =
      !filters.isActive ||
      (filters.isActive === "active" && course.isActive) ||
      (filters.isActive === "inactive" && !course.isActive);

    return matchesSearch && matchesLevel && matchesSemester && matchesActive;
  });

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
            My Courses
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and view your teaching courses
          </p>
        </div>
        <Link
          href="/teacher/courses/create"
          className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          Create Course
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            size={20}
          />
          <input
            type="text"
            placeholder="Search courses by code or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filters.level}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, level: e.target.value }))
            }
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
          >
            <option value="">All Levels</option>
            <option value="100">100 Level</option>
            <option value="200">200 Level</option>
            <option value="300">300 Level</option>
            <option value="400">400 Level</option>
            <option value="500">500 Level</option>
          </select>

          <select
            value={filters.semester}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, semester: e.target.value }))
            }
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
          >
            <option value="">All Semesters</option>
            <option value="1">First Semester</option>
            <option value="2">Second Semester</option>
          </select>

          <select
            value={filters.isActive}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, isActive: e.target.value }))
            }
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No courses found
          </h3>
          <p className="text-muted-foreground">
            {courses.length === 0
              ? "You haven't created any courses yet. Get started by creating your first course."
              : "No courses match your search criteria."}
          </p>
          {courses.length === 0 && (
            <Link
              href="/teacher/courses/create"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus size={20} />
              Create Your First Course
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-foreground text-lg">{course.code}</h3>
          <p className="text-foreground font-medium mt-1">{course.title}</p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                course.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {course.isActive ? "Active" : "Inactive"}
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              Level {course.level}
            </span>
          </div>
        </div>

        <div className="dropdown">
          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
            <MoreVertical size={16} />
          </button>
          <div className="dropdown-menu">
            <Link
              href={`/teacher/courses/${course.id}`}
              className="dropdown-item"
            >
              <Eye size={16} />
              View Details
            </Link>
            <Link
              href={`/teacher/courses/${course.id}/edit`}
              className="dropdown-item"
            >
              <Edit size={16} />
              Edit Course
            </Link>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
        {course.description || "No description provided."}
      </p>

      {/* Course Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Students</span>
          </div>
          <p className="font-semibold text-foreground">
            {course.stats.totalStudents}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <BookOpenCheck size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Assignments</span>
          </div>
          <p className="font-semibold text-foreground">
            {course.stats.totalAssignments}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <BarChart3 size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Avg Score</span>
          </div>
          <p className="font-semibold text-foreground">
            {course.stats.averageScore}%
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <BookOpen size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Progress</span>
          </div>
          <p className="font-semibold text-foreground">
            {course.stats.completionRate}%
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/teacher/courses/${course.id}`}
          className="flex-1 text-center py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          View Course
        </Link>
        <Link
          href={`/teacher/courses/${course.id}/assignments`}
          className="flex-1 text-center py-2 px-4 border border-border text-foreground rounded-lg hover:bg-muted transition-colors text-sm font-medium"
        >
          Assignments
        </Link>
      </div>
    </div>
  );
}
