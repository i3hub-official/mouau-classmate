// app/schedule/page.tsx
"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import {
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  Filter,
  RefreshCw,
  TrendingUp,
  ListTodo,
  CalendarDays,
  MapPin,
  Users,
  Target,
  BarChart3,
} from "lucide-react";
import {
  ScheduleService,
  ScheduleItem,
  DailySchedule,
} from "@/lib/services/scheduleService";
import { UserService } from "@/lib/services/userService";

interface UserData {
  id: string;
  name?: string | null;
  matricNumber?: string | null;
  department?: string | null;
  email?: string | null;
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<DailySchedule[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<ScheduleItem[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<ScheduleItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [view, setView] = useState<"week" | "day">("week");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<
    "all" | "lecture" | "assignment"
  >("all");
  const [signingOut, setSigningOut] = useState(false);
  const [activeDay, setActiveDay] = useState<number>(new Date().getDay());

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (userData?.id) {
      fetchScheduleData();
    }
  }, [currentWeek, userData]);

  const initializeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await UserService.getCurrentUser();
      if (!user?.id) {
        setError(
          "Unable to load user information. Please try refreshing the page."
        );
        setLoading(false);
        return;
      }

      setUserData(user);
    } catch (err) {
      console.error("Error initializing data:", err);
      setError(
        "Failed to load data. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduleData = async () => {
    if (!userData?.id) return;

    try {
      const weekStart = ScheduleService.getWeekStart(currentWeek);

      const [weeklySchedule, todaysSchedule, deadlines] = await Promise.all([
        ScheduleService.getWeeklySchedule(userData.id, weekStart),
        ScheduleService.getTodaysSchedule(userData.id),
        ScheduleService.getUpcomingDeadlines(userData.id),
      ]);

      setSchedule(weeklySchedule);
      setTodaySchedule(todaysSchedule);
      setUpcomingDeadlines(deadlines);
      setError(null);
    } catch (error) {
      console.error("Error fetching schedule data:", error);
      setError("Failed to load schedule. Please try again.");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchScheduleData();
    } finally {
      setRefreshing(false);
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
    setActiveDay(new Date().getDay());
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Clock className="h-4 w-4" />;
      case "ongoing":
        return <PlayCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "overdue":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "lecture":
        return <BookOpen className="h-5 w-5" />;
      case "assignment":
        return <FileText className="h-5 w-5" />;
      case "exam":
        return <FileText className="h-5 w-5" />;
      default:
        return <CalendarIcon className="h-5 w-5" />;
    }
  };

  const getDayName = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", { weekday: "short" });
  };

  const getDayNumber = (date: Date) => {
    return new Date(date).getDate();
  };

  const getMonthYear = () => {
    const weekStart = ScheduleService.getWeekStart(currentWeek);
    return weekStart.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return new Date(date).toDateString() === today.toDateString();
  };

  const getFilteredItems = (items: ScheduleItem[]) => {
    if (typeFilter === "all") return items;
    return items.filter((item) => item.type === typeFilter);
  };

  const stats = ScheduleService.calculateStats(
    schedule.flatMap((day) => day.items)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your schedule...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      {/* Sign Out Overlay */}
      {signingOut && (
        <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center">
          <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <span className="text-foreground font-medium">
                Signing out...
              </span>
            </div>
          </div>
        </div>
      )}

      <main
        className={`w-full px-6 xl:px-8 py-8 ${
          signingOut ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <CalendarDays className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Academic Schedule
                </h1>
                <p className="text-lg text-muted-foreground">
                  Your weekly academic planner
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 lg:mt-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing || signingOut}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Total Items
                </p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {stats.totalItems}
                </p>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <CalendarDays className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>This week</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Lectures
                </p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {stats.lectures}
                </p>
              </div>
              <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                <BookOpen className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              <span>Classes scheduled</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Assignments
                </p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {stats.assignments}
                </p>
              </div>
              <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-muted-foreground text-sm">
              <Target className="h-4 w-4" />
              <span>Tasks pending</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Upcoming
                </p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {stats.upcomingItems}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-muted-foreground text-sm">
              <BarChart3 className="h-4 w-4" />
              <span>This week</span>
            </div>
          </div>
        </div>

        {/* Enhanced Controls Bar */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Week Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateWeek("prev")}
                disabled={signingOut}
                className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 border border-border"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="text-center min-w-[200px]">
                <h2 className="text-lg font-semibold text-foreground">
                  {getMonthYear()}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Week of{" "}
                  {getDayNumber(ScheduleService.getWeekStart(currentWeek))}
                </p>
              </div>

              <button
                onClick={() => navigateWeek("next")}
                disabled={signingOut}
                className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 border border-border"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Filter and Actions */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  disabled={signingOut}
                  className="pl-10 pr-8 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 appearance-none cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="lecture">Lectures Only</option>
                  <option value="assignment">Assignments Only</option>
                </select>
              </div>

              <button
                onClick={goToToday}
                disabled={signingOut}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                Today
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Weekly Schedule - Main Content */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">
                Weekly Schedule
              </h3>
              <div className="text-sm text-muted-foreground bg-card px-3 py-1 rounded-lg border border-border">
                {schedule.reduce((acc, day) => acc + day.items.length, 0)} items
                this week
              </div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedule.map((daySchedule) => {
                const filteredItems = getFilteredItems(daySchedule.items);
                const isTodayDate = isToday(daySchedule.date);

                return (
                  <div
                    key={daySchedule.date.toISOString()}
                    className={`bg-card border rounded-xl p-5 transition-all hover:shadow-lg ${
                      isTodayDate
                        ? "border-primary shadow-lg"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {/* Day Header */}
                    <div className="text-center mb-4 pb-3 border-b border-border">
                      <div
                        className={`inline-flex flex-col items-center justify-center p-3 rounded-lg mb-3 ${
                          isTodayDate
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="text-xs font-medium opacity-80">
                          {getDayName(daySchedule.date)}
                        </div>
                        <div className="text-2xl font-bold">
                          {getDayNumber(daySchedule.date)}
                        </div>
                      </div>

                      <h4 className="text-lg font-semibold text-foreground">
                        {ScheduleService.formatDate(daySchedule.date, "long")}
                      </h4>

                      {isTodayDate && (
                        <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mt-2">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Schedule Items */}
                    {filteredItems.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No scheduled activities</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {filteredItems.slice(0, 4).map((item) => (
                          <div
                            key={item.id}
                            className={`p-3 border rounded-lg transition-all group hover:shadow-md ${
                              item.type === "lecture"
                                ? "border-blue-200 hover:border-blue-300"
                                : "border-purple-200 hover:border-purple-300"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Type Icon */}
                              <div
                                className={`p-2 rounded-lg ${
                                  item.type === "lecture"
                                    ? "bg-blue-100 text-blue-600"
                                    : "bg-purple-100 text-purple-600"
                                }`}
                              >
                                {getTypeIcon(item.type)}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <h5 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1">
                                  {item.title}
                                </h5>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.course.code}
                                </p>

                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {ScheduleService.formatTime(
                                        item.startTime
                                      )}
                                    </span>
                                  </div>

                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${ScheduleService.getStatusColor(
                                      item.status
                                    )}`}
                                  >
                                    {item.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {filteredItems.length > 4 && (
                          <div className="text-center pt-2">
                            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                              +{filteredItems.length - 4} more
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Today's Schedule Card */}
            <div className="bg-card border border-border rounded-xl p-5 sticky top-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Today's Schedule
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your activities for today
                  </p>
                </div>
              </div>

              {todaySchedule.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <div className="p-3 bg-green-100 text-green-600 rounded-xl inline-block mb-3">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-medium">No activities scheduled</p>
                  <p className="text-xs mt-1">Enjoy your free time!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {todaySchedule.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-border rounded-lg hover:border-primary/50 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            item.type === "lecture"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-purple-100 text-purple-600"
                          }`}
                        >
                          {getTypeIcon(item.type)}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
                              {item.title}
                            </h5>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${ScheduleService.getStatusColor(
                                item.status
                              )}`}
                            >
                              {item.status}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground mb-2">
                            {item.course.code}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {ScheduleService.formatTimeRange(
                                  item.startTime,
                                  item.endTime
                                )}
                              </span>
                            </div>
                            {item.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{item.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Deadlines Card */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <ListTodo className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Upcoming Deadlines
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Priority tasks to complete
                  </p>
                </div>
              </div>

              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <div className="p-3 bg-green-100 text-green-600 rounded-xl inline-block mb-3">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="text-xs mt-1">No upcoming deadlines</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {upcomingDeadlines.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-border rounded-lg hover:border-red-500/50 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            item.priority === "high"
                              ? "bg-red-100 text-red-600"
                              : item.priority === "medium"
                              ? "bg-orange-100 text-orange-600"
                              : "bg-green-100 text-green-600"
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-foreground text-sm group-hover:text-red-700 transition-colors">
                              {item.title}
                            </h5>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                item.priority === "high"
                                  ? "bg-red-100 text-red-700"
                                  : item.priority === "medium"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {item.priority}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground mb-2">
                            {item.course.code}
                          </p>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              Due {ScheduleService.formatDate(item.startTime)}{" "}
                              at {ScheduleService.formatTime(item.startTime)}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
