import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSize: number;
  pageSizeOptions: number[];
  totalItems: number;
}

export function PaginationControls({
  currentPage,
  itemLabel,
  onPageChange,
  onPageSizeChange,
  pageSize,
  pageSizeOptions,
  totalItems,
}: PaginationControlsProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalItems === 0) return null;

  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row" aria-label={`${itemLabel} pagination`}>
      <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
        <p className="text-xs font-semibold text-slate-500">
          Showing {firstItem}–{lastItem} of {totalItems}
        </p>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          Per page
          <select
            value={pageSize}
            onChange={event => onPageSizeChange(Number(event.target.value))}
            aria-label={`${itemLabel} per page`}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            {pageSizeOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label={`Previous ${itemLabel} page`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} aria-hidden="true" /> Previous
          </button>
          <span className="min-w-20 text-center text-sm font-semibold text-slate-600" aria-live="polite">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label={`Next ${itemLabel} page`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  );
}
