"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Users,
  Calendar,
  FileText,
  TrendingUp,
  MessageSquare,
  Shield,
  Zap,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
} from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { UserService } from "@/lib/services/userService"; // Assuming this is the correct path

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Attempt to get the current user
        const user = await UserService.getCurrentUser();

        if (user && user.id) {
          // User is authenticated, redirect to the dashboard
          // Use replace so the user can't click "back" to the landing page
          router.replace("/student/dashboard");
        } else {
          // User is not authenticated, show the landing page
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        // If there's an error, assume user is not logged in
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [router]); // Add router as a dependency

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground"></p>
          </div>
        </div>
      </div>
    );
  }

  // If not loading and not redirected, render the landing page
  return (
    <div className="min-h-screen bg-linear-to-br from-background via-accent/5 to-primary/5 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-12 py-4 flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="p-2 border-2 border-primary/20 rounded-xl bg-primary/5">
              <img
                src="/mouau_logo.webp"
                alt="MOUAU Logo"
                className="h-6 w-6 sm:h-7 sm:w-7 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src =
                    "https://placehold.co/40x40/10b981/ffffff?text=M";
                }}
              />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">
                MOUAU ClassMate
              </h1>
              <p className="text-xs text-muted-foreground sm:block">
                Your Academic Partner
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/select-role"
              className="hidden md:block px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="hidden md:block px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 w-full px-4 sm:px-6 lg:px-12 py-12 sm:py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          {/* Hero Content */}
          <div className="text-center mb-12 sm:mb-16 lg:mb-20">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6">
              Your Smarter
              <span className="text-primary"> Campus</span>
              <br />
              Companion
            </h1>

            <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              All-in-one campus hub: course materials, collaboration, and smart
              study tools.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/select-role"
                className="px-8 py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
              >
                Get Started
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 sm:gap-8 lg:gap-12 mb-16">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                  500+
                </div>
                <div className="text-sm text-muted-foreground">
                  Active Students
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                  50+
                </div>
                <div className="text-sm text-muted-foreground">Courses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                  1000+
                </div>
                <div className="text-sm text-muted-foreground">Resources</div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Everything You Need to Succeed
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed to make your academic life easier
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="group p-6 bg-card rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all">
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-lg">
                  Course Materials
                </h3>
                <p className="text-sm text-muted-foreground">
                  Access lecture notes, slides, and study resources anytime,
                  anywhere
                </p>
              </div>

              <div className="group p-6 bg-card rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all">
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-lg">
                  Class Discussions
                </h3>
                <p className="text-sm text-muted-foreground">
                  Collaborate with classmates and get instant help from peers
                </p>
              </div>

              <div className="group p-6 bg-card rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all">
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-lg">
                  Study Groups
                </h3>
                <p className="text-sm text-muted-foreground">
                  Form study groups and collaborate on projects seamlessly
                </p>
              </div>

              <div className="group p-6 bg-card rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all">
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-lg">
                  Assignments
                </h3>
                <p className="text-sm text-muted-foreground">
                  Submit and track your assignments
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-linear-to-r from-primary/10 via-accent/10 to-primary/10 rounded-3xl p-8 sm:p-12 text-center border border-primary/20">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join hundreds of MOUAU students already using ClassMate to achieve
              academic excellence
            </p>
            <Link
              href="/select-role"
              className="inline-block px-8 py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              Get Started Today
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
          {/* Social Media */}
          <div className="flex justify-center gap-4 mb-6">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors group"
            >
              <Facebook className="h-5 w-5 text-primary" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors group"
            >
              <Twitter className="h-5 w-5 text-primary" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors group"
            >
              <Instagram className="h-5 w-5 text-primary" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors group"
            >
              <Linkedin className="h-5 w-5 text-primary" />
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground text-center">
            © 2025 MOUAU ClassMate. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
