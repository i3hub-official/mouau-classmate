// app/support/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  MessageCircle,
  Clock,
  Users,
  BookOpen,
  Shield,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  FileText,
  Video,
  Download,
} from "lucide-react";

export default function SupportPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const supportCategories = [
    {
      id: "account",
      title: "Account & Login",
      icon: <Shield className="h-6 w-6" />,
      description: "Password reset, verification, and account access issues",
      issues: [
        {
          question: "I forgot my password",
          answer:
            "Use the 'Forgot Password' feature on the signin page to reset your password. You'll receive an email with a reset link.",
          action: { text: "Reset Password", href: "/auth/forgot-password" },
        },
        {
          question: "I didn't receive verification email",
          answer:
            "Check your spam folder first. If you still haven't received it, you can request a new verification email.",
          action: { text: "Resend Verification", href: "/auth/verify-email" },
        },
        {
          question: "My account is locked",
          answer:
            "Accounts are temporarily locked after 5 failed login attempts. Wait 30 minutes or reset your password to unlock immediately.",
        },
        {
          question: "I can't remember my matric number",
          answer:
            "Contact your department administrator or visit the student affairs office with your identification documents.",
        },
      ],
    },
    {
      id: "academic",
      title: "Academic Resources",
      icon: <BookOpen className="h-6 w-6" />,
      description: "Course materials, assignments, and academic records",
      issues: [
        {
          question: "I can't access my course materials",
          answer:
            "Make sure you're properly enrolled in the course. Contact your course lecturer if access issues persist.",
        },
        {
          question: "How do I submit assignments?",
          answer:
            "Navigate to the Assignments section in your course, upload your file, and click submit before the deadline.",
        },
        {
          question: "Where can I see my grades?",
          answer:
            "Check the Grades section in your dashboard. Final grades are posted after examination periods.",
        },
        {
          question: "Course registration issues",
          answer:
            "Contact your academic advisor or the registration office during the registration period.",
        },
      ],
    },
    {
      id: "technical",
      title: "Technical Support",
      icon: <HelpCircle className="h-6 w-6" />,
      description: "Platform issues, bugs, and technical problems",
      issues: [
        {
          question: "The website is not loading properly",
          answer:
            "Clear your browser cache and cookies, try a different browser, or check your internet connection.",
        },
        {
          question: "I'm experiencing slow performance",
          answer:
            "This could be due to high traffic or your internet connection. Try during off-peak hours.",
        },
        {
          question: "Features not working as expected",
          answer:
            "Report specific issues through our contact form with details about what you were trying to do.",
        },
        {
          question: "Mobile app issues",
          answer:
            "Make sure you have the latest version of the app installed. Restart the app or reinstall if problems persist.",
        },
      ],
    },
    {
      id: "resources",
      title: "Resources & Guides",
      icon: <FileText className="h-6 w-6" />,
      description: "Tutorials, documentation, and learning resources",
      issues: [
        {
          question: "How to use the platform",
          answer:
            "Check our video tutorials and user guide for step-by-step instructions on platform features.",
          action: { text: "View Tutorials", href: "/guides" },
        },
        {
          question: "Student handbook",
          answer:
            "Download the complete student handbook for academic policies and procedures.",
          action: { text: "Download PDF", href: "/handbook" },
        },
        {
          question: "Academic calendar",
          answer:
            "View the current academic calendar for important dates and deadlines.",
          action: { text: "View Calendar", href: "/calendar" },
        },
      ],
    },
  ];

  const contactMethods = [
    {
      icon: <Mail className="h-6 w-6" />,
      title: "Email Support",
      description: "Get help via email",
      details: "support@mouaucm.edu.ng",
      responseTime: "Within 24 hours",
      action: "mailto:support@mouaucm.edu.ng",
    },
    {
      icon: <Phone className="h-6 w-6" />,
      title: "Phone Support",
      description: "Call our support line",
      details: "+234 XXX XXX XXXX",
      responseTime: "Mon-Fri, 8AM-4PM",
      action: "tel:+234XXXXXXXXXX",
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: "Live Chat",
      description: "Chat with support agents",
      details: "Available on platform",
      responseTime: "Real-time",
      action: "#chat",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Visit Help Desk",
      description: "In-person support",
      details: "ICT Building, Room 101",
      responseTime: "Mon-Fri, 9AM-3PM",
      action: "#location",
    },
  ];

  const filteredCategories = supportCategories
    .map((category) => ({
      ...category,
      issues: category.issues.filter(
        (issue) =>
          issue.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          issue.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.issues.length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Home
              </Link>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">
                MOUAU ClassMate Support
              </h1>
              <p className="text-muted-foreground">
                We're here to help you succeed
              </p>
            </div>
            <div className="w-24"></div> {/* Spacer for balance */}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            How can we help you?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Find answers to common questions, get technical support, and access
            learning resources.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for help articles, guides, or issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-4 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-foreground bg-card"
              />
              <HelpCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">24/7</div>
            <div className="text-muted-foreground">Platform Access</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <Users className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">50+</div>
            <div className="text-muted-foreground">Support Staff</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">98%</div>
            <div className="text-muted-foreground">Issue Resolution</div>
          </div>
        </div>

        {/* Support Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Browse Help Categories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer"
                onClick={() =>
                  setActiveCategory(
                    activeCategory === category.id ? null : category.id
                  )
                }
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <div className="text-primary">{category.icon}</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {category.title}
                      </h3>
                      <ChevronRight
                        className={`h-5 w-5 text-muted-foreground transition-transform ${
                          activeCategory === category.id ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                    <p className="text-muted-foreground mb-4">
                      {category.description}
                    </p>

                    {activeCategory === category.id && (
                      <div className="space-y-4 mt-4">
                        {category.issues.map((issue, index) => (
                          <div
                            key={index}
                            className="border-t border-border pt-4"
                          >
                            <h4 className="font-medium text-foreground mb-2">
                              {issue.question}
                            </h4>
                            <p className="text-muted-foreground text-sm mb-3">
                              {issue.answer}
                            </p>
                            {issue.action && (
                              <Link
                                href={issue.action.href}
                                className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
                              >
                                {issue.action.text}
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Methods */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Contact Support
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactMethods.map((method, index) => (
              <div
                key={index}
                className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-lg transition-all"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
                  <div className="text-primary">{method.icon}</div>
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {method.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-3">
                  {method.description}
                </p>
                <div className="text-foreground font-medium mb-2">
                  {method.details}
                </div>
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-4">
                  <Clock className="h-4 w-4" />
                  {method.responseTime}
                </div>
                <Link
                  href={method.action}
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-sm"
                >
                  Contact now
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Support */}
        <div className="bg-card border border-border rounded-xl p-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Urgent Technical Issues
              </h3>
              <p className="text-muted-foreground mb-4">
                For critical platform outages or emergency technical issues
                affecting multiple users.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                  <div className="text-red-800 font-medium">
                    Emergency Hotline
                  </div>
                  <div className="text-red-600">+234 XXX XXX XXXX</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                  <div className="text-red-800 font-medium">Available</div>
                  <div className="text-red-600">24/7 for emergencies</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Additional Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/guides"
              className="border border-border rounded-lg p-4 hover:shadow-lg transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <Video className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Video Tutorials
                </h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Step-by-step video guides for using platform features
              </p>
            </Link>

            <Link
              href="/faq"
              className="border border-border rounded-lg p-4 hover:shadow-lg transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <HelpCircle className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  FAQ
                </h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Frequently asked questions and answers
              </p>
            </Link>

            <Link
              href="/documentation"
              className="border border-border rounded-lg p-4 hover:shadow-lg transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <Download className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Documentation
                </h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Complete user manuals and technical documentation
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
