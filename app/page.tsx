// app/page.tsx
import Link from "next/link";
import { BookOpen, Users, Calendar, FileText } from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-background via-accent/5 to-primary/5 flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="w-full px-6 lg:px-12 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 border-2 rounded-lg">
              <img
                src="/mouau_logo.webp"
                alt="MOUAU Logo"
                className="h-6 w-6 object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                MOUAU ClassMate
              </h1>
              <p className="text-xs text-muted-foreground">
                Michael Okpara University of Agriculture, Umudike
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/auth/signin"
              className="hidden md:block px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Sign In
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section - Full Width */}
      <section className="flex-1 w-full px-6 lg:px-12 py-16 text-center flex flex-col justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6">
            Your Smarter
            <span className="text-primary"> Campus</span>
            <br />
            Companion
          </h1>

          <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-4xl mx-auto">
            Access course materials, submit assignments, track your grades, and
            connect with classmates - all in one modern platform.
          </p>

          <div className="flex gap-4 justify-center mb-16">
            <Link
              href="/auth/signup"
              className="px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Join Now
            </Link>
            <Link
              href="/auth/signin"
              className="px-8 py-3 border border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-white transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Features Grid - Full Width */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            <div className="p-6 bg-card rounded-lg border border-border hover:border-primary transition-colors">
              <FileText className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">
                Course Materials
              </h3>
              <p className="text-sm text-muted-foreground">
                Access all your lecture notes and resources
              </p>
            </div>

            <div className="p-6 bg-card rounded-lg border border-border hover:border-primary transition-colors">
              <Calendar className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">
                Assignments
              </h3>
              <p className="text-sm text-muted-foreground">
                Submit and track your assignments
              </p>
            </div>

            <div className="p-6 bg-card rounded-lg border border-border hover:border-primary transition-colors">
              <Users className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">
                Class Forum
              </h3>
              <p className="text-sm text-muted-foreground">
                Discuss with classmates and lecturers
              </p>
            </div>

            <div className="p-6 bg-card rounded-lg border border-border hover:border-primary transition-colors">
              <BookOpen className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">
                Grade Tracking
              </h3>
              <p className="text-sm text-muted-foreground">
                Monitor your academic progress
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
