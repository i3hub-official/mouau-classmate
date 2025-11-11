// app/portal/admin/users/page.tsx
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
import {
  Users,
  Search,
  FilterIcon,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  ShieldX,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  Download,
  RefreshCw,
  Home,
  Settings,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Lock,
  Unlock,
  Key,
  User,
} from "lucide-react";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Users | Admin Portal",
  description: "Manage users, accounts, and permissions",
};

interface UserWithDetails {
  id: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: Date | null;
  role: string;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  failedLoginAttempts: number;
  accountLocked: boolean;
  lockedUntil?: Date | null;
  student?: {
    id: string;
    matricNumber: string;
    firstName: string;
    lastName: string;
    otherName?: string | null;
    gender?: string | null;
    phone?: string | null;
    email?: string | null;
    department: string;
    course: string;
    college: string;
    dateEnrolled: Date;
    isActive: boolean;
  } | null;
  teacher?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    otherName?: string | null;
    gender?: string | null;
    phone?: string | null;
    email?: string | null;
    department: string;
    institution: string;
    qualification?: string | null;
    specialization?: string | null;
    experience?: string | null;
    dateJoined: Date;
    isActive: boolean;
  } | null;
  admin?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    otherName?: string | null;
    gender?: string | null;
    phone?: string | null;
    email?: string | null;
    department: string;
    institution: string;
    qualification?: string | null;
    specialization?: string | null;
    experience?: string | null;
    dateJoined: Date;
    isActive: boolean;
  } | null;
  _count: {
    enrollments?: number;
    courses?: number;
    assignments?: number;
  };
}

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
};


export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    role?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}) {
  // Check if user is authenticated and is an admin
   // Check if user is authenticated and is an admin
  const session = (await getServerSession()) as { user?: SessionUser } | null;
  if (!session || session.user?.role !== "ADMIN") {
    redirect("/auth/signin");
  }

  // Parse search params
  const page = parseInt(searchParams.page || "1", 10);
  const limit = 20;
  const filters = {
    role: searchParams.role,
    status: searchParams.status,
    search: searchParams.search,
    sortBy: searchParams.sortBy || "createdAt",
    sortOrder: searchParams.sortOrder || "desc",
  };

  // Fetch users with pagination and filters
  const usersData = await getUsers(page, limit, filters);

    function deleteUser(id: string) {
        throw new Error("Function not implemented.");
    }

    function exportUsers(selectedUsers: never[]) {
        throw new Error("Function not implemented.");
    }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Home className="h-4 w-4" />
          <span>Admin Portal</span>
          <span>/</span>
          <span>Users</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{usersData.total}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Users</p>
              <p className="text-2xl font-bold text-green-500">{usersData.active}</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Inactive Users</p>
              <p className="text-2xl font-bold text-red-500">{usersData.inactive}</p>
            </div>
            <UserX className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Locked Accounts</p>
              <p className="text-2xl font-bold text-orange-500">{usersData.locked}</p>
            </div>
            <ShieldX className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Unverified Emails</p>
              <p className="text-2xl font-bold text-amber-500">{usersData.unverified}</p>
            </div>
            <Mail className="h-8 w-8 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center">
            <FilterIcon className="h-5 w-5 mr-2" />
            Filters
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.delete("page");
                params.delete("role");
                params.delete("status");
                params.delete("search");
                window.location.href = `/portal/admin/users?${params.toString()}`;
              }}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Filters
            </button>
            <button
              onClick={() => {
                window.location.href = "/portal/admin/users/create";
              }}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </button>
          </div>
        </div>

        <form
          action="/portal/admin/users"
          method="GET"
          className="grid grid-cols-1 md:grid-cols-5 gap-4"
        >
          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              User Role
            </label>
            <select
              id="role"
              name="role"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={filters.role || ""}
            >
              <option value="">All Roles</option>
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              Account Status
            </label>
            <select
              id="status"
              name="status"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={filters.status || ""}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="locked">Locked</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="search" className="text-sm font-medium">
              Search Users
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="search"
                name="search"
                type="text"
                placeholder="Search by name, email, or ID..."
                className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm"
                defaultValue={filters.search || ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="sortBy" className="text-sm font-medium">
              Sort By
            </label>
            <select
              id="sortBy"
              name="sortBy"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={filters.sortBy}
            >
              <option value="createdAt">Created Date</option>
              <option value="lastLoginAt">Last Login</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="sortOrder" className="text-sm font-medium">
              Sort Order
            </label>
            <select
              id="sortOrder"
              name="sortOrder"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={filters.sortOrder}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="rounded border-input"
                      onChange={(e) => {
                        const checkboxes = document.querySelectorAll('.user-checkbox');
                        checkboxes.forEach((checkbox) => {
                          (checkbox as HTMLInputElement).checked = e.target.checked;
                        });
                      }}
                    />
                    <span className="text-sm">Select All</span>
                  </div>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  User
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Role
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Status
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Last Login
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Created
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {usersData.users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-24 text-center">
                    No users found matching the current filters.
                  </td>
                </tr>
              ) : (
                usersData.users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            className="user-checkbox rounded border-input"
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Add to selected users list
                              } else {
                                // Remove from selected users list
                              }
                            }}
                          />
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt={user.name || "User"}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{user.name || "Unknown User"}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          user.role === "ADMIN" && "bg-red-100 text-red-800",
                          user.role === "TEACHER" && "bg-blue-100 text-blue-800",
                          user.role === "STUDENT" && "bg-green-100 text-green-800"
                        )}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            user.isActive ? "bg-green-500" : "bg-red-500"
                          )} />
                          <span className="text-sm font-medium text-muted-foreground">
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {user.accountLocked && (
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-orange-500" />
                            <span className="text-sm font-medium text-muted-foreground">Locked</span>
                          </div>
                        )}
                        {!user.emailVerified && (
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                            <span className="text-sm font-medium text-muted-foreground">Unverified</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {user.lastLoginAt ? format(user.lastLoginAt, "PPP p") : "Never"}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {format(user.createdAt, "PPP p")}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              window.location.href = `/portal/admin/users/${user.id}`;
                            }}
                            className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2 mr-2"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              window.location.href = `/portal/admin/users/${user.id}/edit`;
                            }}
                            className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Toggle user status
                              toggleUserStatus(user.id, !user.isActive);
                            }}
                            className={cn(
                              "inline-flex items-center justify-center rounded-md h-8 px-3 py-2",
                              user.isActive
                                ? "bg-red-100 text-red-800 hover:bg-red-200"
                                : "bg-green-100 text-green-800 hover:bg-green-200"
                            )}
                          >
                            {user.isActive ? (
                              <>
                                <Lock className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Unlock className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              // Reset user password
                              resetUserPassword(user.id);
                            }}
                            className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2"
                          >
                            <Key className="h-4 w-4" />
                            Reset Password
                          </button>
                          <button
                            onClick={() => {
                              // Delete user with confirmation
                              if (confirm(`Are you sure you want to delete ${user.name || "this user"}?`)) {
                                deleteUser(user.id);
                              }
                            }}
                            className="inline-flex items-center justify-center rounded-md bg-red-100 text-red-800 hover:bg-red-200 h-8 px-3 py-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-card">
          <div className="text-sm text-muted-foreground">
            Showing {usersData.users.length} of {usersData.total} users
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", (page - 1).toString());
                window.location.href = `/portal/admin/users?${params.toString()}`;
              }}
              disabled={page <= 1}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 border rounded bg-muted/50 min-w-20 text-center">
              Page {page} of {usersData.totalPages}
            </span>
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", (page + 1).toString());
                window.location.href = `/portal/admin/users?${params.toString()}`;
              }}
              disabled={page >= usersData.totalPages}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {usersData.selectedUsers.length > 0 && (
        <div className="rounded-lg border bg-card p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Bulk Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => {
                // Activate selected users
                bulkUpdateUserStatus(usersData.selectedUsers, true);
              }}
              className="inline-flex items-center justify-center rounded-md bg-green-100 text-green-800 hover:bg-green-200 h-9 px-4 py-2"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Activate Selected
            </button>
            <button
              onClick={() => {
                // Deactivate selected users
                bulkUpdateUserStatus(usersData.selectedUsers, false);
              }}
              className="inline-flex items-center justify-center rounded-md bg-red-100 text-red-800 hover:bg-red-200 h-9 px-4 py-2"
            >
              <UserX className="h-4 w-4 mr-2" />
              Deactivate Selected
            </button>
            <button
              onClick={() => {
                // Send verification emails to selected users
                bulkSendVerificationEmails(usersData.selectedUsers);
              }}
              className="inline-flex items-center justify-center rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200 h-9 px-4 py-2"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Verification
            </button>
            <button
              onClick={() => {
                // Export selected users
                exportUsers(usersData.selectedUsers);
              }}
              className="inline-flex items-center justify-center rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 h-9 px-4 py-2"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Selected
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Server-side functions
async function getUsers(
  page: number = 1,
  limit: number = 20,
  filters: {
    role?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }
) {
  const skip = (page - 1) * limit;

  // Build where clause based on filters
  const where: any = {};

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.status) {
    switch (filters.status) {
      case "active":
        where.isActive = true;
        break;
      case "inactive":
        where.isActive = false;
        break;
      case "locked":
        where.accountLocked = true;
        break;
      case "unverified":
        where.emailVerified = null;
        break;
    }
  }

  if (filters.search) {
    where.OR = [
      {
        name: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
    ];
  }

  // Get users with their related profiles
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            matricNumber: true,
            firstName: true,
            lastName: true,
            department: true,
            dateEnrolled: true,
            isActive: true,
          },
        },
        teacher: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
            institution: true,
            dateJoined: true,
            isActive: true,
          },
        },
        admin: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
            institution: true,
            dateJoined: true,
            isActive: true,
          },
        },
        _count: true,
      },
      orderBy: { [filters.sortBy as string]: filters.sortOrder },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  // Calculate statistics
  const active = users.filter((user) => user.isActive).length;
  const inactive = users.filter((user) => !user.isActive).length;
  const locked = users.filter((user) => user.accountLocked).length;
  const unverified = users.filter((user) => !user.emailVerified).length;

  return {
    users,
    total,
    totalPages: Math.ceil(total / limit),
    active,
    inactive,
    locked,
    unverified,
    selectedUsers: [], // This would be managed in state
  };
}

// Client-side functions (would be in a separate file or in a client component)
function toggleUserStatus(userId: string, isActive: boolean) {
  // In a real implementation, this would call an API endpoint
  console.log(`Toggling user ${userId} to ${isActive ? "active" : "inactive"}`);
}

function resetUserPassword(userId: string) {
  // In a real implementation, this would call an API endpoint
  console.log(`Resetting password for user ${userId}`);
}

function bulkUpdateUserStatus(userIds: string[], isActive: boolean) {
  // In a real implementation, this would call an API endpoint
  console.log(`Bulk updating ${userIds.length} users to ${isActive ? "active" : "inactive"}`);
}

function bulkSendVerificationEmails(userIds: string[]) {
  // In a real implementation, this would call an API endpoint
  console.log(`Sending verification emails to ${userIds.length} users`);
function exportUsers(userIds: string[]) {
  // In a real implementation, this would call an API endpoint
  console.log(`Exporting ${userIds.length} users`);
}

// Stub for deleteUser to prevent compile error
function deleteUser(userId: string) {
  // In a real implementation, this would call an API endpoint
  console.log(`Deleting user ${userId}`);
} // In a real implementation, this would call an API endpoint
  console.log(`Exporting ${userIds.length} users`);
}