// File: app/components/s/AcademicProgress.tsx
"use client";

import {
  Award,
  TrendingUp,
  Target,
  BookOpen,
  CheckCircle,
  Clock,
} from "lucide-react";

interface AcademicProgressProps {
  progress?: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    averageProgress: number;
    averageScore: number;
  };
  loading?: boolean;
}

export function AcademicProgress({
  progress,
  loading = false,
}: AcademicProgressProps) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 h-full min-h-[400px]">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-2 bg-muted rounded-full"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-lg"></div>
              ))}
            </div>
            <div className="h-20 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 h-full min-h-[400px] flex flex-col">
      <h3 className="text-xl font-semibold text-foreground mb-6">
        Academic Progress
      </h3>

      <div className="space-y-6 flex-1">
        {/* Overall Progress */}
        <div className="bg-linear-to-r from-primary/5 to-primary/10 p-4 rounded-xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-foreground">
              Overall Progress
            </span>
            <span className="text-lg font-bold text-primary">
              {progress?.averageProgress || 0}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-linear-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress?.averageProgress || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Courses Summary - Enhanced */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">
            Course Status
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
              <BookOpen className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-blue-600">
                {progress?.totalCourses || 0}
              </p>
              <p className="text-xs text-blue-600 font-medium">Total</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl text-center border border-green-100">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-green-600">
                {progress?.completedCourses || 0}
              </p>
              <p className="text-xs text-green-600 font-medium">Completed</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl text-center border border-orange-100">
              <Clock className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-orange-600">
                {progress?.inProgressCourses || 0}
              </p>
              <p className="text-xs text-orange-600 font-medium">In Progress</p>
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-muted/50 p-4 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground">
              Completion Rate
            </span>
            <span className="text-sm font-bold text-green-600">
              {progress?.totalCourses
                ? Math.round(
                    (progress.completedCourses / progress.totalCourses) * 100
                  )
                : 0}
              %
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${
                  progress?.totalCourses
                    ? Math.round(
                        (progress.completedCourses / progress.totalCourses) *
                          100
                      )
                    : 0
                }%`,
              }}
            ></div>
          </div>
        </div>

        {/* Average Score - Enhanced */}
        <div className="text-center p-5 bg-linear-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Award className="h-6 w-6 text-primary" />
            <p className="text-sm font-semibold text-foreground">
              Average Score
            </p>
          </div>
          <p className="text-3xl font-bold text-foreground mb-2">
            {progress?.averageScore ? progress.averageScore.toFixed(1) : "0.0"}
          </p>
          <p className="text-xs text-muted-foreground">Out of 100 points</p>
        </div>

        {/* Performance Indicator */}
        <div className="bg-card p-4 rounded-xl border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Performance
            </span>
            <span
              className={`text-xs font-bold px-2 py-1 rounded-full ${
                (progress?.averageScore || 0) >= 70
                  ? "bg-green-100 text-green-700"
                  : (progress?.averageScore || 0) >= 50
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {(progress?.averageScore || 0) >= 70
                ? "Excellent"
                : (progress?.averageScore || 0) >= 50
                ? "Good"
                : "Needs Improvement"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
