// app/components/DashboardHeader.tsx
"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Bell,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { SignOutModal } from "@/app/components/SignOutModal";

interface DashboardHeaderProps {
  userData?: {
    name?: string;
    matricNumber?: string;
    department?: string;
    email?: string;
  };
  onSignOut?: () => void;
  loading?: boolean;
}

export function DashboardHeader({
  userData,
  onSignOut,
  loading,
}: DashboardHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const pathname = usePathname();

  // Navigation items with their paths
  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/courses", label: "Courses" },
    { href: "/assignments", label: "Assignments" },
    { href: "/schedule", label: "Schedule" },
    { href: "/grades", label: "Grades" },
  ];

  const tagline = "Your Academic Partner";

  // Check if a nav item is active
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const handleSignOutClick = () => {
    setShowUserMenu(false);
    setShowSignOutModal(true);
  };

  const handleSignOut = async () => {
    try {
      const response = await fetch("/signout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        window.location.href = "/auth/signin";
      } else {
        console.error("Sign out failed");
        setShowSignOutModal(false);
      }
    } catch (error) {
      console.error("Error during sign out:", error);
      window.location.href = "/auth/signin";
    }
  };

  return (
    <>
      <header className="border-b border-border bg-card/95 backdrop-blur-lg sticky top-0 z-50 w-full">
        <div className="w-full px-6 xl:px-8 py-3">
          <div className="flex justify-between items-center">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-linear-to-br from-primary to-primary/80 rounded-lg shadow-lg">
                <img
                  src="/mouau_logo.webp"
                  alt="MOUAU Logo"
                  className="h-6 w-6 sm:h-7 sm:w-7 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  MOUAU ClassMate
                </h1>
                {loading ? (
                  <div className="animate-pulse h-4 w-32 bg-muted rounded"></div>
                ) : (
                  <p className="text-xs text-muted-foreground">{tagline}</p>
                )}
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <nav className="flex items-center gap-8">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`text-sm font-medium transition-colors ${
                        active
                          ? "text-foreground border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground"
                      } py-1`}
                    >
                      {item.label}
                    </a>
                  );
                })}
              </nav>

              <div className="flex items-center gap-4">
                <ThemeToggle />
                <button className="p-2 hover:bg-muted rounded-lg transition-colors relative">
                  <Bell size={20} className="text-muted-foreground" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-card"></span>
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div className="h-8 w-8 bg-linear-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
                      <User size={16} className="text-white" />
                    </div>
                    <ChevronDown size={16} className="text-muted-foreground" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-lg py-2 z-50">
                      <div className="px-4 py-3 border-b border-border">
                        {loading ? (
                          <>
                            <div className="animate-pulse h-4 w-32 bg-muted rounded mb-2"></div>
                            <div className="animate-pulse h-3 w-40 bg-muted rounded mb-1"></div>
                            <div className="animate-pulse h-3 w-48 bg-muted rounded"></div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-foreground">
                              {userData?.name || "Student"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {userData?.email}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {userData?.matricNumber} • {userData?.department}
                            </p>
                          </>
                        )}
                      </div>
                      <a
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <User size={16} />
                        Profile Settings
                      </a>
                      <a
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <Settings size={16} />
                        Account Settings
                      </a>
                      <div className="border-t border-border mt-2 pt-2">
                        <button
                          onClick={handleSignOutClick}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <button
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-border pt-4">
              <nav className="flex flex-col gap-3">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                        active
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {item.label}
                    </a>
                  );
                })}

                {/* Mobile User Info - Extended */}
                <div className="border-t border-border pt-4 mt-2">
                  <div className="flex items-center gap-3 px-3 py-2 bg-primary/5 rounded-lg mb-3">
                    <div className="h-10 w-10 bg-linear-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
                      <User size={18} className="text-white" />
                    </div>
                    <div>
                      {loading ? (
                        <>
                          <div className="animate-pulse h-4 w-24 bg-muted rounded mb-1"></div>
                          <div className="animate-pulse h-3 w-20 bg-muted rounded mb-1"></div>
                          <div className="animate-pulse h-3 w-28 bg-muted rounded"></div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-foreground">
                            {userData?.name || "Student"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {userData?.matricNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {userData?.department}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="/profile"
                      className="text-center text-sm text-foreground py-2 px-3 bg-muted rounded-lg transition-colors"
                    >
                      Profile
                    </a>
                    <button
                      onClick={handleSignOutClick}
                      className="text-center text-sm text-red-600 py-2 px-3 bg-red-50 rounded-lg transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      <SignOutModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onSignOut={
          onSignOut
            ? async () => {
                onSignOut();
              }
            : handleSignOut
        }
      />

      {/* Close dropdown when clicking outside */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </>
  );
}
