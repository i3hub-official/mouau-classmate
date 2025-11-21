// app/p/s/assignments/components/AssignmentFilters.tsx
"use client";

import { FilterIcon, Search } from "lucide-react";
import { AssignmentWithDetails } from "./AssignmentCard.js";

interface AssignmentFiltersProps {
  assignments: AssignmentWithDetails[];
  searchParams: {
    course?: string;
    status?: string;
    search?: string;
  };
}

export default function AssignmentFilters({
  assignments,
  searchParams,
}: AssignmentFiltersProps) {
  const handleClearFilters = () => {
    window.location.href = "/p/s/assignments";
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <FilterIcon className="h-5 w-5 mr-2" />
        Filters
      </h2>
      <form
        action="/p/s/assignments"
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
            defaultValue={searchParams.course || ""}
          >
            <option value="">All Courses</option>
            {Array.from(new Set(assignments.map((a) => a.course.id))).map(
              (courseId) => {
                const course = assignments.find(
                  (a) => a.course.id === courseId
                )?.course;
                return (
                  <option key={courseId} value={courseId}>
                    {course ? `${course.code} - ${course.title}` : courseId}
                  </option>
                );
              }
            )}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue={searchParams.status || ""}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="graded">Graded</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="search" className="text-sm font-medium">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              id="search"
              name="search"
              type="text"
              placeholder="Search assignments..."
              className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm"
              defaultValue={searchParams.search || ""}
            />
          </div>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            Clear Filters
          </button>
        </div>
      </form>
    </div>
  );
}
