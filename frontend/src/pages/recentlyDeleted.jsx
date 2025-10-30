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

export default function RecentlyDeleted() {
  const user = useUser();
  const navigate = useNavigate();

  // state
  const PAGE_SIZE = 8;
  const [viewMode, setViewMode] = useState("grid"); // "table" | "grid"
  const [search, setSearch] = useState("");
  const [deletedDocs, setDeletedDocs] = useState([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [deletedTotalPages, setDeletedTotalPages] = useState(1);
  const pagination = usePagination(deletedTotalPages, 1);

  // columns for table mode
  const deletedColumns = [
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
      label: "Deleted On",
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

  // fetch deleted docs
  const fetchDeleted = async () => {
    if (!user) return;
    setDeletedLoading(true);
    try {
      const params = {
        limit: PAGE_SIZE,
        page: pagination.currentPage,
        deleted: true,
        search: search?.trim() || undefined,
      };
      const result = await listDocumentsAPI(params);

      let arr = [];
      if (result && Array.isArray(result.documents)) {
        arr = result.documents;
        setDeletedTotalPages(result.pagination?.total_pages || 1);
      } else if (result?.success && Array.isArray(result.data?.documents)) {
        arr = result.data.documents;
        setDeletedTotalPages(result.data?.pagination?.total_pages || 1);
      } else if (Array.isArray(result)) {
        arr = result;
        setDeletedTotalPages(1);
      }

      // newest deleted first
      arr.sort((a, b) => {
        const ad = new Date(a.deletedAt || a.updatedAt || 0).getTime();
        const bd = new Date(b.deletedAt || b.updatedAt || 0).getTime();
        return bd - ad;
      });

      setDeletedDocs(arr);
    } catch (err) {
      setDeletedDocs([]);
      setDeletedTotalPages(1);
    } finally {
      setDeletedLoading(false);
    }
  };

  useEffect(() => {
    fetchDeleted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, search, pagination.currentPage]);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />

      <div className="flex flex-1 flex-col lg:flex-row">
        <Sidebar user={user} />

        {/* main content */}
        <div className="flex-1 flex flex-col bg-white shadow
                        pt-1 pb-4
                        px-4 sm:px-6 lg:px-8
                        mx-0 lg:mx-6
                        mt-4 lg:mt-8
                        rounded-none lg:rounded-xl">
          <div className="flex-1 px-0 lg:px-1 py-5">
            {/* header / title */}
            <h1 className="text-2xl lg:text-3xl font-bold text-black-800 tracking-widest uppercase mt-3">
              RECENTLY DELETED
            </h1>
            <div className="w-24 lg:w-30 h-1 bg-yellow-400 mb-4 lg:mb-6 rounded" />

            {/* controls row */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              {/* left spacer on desktop to push controls right, hidden mobile */}
              <div className="flex-1 hidden sm:block" />

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                {/* search full width on mobile */}
                <div className="w-full sm:w-64">
                  <SearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search deleted documents..."
                  />
                </div>

                {/* view toggle sits next to it on desktop, below it on mobile */}
                <div className="self-start sm:self-auto">
                  <ViewToggle mode={viewMode} onChange={setViewMode} />
                </div>
              </div>
            </div>

            {/* content */}
            {deletedLoading ? (
              <div className="w-full flex justify-center py-10">
                <Loader message="Loading recently deleted..." />
              </div>
            ) : (
              <>
                {viewMode === "table" ? (
                  // table mode (scrollable on small screens)
                  <div className="w-full overflow-x-auto rounded-lg border border-gray-200 sm:border-0 sm:overflow-visible sm:rounded-none">
                    <Table columns={deletedColumns} data={deletedDocs} />
                  </div>
                ) : (
                  // grid mode (1->2->3->4 cols)
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {deletedDocs.length === 0 ? (
                      <div className="col-span-full text-center py-8">
                        <p className="text-gray-600">No deleted documents</p>
                      </div>
                    ) : (
                      deletedDocs.map((doc, i) => {
                        const id = doc._id || i;
                        return (
                          <div key={id} className="relative">
                            <span className="absolute top-2 right-2 z-10 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                              Deleted
                            </span>
                            <DocumentCard
                              document={doc}
                              user={user}
                              onSelect={() => {
                                /* read-only in trash */
                              }}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </>
            )}

            {/* pagination */}
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
                  <span key={idx} className="px-2 text-gray-400 select-none">
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
                disabled={pagination.currentPage === deletedTotalPages}
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

/* View toggle stays the same, just make sure it doesn't explode layout */
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
