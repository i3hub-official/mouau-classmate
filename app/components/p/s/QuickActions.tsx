// File: app/components/s/QuickActions.tsx
"use client";
import {
  FileText,
  BookOpen,
  Users,
  Calendar,
  Upload,
  Download,
} from "lucide-react";

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  description?: string;
}

const quickActions: QuickAction[] = [
  {
    icon: Upload,
    label: "Upload Assignment",
    href: "/assignments/upload",
    description: "Submit your completed work",
  },
  {
    icon: BookOpen,
    label: "View Courses",
    href: "/courses",
    description: "Browse your enrolled courses",
  },
  {
    icon: Users,
    label: "Class Forum",
    href: "/forum",
    description: "Discuss with classmates",
  },
  {
    icon: Calendar,
    label: "Schedule",
    href: "/schedule",
    description: "View your class timetable",
  },
  {
    icon: Download,
    label: "Download Materials",
    href: "/materials",
    description: "Access course resources",
  },
  {
    icon: FileText,
    label: "View Grades",
    href: "/grades",
    description: "Check your academic performance",
  },
];

export function QuickActions() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-xl font-semibold text-foreground mb-6">
        Quick Actions
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action, index) => {
          const IconComponent = action.icon;
          return (
            <a
              key={index}
              href={action.href}
              className="group p-4 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <IconComponent className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {action.label}
                  </p>
                  {action.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {action.description}
                    </p>
                  )}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
