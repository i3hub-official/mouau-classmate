// app/components/PerformanceOverview.tsx
import { BarChart3, TrendingUp, Target, Award } from "lucide-react";

interface PerformanceOverviewProps {
  metrics?: {
    averageGrade: number;
    attendance: number;
    participation: number;
    assignmentsCompleted: number;
  };
  loading?: boolean;
}

export function PerformanceOverview({ metrics, loading = false }: PerformanceOverviewProps) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-2 bg-muted rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-foreground">
          Performance Overview
        </h3>
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-6">
        {/* Grade Average */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground">
              Grade Average
            </span>
            <span className="text-sm font-bold text-primary">
              {metrics?.averageGrade || 0}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${metrics?.averageGrade || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Attendance */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground">
              Attendance Rate
            </span>
            <span className="text-sm font-bold text-primary">
              {metrics?.attendance || 0}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${metrics?.attendance || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Participation */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground">
              Class Participation
            </span>
            <span className="text-sm font-bold text-primary">
              {metrics?.participation || 0}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full"
              style={{ width: `${metrics?.participation || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <Target className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">
              {metrics?.assignmentsCompleted || 0}
            </p>
            <p className="text-xs text-muted-foreground">Assignments Done</p>
          </div>
          <div className="text-center">
            <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">
              {metrics?.averageGrade ? (metrics.averageGrade >= 70 ? "Good" : "Improving") : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">Performance</p>
          </div>
        </div>
      </div>
    </div>
  );
}