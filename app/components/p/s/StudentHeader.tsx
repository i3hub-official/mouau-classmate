// File: app/components/s/StudentHeader.tsx
"use client";

import { Bell, Menu, LogOut, User, Settings } from "lucide-react";
import { StudentProfile } from "@/lib/types/s/index";

interface StudentHeaderProps {
  onMenuClick: () => void;
  user: StudentProfile;
  onLogout: () => void;
}

export function StudentHeader({
  onMenuClick,
  user,
  onLogout,
}: StudentHeaderProps) {
  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md hover:bg-accent transition-colors md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden md:block">
            <h1 className="text-lg font-semibold text-foreground">
              MOUAU ClassMate
            </h1>
            <p className="text-xs text-muted-foreground">Student Portal</p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="p-2 rounded-md hover:bg-accent transition-colors relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors cursor-pointer">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              {user.passportUrl ? (
                <img
                  src={user.passportUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-primary" />
              )}
            </div>

            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-foreground">
                {user.firstName} {user.surname}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {user.role.toLowerCase()}
              </p>
            </div>

            {/* Dropdown Menu */}
            <div className="relative group">
              <Settings className="h-4 w-4 text-muted-foreground" />

              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-2">
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile Settings
                  </button>

                  <button
                    onClick={onLogout}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md flex items-center gap-2 text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
