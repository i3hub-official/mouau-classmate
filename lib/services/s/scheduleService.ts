// lib/services/scheduleService.ts

import { prisma } from "@/lib/server/prisma";
import { ScheduleItem, WeeklySchedule } from "@/lib/types/s/index";

export class StudentScheduleService {
  /**
   * Get student schedule for a specific week
   */
  static async getWeeklySchedule(
    studentId: string,
    weekStart: Date
  ): Promise<WeeklySchedule> {
    try {
      // Get student enrollments to find their courses
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        select: { courseId: true },
      });

      const courseIds = enrollments.map((e) => e.courseId);

      if (courseIds.length === 0) {
        return {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        };
      }

      // Get assignments for the week
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const assignments = await prisma.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
          dueDate: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        include: {
          course: true,
        },
        orderBy: { dueDate: "asc" },
      });

      // Get lectures for the week
      const lectures = await prisma.lecture.findMany({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
          // Note: In a real implementation, you would need a schedule or date field in the lecture model
          // For now, we'll assume all lectures are scheduled
        },
        include: {
          course: true,
        },
      });

      // Create schedule items
      const scheduleItems: ScheduleItem[] = [
        ...assignments.map((assignment) => ({
          id: assignment.id,
          type: "assignment" as const,
          title: assignment.title,
          courseCode: assignment.course.code,
          courseTitle: assignment.course.title,
          date: assignment.dueDate,
          dueDate: assignment.dueDate,
          description: assignment.description ?? undefined,
        })),
        // Note: In a real implementation, you would have proper scheduling for lectures
        // For now, we'll skip lectures in the schedule
      ];

      // Group by day of week
      const weeklySchedule: WeeklySchedule = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };

      scheduleItems.forEach((item) => {
        const dayOfWeek = item.date.getDay(); // 0 = Sunday, 1 = Monday, etc.

        switch (dayOfWeek) {
          case 0: // Sunday
            weeklySchedule.sunday.push(item);
            break;
          case 1: // Monday
            weeklySchedule.monday.push(item);
            break;
          case 2: // Tuesday
            weeklySchedule.tuesday.push(item);
            break;
          case 3: // Wednesday
            weeklySchedule.wednesday.push(item);
            break;
          case 4: // Thursday
            weeklySchedule.thursday.push(item);
            break;
          case 5: // Friday
            weeklySchedule.friday.push(item);
            break;
          case 6: // Saturday
            weeklySchedule.saturday.push(item);
            break;
        }
      });

      // Sort each day's items by time
      Object.keys(weeklySchedule).forEach((day) => {
        weeklySchedule[day as keyof WeeklySchedule].sort(
          (a, b) => a.date.getTime() - b.date.getTime()
        );
      });

      return weeklySchedule;
    } catch (error) {
      console.error("Error getting weekly schedule:", error);
      throw error;
    }
  }

  /**
   * Get upcoming schedule items
   */
  static async getUpcomingScheduleItems(studentId: string, days: number = 7) {
    try {
      // Get student enrollments to find their courses
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        select: { courseId: true },
      });

      const courseIds = enrollments.map((e) => e.courseId);

      if (courseIds.length === 0) {
        return [];
      }

      // Get assignments for the next N days
      const assignments = await prisma.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          course: true,
        },
        orderBy: { dueDate: "asc" },
      });

      // Create schedule items
      const scheduleItems: ScheduleItem[] = assignments.map((assignment) => ({
        id: assignment.id,
        type: "assignment" as const,
        title: assignment.title,
        courseCode: assignment.course.code,
        courseTitle: assignment.course.title,
        date: assignment.dueDate,
        dueDate: assignment.dueDate,
        description: assignment.description ?? undefined,
      }));

      return scheduleItems;
    } catch (error) {
      console.error("Error getting upcoming schedule items:", error);
      throw error;
    }
  }

  /**
   * Get schedule for a specific date range
   */
  static async getScheduleByDateRange(
    studentId: string,
    startDate: Date,
    endDate: Date
  ) {
    try {
      // Get student enrollments to find their courses
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        select: { courseId: true },
      });

      const courseIds = enrollments.map((e) => e.courseId);

      if (courseIds.length === 0) {
        return [];
      }

      // Get assignments for the date range
      const assignments = await prisma.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
          dueDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          course: true,
        },
        orderBy: { dueDate: "asc" },
      });

      // Create schedule items
      const scheduleItems: ScheduleItem[] = assignments.map((assignment) => ({
        id: assignment.id,
        type: "assignment" as const,
        title: assignment.title,
        courseCode: assignment.course.code,
        courseTitle: assignment.course.title,
        date: assignment.dueDate,
        dueDate: assignment.dueDate,
        description: assignment.description ?? undefined,
      }));

      return scheduleItems;
    } catch (error) {
      console.error("Error getting schedule by date range:", error);
      throw error;
    }
  }
}
