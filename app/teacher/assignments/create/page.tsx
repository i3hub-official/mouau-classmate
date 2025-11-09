// app/teacher/assignments/create/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Calendar, BookOpen } from "lucide-react";

interface Course {
  id: string;
  code: string;
  title: string;
}

export default function CreateAssignmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructions: "",
    dueDate: "",
    dueTime: "23:59",
    maxScore: 100,
    courseId: "",
    allowedAttempts: 1,
    assignmentUrl: "",
    allowLateSubmission: false,
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      // IMPLEMENT COURSES LOADING LOGIC HERE
    } catch (error) {
      console.error("Failed to load courses:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      if (!formData.courseId) {
        throw new Error("Please select a course");
      }

      const dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime}`);
      if (dueDateTime <= new Date()) {
        throw new Error("Due date must be in the future");
      }

      // title: formData.title,
      // description: formData.description,
      // instructions: formData.instructions,
      // dueDate: dueDateTime,
      // maxScore: formData.maxScore,
      // courseId: formData.courseId,
      // teacherId,
      // allowedAttempts: formData.allowedAttempts,
      // assignmentUrl: formData.assignmentUrl || undefined,
      // allowLateSubmission: formData.allowLateSubmission,

      router.push("/teacher/assignments");
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/teacher/assignments"
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Create New Assignment
          </h1>
          <p className="text-muted-foreground mt-1">
            Set up a new assignment for your students
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Assignment Information
            </h2>
          </div>

          <div className="space-y-4">
            {/* Course Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Course *
              </label>
              <select
                value={formData.courseId}
                onChange={(e) => handleChange("courseId", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                required
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignment Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Assignment Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                placeholder="e.g., Midterm Project, Final Exam, etc."
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background resize-none"
                placeholder="Brief description of the assignment..."
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Instructions
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => handleChange("instructions", e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background resize-none"
                placeholder="Detailed instructions for students..."
              />
            </div>

            {/* Due Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Due Date *
                </label>
                <div className="relative">
                  <Calendar
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    size={16}
                  />
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleChange("dueDate", e.target.value)}
                    min={minDate}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Due Time *
                </label>
                <input
                  type="time"
                  value={formData.dueTime}
                  onChange={(e) => handleChange("dueTime", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                  required
                />
              </div>
            </div>

            {/* Max Score and Attempts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Maximum Score *
                </label>
                <input
                  type="number"
                  value={formData.maxScore}
                  onChange={(e) =>
                    handleChange("maxScore", parseInt(e.target.value))
                  }
                  min="1"
                  max="1000"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Allowed Attempts
                </label>
                <select
                  value={formData.allowedAttempts}
                  onChange={(e) =>
                    handleChange("allowedAttempts", parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                >
                  <option value={1}>1 Attempt</option>
                  <option value={2}>2 Attempts</option>
                  <option value={3}>3 Attempts</option>
                  <option value={0}>Unlimited</option>
                </select>
              </div>
            </div>

            {/* Assignment URL */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Assignment URL (Optional)
              </label>
              <input
                type="url"
                value={formData.assignmentUrl}
                onChange={(e) => handleChange("assignmentUrl", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                placeholder="https://example.com/assignment-resources"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Link to external resources, documents, or instructions
              </p>
            </div>

            {/* Settings */}
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allowLateSubmission}
                  onChange={(e) =>
                    handleChange("allowLateSubmission", e.target.checked)
                  }
                  className="rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm font-medium text-foreground">
                  Allow late submissions
                </span>
              </label>
              <p className="text-sm text-muted-foreground">
                When enabled, students can submit after the deadline (may be
                subject to penalties)
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href="/teacher/assignments"
            className="flex-1 py-3 px-4 border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-colors text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Save size={20} />
            )}
            Create Assignment
          </button>
        </div>
      </form>
    </div>
  );
}
