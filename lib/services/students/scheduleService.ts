// lib/services/scheduleService.ts (Client-side)

export type ScheduleItem = {
  id: string;
  title: string;
  type: "lecture" | "assignment" | "exam";
  course: {
    code: string;
    title: string;
  };
  startTime: Date;
  endTime: Date;
  description?: string;
  location?: string;
  status: "upcoming" | "ongoing" | "completed" | "overdue";
  priority: "low" | "medium" | "high";
};

export type DailySchedule = {
  date: Date;
  items: ScheduleItem[];
};

export type MonthlyOverviewItem = {
  date: Date;
  count: number;
  type: "lecture" | "assignment";
};

export interface ScheduleStats {
  totalItems: number;
  upcomingItems: number;
  ongoingItems: number;
  completedItems: number;
  overdueItems: number;
  lectures: number;
  assignments: number;
}

export class ScheduleService {
  /**
   * Get weekly schedule for a student
   */
  static async getWeeklySchedule(
    studentId: string,
    weekStart: Date
  ): Promise<DailySchedule[]> {
    try {
      if (!studentId) {
        throw new Error("Student ID is required to fetch weekly schedule");
      }

      const response = await fetch(
        `/api/schedule/weekly?studentId=${studentId}&weekStart=${weekStart.toISOString()}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("You must be logged in to view schedule");
        }
        if (response.status === 404) {
          console.warn("No schedule found for this week");
          return this.generateEmptyWeekSchedule(weekStart);
        }
        throw new Error(
          `Failed to fetch weekly schedule: ${response.statusText}`
        );
      }

      const scheduleData = await response.json();

      // Parse dates
      return scheduleData.map((day: any) => ({
        date: new Date(day.date),
        items: day.items.map((item: any) => ({
          ...item,
          startTime: new Date(item.startTime),
          endTime: new Date(item.endTime),
        })),
      }));
    } catch (error) {
      console.error("Error fetching weekly schedule:", error);
      throw error;
    }
  }

  /**
   * Get today's schedule for a student
   */
  static async getTodaysSchedule(studentId: string): Promise<ScheduleItem[]> {
    try {
      if (!studentId) {
        throw new Error("Student ID is required to fetch today's schedule");
      }

      const response = await fetch(
        `/api/schedule/today?studentId=${studentId}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("You must be logged in to view schedule");
        }
        if (response.status === 404) {
          console.warn("No schedule found for today");
          return [];
        }
        throw new Error(
          `Failed to fetch today's schedule: ${response.statusText}`
        );
      }

      const scheduleItems = await response.json();

      // Parse dates
      return scheduleItems.map((item: any) => ({
        ...item,
        startTime: new Date(item.startTime),
        endTime: new Date(item.endTime),
      }));
    } catch (error) {
      console.error("Error fetching today's schedule:", error);
      throw error;
    }
  }

  /**
   * Get upcoming deadlines (next 7 days)
   */
  static async getUpcomingDeadlines(
    studentId: string
  ): Promise<ScheduleItem[]> {
    try {
      if (!studentId) {
        throw new Error("Student ID is required to fetch upcoming deadlines");
      }

      const response = await fetch(
        `/api/schedule/deadlines?studentId=${studentId}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("You must be logged in to view deadlines");
        }
        if (response.status === 404) {
          console.warn("No upcoming deadlines found");
          return [];
        }
        throw new Error(
          `Failed to fetch upcoming deadlines: ${response.statusText}`
        );
      }

      const deadlines = await response.json();

      // Parse dates
      return deadlines.map((item: any) => ({
        ...item,
        startTime: new Date(item.startTime),
        endTime: new Date(item.endTime),
      }));
    } catch (error) {
      console.error("Error fetching upcoming deadlines:", error);
      throw error;
    }
  }

  /**
   * Get monthly schedule overview
   */
  static async getMonthlyOverview(
    studentId: string,
    month: number,
    year: number
  ): Promise<MonthlyOverviewItem[]> {
    try {
      if (!studentId) {
        throw new Error("Student ID is required to fetch monthly overview");
      }

      const response = await fetch(
        `/api/schedule/monthly?studentId=${studentId}&month=${month}&year=${year}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("You must be logged in to view schedule");
        }
        if (response.status === 404) {
          console.warn("No schedule found for this month");
          return [];
        }
        throw new Error(
          `Failed to fetch monthly overview: ${response.statusText}`
        );
      }

      const overview = await response.json();

      // Parse dates
      return overview.map((item: any) => ({
        ...item,
        date: new Date(item.date),
      }));
    } catch (error) {
      console.error("Error fetching monthly overview:", error);
      throw error;
    }
  }

  /**
   * Calculate schedule statistics
   */
  static calculateStats(items: ScheduleItem[]): ScheduleStats {
    const stats: ScheduleStats = {
      totalItems: items.length,
      upcomingItems: 0,
      ongoingItems: 0,
      completedItems: 0,
      overdueItems: 0,
      lectures: 0,
      assignments: 0,
    };

    items.forEach((item) => {
      // Count by status
      switch (item.status) {
        case "upcoming":
          stats.upcomingItems++;
          break;
        case "ongoing":
          stats.ongoingItems++;
          break;
        case "completed":
          stats.completedItems++;
          break;
        case "overdue":
          stats.overdueItems++;
          break;
      }

      // Count by type
      if (item.type === "lecture") {
        stats.lectures++;
      } else if (item.type === "assignment") {
        stats.assignments++;
      }
    });

    return stats;
  }

  /**
   * Get the start of the week (Monday) for a given date
   */
  static getWeekStart(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  /**
   * Get the end of the week (Sunday) for a given date
   */
  static getWeekEnd(date: Date): Date {
    const start = this.getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  /**
   * Generate array of dates for the current week
   */
  static getWeekDates(weekStart: Date): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  /**
   * Check if a date is today
   */
  static isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  /**
   * Check if a date is in the current week
   */
  static isInCurrentWeek(date: Date): boolean {
    const now = new Date();
    const weekStart = this.getWeekStart(now);
    const weekEnd = this.getWeekEnd(now);
    return date >= weekStart && date <= weekEnd;
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date, format: "short" | "long" = "short"): string {
    if (format === "long") {
      return new Date(date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  /**
   * Format time for display
   */
  static formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Format time range for display
   */
  static formatTimeRange(startTime: Date, endTime: Date): string {
    return `${this.formatTime(startTime)} - ${this.formatTime(endTime)}`;
  }

  /**
   * Get status color classes for UI
   */
  static getStatusColor(status: ScheduleItem["status"]): string {
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
  }

  /**
   * Get priority color classes for UI
   */
  static getPriorityColor(priority: ScheduleItem["priority"]): string {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  /**
   * Get type color classes for UI
   */
  static getTypeColor(type: ScheduleItem["type"]): string {
    switch (type) {
      case "lecture":
        return "bg-blue-100 text-blue-800";
      case "assignment":
        return "bg-purple-100 text-purple-800";
      case "exam":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  /**
   * Filter schedule items by type
   */
  static filterByType(
    items: ScheduleItem[],
    type: ScheduleItem["type"] | "all"
  ): ScheduleItem[] {
    if (type === "all") return items;
    return items.filter((item) => item.type === type);
  }

  /**
   * Filter schedule items by status
   */
  static filterByStatus(
    items: ScheduleItem[],
    status: ScheduleItem["status"] | "all"
  ): ScheduleItem[] {
    if (status === "all") return items;
    return items.filter((item) => item.status === status);
  }

  /**
   * Filter schedule items by course
   */
  static filterByCourse(
    items: ScheduleItem[],
    courseCode: string
  ): ScheduleItem[] {
    if (!courseCode || courseCode === "all") return items;
    return items.filter((item) => item.course.code === courseCode);
  }

  /**
   * Sort schedule items by start time
   */
  static sortByTime(
    items: ScheduleItem[],
    ascending: boolean = true
  ): ScheduleItem[] {
    return [...items].sort((a, b) => {
      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();
      return ascending ? timeA - timeB : timeB - timeA;
    });
  }

  /**
   * Group schedule items by date
   */
  static groupByDate(items: ScheduleItem[]): DailySchedule[] {
    const grouped = new Map<string, ScheduleItem[]>();

    items.forEach((item) => {
      const dateKey = new Date(item.startTime).toDateString();
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(item);
    });

    const dailySchedules: DailySchedule[] = [];
    grouped.forEach((items, dateKey) => {
      dailySchedules.push({
        date: new Date(dateKey),
        items: this.sortByTime(items),
      });
    });

    return dailySchedules.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get unique courses from schedule items
   */
  static getUniqueCourses(items: ScheduleItem[]): string[] {
    return Array.from(new Set(items.map((item) => item.course.code))).sort();
  }

  /**
   * Get time until item starts (in minutes)
   */
  static getTimeUntilStart(item: ScheduleItem): number {
    const now = new Date();
    const startTime = new Date(item.startTime);
    return Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));
  }

  /**
   * Get duration of item (in minutes)
   */
  static getDuration(item: ScheduleItem): number {
    const startTime = new Date(item.startTime);
    const endTime = new Date(item.endTime);
    return Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }

  /**
   * Check if item is happening now
   */
  static isHappeningNow(item: ScheduleItem): boolean {
    const now = new Date();
    const startTime = new Date(item.startTime);
    const endTime = new Date(item.endTime);
    return now >= startTime && now <= endTime;
  }

  /**
   * Generate empty week schedule for when no data is available
   */
  private static generateEmptyWeekSchedule(weekStart: Date): DailySchedule[] {
    const schedule: DailySchedule[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      schedule.push({
        date: new Date(date),
        items: [],
      });
    }
    return schedule;
  }

  /**
   * Get items for a specific date
   */
  static getItemsForDate(
    schedule: DailySchedule[],
    date: Date
  ): ScheduleItem[] {
    const targetDate = new Date(date).toDateString();
    const daySchedule = schedule.find(
      (day) => new Date(day.date).toDateString() === targetDate
    );
    return daySchedule?.items || [];
  }

  /**
   * Count items by type for a week
   */
  static countItemsByType(schedule: DailySchedule[]): Record<string, number> {
    const counts: Record<string, number> = {
      lecture: 0,
      assignment: 0,
      exam: 0,
    };

    schedule.forEach((day) => {
      day.items.forEach((item) => {
        counts[item.type]++;
      });
    });

    return counts;
  }
}

// Export convenient methods
export const {
  getWeeklySchedule,
  getTodaysSchedule,
  getUpcomingDeadlines,
  getMonthlyOverview,
  calculateStats,
  getWeekStart,
  getWeekEnd,
  getWeekDates,
  isToday,
  isInCurrentWeek,
  formatDate,
  formatTime,
  formatTimeRange,
  getStatusColor,
  getPriorityColor,
  getTypeColor,
  filterByType,
  filterByStatus,
  filterByCourse,
  sortByTime,
  groupByDate,
  getUniqueCourses,
  getTimeUntilStart,
  getDuration,
  isHappeningNow,
  getItemsForDate,
  countItemsByType,
} = ScheduleService;
