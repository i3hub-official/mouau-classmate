import React from "react";
import {
  FileText,
  Folder,
  Lock,
  Database,
  Mail,
  Smartphone,
  Globe,
  Shield,
  Activity,
  Zap,
  Code,
  Settings,
} from "lucide-react";

export default function ProjectStructure() {
  const sections = [
    {
      name: "Frontend Layer",
      icon: Globe,
      color: "bg-blue-500",
      items: [
        {
          name: "app/portal",
          count: "21 pages",
          desc: "Admin (5) • Student (7) • Teacher (9)",
        },
        {
          name: "app/auth",
          count: "4 pages",
          desc: "Signin, Forgot Password, Reset Password, Verify Email",
        },
        {
          name: "app/components",
          count: "15 components",
          desc: "Student (8) • Teacher (3) • Shared (4)",
        },
        {
          name: "hooks",
          count: "3 hooks",
          desc: "useAuth, useRoleProtection, use-internet-status",
        },
      ],
    },
    {
      name: "API Layer",
      icon: Zap,
      color: "bg-green-500",
      items: [
        {
          name: "api/auth",
          count: "9 endpoints",
          desc: "Signin, Signup, Password Reset, Email Verification",
        },
        {
          name: "api/student",
          count: "7 endpoints",
          desc: "Courses, Grades, Assignments, Profile, Schedule",
        },
        {
          name: "api/teacher",
          count: "5 endpoints",
          desc: "Classes, Attendance, Results, Assignments, Students",
        },
        {
          name: "api/admin",
          count: "3 endpoints",
          desc: "Users, Reports, Audits",
        },
      ],
    },
    {
      name: "Business Logic Layer",
      icon: Activity,
      color: "bg-purple-500",
      items: [
        {
          name: "services/student",
          count: "13 services",
          desc: "Assignment, Course, Dashboard, Email, Grade, Notification, etc.",
        },
        {
          name: "services/teacher",
          count: "5 services",
          desc: "Assignment, Attendance, Class, Grade, Student Management",
        },
        {
          name: "services/admin",
          count: "4 services",
          desc: "Audit, Report, System, User Management",
        },
        {
          name: "services/shared",
          count: "2 services",
          desc: "User Service (client & server)",
        },
      ],
    },
    {
      name: "Type System",
      icon: Code,
      color: "bg-indigo-500",
      items: [
        {
          name: "types/student",
          count: "✅ Complete",
          desc: "Student, Course, Grade, Assignment, Dashboard types",
        },
        {
          name: "types/teacher",
          count: "✅ Complete",
          desc: "Teacher, Class, Attendance, Grading types",
        },
        {
          name: "types/admin",
          count: "✅ Complete",
          desc: "User, Audit, Security, Report, System types",
        },
        {
          name: "types/shared",
          count: "✅ Complete",
          desc: "Auth, API, Form, UI, Utility types",
        },
      ],
    },
    {
      name: "Security Layer",
      icon: Shield,
      color: "bg-red-500",
      items: [
        {
          name: "middleware",
          count: "24 modules",
          desc: "Adaptive Threat Detection, Rate Limiting, Geo-blocking",
        },
        {
          name: "security",
          count: "3 modules",
          desc: "Encryption, CSP Config, Data Protection",
        },
        {
          name: "server",
          count: "3 modules",
          desc: "JWT Handling, Prisma Client, API Authentication",
        },
      ],
    },
    {
      name: "Configuration",
      icon: Settings,
      color: "bg-yellow-500",
      items: [
        {
          name: "config/student",
          count: "Ready",
          desc: "Academic rules, grading scales, permissions",
        },
        {
          name: "config/teacher",
          count: "Ready",
          desc: "Class limits, grading rules, permissions",
        },
        {
          name: "config/admin",
          count: "Ready",
          desc: "System settings, user limits, permissions",
        },
        {
          name: "utils",
          count: "4 utilities",
          desc: "Client IP, File Utils, Path Utils, General Utils",
        },
      ],
    },
    {
      name: "Email System",
      icon: Mail,
      color: "bg-pink-500",
      items: [
        {
          name: "templates/emails",
          count: "4 templates",
          desc: "Email Verification, Password Reset, Confirmation, Welcome",
        },
        {
          name: "Format",
          count: "3 per template",
          desc: "HTML, Plain Text, Subject (Handlebars)",
        },
      ],
    },
    {
      name: "Database Layer",
      icon: Database,
      color: "bg-cyan-500",
      items: [
        {
          name: "prisma/schema.prisma",
          count: "Complete Schema",
          desc: "Users, Students, Teachers, Courses, Enrollments, etc.",
        },
        {
          name: "Models",
          count: "20+ models",
          desc: "Authentication, Profiles, Academic, Security, Audit",
        },
        {
          name: "Enums",
          count: "8 enums",
          desc: "Role, Gender, Grade, NotificationType, AuditAction, etc.",
        },
        {
          name: "prisma/migrations",
          count: "Version Control",
          desc: "Database migration history",
        },
      ],
    },
    {
      name: "PWA & Assets",
      icon: Smartphone,
      color: "bg-teal-500",
      items: [
        {
          name: "public/android",
          count: "6 icons",
          desc: "48px to 512px launcher icons",
        },
        {
          name: "public/ios",
          count: "12 icons",
          desc: "16px to 1024px app icons (all sizes)",
        },
        {
          name: "public/windows11",
          count: "4 tiles",
          desc: "Square logos and splash screens",
        },
        {
          name: "PWA files",
          count: "3 files",
          desc: "manifest.json, sw.js, site.webmanifest",
        },
      ],
    },
  ];

  const stats = [
    { label: "API Endpoints", value: "24", color: "text-green-600", icon: Zap },
    { label: "Portal Pages", value: "21", color: "text-blue-600", icon: Globe },
    {
      label: "Services",
      value: "24",
      color: "text-purple-600",
      icon: Activity,
    },
    { label: "Type Files", value: "4", color: "text-indigo-600", icon: Code },
    { label: "Middleware", value: "24", color: "text-red-600", icon: Shield },
    {
      label: "Components",
      value: "15",
      color: "text-yellow-600",
      icon: FileText,
    },
  ];

  const completionStats = [
    { category: "Backend APIs", completion: 100, color: "bg-green-500" },
    { category: "Frontend Pages", completion: 100, color: "bg-blue-500" },
    { category: "Business Services", completion: 100, color: "bg-purple-500" },
    { category: "Type Definitions", completion: 100, color: "bg-indigo-500" },
    { category: "Security Layer", completion: 100, color: "bg-red-500" },
    { category: "Configuration", completion: 0, color: "bg-yellow-500" },
    { category: "UI Components", completion: 40, color: "bg-pink-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-block mb-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-sm font-semibold">
            🎓 MOUAU CLASSMATE
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Educational Platform Architecture
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Enterprise-Grade Multi-Role Portal with Advanced Security
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-8 md:mb-12">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="bg-white rounded-lg shadow-md p-4 md:p-6 text-center hover:shadow-lg transition-shadow"
              >
                <Icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                <div
                  className={`text-2xl md:text-3xl font-bold ${stat.color} mb-1`}
                >
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Completion Progress */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-600" />
            Project Completion Status
          </h3>
          <div className="space-y-4">
            {completionStats.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {item.category}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {item.completion}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`${item.color} h-2.5 rounded-full transition-all duration-500`}
                    style={{ width: `${item.completion}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">
                Overall Progress
              </span>
              <span className="text-2xl font-bold text-purple-600">77%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mt-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-4 rounded-full transition-all duration-500"
                style={{ width: "77%" }}
              ></div>
            </div>
          </div>
        </div>

        {/* Architecture Layers */}
        <div className="space-y-6">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div
                  className={`${section.color} text-white px-4 md:px-6 py-4 flex items-center gap-3`}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                  <h2 className="text-lg md:text-xl font-bold">
                    {section.name}
                  </h2>
                </div>
                <div className="p-4 md:p-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    {section.items.map((item, i) => (
                      <div
                        key={i}
                        className="border-l-4 border-gray-300 pl-4 py-2 hover:border-gray-500 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-2">
                          <span className="font-semibold text-gray-900 text-sm md:text-base">
                            {item.name}
                          </span>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600 whitespace-nowrap w-fit">
                            {item.count}
                          </span>
                        </div>
                        <p className="text-xs md:text-sm text-gray-600">
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Key Features */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl shadow-xl p-6 md:p-8 text-white">
          <h3 className="text-2xl font-bold mb-6 text-center">
            ✨ Enterprise Features
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5" />
                <h4 className="font-bold">🔐 Enterprise Security</h4>
              </div>
              <ul className="text-sm space-y-1 opacity-90">
                <li>• Adaptive threat detection</li>
                <li>• Geo-blocking & IP filtering</li>
                <li>• Multi-layer rate limiting</li>
                <li>• End-to-end encryption</li>
                <li>• Session fingerprinting</li>
                <li>• Behavioral analysis</li>
              </ul>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-5 h-5" />
                <h4 className="font-bold">📱 Progressive Web App</h4>
              </div>
              <ul className="text-sm space-y-1 opacity-90">
                <li>• Full offline support</li>
                <li>• Service worker caching</li>
                <li>• 22+ platform icons</li>
                <li>• Install on any device</li>
                <li>• Connection monitoring</li>
                <li>• Background sync</li>
              </ul>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5" />
                <h4 className="font-bold">🎯 Role-Based Access</h4>
              </div>
              <ul className="text-sm space-y-1 opacity-90">
                <li>• Student portal (7 pages)</li>
                <li>• Teacher portal (9 pages)</li>
                <li>• Admin portal (5 pages)</li>
                <li>• Protected routes & guards</li>
                <li>• Custom permissions</li>
                <li>• Audit logging</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Remaining Tasks */}
        <div className="mt-8 bg-amber-50 border-l-4 border-amber-400 p-4 md:p-6 rounded-r-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-amber-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-800 mb-2">
                Remaining Tasks (23% to completion)
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm text-amber-700">
                <div>
                  <p className="font-semibold mb-1">🔧 Configuration (0%)</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Add student configuration files</li>
                    <li>Add teacher configuration files</li>
                    <li>Add admin configuration files</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-1">🎨 UI Components (40%)</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Install & configure shadcn/ui</li>
                    <li>Create shared UI components</li>
                    <li>Build common layout components</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            🛠️ Technology Stack
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Next.js 14+", desc: "App Router" },
              { name: "TypeScript", desc: "Type Safety" },
              { name: "PostgreSQL", desc: "Database" },
              { name: "Prisma ORM", desc: "Database" },
              { name: "NextAuth.js", desc: "Authentication" },
              { name: "Tailwind CSS", desc: "Styling" },
              { name: "Handlebars", desc: "Email Templates" },
              { name: "PWA", desc: "Offline Support" },
            ].map((tech, i) => (
              <div
                key={i}
                className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <p className="font-semibold text-gray-900 text-sm">
                  {tech.name}
                </p>
                <p className="text-xs text-gray-600">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Generated: November 10, 2025 • Version: 1.0.0 • Status: 77% Complete
          </p>
        </div>
      </div>
    </div>
  );
}
