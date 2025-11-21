// app/p/s/assignments/components/Pagination.tsx
"use client";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  searchParams: {
    page?: string;
  };
}

export default function Pagination({ 
  currentPage, 
  totalItems, 
  itemsPerPage, 
  searchParams 
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const page = currentPage || 1;

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", newPage.toString());
    window.location.href = `/p/s/assignments?${params.toString()}`;
  };

  if (totalItems <= itemsPerPage) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t">
      <div className="text-sm text-muted-foreground">
        Showing {Math.min(itemsPerPage, totalItems - (page - 1) * itemsPerPage)} of{" "}
        {totalItems} assignments
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm px-3">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}