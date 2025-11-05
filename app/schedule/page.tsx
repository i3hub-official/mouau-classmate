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
  MapPin,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";
import {
  ScheduleService,
  ScheduleItem,
  DailySchedule,
} from "@/lib/services/scheduleServices";

interface UserData {
  name?: string;
  matricNumber?: string;
  department?: string;
  email?: string;
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<DailySchedule[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<ScheduleItem[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<ScheduleItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [view, setView] = useState<"week" | "day" | "month">("week");
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    fetchScheduleData();
    fetchUserData();
  }, [currentWeek]);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      const studentId = await getCurrentStudentId();

      if (!studentId) {
        console.error("No student ID found");
        setLoading(false);
        return;
      }

      const [weeklySchedule, todaysSchedule, deadlines] = await Promise.all([
        ScheduleService.getWeeklySchedule(studentId, getWeekStart(currentWeek)),
        ScheduleService.getTodaysSchedule(studentId),
        ScheduleService.getUpcomingDeadlines(studentId),
      ]);

      setSchedule(weeklySchedule);
      setTodaySchedule(todaysSchedule);
      setUpcomingDeadlines(deadlines);
    } catch (error) {
      console.error("Error fetching schedule data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStudentId = async (): Promise<string | null> => {
    // TODO: Implement this based on your auth system
    return null;
  };

  const fetchUserData = async () => {
    try {
      // TODO: Replace with actual user data fetch
      setUserData({
        name: "Student",
        matricNumber: "MOUAU/XX/XX/XXX",
        department: "Student Portal",
        email: "student@mouau.edu.ng",
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const getWeekStart = (date: Date): Date => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "ongoing":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
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
        return <BookOpen className="h-4 w-4" />;
      case "assignment":
        return <FileText className="h-4 w-4" />;
      case "exam":
        return <FileText className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader userData={userData ?? undefined} />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userData={userData ?? undefined} />

      {/* Main Content */}
      <main className="w-full px-6 xl:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Schedule
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage your academic schedule and deadlines
            </p>
          </div>

          <div className="flex items-center gap-4 mt-4 lg:mt-0">
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setView("day")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === "day"
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground"
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setView("week")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === "week"
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView("month")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === "month"
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground"
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateWeek("prev")}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-semibold text-foreground">
                {getWeekStart(currentWeek).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}{" "}
                - Week of {getWeekStart(currentWeek).getDate()}
              </h2>

              <button
                onClick={() => navigateWeek("next")}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <button
              onClick={goToToday}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Today
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Weekly Schedule */}
          <div className="xl:col-span-2 space-y-6">
            <h3 className="text-2xl font-bold text-foreground">
              Weekly Schedule
            </h3>

            {schedule.map((daySchedule) => (
              <div
                key={daySchedule.date.toISOString()}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-foreground">
                    {formatDate(daySchedule.date)}
                  </h4>
                  {isToday(daySchedule.date) && (
                    <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                      Today
                    </span>
                  )}
                </div>

                {daySchedule.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No scheduled activities</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {daySchedule.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 border border-border rounded-lg hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              {getTypeIcon(item.type)}
                            </div>
                            <div>
                              <h5 className="font-semibold text-foreground">
                                {item.title}
                              </h5>
                              <p className="text-sm text-muted-foreground">
                                {item.course.code} - {item.course.title}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(
                              item.status
                            )}`}
                          >
                            {getStatusIcon(item.status)}
                            {item.status.charAt(0).toUpperCase() +
                              item.status.slice(1)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {formatTime(item.startTime)} -{" "}
                              {formatTime(item.endTime)}
                            </span>
                          </div>
                          {item.type === "assignment" && (
                            <div className="flex items-center gap-1">
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  item.priority === "high"
                                    ? "bg-red-100 text-red-800"
                                    : item.priority === "medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {item.priority} priority
                              </span>
                            </div>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Today's Schedule */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Today's Schedule
              </h3>

              {todaySchedule.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No activities scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaySchedule.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getTypeIcon(item.type)}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-foreground text-sm">
                            {item.title}
                          </h5>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(item.startTime)} - {item.course.code}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs ${getStatusColor(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Upcoming Deadlines
              </h3>

              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No upcoming deadlines</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingDeadlines.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-foreground text-sm">
                            {item.title}
                          </h5>
                          <p className="text-xs text-muted-foreground">
                            Due {formatDate(item.startTime)} at{" "}
                            {formatTime(item.startTime)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.course.code}
                          </p>
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
