// lib/services/scheduleServices.ts
import { prisma } from "@/lib/server/prisma";
import { Course, Lecture, Assignment, Enrollment } from "@prisma/client";

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

export class ScheduleService {
  /**
   * Get weekly schedule for a student
   */
  static async getWeeklySchedule(
    studentId: string,
    weekStart: Date
  ): Promise<DailySchedule[]> {
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Get student's enrolled courses
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: {
            include: {
              lectures: {
                where: {
                  isPublished: true,
                  publishedAt: { lte: new Date() },
                },
              },
              assignments: {
                where: {
                  isPublished: true,
                },
              },
            },
          },
        },
      });

      const scheduleItems: ScheduleItem[] = [];

      // Process lectures
      enrollments.forEach((enrollment) => {
        enrollment.course.lectures.forEach((lecture) => {
          if (lecture.publishedAt) {
            const lectureDate = new Date(lecture.publishedAt);
            if (lectureDate >= weekStart && lectureDate < weekEnd) {
              scheduleItems.push({
                id: lecture.id,
                title: lecture.title,
                type: "lecture",
                course: {
                  code: enrollment.course.code,
                  title: enrollment.course.title,
                },
                startTime: lectureDate,
                endTime: new Date(
                  lectureDate.getTime() + (lecture.duration || 60) * 60000
                ),
                description: lecture.description || undefined,
                status: this.getItemStatus(
                  lectureDate,
                  new Date(
                    lectureDate.getTime() + (lecture.duration || 60) * 60000
                  )
                ),
                priority: "medium",
              });
            }
          }
        });

        // Process assignments
        enrollment.course.assignments.forEach((assignment) => {
          const dueDate = new Date(assignment.dueDate);
          if (dueDate >= weekStart && dueDate < weekEnd) {
            scheduleItems.push({
              id: assignment.id,
              title: assignment.title,
              type: "assignment",
              course: {
                code: enrollment.course.code,
                title: enrollment.course.title,
              },
              startTime: dueDate,
              endTime: new Date(dueDate.getTime() + 2 * 60 * 60000), // 2 hours buffer
              description: assignment.description || undefined,
              status: this.getItemStatus(
                dueDate,
                new Date(dueDate.getTime() + 2 * 60 * 60000)
              ),
              priority: assignment.allowLateSubmission ? "medium" : "high",
            });
          }
        });
      });

      // Group by day
      const dailySchedules: DailySchedule[] = [];
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStart);
        currentDate.setDate(currentDate.getDate() + i);

        const dayItems = scheduleItems
          .filter((item) => {
            const itemDate = new Date(item.startTime);
            return itemDate.toDateString() === currentDate.toDateString();
          })
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        dailySchedules.push({
          date: new Date(currentDate),
          items: dayItems,
        });
      }

      return dailySchedules;
    } catch (error) {
      console.error("Error fetching weekly schedule:", error);
      throw new Error("Failed to fetch schedule");
    }
  }

  /**
   * Get today's schedule for a student
   */
  static async getTodaysSchedule(studentId: string): Promise<ScheduleItem[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: {
            include: {
              lectures: {
                where: {
                  isPublished: true,
                  publishedAt: {
                    gte: today,
                    lt: tomorrow,
                  },
                },
              },
              assignments: {
                where: {
                  isPublished: true,
                  dueDate: {
                    gte: today,
                    lt: tomorrow,
                  },
                },
              },
            },
          },
        },
      });

      const scheduleItems: ScheduleItem[] = [];

      enrollments.forEach((enrollment) => {
        // Today's lectures
        enrollment.course.lectures.forEach((lecture) => {
          if (lecture.publishedAt) {
            scheduleItems.push({
              id: lecture.id,
              title: lecture.title,
              type: "lecture",
              course: {
                code: enrollment.course.code,
                title: enrollment.course.title,
              },
              startTime: new Date(lecture.publishedAt),
              endTime: new Date(
                new Date(lecture.publishedAt).getTime() +
                  (lecture.duration || 60) * 60000
              ),
              description: lecture.description || undefined,
              status: this.getItemStatus(
                new Date(lecture.publishedAt),
                new Date(
                  new Date(lecture.publishedAt).getTime() +
                    (lecture.duration || 60) * 60000
                )
              ),
              priority: "medium",
            });
          }
        });

        // Today's assignments
        enrollment.course.assignments.forEach((assignment) => {
          scheduleItems.push({
            id: assignment.id,
            title: assignment.title,
            type: "assignment",
            course: {
              code: enrollment.course.code,
              title: enrollment.course.title,
            },
            startTime: new Date(assignment.dueDate),
            endTime: new Date(
              new Date(assignment.dueDate).getTime() + 2 * 60 * 60000
            ),
            description: assignment.description || undefined,
            status: this.getItemStatus(
              new Date(assignment.dueDate),
              new Date(new Date(assignment.dueDate).getTime() + 2 * 60 * 60000)
            ),
            priority: assignment.allowLateSubmission ? "medium" : "high",
          });
        });
      });

      return scheduleItems.sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      );
    } catch (error) {
      console.error("Error fetching today's schedule:", error);
      throw new Error("Failed to fetch today's schedule");
    }
  }

  /**
   * Get upcoming deadlines (next 7 days)
   */
  static async getUpcomingDeadlines(
    studentId: string
  ): Promise<ScheduleItem[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: {
            include: {
              assignments: {
                where: {
                  isPublished: true,
                  dueDate: {
                    gte: today,
                    lte: nextWeek,
                  },
                },
              },
            },
          },
        },
      });

      const deadlines: ScheduleItem[] = [];

      enrollments.forEach((enrollment) => {
        enrollment.course.assignments.forEach((assignment) => {
          deadlines.push({
            id: assignment.id,
            title: assignment.title,
            type: "assignment",
            course: {
              code: enrollment.course.code,
              title: enrollment.course.title,
            },
            startTime: new Date(assignment.dueDate),
            endTime: new Date(
              new Date(assignment.dueDate).getTime() + 2 * 60 * 60000
            ),
            description: assignment.description || undefined,
            status: this.getItemStatus(
              new Date(assignment.dueDate),
              new Date(new Date(assignment.dueDate).getTime() + 2 * 60 * 60000)
            ),
            priority: assignment.allowLateSubmission ? "medium" : "high",
          });
        });
      });

      return deadlines.sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      );
    } catch (error) {
      console.error("Error fetching upcoming deadlines:", error);
      throw new Error("Failed to fetch upcoming deadlines");
    }
  }

  /**
   * Get monthly schedule overview
   */
  static async getMonthlyOverview(
    studentId: string,
    month: number,
    year: number
  ): Promise<{ date: Date; count: number; type: "lecture" | "assignment" }[]> {
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: {
            include: {
              lectures: {
                where: {
                  isPublished: true,
                  publishedAt: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
              },
              assignments: {
                where: {
                  isPublished: true,
                  dueDate: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
              },
            },
          },
        },
      });

      const overview: {
        [key: string]: { lectures: number; assignments: number };
      } = {};

      enrollments.forEach((enrollment) => {
        enrollment.course.lectures.forEach((lecture) => {
          if (lecture.publishedAt) {
            const dateKey = new Date(lecture.publishedAt).toDateString();
            if (!overview[dateKey])
              overview[dateKey] = { lectures: 0, assignments: 0 };
            overview[dateKey].lectures++;
          }
        });

        enrollment.course.assignments.forEach((assignment) => {
          const dateKey = new Date(assignment.dueDate).toDateString();
          if (!overview[dateKey])
            overview[dateKey] = { lectures: 0, assignments: 0 };
          overview[dateKey].assignments++;
        });
      });

      return Object.entries(overview).flatMap(([dateKey, counts]) => [
        {
          date: new Date(dateKey),
          count: counts.lectures,
          type: "lecture" as const,
        },
        {
          date: new Date(dateKey),
          count: counts.assignments,
          type: "assignment" as const,
        },
      ]);
    } catch (error) {
      console.error("Error fetching monthly overview:", error);
      throw new Error("Failed to fetch monthly overview");
    }
  }

  private static getItemStatus(
    startTime: Date,
    endTime: Date
  ): "upcoming" | "ongoing" | "completed" | "overdue" {
    const now = new Date();
    if (now < startTime) return "upcoming";
    if (now >= startTime && now <= endTime) return "ongoing";
    if (now > endTime) return "completed";
    return "overdue";
  }
}

export const {
  getWeeklySchedule,
  getTodaysSchedule,
  getUpcomingDeadlines,
  getMonthlyOverview,
} = ScheduleService;
