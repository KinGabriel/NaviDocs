import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../layout/headers/header";
import Sidebar from "../layout/sidebars/sidebar";
import useUser from "../hooks/useUser";
import SearchBar from "../components/searchbar";
import Table from "../components/table";
import DocumentCard from "../components/cards/documentCard";
import usePagination from "../hooks/usePagination";
import Loader from "../components/loader";
import { listDocumentsAPI } from "../api/documentsAPI";

export default function ArchivedDocuments() {
  const user = useUser();
  const navigate = useNavigate();

  const PAGE_SIZE = 8;
  const [search, setSearch] = useState("");
  const [archivedDocs, setArchivedDocs] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedTotalPages, setArchivedTotalPages] = useState(1);
  const pagination = usePagination(archivedTotalPages, 1);

  const archivedColumns = [
    {
      key: "title",
      label: "Document Name",
      render: (row) => row.title || "Untitled",
    },
    {
      key: "assignedTo",
      label: "Assigned To",
      render: (row) => {
        const list = row.assignedNames || row.assigned || [];
        if (Array.isArray(list) && list.length) {
          return list.filter(Boolean).join(", ");
        }
        return row.createdByName || row.created_by_name || "-";
      },
    },
    {
      key: "deletedAt",
      label: "Archived On",
      render: (row) =>
        row.deletedAt
          ? new Date(row.deletedAt).toLocaleString()
          : row.updatedAt
          ? new Date(row.updatedAt).toLocaleString()
          : "-",
    },
    {
      key: "actions",
      label: "Actions",
      render: () => (
        <span className="text-gray-400 text-sm select-none">No actions</span>
      ),
    },
  ];

  const fetchArchived = async () => {
    if (!user) return;
    setArchivedLoading(true);
    try {
      const params = {
        limit: PAGE_SIZE,
        page: pagination.currentPage,
        deleted: true, // still using deleted=true to pull soft-deleted docs
        search: search?.trim() || undefined,
      };
      const result = await listDocumentsAPI(params);

      let arr = [];
      if (result && Array.isArray(result.documents)) {
        arr = result.documents;
        setArchivedTotalPages(result.pagination?.total_pages || 1);
      } else if (result?.success && Array.isArray(result.data?.documents)) {
        arr = result.data.documents;
        setArchivedTotalPages(result.data?.pagination?.total_pages || 1);
      } else if (Array.isArray(result)) {
        arr = result;
        setArchivedTotalPages(1);
      }

      // newest archived first
      arr.sort((a, b) => {
        const ad = new Date(a.deletedAt || a.updatedAt || 0).getTime();
        const bd = new Date(b.deletedAt || b.updatedAt || 0).getTime();
        return bd - ad;
      });

      setArchivedDocs(arr);
    } catch (err) {
      setArchivedDocs([]);
      setArchivedTotalPages(1);
    } finally {
      setArchivedLoading(false);
    }
  };

  useEffect(() => {
    fetchArchived();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, search, pagination.currentPage]);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />

      <div className="flex flex-1 flex-col lg:flex-row">
        <Sidebar user={user} />

        <div
          className="flex-1 flex flex-col bg-white shadow
                      pt-1 pb-4
                      px-4 sm:px-6 lg:px-8
                      mx-0 lg:mx-6
                      mt-4 lg:mt-8
                      rounded-none lg:rounded-xl"
        >
          <div className="flex-1 px-0 lg:px-1 py-5">
            {/* Page title */}
            <h1 className="text-2xl lg:text-3xl font-bold text-black-800 tracking-widest uppercase mt-3">
              ARCHIVED DOCUMENTS
            </h1>
            <div className="w-24 lg:w-30 h-1 bg-yellow-400 mb-4 lg:mb-6 rounded" />

            {/* Controls: search  */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mb-4">
              <div className="w-full sm:w-64">
                <SearchBar
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search archived documents..."
                />
              </div>
            </div>

            {/* Content: table only */}
            {archivedLoading ? (
              <div className="w-full flex justify-center py-10">
                <Loader message="Loading archived documents..." />
              </div>
            ) : (
              <div className="w-full overflow-x-auto rounded-lg border border-gray-200 sm:border-0 sm:overflow-visible sm:rounded-none">
                <Table columns={archivedColumns} data={archivedDocs} />
              </div>
            )}

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row justify-center items-center mt-6 gap-2 flex-wrap">
              <button
                onClick={pagination.handlePrev}
                disabled={pagination.currentPage === 1}
                className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Prev
              </button>

              {pagination.getPageNumbers().map((num, idx) =>
                num === "..." ? (
                  <span
                    key={idx}
                    className="px-2 text-gray-400 select-none"
                  >
                    ...
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
                disabled={pagination.currentPage === archivedTotalPages}
                className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewToggle({ mode = "grid", onChange }) {
  const isTable = mode === "table";

  return (
    <div className="inline-flex items-stretch rounded-full border border-gray-300 overflow-hidden">
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`px-3 py-2 flex items-center ${
          isTable ? "bg-blue-100 text-blue-700" : "bg-white text-gray-700"
        }`}
        aria-label="List view"
        title="List view"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => onChange("grid")}
        className={`px-3 py-2 flex items-center ${
          !isTable ? "bg-blue-100 text-blue-700" : "bg-white text-gray-700"
        }`}
        aria-label="Grid view"
        title="Grid view"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="4" y="4" width="6" height="6" rx="1"></rect>
          <rect x="14" y="4" width="6" height="6" rx="1"></rect>
          <rect x="4" y="14" width="6" height="6" rx="1"></rect>
          <rect x="14" y="14" width="6" height="6" rx="1"></rect>
        </svg>
      </button>
    </div>
  );
}
