// app/portal/student/schedule/page.tsx
import { Metadata } from "next";
import { checkStudentSession } from "@/lib/services/student/sessionService";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  FilterIcon,
  ChevronLeft,
  ChevronRight,
  Home,
  Play,
  Video,
  AlertTriangle,
  RefreshCw,
  Users,
  Plus,
  X,
  CheckCircle,
} from "lucide-react";
import { format, isToday, isPast, isFuture, addDays, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Schedule | Student Portal",
  description: "View your class schedule and calendar",
};

interface ScheduleItem {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  courseColor?: string;
  instructorName: string;
  instructorEmail?: string;
  instructorPhoto?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  type: "lecture" | "assignment" | "exam" | "event";
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  description?: string;
  resources?: Array<{
    type: "link" | "file" | "video";
    title: string;
    url?: string;
  }>;
}

interface DaySchedule {
  date: Date;
  items: ScheduleItem[];
}

interface ScheduleData {
  currentWeek: number;
  currentView: "week" | "day" | "month";
  selectedDate?: Date;
  courses: Array<{
    id: string;
    code: string;
    title: string;
    color?: string;
  }>;
  items: ScheduleItem[];
  hasMore: boolean;
}

export default async function StudentSchedulePage({
  searchParams,
}: {
  searchParams: {
    week?: string;
    course?: string;
    type?: string;
    view?: string;
    page?: string;
  };
}) {
  // Check if user is authenticated and is a student
  const session = await checkStudentSession();
  if (!session || session.user?.role !== "STUDENT") {
    redirect("/auth/signin");
  }

  // Parse search params
  const week = searchParams.week ? parseInt(searchParams.week, 10) : getCurrentWeek();
  const course = searchParams.course;
  const type = searchParams.type;
  const view = searchParams.view || "week";
  const page = parseInt(searchParams.page || "1", 10);

  // Get schedule data
  const scheduleData = await getScheduleData(session.user.id, week, course, type, view);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Home className="h-4 w-4" />
            <span>Student Portal</span>
            <span>/</span>
            <span>Schedule</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold">My Schedule</h1>
            <p className="text-muted-foreground">
              View your class schedule and calendar
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FilterIcon className="h-5 w-5 mr-2" />
            Filters
          </h2>
          <form
            action="/portal/student/schedule"
            method="GET"
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <div className="space-y-2">
              <label htmlFor="course" className="text-sm font-medium">
                Course
              </label>
              <select
                id="course"
                name="course"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={course || ""}
              >
                <option value="">All Courses</option>
                {scheduleData.courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium">
                Type
              </label>
              <select
                id="type"
                name="type"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={type || ""}
              >
                <option value="">All Types</option>
                <option value="lecture">Lectures</option>
                <option value="assignment">Assignments</option>
                <option value="exam">Exams</option>
                <option value="event">Events</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="view" className="text-sm font-medium">
                View
              </label>
              <select
                id="view"
                name="view"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={view}
              >
                <option value="week">Week View</option>
                <option value="day">Day View</option>
                <option value="month">Month View</option>
              </select>
            </div>

            <div className="flex items-end md:col-span-2 lg:col-span-4">
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.delete("page");
                  window.location.href = `/portal/student/schedule?${params.toString()}`;
                }}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Apply Filters
              </button>
            </div>
          </form>
        </div>

        {/* Week Navigation */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold mb-4">Week {week}</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("week", (week - 1).toString());
                  window.location.href = `/portal/student/schedule?${params.toString()}`;
                }}
                disabled={week <= 1}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="px-3 py-1 border rounded bg-gray-100 text-center min-w-[80px]">
                Page {page}
              </span>
              <button
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("week", (week + 1).toString());
                  window.location.href = `/portal/student/schedule?${params.toString()}`;
                }}
                disabled={week >= getCurrentWeek()}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {format(startOfWeek(new Date(), { week: 1 }), "PPP")} - {format(endOfWeek(new Date(), { week: 1 }), "PPP")}
              </span>
              <button
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("week", getCurrentWeek().toString());
                  window.location.href = `/portal/student/schedule?${params.toString()}`;
                }}
                className={cn(
                  "inline-flex items-center justify-center rounded-md px-3 py-1 text-sm",
                  week === getCurrentWeek() && "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Schedule Content */}
        {view === "week" ? (
          <WeekScheduleView scheduleData={scheduleData} page={page} />
        ) : (
          <DayScheduleView scheduleData={scheduleData} page={page} />
        )}
      </div>
    </div>
  );
}

// Server-side functions
async function getScheduleData(
  studentId: string,
  week: number,
  course?: string,
  type?: string,
  view: string = "week"
) {
  const startDate = startOfWeek(new Date(), { week: 1 });
  const endDate = endOfWeek(new Date(), { week: 1 });

  // Get enrolled courses
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: {
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          color: true,
        },
      },
    },
  });

  // Get schedule items based on filters
  let scheduleItems: ScheduleItem[] = [];

  // Get lectures for the week
  const lectures = await prisma.lecture.findMany({
    where: {
      course: {
        enrollments: {
          some: {
            studentId,
          },
        },
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      course: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photo: true,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Get assignments for the week
  const assignments = await prisma.assignment.findMany({
    where: {
      course: {
        enrollments: {
          some: {
            studentId,
          },
        },
      },
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      course: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photo: true,
          },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  // Get exams for the week
  const exams = await prisma.exam.findMany({
    where: {
      course: {
        enrollments: {
          some: {
            studentId,
          },
        },
      },
      examDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      course: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photo: true,
          },
        },
      },
    },
    orderBy: { examDate: "asc" },
  });

  // Get events for the week
  const events = await prisma.event.findMany({
    where: {
      course: {
        enrollments: {
          some: {
            studentId,
          },
        },
      },
      eventDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      course: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photo: true,
          },
        },
      },
    },
    orderBy: { eventDate: "asc" },
  });

  // Combine and sort all items by date and time
  const allItems = [
    ...lectures.map((lecture) => ({
      id: lecture.id,
      courseId: lecture.courseId,
      courseCode: lecture.course.code,
      courseTitle: lecture.course.title,
      courseColor: lecture.course.color,
      instructorName: `${lecture.course.instructor?.firstName || ""} ${lecture.course.instructor?.lastName || ""}`,
      instructorEmail: lecture.course.instructor?.email || "",
      instructorPhoto: lecture.course.instructor?.photo || "",
      startTime: lecture.createdAt,
      endTime: new Date(lecture.createdAt.getTime() + 60 * 60 * 1000), // 1 hour duration
      type: "lecture",
      status: isPast(lecture.createdAt) ? "completed" : "scheduled",
      description: lecture.description,
      resources: lecture.content ? [{
        type: "video",
        title: "Lecture Video",
        url: lecture.content?.videoUrl || "#",
      }] : [],
    })),
    ...assignments.map((assignment) => ({
      id: assignment.id,
      courseId: assignment.courseId,
      courseCode: assignment.course.code,
      courseTitle: assignment.course.title,
      courseColor: assignment.course.color,
      instructorName: `${assignment.course.instructor?.firstName || ""} ${assignment.course.instructor?.lastName || ""}`,
      instructorEmail: assignment.course.instructor?.email || "",
      instructorPhoto: assignment.course.instructor?.photo || "",
      startTime: assignment.dueDate,
      endTime: assignment.dueDate,
      type: "assignment",
      status: isPast(assignment.dueDate) ? "overdue" : "pending",
      description: assignment.description,
      resources: [{
        type: "link",
        title: "Submit Assignment",
        url: `/portal/student/assignments/${assignment.id}`,
      }] : [],
    })),
    ...exams.map((exam) => ({
      id: exam.id,
      courseId: exam.courseId,
      courseCode: exam.course.code,
      courseTitle: exam.course.title,
      courseColor: exam.course.color,
      instructorName: `${exam.course.instructor?.firstName || ""} ${exam.course.instructor?.lastName || ""}`,
      instructorEmail: exam.course.instructor?.email || "",
      instructorPhoto: exam.course.instructor?.photo || "",
      startTime: exam.examDate,
      endTime: new Date(exam.examDate.getTime() + 2 * 60 * 60 * 1000), // 2 hour duration
      type: "exam",
      status: isPast(exam.examDate) ? "completed" : "scheduled",
      description: exam.description,
      resources: [{
        type: "link",
        title: "Exam Details",
        url: `/portal/student/exams/${exam.id}`,
      }] : [],
    })),
    ...events.map((event) => ({
      id: event.id,
      courseId: event.courseId,
      courseCode: event.course.code,
      courseTitle: event.course.title,
      courseColor: event.course.color,
      instructorName: `${event.course.instructor?.firstName || ""} ${event.course.instructor?.lastName || ""}`,
      instructorEmail: event.course.instructor?.email || "",
      instructorPhoto: event.course.instructor?.photo || "",
      startTime: event.eventDate,
      endTime: new Date(event.eventDate.getTime() + 60 * 60 * 1000), // 1 hour duration
      type: "event",
      status: isPast(event.eventDate) ? "completed" : "scheduled",
      description: event.description,
      resources: event.resources ? event.resources.map((resource) => ({
        type: resource.type,
        title: resource.title,
        url: resource.url,
      })) : [],
    })),
  ];

  // Filter by course if specified
  if (course) {
    allItems = allItems.filter((item) => item.courseId === course);
  }

  // Filter by type if specified
  if (type) {
    allItems = allItems.filter((item) => item.type === type);
  }

  // Sort by date and time
  allItems.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Paginate results
  const startIndex = (page - 1) * 10;
  const paginatedItems = allItems.slice(startIndex, startIndex + 10);

  // Get unique courses for display
  const courses = Array.from(
    new Set(enrollments.map((e) => e.courseId))
  ).map((courseId) => {
    const enrollment = enrollments.find((e) => e.courseId === courseId);
    return {
      id: courseId,
      code: enrollment.course.code,
      title: enrollment.course.title,
      color: enrollment.course.color,
    };
  });

  return {
    currentWeek: week,
    currentView: view,
    courses: courses,
    items: paginatedItems,
    hasMore: allItems.length > page * 10,
  };
}

function getCurrentWeek(): number {
  const date = new Date();
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = date.getTime() - firstDayOfYear.getTime();
  return Math.ceil(pastDaysOfYear / 7) + 1;
}

// Week View Component
function WeekScheduleView({ scheduleData, page }: { scheduleData: any; page: number }) {
  const weekDays = generateWeekDays(scheduleData.currentWeek);

  return (
    <div className="space-y-6">
      {/* Week Overview */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Week Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={cn(
                "p-4 rounded-lg border",
                isToday(day.date) && "bg-blue-100 border-blue-300"
              )}
            >
              <div className="text-center mb-2">
                <div className="text-lg font-bold">{format(day.date, "EEEE")}</div>
                <div className="text-sm text-gray-600">{day.day}</div>
              </div>
              <div className="space-y-2">
                {day.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{item.startTime && format(item.startTime, "HH:mm")}</div>
                        <div className="text-xs text-gray-500">{item.courseCode}</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        item.type === "lecture" && "bg-purple-500",
                        item.type === "assignment" && "bg-orange-500",
                        item.type === "exam" && "bg-red-500"
                      )} />
                      <div className="text-sm text-gray-900 ml-2">
                        <div className="font-medium">{item.courseTitle}</div>
                        <div className="text-xs text-gray-500">{item.startTime && format(item.startTime, "HH:mm")}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule Items List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-semibold mb-4">Schedule Details</h2>
        <div className="space-y-4">
          {scheduleData.items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No schedule found for this week</p>
              </div>
            </div>
          ) : (
            scheduleData.items.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        item.type === "lecture" && "bg-purple-500",
                        item.type === "assignment" && "bg-orange-500",
                        item.type === "exam" && "bg-red-500"
                      )} />
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">{item.courseCode}</div>
                        <div className="text-xs text-gray-500">{item.startTime && format(item.startTime, "HH:mm")}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          window.location.href = `/portal/student/schedule/item/${item.id}`;
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        {scheduleData.hasMore && (
          <div className="flex items-center justify-center py-6">
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", (page + 1).toString());
                window.location.href = `/portal/student/schedule?${params.toString()}`;
              }}
              disabled={page >= Math.ceil(scheduleData.items.length / 10)}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Day View Component
function DayScheduleView({ scheduleData, page }: { scheduleData: any; page: number }) {
  const selectedDate = scheduleData.selectedDate || new Date();

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">
          Schedule for {format(selectedDate, "EEEE, MMMM d, yyyy")}
        </h2>
        <div className="flex justify-center">
          <button
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set("date", format(selectedDate, "yyyy-MM-dd"));
              window.location.href = `/portal/student/schedule?${params.toString()}`;
            }}
            className="text-blue-600 hover:text-blue-800 text-sm px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Change Date
          </button>
        </div>
      </div>

      {/* Schedule Items for the selected date */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-semibold mb-4">
          Classes for {format(selectedDate, "EEEE, MMMM d, yyyy")}
        </h2>
        <div className="space-y-4">
          {scheduleData.items.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No classes scheduled for this date</p>
            </div>
          ) : (
            scheduleData.items
              .filter((item) => isSameDay(new Date(item.startTime), selectedDate))
              .map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          item.type === "lecture" && "bg-purple-500",
                          item.type === "assignment" && "bg-orange-500",
                          item.type === "exam" && "bg-red-500"
                        )} />
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">{item.courseCode}</div>
                          <div className="text-xs text-gray-500">{format(item.startTime, "HH:mm")}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            window.location.href = `/portal/student/schedule/item/${item.id}`;
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function generateWeekDays(weekNumber: number) {
  const startDate = startOfWeek(new Date(), { week: 1 });
  const days = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    days.push({
      date,
      day: format(date, "EEEE"),
      items: [], // Will be populated by the main function
    });
  }

  return days;
}