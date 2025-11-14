import React from "react";
import usePagination from "../../hooks/usePagination";

export default function StatCardModal({ isOpen, onClose, title, children, data = [], itemsPerPage = 10, }) {
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const pagination = usePagination(totalPages);

  if (!isOpen) return null;

  // Get current page data
  const startIndex = (pagination.currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = data.slice(startIndex, endIndex);

  return (
    <div className="fixed inset-0 bg-opacity-30 backdrop-blur-[2px] flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-[90vw] max-w-4xl h-[90vh] p-8 relative border-0 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors duration-200 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Title */}
        {title && (
          <h2 className="text-2xl font-bold text-gray-800 mb-6 pr-12">
            {title}
          </h2>
        )}

        {/* Content */}
        <div className="text-gray-700 flex-1">
          {children && React.cloneElement(children, { data: currentPageData })}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-6 gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={pagination.handlePrev}
              disabled={pagination.currentPage === 1}
              className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            {pagination.getPageNumbers().map((num, idx) =>
              num === "..." ? (
                <span key={idx} className="px-2 text-gray-400">...</span>
              ) : (
                <button
                  key={num}
                  onClick={() => pagination.handlePage(num)}
                  className={`px-3 py-1 rounded border ${pagination.currentPage === num
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  {num}
                </button>
              )
            )}
            <button
              onClick={pagination.handleNext}
              disabled={pagination.currentPage === totalPages}
              className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <div className="ml-4 text-sm text-gray-500">
              Showing {startIndex + 1}-{Math.min(endIndex, data.length)} of {data.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}