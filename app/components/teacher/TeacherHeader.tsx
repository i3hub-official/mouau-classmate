// app/components/teacher/TeacherHeader.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  Mail,
  Calendar,
  FileText,
  Users,
} from "lucide-react";

interface TeacherHeaderProps {
  onMenuClick: () => void;
  user?: any;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  time: string;
  read: boolean;
  actionUrl?: string;
}

export function TeacherHeader({ onMenuClick, user }: TeacherHeaderProps) {
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock notifications data
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "Assignment Submitted",
      message: "5 new submissions for 'Midterm Project'",
      type: "info",
      time: "5 min ago",
      read: false,
      actionUrl: "/teacher/assignments/1/submissions",
    },
    {
      id: "2",
      title: "Course Enrollment",
      message: "15 new students enrolled in 'CSC101'",
      type: "success",
      time: "1 hour ago",
      read: false,
      actionUrl: "/teacher/courses/1",
    },
    {
      id: "3",
      title: "Deadline Reminder",
      message: "Assignment 'Quiz 2' due in 2 days",
      type: "warning",
      time: "2 hours ago",
      read: true,
      actionUrl: "/teacher/assignments/2",
    },
    {
      id: "4",
      title: "System Update",
      message: "New features available in gradebook",
      type: "info",
      time: "1 day ago",
      read: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const notificationsDropdown = document.getElementById(
        "notifications-dropdown"
      );
      const profileDropdown = document.getElementById("profile-dropdown");
      const searchDropdown = document.getElementById("search-dropdown");

      if (
        notificationsDropdown &&
        !notificationsDropdown.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
      if (profileDropdown && !profileDropdown.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (searchDropdown && !searchDropdown.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPageTitle = () => {
    const pathSegments = pathname.split("/").filter(Boolean);
    if (pathSegments.length <= 2) return "Dashboard";

    const pageMap: { [key: string]: string } = {
      courses: "Courses",
      assignments: "Assignments",
      grading: "Grading",
      students: "Students",
      schedule: "Schedule",
      analytics: "Analytics",
      settings: "Settings",
    };

    return pageMap[pathSegments[2]] || "Dashboard";
  };

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length <= 2) return [];

    const breadcrumbs = [];
    let currentPath = "";

    for (let i = 2; i < segments.length; i++) {
      currentPath += `/${segments[i]}`;
      const segment = segments[i];

      // Format segment for display
      const formattedName = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      breadcrumbs.push({
        name: formattedName,
        path: `/teacher${currentPath}`,
        isLast: i === segments.length - 1,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-30">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-muted rounded-lg transition-colors lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden md:block">
            <h1 className="text-xl font-semibold text-foreground">
              {getPageTitle()}
            </h1>
            {breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Link
                  href="/teacher"
                  className="hover:text-foreground transition-colors"
                >
                  Teacher
                </Link>
                {breadcrumbs.map((crumb, index) => (
                  <span key={crumb.path} className="flex items-center gap-1">
                    <span>/</span>
                    {crumb.isLast ? (
                      <span className="text-foreground font-medium">
                        {crumb.name}
                      </span>
                    ) : (
                      <Link
                        href={crumb.path}
                        className="hover:text-foreground transition-colors"
                      >
                        {crumb.name}
                      </Link>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative" id="search-dropdown">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>

            {searchOpen && (
              <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search courses, assignments, students..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="p-2">
                  <div className="text-sm text-muted-foreground p-3 text-center">
                    Type to search...
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" id="notifications-dropdown">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-primary hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
                          !notification.read ? "bg-blue-50/50" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-1 rounded ${
                              notification.type === "success"
                                ? "bg-green-100 text-green-600"
                                : notification.type === "warning"
                                ? "bg-amber-100 text-amber-600"
                                : notification.type === "error"
                                ? "bg-red-100 text-red-600"
                                : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            {notification.type === "success" && (
                              <Users className="h-3 w-3" />
                            )}
                            {notification.type === "warning" && (
                              <Calendar className="h-3 w-3" />
                            )}
                            {notification.type === "error" && (
                              <Bell className="h-3 w-3" />
                            )}
                            {notification.type === "info" && (
                              <FileText className="h-3 w-3" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm">
                              {notification.title}
                            </p>
                            <p className="text-muted-foreground text-sm mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.time}
                            </p>
                          </div>
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              <div className="w-2 h-2 bg-primary rounded-full" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 border-t border-border">
                  <Link
                    href="/teacher/notifications"
                    className="block text-center text-sm text-primary hover:underline"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" id="profile-dropdown">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="hidden md:block text-sm font-medium text-foreground">
                {user?.name || "Teacher"}
              </span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-12 w-48 bg-card border border-border rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-border">
                  <p className="font-medium text-foreground">
                    {user?.name || "Teacher"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user?.email || "teacher@eduplatform.com"}
                  </p>
                </div>
                <div className="p-1">
                  <Link
                    href="/teacher/profile"
                    className="flex items-center gap-2 px-3 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    href="/teacher/settings"
                    className="flex items-center gap-2 px-3 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </div>
                <div className="p-1 border-t border-border">
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-muted rounded-lg transition-colors">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}