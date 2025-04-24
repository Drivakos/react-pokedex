import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`
          flex items-center px-2 py-1 text-sm rounded transition-colors
          ${currentPage === 1 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-blue-600 hover:bg-blue-50'}
        `}
      >
        <ChevronLeft size={16} className="mr-1" /> Previous
      </button>
      
      <div className="flex items-center">
        {renderPageNumbers()}
      </div>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`
          flex items-center px-2 py-1 text-sm rounded transition-colors
          ${currentPage === totalPages 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-blue-600 hover:bg-blue-50'}
        `}
      >
        Next <ChevronRight size={16} className="ml-1" />
      </button>
    </div>
  );
  
  function renderPageNumbers() {
    const pages = [];
    const maxVisiblePages = 5;
    
    // Logic to show a subset of pages with ellipsis
    if (totalPages <= maxVisiblePages) {
      // Show all pages if there are few
      for (let i = 1; i <= totalPages; i++) {
        pages.push(renderPageButton(i));
      }
    } else {
      // Always show first page
      pages.push(renderPageButton(1));
      
      // Calculate start and end of visible pages
      let startPage: number;
      let endPage: number;
      
      if (currentPage <= 3) {
        startPage = 2;
        endPage = 4;
        pages.push(...Array.from({ length: endPage - startPage + 1 }, (_, i) => 
          renderPageButton(startPage + i)
        ));
        pages.push(<span key="ellipsis-end" className="mx-1">...</span>);
        pages.push(renderPageButton(totalPages));
      } else if (currentPage >= totalPages - 2) {
        pages.push(<span key="ellipsis-start" className="mx-1">...</span>);
        startPage = totalPages - 3;
        endPage = totalPages - 1;
        pages.push(...Array.from({ length: endPage - startPage + 1 }, (_, i) => 
          renderPageButton(startPage + i)
        ));
        pages.push(renderPageButton(totalPages));
      } else {
        pages.push(<span key="ellipsis-start" className="mx-1">...</span>);
        startPage = currentPage - 1;
        endPage = currentPage + 1;
        pages.push(...Array.from({ length: endPage - startPage + 1 }, (_, i) => 
          renderPageButton(startPage + i)
        ));
        pages.push(<span key="ellipsis-end" className="mx-1">...</span>);
        pages.push(renderPageButton(totalPages));
      }
    }
    
    return pages;
  }
  
  function renderPageButton(pageNumber: number) {
    const isActive = pageNumber === currentPage;
    
    return (
      <button
        key={`page-${pageNumber}`}
        onClick={() => onPageChange(pageNumber)}
        className={`
          w-8 h-8 mx-0.5 flex items-center justify-center rounded transition-colors
          ${isActive 
            ? 'bg-blue-500 text-white' 
            : 'text-gray-700 hover:bg-gray-100'}
        `}
      >
        {pageNumber}
      </button>
    );
  }
};

export default Pagination;
