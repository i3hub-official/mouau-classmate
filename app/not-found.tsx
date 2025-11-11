// app/not-found.tsx (Redesigned Version)
"use client";
import Link from "next/link";
import {
  Home,
  ArrowLeft,
  Search,
  BookOpen,
  Mail,
  Users,
  Calendar,
  MapPin,
  Compass,
} from "lucide-react";

export default function NotFound() {
  const popularLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/auth/signin", label: "Sign In", icon: Users },
    { href: "/student/courses", label: "Courses", icon: BookOpen },
    { href: "/student/schedule", label: "Schedule", icon: Calendar },
    { href: "/support", label: "Support", icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center p-4 md:pt-20">
      <div className="max-w-3xl w-full">
        {/* Header Section */}
        <div className="text-center mb-8 md:mb-12">
          {/* Logo and Brand */}
          <div className="mb-6 md:mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-2.5 border-2 border-primary/20 rounded-2xl bg-card shadow-sm">
                <img
                  src="/mouau_logo.webp"
                  alt="MOUAU Logo"
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
                />
              </div>
              <div className="text-left">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  MOUAU ClassMate
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Michael Okpara University of Agriculture, Umudike
                </p>
              </div>
            </div>
          </div>

          {/* 404 Message */}
          <div className="relative mb-8">
            <div className="inline-flex items-center justify-center gap-4 mb-6">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 rotate-12">
                  <span className="text-4xl sm:text-5xl font-black text-primary -rotate-12">
                    4
                  </span>
                </div>
              </div>
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-accent/20 rounded-full flex items-center justify-center border border-accent/30">
                  <Search className="h-10 w-10 sm:h-12 sm:w-12 text-accent" />
                </div>
              </div>
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 -rotate-12">
                  <span className="text-4xl sm:text-5xl font-black text-primary rotate-12">
                    4
                  </span>
                </div>
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3">
              Page Not Found
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
              Looks like you've ventured into uncharted territory. Let's get you
              back on track!
            </p>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="space-y-4 md:space-y-6 mb-6">
          {/* Popular Destinations Card */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-primary/5 border-b border-border px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Compass className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm sm:text-base">
                  Quick Navigation
                </h3>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {popularLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 p-3 sm:p-4 bg-background border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  >
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <link.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground text-sm sm:text-base block">
                        {link.label}
                      </span>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Help Section Card */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-accent/10 border-b border-border px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-accent/20 rounded-lg">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground text-sm sm:text-base">
                  Need Assistance?
                </h3>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Our support team is ready to help you find what you're looking
                for.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/support"
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Mail className="h-4 w-4" />
                  Contact Support
                </Link>
                <button
                  onClick={() => window.history.back()}
                  className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-border text-foreground font-medium text-sm rounded-xl hover:bg-accent/10 hover:border-accent/50 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            <Link
              href="/"
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              <Home className="h-3 w-3" />
              Return to Homepage
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
