"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, BookOpen, Users, Calendar, FileText } from "lucide-react";

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    credits: 3,
    level: 100,
    semester: 1,
    courseOutline: "",
    isActive: true,
  });

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    try {
      
    } catch (error) {
      console.error("Failed to load course:", error);
      setErrors({ submit: "Failed to load course details" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/teacher/courses/${courseId}`}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Edit Course
          </h1>
          <p className="text-muted-foreground mt-1">
            Update course information and settings
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Course Information
            </h2>
          </div>

          <div className="space-y-4">
            {/* Course Code */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Course Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange("code", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                placeholder="e.g., CSC101, MAT201"
                required
              />
            </div>

            {/* Course Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Course Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                placeholder="e.g., Introduction to Computer Science"
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
                placeholder="Brief description of the course..."
              />
            </div>

            {/* Course Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Credits *
                </label>
                <select
                  value={formData.credits}
                  onChange={(e) => handleChange("credits", parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                >
                  <option value={1}>1 Credit</option>
                  <option value={2}>2 Credits</option>
                  <option value={3}>3 Credits</option>
                  <option value={4}>4 Credits</option>
                  <option value={5}>5 Credits</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Level *
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => handleChange("level", parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                >
                  <option value={100}>100 Level</option>
                  <option value={200}>200 Level</option>
                  <option value={300}>300 Level</option>
                  <option value={400}>400 Level</option>
                  <option value={500}>500 Level</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Semester *
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) => handleChange("semester", parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                >
                  <option value={1}>First Semester</option>
                  <option value={2}>Second Semester</option>
                </select>
              </div>
            </div>

            {/* Course Outline */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Course Outline
              </label>
              <textarea
                value={formData.courseOutline}
                onChange={(e) => handleChange("courseOutline", e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background resize-none"
                placeholder="Detailed course outline, topics covered, learning objectives..."
              />
              <p className="text-sm text-muted-foreground mt-1">
                Provide a comprehensive outline of what students will learn in this course
              </p>
            </div>
          </div>
        </div>

        {/* Course Settings */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Course Settings
            </h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange("isActive", e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/20"
              />
              <div>
                <div className="font-medium text-foreground">Active Course</div>
                <div className="text-sm text-muted-foreground">
                  When active, students can enroll and access course materials
                </div>
              </div>
            </label>
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
            href={`/teacher/courses/${courseId}`}
            className="flex-1 py-3 px-4 border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-colors text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Save size={20} />
            )}
            Update Course
          </button>
        </div>
      </form>
    </div>
  );
}