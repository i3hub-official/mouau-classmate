// File: lib/services/teachers/scheduleService.ts
import { prisma } from "@/lib/server/prisma";

export interface CreateLectureData {
  title: string;
  description?: string;
  content?: any;
  duration?: number;
  orderIndex?: number;
  courseId: string;
  teacherId: string;
}

export class TeacherScheduleService {
  /**
   * Create a new lecture
   */
  static async createLecture(data: CreateLectureData) {
    try {
      // Verify teacher has access to the course
      const course = await prisma.course.findFirst({
        where: {
          id: data.courseId,
          OR: [
            { instructorId: data.teacherId },
            { creatorId: data.teacherId },
          ],
        },
      });

      if (!course) {
        throw new Error("Teacher does not have access to this course");
      }

      // Get the next order index if not provided
      let orderIndex = data.orderIndex;
      if (orderIndex === undefined) {
        const lastLecture = await prisma.lecture.findFirst({
          where: { courseId: data.courseId },
          orderBy: { orderIndex: 'desc' },
        });
        orderIndex = lastLecture ? lastLecture.orderIndex + 1 : 0;
      }

      const lecture = await prisma.lecture.create({
        data: {
          title: data.title,
          description: data.description,
          content: data.content,
          duration: data.duration,
          orderIndex,
          courseId: data.courseId,
        },
        include: {
          course: true,
          submissions: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: data.teacherId,
          action: "LECTURE_CREATED",
          resourceType: "LECTURE",
          resourceId: lecture.id,
          details: {
            courseId: data.courseId,
            courseCode: course.code,
            title: data.title,
            orderIndex,
          },
        },
      });

      return lecture;
    } catch (error) {
      console.error("Create lecture error:", error);
      throw error;
    }
  }

  /**
   * Update lecture
   */
  static async updateLecture(
    lectureId: string,
    teacherId: string,
    data: Partial<CreateLectureData>
  ) {
    try {
      // Verify teacher has access to this lecture
      const lecture = await prisma.lecture.findFirst({
        where: {
          id: lectureId,
          course: {
            OR: [
              { instructorId: teacherId },
              { creatorId: teacherId },
            ],
          },
        },
        include: {
          course: true,
        },
      });

      if (!lecture) {
        throw new Error("Lecture not found or access denied");
      }

      const updatedLecture = await prisma.lecture.update({
        where: { id: lectureId },
        data,
        include: {
          course: true,
          submissions: true,
        },
      });

      return updatedLecture;
    } catch (error) {
      console.error("Update lecture error:", error);
      throw error;
    }
  }

  /**
   * Publish/unpublish lecture
   */
  static async toggleLecturePublish(
    lectureId: string,
    teacherId: string,
    publish: boolean
  ) {
    const lecture = await prisma.lecture.findFirst({
      where: {
        id: lectureId,
        course: {
          OR: [
            { instructorId: teacherId },
            { creatorId: teacherId },
          ],
        },
      },
    });

    if (!lecture) {
      throw new Error("Lecture not found or access denied");
    }

    const updatedLecture = await prisma.lecture.update({
      where: { id: lectureId },
      data: {
        isPublished: publish,
        ...(publish && { publishedAt: new Date() }),
      },
      include: {
        course: true,
      },
    });

    return updatedLecture;
  }

  /**
   * Get course schedule with lectures
   */
  static async getCourseSchedule(courseId: string, teacherId: string) {
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [
          { instructorId: teacherId },
          { creatorId: teacherId },
        ],
      },
      include: {
        lectures: {
          orderBy: { orderIndex: 'asc' },
          include: {
            submissions: {
              include: {
                student: true,
              },
            },
          },
        },
        assignments: {
          where: { isPublished: true },
          orderBy: { dueDate: 'asc' },
          include: {
            submissions: true,
          },
        },
      },
    });

    if (!course) {
      throw new Error("Course not found or access denied");
    }

    // Combine lectures and assignments into a timeline
    const timeline = [
      ...course.lectures.map(lecture => ({
        id: lecture.id,
        type: 'lecture' as const,
        title: lecture.title,
        description: lecture.description,
        date: lecture.createdAt,
        isPublished: lecture.isPublished,
        publishedAt: lecture.publishedAt,
        duration: lecture.duration,
        orderIndex: lecture.orderIndex,
        submissions: lecture.submissions,
        studentCount: course.lectures.reduce((acc, l) => acc + l.submissions.length, 0),
      })),
      ...course.assignments.map(assignment => ({
        id: assignment.id,
        type: 'assignment' as const,
        title: assignment.title,
        description: assignment.description,
        date: assignment.dueDate,
        isPublished: assignment.isPublished,
        maxScore: assignment.maxScore,
        submissions: assignment.submissions,
        pendingGrading: assignment.submissions.filter(s => !s.isGraded).length,
        studentCount: assignment.submissions.length,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      course: {
        id: course.id,
        code: course.code,
        title: course.title,
        credits: course.credits,
      },
      timeline,
      statistics: {
        totalLectures: course.lectures.length,
        publishedLectures: course.lectures.filter(l => l.isPublished).length,
        totalAssignments: course.assignments.length,
        publishedAssignments: course.assignments.filter(a => a.isPublished).length,
        upcomingDeadlines: course.assignments.filter(a =>
          a.isPublished && new Date(a.dueDate) > new Date()
        ).length,
      },
    };
  }

  /**
   * Reorder lectures in a course
   */
  static async reorderLectures(
    courseId: string,
    teacherId: string,
    lectureOrder: { id: string; orderIndex: number }[]
  ) {
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [
          { instructorId: teacherId },
          { creatorId: teacherId },
        ],
      },
    });

    if (!course) {
      throw new Error("Course not found or access denied");
    }

    // Update lecture orders in transaction
    const updates = lectureOrder.map(({ id, orderIndex }) =>
      prisma.lecture.update({
        where: { id },
        data: { orderIndex },
      })
    );

    await prisma.$transaction(updates);

    return { success: true, message: "Lecture order updated successfully" };
  }

  /**
   * Get teacher's weekly schedule
   */
  static async getWeeklySchedule(teacherId: string, weekStart: Date) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const courses = await prisma.course.findMany({
      where: {
        OR: [
          { instructorId: teacherId },
          { creatorId: teacherId },
        ],
        isActive: true,
      },
      include: {
        assignments: {
          where: {
            dueDate: {
              gte: weekStart,
              lte: weekEnd,
            },
            isPublished: true,
          },
          include: {
            submissions: true,
          },
        },
        lectures: {
          where: {
            createdAt: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // Group events by day
    const schedule: { [key: string]: any[] } = {};

    courses.forEach(course => {
      // Add assignments
      course.assignments.forEach(assignment => {
        const dateKey = assignment.dueDate.toISOString().split('T')[0];
        if (!schedule[dateKey]) {
          schedule[dateKey] = [];
        }

        schedule[dateKey].push({
          id: assignment.id,
          type: 'assignment',
          title: `${course.code}: ${assignment.title}`,
          time: assignment.dueDate,
          course: course.code,
          status: 'due',
          submissions: assignment.submissions.length,
          pendingGrading: assignment.submissions.filter(s => !s.isGraded).length,
        });
      });

      // Add lectures
      course.lectures.forEach(lecture => {
        const dateKey = lecture.createdAt.toISOString().split('T')[0];
        if (!schedule[dateKey]) {
          schedule[dateKey] = [];
        }

        schedule[dateKey].push({
          id: lecture.id,
          type: 'lecture',
          title: `${course.code}: ${lecture.title}`,
          time: lecture.createdAt,
          course: course.code,
          status: lecture.isPublished ? 'published' : 'draft',
          duration: lecture.duration,
        });
      });
    });

    // Sort events by time within each day
    Object.keys(schedule).forEach(date => {
      schedule[date].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    });

    return {
      weekStart,
      weekEnd,
      schedule,
      summary: {
        totalCourses: courses.length,
        totalAssignments: courses.reduce((acc, course) => acc + course.assignments.length, 0),
        totalLectures: courses.reduce((acc, course) => acc + course.lectures.length, 0),
      },
    };
  }
}