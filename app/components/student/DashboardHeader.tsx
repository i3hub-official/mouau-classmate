// app/components/student/DashboardHeader.tsx
"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { SignOutModal } from "@/app/components/student/SignOutModal";
import { NotificationDropdown } from "@/app/components/student/NotificationDropdown";
import { UserService } from "@/lib/services/userService";
import { NotificationService } from "@/lib/services/student/notificationService";

interface DashboardHeaderProps {
  onSignOut?: () => Promise<void>;
}

interface HeaderUserData {
  name?: string;
  matricNumber?: string;
  department?: string;
  email?: string;
}

export function DashboardHeader({ onSignOut }: DashboardHeaderProps) {
  const [userData, setUserData] = useState<HeaderUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  // Navigation items with their paths
  const navItems = [
    { href: "/student/dashboard", label: "Dashboard" },
    { href: "/courses", label: "Courses" },
    { href: "/assignments", label: "Assignments" },
    { href: "/schedule", label: "Schedule" },
    { href: "/grades", label: "Grades" },
  ];

  const tagline = "Your Academic Partner";

  useEffect(() => {
    fetchUserData();
    fetchUnreadCount();

    // Refresh unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userData = await UserService.getHeaderUserData();
      setUserData(userData);
    } catch (error) {
      console.error("Error fetching user data for header:", error);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const count = await NotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  // Check if a nav item is active
  const isActive = (href: string) => {
    if (href === "/student/dashboard") {
      return pathname === "/student/dashboard";
    }
    return pathname.startsWith(href);
  };

  const handleSignOutClick = () => {
    setShowUserMenu(false);
    setMobileMenuOpen(false);
    setShowSignOutModal(true);
  };

  const handleSignOut = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    setSigningOut(true);
    try {
      // If parent component provided onSignOut, use it
      if (onSignOut) {
        await onSignOut();
        return { success: true };
      }

      // Otherwise use the default implementation
      const response = await fetch("/auth/signout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        // Wait a moment for cookies to clear, then redirect
        await new Promise((resolve) => setTimeout(resolve, 500));
        window.location.href = "/auth/signin";
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Sign out failed");
      }
    } catch (error) {
      console.error("Error during sign out:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Sign out failed",
      };
    } finally {
      setSigningOut(false);
    }
  };

  const handleModalSignOut = async () => {
    const result = await handleSignOut();
    if (result.success) {
      setShowSignOutModal(false);
    }
    return result;
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);

    // Refresh unread count when opening notifications
    if (!showNotifications) {
      fetchUnreadCount();
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

                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={handleNotificationClick}
                    className="p-2 hover:bg-muted rounded-lg transition-colors relative"
                  >
                    <Bell size={20} className="text-muted-foreground" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full border-2 border-card flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  <NotificationDropdown
                    isOpen={showNotifications}
                    onClose={() => setShowNotifications(false)}
                  />
                </div>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    disabled={signingOut}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
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
                        ) : userData ? (
                          <>
                            <p className="text-sm font-medium text-foreground">
                              {userData.name || "Student"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {userData.email}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {userData.matricNumber} • {userData.department}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Not signed in
                          </p>
                        )}
                      </div>
                      <a
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User size={16} />
                        Profile Settings
                      </a>
                      <a
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings size={16} />
                        Account Settings
                      </a>
                      <a
                        href="/notifications"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Bell size={16} />
                        Notifications
                        {unreadCount > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </a>
                      <div className="border-t border-border mt-2 pt-2">
                        <button
                          onClick={handleSignOutClick}
                          disabled={signingOut}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors disabled:opacity-50"
                        >
                          <LogOut size={16} />
                          {signingOut ? "Signing Out..." : "Sign Out"}
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
                className="p-2 hover:bg-muted rounded-lg transition-colors relative"
                onClick={handleNotificationClick}
              >
                <Bell size={20} className="text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-card"></span>
                )}
              </button>
              <button
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                disabled={signingOut}
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
                      onClick={() => setMobileMenuOpen(false)}
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
                      ) : userData ? (
                        <>
                          <p className="text-sm font-medium text-foreground">
                            {userData.name || "Student"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {userData.matricNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {userData.department}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Not signed in
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="/profile"
                      className="text-center text-sm text-foreground py-2 px-3 bg-muted rounded-lg transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Profile
                    </a>
                    <a
                      href="/notifications"
                      className="text-center text-sm text-foreground py-2 px-3 bg-muted rounded-lg transition-colors relative"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Notifications
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </a>
                  </div>
                  <button
                    onClick={handleSignOutClick}
                    disabled={signingOut}
                    className="w-full mt-2 text-center text-sm text-red-600 py-2 px-3 bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {signingOut ? "Signing Out..." : "Sign Out"}
                  </button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      <SignOutModal
        isOpen={showSignOutModal}
        onClose={() => !signingOut && setShowSignOutModal(false)}
        onSignOut={handleModalSignOut}
      />

      {/* Close dropdowns when clicking outside */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}

      {/* Notification Dropdown */}
      <NotificationDropdown
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
}
