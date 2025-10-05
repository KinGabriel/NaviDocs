import React, { useEffect, useState } from "react";
import TemplateCard from "../templatecard";
import usePagination from "../../hooks/usePagination";
import { fetchPublishedTemplatesAPI } from "../../api/documentContollerAPI";

export default function SelectTemplateModal({
  open,
  onClose,
  user,
  onPickTemplate,
}) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const PAGE_SIZE = 8;
  const pagination = usePagination(totalPages, 1);

  useEffect(() => {
    if (!open) return;
    let ignore = false;

    const fetchPublished = async () => {
      setLoading(true);
      try {
        const params = {
          limit: PAGE_SIZE,
          page: pagination.currentPage,
        };

        const result = await fetchPublishedTemplatesAPI(params);

        let arr = [];
        if (result?.success && result.data?.templates) {
          arr = result.data.templates;
          setTotalPages(result.data.pagination?.total_pages || 1);
        } else if (result?.templates) {
          arr = result.templates;
          setTotalPages(1);
        } else if (Array.isArray(result)) {
          arr = result;
          setTotalPages(1);
        }

        if (!ignore) setTemplates(arr);
      } catch (e) {
        if (!ignore) {
          setTemplates([]);
          setTotalPages(1);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchPublished();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pagination.currentPage]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal shell */}
      <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Select Template</h2>
            <p className="text-xs text-gray-500">
              Choose a published template from Document Controller
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Template grid only */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {loading ? (
              <div className="col-span-full text-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-2 text-gray-600">Loading templates…</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="col-span-full text-center py-10">
                <p className="text-gray-600">No published templates found</p>
              </div>
            ) : (
              templates.map((t, i) => {
                const id = t._id || t.id || i;
                return (
                  <div
                    key={id}
                    className="relative"
                    onClick={() => onPickTemplate?.(t)}
                  >
                    <TemplateCard
                      template={t}
                      user={user}
                      onSelect={() => onPickTemplate?.(t)}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="px-6 pb-6 flex justify-center items-center gap-2">
          <button
            onClick={pagination.handlePrev}
            disabled={pagination.currentPage === 1}
            className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Prev
          </button>
          {pagination.getPageNumbers().map((num, idx) =>
            num === "..." ? (
              <span key={idx} className="px-2 text-gray-400">
                …
              </span>
            ) : (
              <button
                key={num}
                onClick={() => pagination.handlePage(num)}
                className={`px-3 py-1 rounded border ${
                  pagination.currentPage === num
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
            className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
