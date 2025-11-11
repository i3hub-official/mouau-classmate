// app/components/teacher/TeacherSidebar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  ClipboardCheck,
  User2,
  Settings,
  ChevronLeft,
  LogOut,
  User,
  Bell,
  FileText,
  BarChart3,
  Calendar,
  Users,
} from "lucide-react";

interface TeacherSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  onLogout: () => Promise<void>;
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: MenuItem[];
}

export function TeacherSidebar({ isOpen, onClose, user }: TeacherSidebarProps) {
  const pathname = usePathname();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menuItems: MenuItem[] = [
    {
      label: "Dashboard",
      href: "/teacher",
      icon: <Home className="h-5 w-5" />,
    },
    {
      label: "Courses",
      href: "/teacher/courses",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      label: "Assignments",
      href: "/teacher/assignments",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      label: "Grading",
      href: "/teacher/grading",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    {
      label: "Students",
      href: "/teacher/students",
      icon: <User2 className="h-5 w-5" />,
    },
    {
      label: "Schedule",
      href: "/teacher/schedule",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      label: "Analytics",
      href: "/teacher/analytics",
      icon: <BarChart3 className="h-5 w-5" />,
      children: [
        {
          label: "Course Analytics",
          href: "/teacher/analytics/courses",
          icon: <BarChart3 className="h-4 w-4" />,
        },
        {
          label: "Student Performance",
          href: "/teacher/analytics/students",
          icon: <Users className="h-4 w-4" />,
        },
        {
          label: "Assignment Reports",
          href: "/teacher/analytics/assignments",
          icon: <FileText className="h-4 w-4" />,
        },
      ],
    },
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const toggleSubmenu = (label: string) => {
    setActiveMenu(activeMenu === label ? null : label);
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("teacher-sidebar");
      if (sidebar && !sidebar.contains(event.target as Node) && isOpen) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    try {
      // ADD SIGNOUT HANDLER LOGIC HERE
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        id="teacher-sidebar"
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link href="/teacher" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">
              EduPlatform
            </span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-muted rounded"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">
                {user?.name || "Teacher"}
              </p>
              <p className="text-muted-foreground text-xs truncate">
                {user?.department || "Faculty"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-3">
            {menuItems.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleSubmenu(item.label)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors
                        ${
                          isActive(item.href)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-muted"
                        }
                      `}
                    >
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                      <ChevronLeft
                        className={`h-4 w-4 transition-transform ${
                          activeMenu === item.label ? "rotate-90" : "-rotate-90"
                        }`}
                      />
                    </button>

                    {activeMenu === item.label && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            className={`
                              flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors
                              ${
                                isActive(child.href)
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-foreground hover:bg-muted"
                              }
                            `}
                          >
                            {child.icon}
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                      ${
                        isActive(item.href)
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-muted"
                      }
                    `}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <Link
            href="/teacher/settings"
            className="flex items-center gap-3 px-3 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
