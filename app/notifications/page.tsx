// app/notifications/page.tsx
"use client";
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import {
  Bell,
  Check,
  Trash2,
  ExternalLink,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Loader,
} from "lucide-react";
import {
  NotificationService,
  Notification,
} from "@/lib/services/notificationService";

type FilterType = "all" | "unread" | "read";
type NotificationType = "all" | "info" | "success" | "warning" | "error";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [typeFilter, setTypeFilter] = useState<NotificationType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>(
    []
  );
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await NotificationService.getNotifications(100); // Get more for the page
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchNotifications();
      setSelectedNotifications([]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      setMarkingAsRead(notificationId);
      const success = await NotificationService.markAsRead(notificationId);

      if (success) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId
              ? { ...notif, isRead: true, readAt: new Date() }
              : notif
          )
        );
        // Remove from selected if it was selected
        setSelectedNotifications((prev) =>
          prev.filter((id) => id !== notificationId)
        );
      }
    } finally {
      setMarkingAsRead(null);
    }
  };

  const handleMarkAsUnread = async (notificationId: string) => {
    try {
      // Since we don't have an unread endpoint, we'll simulate it by updating local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId
            ? { ...notif, isRead: false, readAt: undefined }
            : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as unread:", error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      setDeleting(notificationId);
      const success = await NotificationService.deleteNotification(
        notificationId
      );

      if (success) {
        setNotifications((prev) =>
          prev.filter((notif) => notif.id !== notificationId)
        );
        setSelectedNotifications((prev) =>
          prev.filter((id) => id !== notificationId)
        );
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedNotifications.length === 0) return;

    try {
      setBulkActionLoading(true);
      // Mark each selected notification as read
      for (const notificationId of selectedNotifications) {
        await NotificationService.markAsRead(notificationId);
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          selectedNotifications.includes(notif.id)
            ? { ...notif, isRead: true, readAt: new Date() }
            : notif
        )
      );
      setSelectedNotifications([]);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNotifications.length === 0) return;

    try {
      setBulkActionLoading(true);
      // Delete each selected notification
      for (const notificationId of selectedNotifications) {
        await NotificationService.deleteNotification(notificationId);
      }

      // Update local state
      setNotifications((prev) =>
        prev.filter((notif) => !selectedNotifications.includes(notif.id))
      );
      setSelectedNotifications([]);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map((n) => n.id));
    }
  };

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotifications((prev) =>
      prev.includes(notificationId)
        ? prev.filter((id) => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  // Filter and search notifications
  const filteredNotifications = notifications.filter((notification) => {
    // Filter by read status
    if (filter === "unread" && notification.isRead) return false;
    if (filter === "read" && !notification.isRead) return false;

    // Filter by type
    if (typeFilter !== "all" && notification.type !== typeFilter) return false;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "error":
        return <X className="h-5 w-5 text-red-600" />;
      case "info":
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-l-green-500 bg-green-50/50";
      case "warning":
        return "border-l-yellow-500 bg-yellow-50/50";
      case "error":
        return "border-l-red-500 bg-red-50/50";
      case "info":
      default:
        return "border-l-blue-500 bg-blue-50/50";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="w-full px-6 xl:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Notifications
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage your alerts and updates
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 lg:mt-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Loader
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {notifications.length}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {unreadCount}
                </p>
                <p className="text-sm text-muted-foreground">Unread</p>
              </div>
              <Bell className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {notifications.length - unreadCount}
                </p>
                <p className="text-sm text-muted-foreground">Read</p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {filteredNotifications.length}
                </p>
                <p className="text-sm text-muted-foreground">Filtered</p>
              </div>
              <Filter className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as NotificationType)}
                className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedNotifications.length > 0 && (
            <div className="flex items-center gap-4 mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedNotifications.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-border"
                />
                <span className="text-sm font-medium text-foreground">
                  {selectedNotifications.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkMarkAsRead}
                  disabled={bulkActionLoading}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Mark as Read
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkActionLoading}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="text-center p-12">
              <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No notifications found
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters or search query"
                  : "You're all caught up! New notifications will appear here."}
              </p>
              {(searchQuery || filter !== "all" || typeFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilter("all");
                    setTypeFilter("all");
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 transition-colors border-l-4 ${
                    getNotificationColor(notification.type)
                  } ${
                    !notification.isRead ? "bg-card" : "bg-muted/30"
                  } hover:bg-muted/50`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox for selection */}
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => handleSelectNotification(notification.id)}
                      className="mt-1 rounded border-border"
                    />

                    {/* Notification Icon */}
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Notification Content */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`text-lg font-semibold ${
                              !notification.isRead
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {NotificationService.formatTime(
                            notification.createdAt
                          )}
                        </span>
                      </div>

                      <p className="text-muted-foreground mb-3">
                        {notification.message}
                      </p>

                      {notification.actionUrl && (
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <ExternalLink className="h-4 w-4" />
                          <span>View details</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.isRead ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          disabled={markingAsRead === notification.id}
                          className="p-2 hover:bg-background rounded transition-colors disabled:opacity-50"
                          title="Mark as read"
                        >
                          {markingAsRead === notification.id ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsUnread(notification.id);
                          }}
                          className="p-2 hover:bg-background rounded transition-colors"
                          title="Mark as unread"
                        >
                          <Bell className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        disabled={deleting === notification.id}
                        className="p-2 hover:bg-background rounded transition-colors text-red-500 disabled:opacity-50"
                        title="Delete notification"
                      >
                        {deleting === notification.id ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Load More (if needed) */}
        {filteredNotifications.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              {refreshing ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}