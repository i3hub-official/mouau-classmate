// app/portal/admin/audits/page.tsx
import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
import { AuditAction, ResourceType } from "@prisma/client";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  Calendar,
  Activity,
  Globe,
  Monitor,
  FilterIcon,
  RotateCcw,
  Home,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Audit Logs | Admin Portal",
  description: "View and filter system audit logs",
};

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

interface AuditLogWithDetails {
  id: string;
  userId?: string | null;
  user?: User | null;
  action: AuditAction;
  resourceType?: ResourceType | null;
  resourceId?: string | null;
  details?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  securityLevel?: string | null;
  createdAt: Date;
}

export default async function AdminAuditsPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    action?: string;
    resourceType?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    ipAddress?: string;
  };
}) {
  // Check if user is authenticated and is an admin
  const session = await getServerSession();
  // Extend session user type to include 'role'
  const user = session && session.user
    ? (session.user as typeof session.user & { role?: string | null })
    : null;
  if (!session || user?.role !== "ADMIN") {
    redirect("/auth/signin");
  }

  // Parse search params
  const page = parseInt(searchParams.page || "1", 10);
  const limit = 20;

  const filters = {
    action: searchParams.action as AuditAction,
    resourceType: searchParams.resourceType as ResourceType,
    userId: searchParams.userId,
    dateFrom: searchParams.dateFrom,
    dateTo: searchParams.dateTo,
    ipAddress: searchParams.ipAddress,
  };

  // Fetch data
  const auditLogsData = await getAuditLogs(page, limit, filters);
  const auditActions = await getAuditActions();
  const resourceTypes = await getResourceTypes();
  const users = await getUsers();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Home className="h-4 w-4" />
          <span>Admin Portal</span>
          <span>/</span>
          <Settings className="h-4 w-4" />
          <span>Audit Logs</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">View and filter system activity logs</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <FilterIcon className="h-5 w-5 mr-2" />
          Filters
        </h2>
        <form
          action="/portal/admin/audits"
          method="GET"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <div className="space-y-2">
            <label htmlFor="action" className="text-sm font-medium">
              Action
            </label>
            <select
              id="action"
              name="action"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={filters.action || ""}
            >
              <option value="">Select action</option>
              {auditActions.map((action) => (
                <option key={action} value={action}>
                  {action.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="resourceType" className="text-sm font-medium">
              Resource Type
            </label>
            <select
              id="resourceType"
              name="resourceType"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={filters.resourceType || ""}
            >
              <option value="">Select resource type</option>
              {resourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="userId" className="text-sm font-medium">
              User
            </label>
            <select
              id="userId"
              name="userId"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={filters.userId || ""}
            >
              <option value="">Select user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email || "Unknown User"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="dateFrom" className="text-sm font-medium">
              Date From
            </label>
            <input
              id="dateFrom"
              name="dateFrom"
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={filters.dateFrom || ""}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="dateTo" className="text-sm font-medium">
              Date To
            </label>
            <input
              id="dateTo"
              name="dateTo"
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={filters.dateTo || ""}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="ipAddress" className="text-sm font-medium">
              IP Address
            </label>
            <input
              id="ipAddress"
              name="ipAddress"
              placeholder="Enter IP address"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={filters.ipAddress || ""}
            />
          </div>

          <div className="flex items-end space-x-2 lg:col-span-3">
            <button
              type="button"
              onClick={() => (window.location.href = "/portal/admin/audits")}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
            >
              <FilterIcon className="h-4 w-4 mr-2" />
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Date/Time
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  User
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Action
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Resource
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  IP Address
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {auditLogsData.auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-24 text-center">
                    No audit logs found matching the current filters.
                  </td>
                </tr>
              ) : (
                auditLogsData.auditLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 align-middle">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {format(log.createdAt, "MMM dd, yyyy HH:mm:ss")}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        {log.user ? (
                          <div className="space-y-1">
                            <div className="font-medium">
                              {log.user.name || "Unknown User"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {log.user.email}
                            </div>
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                              {log.user.role}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                            (log.action.includes("FAILED") ||
                              log.action.includes("ERROR") ||
                              log.action.includes("EXCEEDED")) &&
                              "border-transparent bg-destructive text-destructive-foreground",
                            (log.action.includes("LOGIN") ||
                              log.action.includes("REGISTERED") ||
                              log.action.includes("CREATED") ||
                              log.action.includes("SENT")) &&
                              "border-transparent bg-primary text-primary-foreground",
                            !(log.action.includes("FAILED") ||
                              log.action.includes("ERROR") ||
                              log.action.includes("EXCEEDED") ||
                              log.action.includes("LOGIN") ||
                              log.action.includes("REGISTERED") ||
                              log.action.includes("CREATED") ||
                              log.action.includes("SENT")) &&
                              "border-transparent bg-secondary text-secondary-foreground"
                          )}
                        >
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center">
                          {(() => {
                            switch (log.resourceType) {
                              case "USER":
                                return <User className="h-4 w-4" />;
                              case "COURSE":
                              case "LECTURE":
                              case "ASSIGNMENT":
                                return <Activity className="h-4 w-4" />;
                              case "SESSION":
                                return <Monitor className="h-4 w-4" />;
                              default:
                                return <Globe className="h-4 w-4" />;
                            }
                          })()}
                          <span className="ml-2">{log.resourceType}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle font-mono text-sm">
                        {log.ipAddress || "Unknown"}
                      </td>
                      <td className="p-4 align-middle">
                        <button
                          onClick={() => {
                            const detailsRow = document.getElementById(
                              `details-${log.id}`
                            );
                            if (detailsRow) {
                              detailsRow.style.display =
                                detailsRow.style.display === "none" ? "table-row" : "none";
                            }
                          }}
                          className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                    <tr
                      id={`details-${log.id}`}
                      style={{ display: "none" }}
                      className="border-b bg-muted/30"
                    >
                      <td colSpan={6} className="p-4">
                        <div className="space-y-3">
                          {log.resourceId && (
                            <div className="flex items-start gap-2">
                              <span className="font-semibold min-w-[100px]">
                                Resource ID:
                              </span>
                              <span className="font-mono text-sm">{log.resourceId}</span>
                            </div>
                          )}
                          {log.userAgent && (
                            <div className="flex flex-col gap-2">
                              <span className="font-semibold">User Agent:</span>
                              <div className="rounded-md border bg-background p-3 text-sm font-mono break-all">
                                {log.userAgent}
                              </div>
                            </div>
                          )}
                          {log.details && (
                            <div className="flex flex-col gap-2">
                              <span className="font-semibold">Details:</span>
                              <div className="rounded-md border bg-background p-3">
                                <pre className="text-sm whitespace-pre-wrap font-mono">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-card">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            {Math.min(
              (page - 1) * limit + 1,
              auditLogsData.pagination.total
            )}{" "}
            to{" "}
            {Math.min(page * limit, auditLogsData.pagination.total)} of{" "}
            {auditLogsData.pagination.total} results
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", (page - 1).toString());
                window.location.href = `/portal/admin/audits?${params.toString()}`;
              }}
              disabled={page <= 1}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </button>
            <span className="px-3 py-1 border rounded bg-muted/50 min-w-[80px] text-center text-sm">
              Page {page} of {auditLogsData.pagination.totalPages}
            </span>
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", (page + 1).toString());
                window.location.href = `/portal/admin/audits?${params.toString()}`;
              }}
              disabled={page >= auditLogsData.pagination.totalPages}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Server-side data fetching functions
async function getAuditLogs(
  page: number = 1,
  limit: number = 20,
  filters: {
    action?: AuditAction;
    resourceType?: ResourceType;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    ipAddress?: string;
  } = {}
) {
  const skip = (page - 1) * limit;

  // Build where clause based on filters
  const where: any = {};

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.resourceType) {
    where.resourceType = filters.resourceType;
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.ipAddress) {
    where.ipAddress = {
      contains: filters.ipAddress,
      mode: "insensitive",
    };
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.createdAt.lte = new Date(filters.dateTo);
    }
  }

  const [auditLogs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    auditLogs: auditLogs as AuditLogWithDetails[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getAuditActions() {
  return Object.values(AuditAction);
}

async function getResourceTypes() {
  return Object.values(ResourceType);
}

async function getUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });
}