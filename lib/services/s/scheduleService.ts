// lib/services/scheduleService.ts
import { prisma } from "@/lib/server/prisma";
import { ScheduleItem, WeeklySchedule } from "@/lib/types/s/index";

export class StudentScheduleService {
  /**
   * Get complete weekly schedule with Assignments, Lectures & Exams
   * Fully type-safe and aligned with your latest schema
   */
  static async getWeeklySchedule(
    studentId: string,
    weekStart: Date // Must be a Monday
  ): Promise<WeeklySchedule> {
    try {
      // Ensure weekStart is a Monday
      const adjustedWeekStart = new Date(weekStart);
      const dayOfWeek = adjustedWeekStart.getDay();
      const diff = adjustedWeekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when Sunday
      adjustedWeekStart.setDate(diff);
      adjustedWeekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(adjustedWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const enrollments = await prisma.enrollment.findMany({
        where: { 
          studentId, 
          isCompleted: false 
        },
        select: { courseId: true },
      });

      const courseIds = enrollments.map((e) => e.courseId);

      if (courseIds.length === 0) {
        return {
          weekStart: adjustedWeekStart,
          weekEnd,
          items: [],
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        };
      }

      // Fetch all three types in parallel
      const [assignments, lectures, exams] = await Promise.all([
        prisma.assignment.findMany({
          where: {
            courseId: { in: courseIds },
            isPublished: true,
            dueDate: { gte: adjustedWeekStart, lte: weekEnd },
            deletedAt: null,
          },
          include: { 
            course: { 
              select: { 
                code: true, 
                title: true 
              } 
            } 
          },
          orderBy: { dueDate: "asc" },
        }),

        prisma.lecture.findMany({
          where: {
            courseId: { in: courseIds },
            isPublished: true,
            scheduledAt: { 
              gte: adjustedWeekStart, 
              lte: weekEnd,
              not: null 
            },
          },
          include: { 
            course: { 
              select: { 
                code: true, 
                title: true 
              } 
            } 
          },
          orderBy: { scheduledAt: "asc" },
        }),

        prisma.exam.findMany({
          where: {
            courseId: { in: courseIds },
            isPublished: true,
            date: { gte: adjustedWeekStart, lte: weekEnd },
            deletedAt: null,
          },
          include: {
            course: { 
              select: { 
                code: true, 
                title: true 
              } 
            },
          },
          orderBy: { date: "asc" },
        }),
      ]);

      const items: ScheduleItem[] = [
        // Assignments
        ...assignments.map((a) => ({
          id: `assignment-${a.id}`,
          type: "assignment" as const,
          scheduledAt: a.dueDate,
          dueDate: a.dueDate,
          title: a.title,
          courseCode: a.course.code,
          courseTitle: a.course.title,
          description: a.description || "Assignment due",
        })),

        // Lectures
        ...lectures.map((l) => ({
          id: `lecture-${l.id}`,
          type: "lecture" as const,
          scheduledAt: l.scheduledAt!,
          title: l.title,
          courseCode: l.course.code,
          courseTitle: l.course.title,
          description: l.description || "Lecture session",
          duration: l.duration || 60, // Default 60 minutes
        })),

        // Exams
        ...exams.map((e) => ({
          id: `exam-${e.id}`,
          type: "exam" as const,
          scheduledAt: e.date,
          title: e.title || `${e.course.code} Examination`,
          courseCode: e.course.code,
          courseTitle: e.course.title,
          description: e.description || `${e.course.code} Exam`,
          venue: e.venue,
          duration: e.duration,
          format: e.format,
        })),
      ];

      // Group by day
      const schedule: WeeklySchedule = {
        weekStart: adjustedWeekStart,
        weekEnd,
        items,
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };

      const dayMap: Record<number, keyof WeeklySchedule> = {
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
        6: "saturday",
        0: "sunday",
      };

      items.forEach((item) => {
        const dayOfWeek = item.scheduledAt.getDay();
        const dayKey = dayMap[dayOfWeek];
        if (dayKey && Array.isArray(schedule[dayKey])) {
          (schedule[dayKey] as ScheduleItem[]).push(item);
        }
      });

      // Sort each day chronologically
      (
        [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ] as const
      ).forEach((day) => {
        schedule[day].sort(
          (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
        );
      });

      return schedule;
    } catch (error) {
      console.error("Error getting weekly schedule:", error);
      throw new Error("Failed to retrieve weekly schedule");
    }
  }

  /**
   * Get upcoming items (next N days) — now includes exams
   */
  static async getUpcomingScheduleItems(
    studentId: string,
    daysAhead: number = 14
  ): Promise<ScheduleItem[]> {
    try {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      futureDate.setHours(23, 59, 59, 999);

      const enrollments = await prisma.enrollment.findMany({
        where: { 
          studentId, 
          isCompleted: false 
        },
        select: { courseId: true },
      });

      const courseIds = enrollments.map((e) => e.courseId);
      if (courseIds.length === 0) return [];

      const [assignments, lectures, exams] = await Promise.all([
        prisma.assignment.findMany({
          where: {
            courseId: { in: courseIds },
            isPublished: true,
            dueDate: { gte: startDate, lte: futureDate },
            deletedAt: null,
          },
          include: { 
            course: { 
              select: { 
                code: true, 
                title: true 
              } 
            } 
          },
        }),

        prisma.lecture.findMany({
          where: {
            courseId: { in: courseIds },
            isPublished: true,
            scheduledAt: { 
              gte: startDate, 
              lte: futureDate,
              not: null 
            },
          },
          include: { 
            course: { 
              select: { 
                code: true, 
                title: true 
              } 
            } 
          },
        }),

        prisma.exam.findMany({
          where: {
            courseId: { in: courseIds },
            isPublished: true,
            deletedAt: null,
            date: { gte: startDate, lte: futureDate },
          },
          include: { 
            course: { 
              select: { 
                code: true, 
                title: true 
              } 
            } 
          },
        }),
      ]);

      const items: ScheduleItem[] = [
        ...assignments.map((a) => ({
          id: `assignment-${a.id}`,
          type: "assignment" as const,
          scheduledAt: a.dueDate,
          dueDate: a.dueDate,
          title: a.title,
          courseCode: a.course.code,
          courseTitle: a.course.title,
          description: a.description || "Assignment due",
        })),

        ...lectures.map((l) => ({
          id: `lecture-${l.id}`,
          type: "lecture" as const,
          scheduledAt: l.scheduledAt!,
          title: l.title,
          courseCode: l.course.code,
          courseTitle: l.course.title,
          description: l.description || "Lecture session",
          duration: l.duration || 60,
        })),

        ...exams.map((e) => ({
          id: `exam-${e.id}`,
          type: "exam" as const,
          scheduledAt: e.date,
          title: e.title || `${e.course.code} Exam`,
          courseCode: e.course.code,
          courseTitle: e.course.title,
          description: e.description || `${e.course.code} Examination`,
          venue: e.venue,
          duration: e.duration,
          format: e.format,
        })),
      ];

      return items.sort(
        (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
      );
    } catch (error) {
      console.error("Error getting upcoming schedule items:", error);
      throw new Error("Failed to retrieve upcoming schedule items");
    }
  }

  /**
   * Get schedule items in custom date range — includes exams
   */
  static async getScheduleByDateRange(
    studentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ScheduleItem[]> {
    try {
      // Normalize dates
      const normalizedStart = new Date(startDate);
      normalizedStart.setHours(0, 0, 0, 0);
      
      const normalizedEnd = new Date(endDate);
      normalizedEnd.setHours(23, 59, 59, 999);

      const enrollments = await prisma.enrollment.findMany({
        where: { 
          studentId, 
          isCompleted: false 
        },
        select: { courseId: true },
      });

      const courseIds = enrollments.map((e) => e.courseId);
      if (courseIds.length === 0) return [];

      const [assignments, lectures, exams] = await Promise.all([
        prisma.assignment.findMany({
          where: {
            courseId: { in: courseIds },
            isPublished: true,
            dueDate: { 
              gte: normalizedStart, 
              lte: normalizedEnd 
            },
            deletedAt: null,
          },
          include: { 
            course: { 
              select: { 
                code: true, 
                title: true 
              } 
            } 
          },
        }),

        prisma.lecture.findMany({
          where: {
            courseId: { in: courseIds },
            isPublished: true,
            scheduledAt: { 
              gte: normalizedStart, 
              lte: normalizedEnd,
              not: null 
            },
          },
          include: { 
            course: { 
              select: { 
                code: true, 
                title: true 
              } 
            } 
          },
        }),

        prisma.exam.findMany({
          where: {
            courseId: { in: courseIds },
            isPublished: true,
            deletedAt: null,
            date: { 
              gte: normalizedStart, 
              lte: normalizedEnd 
            },
          },
          include: { 
            course: { 
              select: { 
                code: true, 
                title: true 
              } 
            } 
          },
        }),
      ]);

      const items: ScheduleItem[] = [
        ...assignments.map((a) => ({
          id: `assignment-${a.id}`,
          type: "assignment" as const,
          scheduledAt: a.dueDate,
          dueDate: a.dueDate,
          title: a.title,
          courseCode: a.course.code,
          courseTitle: a.course.title,
          description: a.description || "Assignment due",
        })),

        ...lectures.map((l) => ({
          id: `lecture-${l.id}`,
          type: "lecture" as const,
          scheduledAt: l.scheduledAt!,
          title: l.title,
          courseCode: l.course.code,
          courseTitle: l.course.title,
          description: l.description || "Lecture session",
          duration: l.duration || 60,
        })),

        ...exams.map((e) => ({
          id: `exam-${e.id}`,
          type: "exam" as const,
          scheduledAt: e.date,
          title: e.title || `${e.course.code} Examination`,
          courseCode: e.course.code,
          courseTitle: e.course.title,
          description: e.description || `${e.course.code} Exam`,
          venue: e.venue,
          duration: e.duration,
          format: e.format,
        })),
      ];

      return items.sort(
        (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
      );
    } catch (error) {
      console.error("Error getting schedule by date range:", error);
      throw new Error("Failed to retrieve schedule for date range");
    }
  }

  /**
   * Get today's schedule items
   */
  static async getTodaysSchedule(studentId: string): Promise<ScheduleItem[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await this.getScheduleByDateRange(studentId, today, tomorrow);
    } catch (error) {
      console.error("Error getting today's schedule:", error);
      throw new Error("Failed to retrieve today's schedule");
    }
  }

  /**
   * Get urgent items (due in next 3 days)
   */
  static async getUrgentItems(studentId: string): Promise<ScheduleItem[]> {
    try {
      const items = await this.getUpcomingScheduleItems(studentId, 3);
      
      // Prioritize assignments and exams over lectures
      return items
        .filter(item => item.type === "assignment" || item.type === "exam")
        .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    } catch (error) {
      console.error("Error getting urgent items:", error);
      throw new Error("Failed to retrieve urgent items");
    }
  }

  /**
   * Get schedule statistics
   */
  static async getScheduleStats(studentId: string): Promise<{
    totalThisWeek: number;
    assignmentsDue: number;
    lecturesScheduled: number;
    examsScheduled: number;
    urgentItems: number;
  }> {
    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weeklySchedule = await this.getWeeklySchedule(studentId, weekStart);
      const urgentItems = await this.getUrgentItems(studentId);

      const assignmentsDue = weeklySchedule.items.filter(item => item.type === "assignment").length;
      const lecturesScheduled = weeklySchedule.items.filter(item => item.type === "lecture").length;
      const examsScheduled = weeklySchedule.items.filter(item => item.type === "exam").length;

      return {
        totalThisWeek: weeklySchedule.items.length,
        assignmentsDue,
        lecturesScheduled,
        examsScheduled,
        urgentItems: urgentItems.length,
      };
    } catch (error) {
      console.error("Error getting schedule stats:", error);
      throw new Error("Failed to retrieve schedule statistics");
    }
  }
}