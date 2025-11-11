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
  const week = searchParams.week ? parseInt(searchParams.week) : getCurrentWeek();
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

        {/* Week Navigation */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Week {week}</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("week", (week - 1).toString());
                  window.location.href = `/portal/student/schedule?${params.toString()}`;
                }}
                disabled={week <= 1}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("week", (week + 1).toString());
                  window.location.href = `/portal/student/schedule?${params.toString()}`;
                }}
                disabled={week >= getCurrentWeek()}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2 disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center space-x-4">
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
                  "inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2",
                  week === getCurrentWeek() && "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
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
              <label htmlFor="course" className="text-sm font-medium">Course</label>
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
              <label htmlFor="type" className="text-sm font-medium">Type</label>
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
              <label htmlFor="view" className="text-sm font-medium">View</label>
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
                onClick={() => (window.location.href = "/portal/student/schedule")}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Apply Filters
              </button>
            </div>
          </form>
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
    where: {
      studentId,
    },
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

  for (const enrollment of enrollments) {
    if (course && enrollment.course.id !== course) continue;

    // Get lectures for the week
    const lectures = await prisma.lecture.findMany({
      where: {
        courseId: enrollment.course.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            color: true,
            instructor: {
              select: {
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

    // Add lectures to schedule
    lectures.forEach((lecture) => {
      scheduleItems.push({
        id: lecture.id,
        courseId: enrollment.course.id,
        courseCode: enrollment.course.code,
        courseTitle: enrollment.course.title,
        courseColor: enrollment.course.color,
        instructorName: `${lecture.course.instructor?.firstName || ""} ${lecture.course.instructor?.lastName || ""}`,
        instructorEmail: lecture.course.instructor?.email || "",
        instructorPhoto: lecture.course.instructor?.photo || "",
        startTime: lecture.createdAt,
        endTime: new Date(lecture.createdAt.getTime() + 60 * 60 * 1000), // 1 hour duration
        location: lecture.course.title || "TBD",
        type: "lecture",
        status: isPast(lecture.createdAt) ? "completed" : "scheduled",
        description: lecture.description,
        resources: lecture.content ? [{
          type: "video",
          title: "Lecture Video",
          url: lecture.content?.videoUrl || "#",
        }] : [],
      });
    });

    // Get assignments for the week
    const assignments = await prisma.assignment.findMany({
      where: {
        courseId: enrollment.course.id,
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            color: true,
            instructor: {
              select: {
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

    // Add assignments to schedule
    assignments.forEach((assignment) => {
      scheduleItems.push({
        id: assignment.id,
        courseId: enrollment.course.id,
        courseCode: enrollment.course.code,
        courseTitle: enrollment.course.title,
        courseColor: enrollment.course.color,
        instructorName: `${assignment.course.instructor?.firstName || ""} ${assignment.course.instructor?.lastName || ""}`,
        instructorEmail: assignment.course.instructor?.email || "",
        instructorPhoto: assignment.course.instructor?.photo || "",
        startTime: assignment.dueDate,
        endTime: assignment.dueDate,
        location: assignment.course.title || "Online",
        type: "assignment",
        status: isPast(assignment.dueDate) ? "overdue" : "pending",
        description: assignment.description,
        resources: [{
          type: "link",
          title: "Submit Assignment",
          url: `/portal/student/assignments/${assignment.id}`,
        }],
      });
    });
  }

  // Filter by type if specified
  if (type) {
    scheduleItems = scheduleItems.filter((item) => item.type === type);
  }

  // Sort by date and time
  scheduleItems.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Paginate results
  const startIndex = (page - 1) * 10;
  const paginatedItems = scheduleItems.slice(startIndex, startIndex + 10);

  return {
    currentWeek: week,
    currentView: view,
    courses: enrollments.map((e) => e.course),
    items: paginatedItems,
    hasMore: scheduleItems.length > page * 10,
  };
}

function getCurrentWeek(): number {
  const date = new Date();
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = date.getTime() - firstDayOfYear.getTime();
  const currentWeek = Math.ceil(pastDaysOfYear / 7);
  return currentWeek;
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
                isToday(day.date) ? "bg-blue-100 border-blue-300" : "bg-white border-gray-200",
                isFuture(day.date) ? "opacity-50" : ""
              )}
            >
              <div className="text-center mb-2">
                <div className="text-sm font-medium">{day.day}</div>
                <div className="text-xs text-muted-foreground">{format(day.date, "MMM d")}</div>
              </div>
              <div className="space-y-1">
                {day.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className={cn(
                      "p-2 rounded border",
                      item.status === "completed" && "bg-green-50 border-green-200",
                      item.status === "in_progress" && "bg-blue-50 border-blue-200",
                      item.status === "overdue" && "bg-red-50 border-red-200"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            item.type === "lecture" && "bg-purple-500",
                            item.type === "assignment" && "bg-orange-500",
                            item.type === "exam" && "bg-red-500"
                          )} />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(item.startTime, "HH:mm")}
                        </div>
                      </div>
                      <div className="text-sm font-medium truncate">
                        {item.courseCode}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.instructorName}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.status === "completed" && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {item.status === "in_progress" && (
                        <Play className="h-4 w-4 text-blue-500" />
                      )}
                      {item.status === "overdue" && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Schedule Items List */}
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-4">Schedule Details</h2>
      <div className="space-y-4">
        {scheduleData.items.map((item) => (
          <div
            key={item.id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    item.type === "lecture" && "bg-purple-500",
                    item.type === "assignment" && "bg-orange-500",
                    item.type === "exam" && "bg-red-500"
                  )} />
                </div>
                <div>
                  <div className="text-sm font-medium">{item.courseCode}</div>
                  <div className="text-xs text-muted-foreground">{item.instructorName}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">
                  {format(item.startTime, "EEE, MMM d")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(item.endTime, "HH:mm")}
                </div>
              </div>
            </div>

            <div className="mb-2">
              <h3 className="text-lg font-semibold">{item.courseTitle}</h3>
              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                  item.status === "completed" && "bg-green-100 text-green-800",
                  item.status === "in_progress" && "bg-blue-100 text-blue-800",
                  item.status === "overdue" && "bg-red-100 text-red-800"
                )}>
                  {item.status}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {item.location}
              </div>
            </div>

            {item.resources && item.resources.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Resources</h4>
                <div className="flex flex-wrap gap-2">
                  {item.resources.map((resource, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        window.open(resource.url || "#", "_blank");
                      }}
                      className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2"
                    >
                      {resource.type === "video" && <Video className="h-4 w-4 mr-2" />}
                      {resource.type === "link" && <BookOpen className="h-4 w-4 mr-2" />}
                      {resource.type === "file" && <FileText className="h-4 w-4 mr-2" />}
                      <span className="text-sm">{resource.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
            className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

// Day View Component
function DayScheduleView({ scheduleData, page }: { scheduleData: any; page: number }) {
  const selectedDate = scheduleData.selectedDate || new Date();
  const daySchedule = scheduleData.items.filter((item) => 
    isSameDay(new Date(item.startTime), selectedDate)
  );

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Select Date</h2>
        <input
          type="date"
          value={format(selectedDate, "yyyy-MM-dd")}
          onChange={(e) => {
            const params = new URLSearchParams(window.location.search);
            params.set("date", e.target.value);
            window.location.href = `/portal/student/schedule?${params.toString()}`;
          }}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {/* Day Schedule */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-4">
          Schedule for {format(selectedDate, "EEEE, MMMM d, yyyy")}
        </h2>
        <div className="space-y-4">
          {daySchedule.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No schedule found for this date</p>
            </div>
          ) : (
            daySchedule.map((item, index) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        item.type === "lecture" && "bg-purple-500",
                        item.type === "assignment" && "bg-orange-500",
                        item.type === "exam" && "bg-red-500"
                      )} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{format(item.startTime, "HH:mm")}</div>
                      <div className="text-xs text-muted-foreground">{item.courseCode}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {format(item.startTime, "EEE, MMM d")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(item.endTime, "HH:mm")}
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <h3 className="text-lg font-semibold">{item.courseTitle}</h3>
                  <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                      item.status === "completed" && "bg-green-100 text-green-800",
                      item.status === "in_progress" && "bg-blue-100 text-blue-800",
                      item.status === "overdue" && "bg-red-100 text-red-800"
                    )}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.location}
                  </div>
                </div>

                {item.resources && item.resources.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Resources</h4>
                    <div className="flex flex-wrap gap-2">
                      {item.resources.map((resource, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            window.open(resource.url || "#", "_blank");
                          }}
                          className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2"
                        >
                          {resource.type === "video" && <Video className="h-4 w-4 mr-2" />}
                          {resource.type === "link" && <BookOpen className="h-4 w-4 mr-2" />}
                          {resource.type === "file" && <FileText className="h-4 w-4 mr-2" />}
                          <span className="text-sm">{resource.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Helper functions
function generateWeekDays(weekNumber: number) {
  const startOfWeek = startOfWeek(new Date(), { week: 1 });
  const days = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    days.push({
      date,
      day: format(date, "EEE"),
      items: [], // Will be populated by the main function
    });
  }

  return days;
}