// app/components/RecentActivities.tsx
import { FileText, BookOpen, Calendar, Clock } from "lucide-react";

interface RecentActivity {
  id: string;
  title: string;
  description: string;
  type: "assignment" | "lecture" | "schedule" | "notification";
  courseCode: string;
  courseName: string;
  timestamp: Date;
  icon: string;
  color: string;
}

interface RecentActivitiesProps {
  activities: RecentActivity[];
  loading?: boolean;
}

const iconMap = {
  FileText: FileText,
  BookOpen: BookOpen,
  Calendar: Calendar,
  Clock: Clock,
};

export function RecentActivities({ activities, loading = false }: RecentActivitiesProps) {
  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - new Date(timestamp).getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
  };

  const getActivityIcon = (iconName: string, color: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || FileText;
    const colorClasses = {
      blue: "bg-blue-100 text-blue-600",
      green: "bg-green-100 text-green-600",
      orange: "bg-orange-100 text-orange-600",
      purple: "bg-purple-100 text-purple-600",
    };

    return (
      <div
        className={`p-2 rounded-lg ${
          colorClasses[color as keyof typeof colorClasses] || colorClasses.blue
        }`}
      >
        <IconComponent size={16} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-6"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 mb-4">
              <div className="h-10 w-10 bg-muted rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-foreground">
          Recent Activities
        </h3>
        <a
          href="/activities"
          className="text-sm text-primary hover:underline font-medium"
        >
          View All
        </a>
      </div>
      <div className="space-y-4">
        {activities && activities.length > 0 ? (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-4 p-4 hover:bg-muted rounded-xl transition-colors"
            >
              {getActivityIcon(activity.icon, activity.color)}
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-foreground">
                  {activity.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.courseCode} - {activity.courseName}
                </p>
              </div>
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {getTimeAgo(activity.timestamp)}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg">
              No recent activities
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Your recent activities will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}