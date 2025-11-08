"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TeacherCourseService } from "@/lib/services/teachers/courseService";
import { TeacherScheduleService } from "@/lib/services/teachers/scheduleService";
import {
  ArrowLeft,
  Play,
  FileText,
  Clock,
  CheckCircle,
  Lock,
  BarChart3,
  Plus,
  Edit,
  Eye,
  EyeOff,
} from "lucide-react";

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  orderIndex: number;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  submissions: any[];
}

export default function TeacherCourseLecturesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);

  useEffect(() => {
    loadCourseAndLectures();
  }, [courseId]);

  const loadCourseAndLectures = async () => {
    try {
      const teacherId = "temp-teacher-id"; // Replace with actual teacher ID from auth
      const courseData = await TeacherCourseService.getCourseDetails(
        courseId,
        teacherId
      );

      if (courseData) {
        setCourse(courseData);
        setLectures(
          (courseData.lectures || []).map((lecture: any) => ({
            ...lecture,
            duration: lecture.duration ?? 0,
            submissions: lecture.submissions ?? [],
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load course lectures:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLecturePublish = async (lectureId: string, publish: boolean) => {
    try {
      const teacherId = "temp-teacher-id"; // Replace with actual teacher ID from auth
      await TeacherScheduleService.toggleLecturePublish(
        lectureId,
        teacherId,
        publish
      );

      // Update local state
      setLectures((prev) =>
        prev.map((lecture) =>
          lecture.id === lectureId
            ? {
                ...lecture,
                isPublished: publish,
                publishedAt: publish ? new Date() : null,
              }
            : lecture
        )
      );
    } catch (error) {
      console.error("Failed to toggle lecture publish status:", error);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateLectureStats = () => {
    const publishedLectures = lectures.filter((l) => l.isPublished);
    const totalDuration = publishedLectures.reduce(
      (acc, lecture) => acc + lecture.duration,
      0
    );
    const totalSubmissions = lectures.reduce(
      (acc, lecture) => acc + (lecture.submissions?.length || 0),
      0
    );

    return {
      total: lectures.length,
      published: publishedLectures.length,
      draft: lectures.length - publishedLectures.length,
      totalDuration,
      totalSubmissions,
    };
  };

  const stats = calculateLectureStats();

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
        <p className="text-muted-foreground mt-2">
          The course you're looking for doesn't exist.
        </p>
        <Link
          href="/teacher/courses"
          className="mt-4 inline-block text-primary hover:underline"
        >
          Back to Courses
        </Link>
      </div>
    );
  }

  const publishedLectures = lectures.filter((lecture) => lecture.isPublished);
  const draftLectures = lectures.filter((lecture) => !lecture.isPublished);

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
              Course Lectures
            </h1>
            <p className="text-muted-foreground mt-1">
              {course.code} • {course.title}
            </p>
          </div>
        </div>
        <Link
          href={`/teacher/courses/${courseId}/lectures/create`}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          Add Lecture
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <div className="text-2xl font-bold text-foreground">
              {stats.total}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">Total Lectures</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Eye className="h-5 w-5 text-green-600" />
            <div className="text-2xl font-bold text-foreground">
              {stats.published}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">Published</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-primary" />
            <div className="text-2xl font-bold text-foreground">
              {formatDuration(stats.totalDuration)}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">Total Duration</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div className="text-2xl font-bold text-foreground">
              {stats.totalSubmissions}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">Student Views</div>
        </div>
      </div>

      {/* Published Lectures */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Published Lectures ({publishedLectures.length})
          </h3>
          <div className="text-sm text-muted-foreground">
            Visible to students
          </div>
        </div>

        {publishedLectures.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Published Lectures
            </h3>
            <p className="text-muted-foreground mb-4">
              Publish lectures to make them visible to students.
            </p>
            <Link
              href={`/teacher/courses/${courseId}/lectures/create`}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create First Lecture
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {publishedLectures.map((lecture, index) => (
              <div
                key={lecture.id}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                      <Eye className="h-6 w-6" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-foreground">
                          {lecture.title}
                        </h4>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Published
                        </span>
                      </div>

                      {lecture.description && (
                        <p className="text-muted-foreground mb-3 line-clamp-2">
                          {lecture.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>{formatDuration(lecture.duration)}</span>
                        </div>
                        <div>
                          <span>Lecture {lecture.orderIndex + 1}</span>
                        </div>
                        {lecture.publishedAt && (
                          <div>
                            <span>
                              Published {formatDate(lecture.publishedAt)}
                            </span>
                          </div>
                        )}
                        {lecture.submissions && (
                          <div>
                            <span>
                              {lecture.submissions.length} student views
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/teacher/courses/${courseId}/lectures/${lecture.id}`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Lecture"
                    >
                      <Play size={16} />
                    </Link>
                    <Link
                      href={`/teacher/courses/${courseId}/lectures/${lecture.id}/edit`}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Edit Lecture"
                    >
                      <Edit size={16} />
                    </Link>
                    <button
                      onClick={() => toggleLecturePublish(lecture.id, false)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Unpublish Lecture"
                    >
                      <EyeOff size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Draft Lectures */}
      {draftLectures.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Draft Lectures ({draftLectures.length})
          </h3>
          <div className="space-y-3">
            {draftLectures.map((lecture, index) => (
              <div
                key={lecture.id}
                className="bg-card border border-border rounded-xl p-6 opacity-80"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-gray-100 text-gray-600 rounded-lg">
                      <Lock className="h-6 w-6" />
                    </div>

                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-foreground">
                        {lecture.title}
                      </h4>

                      {lecture.description && (
                        <p className="text-muted-foreground mb-3 line-clamp-2">
                          {lecture.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>{formatDuration(lecture.duration)}</span>
                        </div>
                        <div>
                          <span>Lecture {lecture.orderIndex + 1}</span>
                        </div>
                        <span className="text-amber-600">Draft</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/teacher/courses/${courseId}/lectures/${lecture.id}/edit`}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Edit Lecture"
                    >
                      <Edit size={16} />
                    </Link>
                    <button
                      onClick={() => toggleLecturePublish(lecture.id, true)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Publish Lecture"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href={`/teacher/courses/${courseId}/lectures/create`}
            className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-foreground">
                Create New Lecture
              </div>
              <div className="text-sm text-muted-foreground">
                Add a new lecture to this course
              </div>
            </div>
          </Link>

          <Link
            href={`/teacher/courses/${courseId}/schedule`}
            className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-foreground">Manage Schedule</div>
              <div className="text-sm text-muted-foreground">
                Organize lecture order and timing
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
