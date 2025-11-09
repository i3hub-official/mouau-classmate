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
          desc: "Role-based dashboards (Admin, Student, Teacher)",
        },
        {
          name: "app/auth",
          count: "4 pages",
          desc: "Shared authentication UI",
        },
        {
          name: "app/components",
          count: "12 components",
          desc: "Role-specific UI components",
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
          desc: "Authentication & user management",
        },
        {
          name: "api/student",
          count: "7 endpoints",
          desc: "Student operations (courses, grades, etc.)",
        },
        {
          name: "api/teacher",
          count: "5 endpoints",
          desc: "Teacher operations (classes, attendance)",
        },
        {
          name: "api/admin",
          count: "3 endpoints",
          desc: "Admin operations (users, reports, audits)",
        },
      ],
    },
    {
      name: "Security Layer",
      icon: Shield,
      color: "bg-red-500",
      items: [
        {
          name: "lib/middleware",
          count: "24 modules",
          desc: "Advanced threat detection, rate limiting, geo-blocking",
        },
        {
          name: "lib/security",
          count: "3 modules",
          desc: "Encryption, CSP config, data protection",
        },
        {
          name: "lib/server",
          count: "3 modules",
          desc: "JWT handling, Prisma client",
        },
      ],
    },
    {
      name: "Business Logic",
      icon: Activity,
      color: "bg-purple-500",
      items: [
        {
          name: "lib/services/student",
          count: "13 services",
          desc: "Student business logic",
        },
        {
          name: "lib/services/teacher",
          count: "Empty",
          desc: "Ready for teacher services",
        },
        {
          name: "lib/services/admin",
          count: "Empty",
          desc: "Ready for admin services",
        },
        {
          name: "lib/utils",
          count: "4 utilities",
          desc: "Client IP, file utils, path utils",
        },
      ],
    },
    {
      name: "Configuration",
      icon: FileText,
      color: "bg-yellow-500",
      items: [
        {
          name: "lib/types",
          count: "3 folders",
          desc: "TypeScript definitions per role",
        },
        {
          name: "lib/config",
          count: "3 folders",
          desc: "Role-specific configurations",
        },
        {
          name: "lib/templates/emails",
          count: "4 templates",
          desc: "Email templates (verification, reset, welcome)",
        },
      ],
    },
    {
      name: "Database Layer",
      icon: Database,
      color: "bg-indigo-500",
      items: [
        {
          name: "prisma/schema.prisma",
          count: "1 schema",
          desc: "Database schema definition",
        },
        {
          name: "prisma/migrations",
          count: "Migration history",
          desc: "Database version control",
        },
      ],
    },
    {
      name: "PWA & Assets",
      icon: Smartphone,
      color: "bg-pink-500",
      items: [
        {
          name: "public/android",
          count: "6 icons",
          desc: "Android launcher icons",
        },
        {
          name: "public/ios",
          count: "12 icons",
          desc: "iOS app icons (all sizes)",
        },
        {
          name: "public/windows11",
          count: "4 tiles",
          desc: "Windows 11 app tiles",
        },
        {
          name: "PWA files",
          count: "manifest.json, sw.js",
          desc: "Progressive Web App support",
        },
      ],
    },
  ];

  const stats = [
    { label: "Total Pages", value: "21", color: "text-blue-600" },
    { label: "API Endpoints", value: "24", color: "text-green-600" },
    { label: "Services", value: "13+", color: "text-purple-600" },
    { label: "Middleware", value: "24", color: "text-red-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎓 Educational Platform Architecture
          </h1>
          <p className="text-xl text-gray-600">
            Complete Multi-Role Portal with Enterprise Security
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-md p-6 text-center"
            >
              <div className={`text-3xl font-bold ${stat.color} mb-2`}>
                {stat.value}
              </div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Architecture Layers */}
        <div className="space-y-6">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-lg shadow-lg overflow-hidden"
              >
                <div
                  className={`${section.color} text-white px-6 py-4 flex items-center gap-3`}
                >
                  <Icon className="w-6 h-6" />
                  <h2 className="text-xl font-bold">{section.name}</h2>
                </div>
                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    {section.items.map((item, i) => (
                      <div
                        key={i}
                        className="border-l-4 border-gray-300 pl-4 py-2"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-gray-900">
                            {item.name}
                          </span>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                            {item.count}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Key Features */}
        <div className="mt-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-6 text-center">
            ✨ Key Features
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-bold mb-2">🔐 Enterprise Security</h4>
              <ul className="text-sm space-y-1 opacity-90">
                <li>• Adaptive threat detection</li>
                <li>• Geo-blocking & IP filtering</li>
                <li>• Rate limiting & DDoS protection</li>
                <li>• End-to-end encryption</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2">📱 Progressive Web App</h4>
              <ul className="text-sm space-y-1 opacity-90">
                <li>• Offline support</li>
                <li>• Service worker caching</li>
                <li>• Cross-platform icons</li>
                <li>• Internet status monitoring</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2">🎯 Role-Based Access</h4>
              <ul className="text-sm space-y-1 opacity-90">
                <li>• Student portal (7 pages)</li>
                <li>• Teacher portal (9 pages)</li>
                <li>• Admin portal (5 pages)</li>
                <li>• Protected routes & guards</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Missing Components Alert */}
        <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-yellow-400"
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
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Remaining Tasks
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    Add shared UI components (/components/ui,
                    /components/shared)
                  </li>
                  <li>Complete teacher services (/lib/services/teacher)</li>
                  <li>Complete admin services (/lib/services/admin)</li>
                  <li>Populate type definitions (/lib/types/*/)</li>
                  <li>Add role configurations (/lib/config/*/)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
