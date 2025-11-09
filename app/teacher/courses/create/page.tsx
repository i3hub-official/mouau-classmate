// app/teacher/courses/create/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, BookOpen } from "lucide-react";

export default function CreateCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    credits: 3,
    level: 100,
    semester: 1,
    courseOutline: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

   
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/teacher/courses"
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Create New Course
          </h1>
          <p className="text-muted-foreground mt-1">
            Set up a new course for your students
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
              Course Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Course Code */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Course Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background ${
                  errors.code ? "border-red-500" : "border-border"
                }`}
                placeholder="e.g., CSC101"
                required
              />
              {errors.code && (
                <p className="text-red-600 text-sm mt-1">{errors.code}</p>
              )}
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

            {/* Level */}
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

            {/* Semester */}
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

            {/* Credits */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Credit Units *
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
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Course Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background resize-none"
              placeholder="Describe the course objectives, topics covered, and learning outcomes..."
            />
          </div>

          {/* Course Outline */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Course Outline (Optional)
            </label>
            <textarea
              value={formData.courseOutline}
              onChange={(e) => handleChange("courseOutline", e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background resize-none"
              placeholder="Provide detailed course outline, weekly topics, reading materials, etc."
            />
            <p className="text-sm text-muted-foreground mt-1">
              You can update this later with more detailed information.
            </p>
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
            href="/teacher/courses"
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
            Create Course
          </button>
        </div>
      </form>
    </div>
  );
}