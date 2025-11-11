// File: lib/services/teacher/attendanceService.ts

import { prisma } from "@/lib/server/prisma";
import {
  AttendanceRecord,
  AttendanceSession,
  AttendanceFormData,
  StudentAttendanceSummary,
} from "@/lib/types/teacher/index";
import { AuditAction } from "@prisma/client";

export class TeacherAttendanceService {
  /**
   * Create attendance session
   */
  static async createAttendanceSession(
    teacherId: string,
    attendanceData: AttendanceFormData
  ) {
    try {
      const { courseId, date, topic, records } = attendanceData;

      // Verify teacher is assigned to the course
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      if (course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      // Create attendance records
      const attendanceRecords = await prisma.$transaction(async (tx) => {
        const createdRecords = [];

        for (const record of records) {
          const attendanceRecord = await tx.attendance.create({
            data: {
              studentId: record.studentId,
              courseId,
              markedAt: date,
              status: record.status.toUpperCase() as any,
              notes: record.remarks,
              markedBy: teacherId,
              lectureId: record.lectureId, // <-- Ensure record.lectureId exists in AttendanceFormData
            },
            include: {
              student: {
                select: {
                  id: true,
                  matricNumber: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          });
          createdRecords.push(attendanceRecord);
        }

        return createdRecords;
      });

      // Log the attendance session
      await prisma.auditLog.create({
        data: {
          userId: teacherId,
          action: "LECTURE_CREATED",
          resourceType: "ATTENDANCE",
          details: {
            courseId,
            date,
            topic,
            recordCount: records.length,
          },
        },
      });

      return {
        success: true,
        records: attendanceRecords.map((rec) => ({
          id: rec.id,
          studentId: rec.studentId,
          courseId: rec.courseId,
          date: rec.markedAt, // assuming 'markedAt' is the date field in your DB
          status: rec.status.toLowerCase() as
            | "present"
            | "absent"
            | "excused"
            | "late",
          remarks: rec.notes ?? null,
          createdAt: rec.createdAt,
          updatedAt: rec.updatedAt,
        })) as AttendanceRecord[],
        message: "Attendance recorded successfully",
      };
    } catch (error) {
      console.error("Error creating attendance session:", error);
      throw error;
    }
  }

  /**
   * Get attendance sessions for a course
   */
  static async getCourseAttendanceSessions(
    teacherId: string,
    courseId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      // Verify teacher is assigned to the course
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      if (course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      const skip = (page - 1) * limit;

      // Get unique dates for the course
      const dates = await prisma.attendance.findMany({
        where: { courseId },
        select: { markedAt: true },
        distinct: ["markedAt"],
        orderBy: { markedAt: "desc" },
        skip,
        take: limit,
      });

      // Get attendance records for each date
      const sessions = await Promise.all(
        dates.map(async (dateRecord) => {
          const records = await prisma.attendance.findMany({
            where: {
              courseId,
              markedAt: dateRecord.markedAt,
            },
            include: {
              student: {
                select: {
                  id: true,
                  matricNumber: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { student: { firstName: "asc" } },
          });

          const totalStudents = records.length;
          const presentCount = records.filter(
            (r) => r.status.toLowerCase() === "present"
          ).length;
          const absentCount = records.filter(
            (r) => r.status.toLowerCase() === "absent"
          ).length;
          const attendanceRate =
            totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;

          return {
            id: dateRecord.markedAt.toISOString(),
            courseId,
            date: dateRecord.markedAt,
            topic: records[0]?.notes || "Class Session",
            records: records.map((rec) => ({
              id: rec.id,
              studentId: rec.studentId,
              courseId: rec.courseId,
              date: rec.markedAt, // map 'markedAt' to 'date'
              status: rec.status.toLowerCase() as
                | "present"
                | "absent"
                | "excused"
                | "late",
              remarks: rec.notes ?? null,
              createdAt: rec.createdAt,
              updatedAt: rec.updatedAt,
            })) as AttendanceRecord[],
            totalStudents,
            presentCount,
            absentCount,
            attendanceRate: parseFloat(attendanceRate.toFixed(2)),
          } as AttendanceSession;
        })
      );

      const total = await prisma.attendance.groupBy({
        by: ["markedAt"],
        where: { courseId },
      });

      return {
        sessions,
        pagination: {
          page,
          limit,
          total: total.length,
          totalPages: Math.ceil(total.length / limit),
        },
      };
    } catch (error) {
      console.error("Error getting course attendance sessions:", error);
      throw error;
    }
  }

  /**
   * Get attendance session by date
   */
  static async getAttendanceSessionByDate(
    teacherId: string,
    courseId: string,
    date: Date
  ) {
    try {
      // Verify teacher is assigned to the course
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      if (course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      const records = await prisma.attendance.findMany({
        where: {
          courseId,
          markedAt: date,
        },
        include: {
          student: {
            select: {
              id: true,
              matricNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { student: { firstName: "asc" } },
      });

      const totalStudents = records.length;
      const presentCount = records.filter(
        (r) => r.status.toLowerCase() === "present"
      ).length;
      const absentCount = records.filter(
        (r) => r.status.toLowerCase() === "absent"
      ).length;
      const attendanceRate =
        totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;

      const session = {
        id: date.toISOString(),
        courseId,
        date,
        topic: records[0]?.notes || "Class Session",
        records: records.map((rec) => ({
          id: rec.id,
          studentId: rec.studentId,
          courseId: rec.courseId,
          date: rec.markedAt, // map 'markedAt' to 'date'
          status: rec.status.toLowerCase() as
            | "present"
            | "absent"
            | "excused"
            | "late",
          remarks: rec.notes ?? null,
          createdAt: rec.createdAt,
          updatedAt: rec.updatedAt,
        })) as AttendanceRecord[],
        totalStudents,
        presentCount,
        absentCount,
        attendanceRate: parseFloat(attendanceRate.toFixed(2)),
      } as AttendanceSession;

      return session;
    } catch (error) {
      console.error("Error getting attendance session by date:", error);
      throw error;
    }
  }

  /**
   * Update attendance record
   */
  static async updateAttendanceRecord(
    teacherId: string,
    recordId: string,
    status: "present" | "absent" | "excused" | "late",
    remarks?: string
  ) {
    try {
      // Get the attendance record
      const record = await prisma.attendance.findUnique({
        where: { id: recordId },
        include: {
          course: true,
        },
      });

      if (!record) {
        throw new Error("Attendance record not found");
      }

      // Verify teacher is assigned to the course
      if (record.course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      const updatedRecord = await prisma.attendance.update({
        where: { id: recordId },
        data: {
          status: status.toUpperCase() as any,
          notes: remarks,
          updatedAt: new Date(),
        },
        include: {
          student: {
            select: {
              id: true,
              matricNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Log the update
      await prisma.auditLog.create({
        data: {
          userId: teacherId,
          action: "PROFILE_UPDATED",
          resourceType: "ATTENDANCE",
          resourceId: recordId,
          details: {
            status,
            studentId: record.studentId,
            courseId: record.courseId,
          },
        },
      });

      return {
        success: true,
        record: {
          id: updatedRecord.id,
          studentId: updatedRecord.studentId,
          courseId: updatedRecord.courseId,
          date: updatedRecord.markedAt, // Use markedAt as the date field
          status: (updatedRecord.status as string).toLowerCase() as "present" | "absent" | "excused" | "late",
          remarks: updatedRecord.notes ?? null,
          createdAt: updatedRecord.createdAt,
          updatedAt: updatedRecord.updatedAt,
        } as AttendanceRecord,
        message: "Attendance record updated successfully",
      };
    } catch (error) {
      console.error("Error updating attendance record:", error);
      throw error;
    }
  }

  /**
   * Get student attendance summary
   */
  static async getStudentAttendanceSummary(
    teacherId: string,
    courseId: string,
    studentId: string
  ) {
    try {
      // Verify teacher is assigned to the course
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      if (course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      // Get all attendance records for the student in the course
      const records = await prisma.attendance.findMany({
        where: {
          courseId,
          studentId,
        },
        include: {
          student: {
            select: {
              id: true,
              matricNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { markedAt: "desc" },
      });

      const totalSessions = records.length;
      const present = records.filter((r) => r.status.toLowerCase() === "present").length;
      const absent = records.filter((r) => r.status.toLowerCase() === "absent").length;
      const excused = records.filter((r) => r.status.toLowerCase() === "excused").length;
      const late = records.filter((r) => r.status.toLowerCase() === "late").length;
      const attendanceRate =
        totalSessions > 0 ? (present / totalSessions) * 100 : 0;

      const summary = {
        student: records[0]?.student || {
          id: studentId,
          matricNumber: "",
          firstName: "",
          lastName: "",
        },
        courseId,
        totalSessions,
        present,
        absent,
        excused,
        late,
        attendanceRate: parseFloat(attendanceRate.toFixed(2)),
      } as StudentAttendanceSummary;

      return summary;
    } catch (error) {
      console.error("Error getting student attendance summary:", error);
      throw error;
    }
  }

  /**
   * Get course attendance statistics
   */
  static async getCourseAttendanceStatistics(
    teacherId: string,
    courseId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    try {
      // Verify teacher is assigned to the course
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      if (course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      // Build date filter
      const dateFilter: any = { courseId };
      if (startDate && endDate) {
        dateFilter.date = {
          gte: startDate,
          lte: endDate,
        };
      }

      // Get all attendance records for the course
      const records = await prisma.attendance.findMany({
        where: dateFilter,
      });

      // Get total enrolled students
      const totalEnrollments = await prisma.enrollment.count({
        where: { courseId },
      });

      // Calculate statistics
      const totalSessions = new Set(records.map((r) => r.markedAt.toDateString()))
        .size;
      const presentCount = records.filter((r) => r.status.toLowerCase() === "present").length;
      const absentCount = records.filter((r) => r.status.toLowerCase() === "absent").length;
      const excusedCount = records.filter((r) => r.status.toLowerCase() === "excused").length;
      const lateCount = records.filter((r) => r.status.toLowerCase() === "late").length;

      const averageAttendanceRate =
        records.length > 0 ? (presentCount / records.length) * 100 : 0;

      return {
        totalEnrollments,
        totalSessions,
        totalRecords: records.length,
        present: presentCount,
        absent: absentCount,
        excused: excusedCount,
        late: lateCount,
        averageAttendanceRate: parseFloat(averageAttendanceRate.toFixed(2)),
      };
    } catch (error) {
      console.error("Error getting course attendance statistics:", error);
      throw error;
    }
  }
}
