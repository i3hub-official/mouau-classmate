// app/components/NotificationDropdown.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { Bell, Check, Trash2, ExternalLink, Loader, X } from "lucide-react";
import {
  NotificationService,
  Notification,
} from "@/lib/services/notificationService";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDropdown({
  isOpen,
  onClose,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);

      // Prevent body scroll when dropdown is open on mobile
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await NotificationService.getNotifications(20);
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
      }
    } finally {
      setMarkingAsRead(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setRefreshing(true);
      const success = await NotificationService.markAllAsRead();

      if (success) {
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, isRead: true, readAt: new Date() }))
        );
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      const success = await NotificationService.deleteNotification(
        notificationId
      );

      if (success) {
        setNotifications((prev) =>
          prev.filter((notif) => notif.id !== notificationId)
        );
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Dropdown Container */}
      <div
        ref={dropdownRef}
        className="fixed md:absolute inset-x-0 md:inset-x-auto bottom-0 md:bottom-auto md:right-0 md:top-full md:mt-2 w-full md:w-80 lg:w-96 bg-card border border-border md:rounded-lg shadow-lg z-50 max-h-[80vh] md:max-h-96 overflow-hidden md:overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card sticky top-0">
          <h3 className="text-lg font-semibold text-foreground">
            Notifications
          </h3>
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={refreshing}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50"
            >
              <Loader
                size={16}
                className={`text-muted-foreground ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded transition-colors md:hidden"
            >
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-[calc(80vh-120px)] md:max-h-64">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader
                size={24}
                className="animate-spin text-muted-foreground"
              />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center p-8">
              <Bell
                size={48}
                className="text-muted-foreground mx-auto mb-4 opacity-50"
              />
              <p className="text-muted-foreground">No notifications</p>
              <p className="text-sm text-muted-foreground mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                    !notification.isRead
                      ? "bg-blue-50/50 dark:bg-blue-950/20"
                      : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-sm font-medium ${
                            !notification.isRead
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {notification.title}
                        </span>
                        {!notification.isRead && (
                          <span className="h-2 w-2 bg-blue-500 rounded-full shrink-0"></span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {NotificationService.formatTime(
                            notification.createdAt
                          )}
                        </span>
                        {notification.actionUrl && (
                          <ExternalLink
                            size={12}
                            className="text-muted-foreground shrink-0"
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          disabled={markingAsRead === notification.id}
                          className="p-1 hover:bg-background rounded transition-colors disabled:opacity-50"
                          title="Mark as read"
                        >
                          {markingAsRead === notification.id ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            <Check
                              size={14}
                              className="text-muted-foreground"
                            />
                          )}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="p-1 hover:bg-background rounded transition-colors text-red-500"
                        title="Delete notification"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-3 bg-card sticky bottom-0">
          <a
            href="/notifications"
            className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
          >
            View all notifications
          </a>
        </div>
      </div>
    </>
  );
}
