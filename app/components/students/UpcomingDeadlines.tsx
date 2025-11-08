// app/components/UpcomingDeadlines.tsx
import { Clock, Calendar, AlertCircle } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  dueDate: Date;
  course: {
    code: string;
    title: string;
  };
  isSubmitted: boolean;
}

interface UpcomingDeadlinesProps {
  assignments: Assignment[];
  loading?: boolean;
}

export function UpcomingDeadlines({ assignments, loading = false }: UpcomingDeadlinesProps) {
  const getDaysUntilDue = (dueDate: Date) => {
    const now = new Date();
    const diffTime = new Date(dueDate).getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`;
    return `${Math.ceil(diffDays / 30)} months`;
  };

  const getUrgencyColor = (dueDate: Date) => {
    const now = new Date();
    const diffTime = new Date(dueDate).getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return "text-red-600 bg-red-50";
    if (diffDays <= 3) return "text-orange-600 bg-orange-50";
    if (diffDays <= 7) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
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
          Upcoming Deadlines
        </h3>
        <a
          href="/assignments"
          className="text-sm text-primary hover:underline font-medium"
        >
          View All
        </a>
      </div>
      <div className="space-y-4">
        {assignments && assignments.length > 0 ? (
          assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center gap-4 p-4 hover:bg-muted rounded-xl transition-colors"
            >
              <div className={`p-2 rounded-lg ${getUrgencyColor(assignment.dueDate)}`}>
                <AlertCircle size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-foreground">
                  {assignment.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {assignment.course.code} - {assignment.course.title}
                </p>
              </div>
              <div className="text-sm font-medium whitespace-nowrap">
                <span className={`px-2 py-1 rounded-full text-xs ${getUrgencyColor(assignment.dueDate)}`}>
                  {getDaysUntilDue(assignment.dueDate)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg">
              No upcoming deadlines
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Your upcoming assignments will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}