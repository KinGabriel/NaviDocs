import React, { useEffect, useState } from "react";
import Header from "../layout/headers/header";
import Sidebar from "../layout/sidebars/sidebar";
import useUser from "../hooks/useUser";
import SearchBar from "../components/searchbar";
import Table from "../components/table";
import usePagination from "../hooks/usePagination";
import Loader from "../components/loader";
import { listDocumentsAPI, restoreDocumentAPI, permanentlyDeleteDocumentAPI } from "../api/documentsAPI";
import UnarchiveDocumentModal from "../components/modals/unarchiveDocumentModal";
import PermanentlyDeleteDocumentModal from "../components/modals/permanentlyDeleteDocumentModal";
import { useNavigate } from "react-router-dom";

function getEllipsedPages(current, total, siblings = 1) {
  const pages = [];
  const start = Math.max(2, current - siblings);
  const end = Math.min(total - 1, current + siblings);
  pages.push(1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  if (total > 1) pages.push(total);
  return Array.from(new Set(pages)).filter(p => p >= 1 && p <= total || p === "…");
}

export default function ArchivedDocuments() {
  const user = useUser();
  const navigate = useNavigate();

  const PAGE_SIZE = 8;
  const [search, setSearch] = useState("");
  const [archivedDocs, setArchivedDocs] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedTotalPages, setArchivedTotalPages] = useState(1);
  const [rowBusy, setRowBusy] = useState(null);
  const pagination = usePagination(archivedTotalPages, 1);

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [openUnarchive, setOpenUnarchive] = useState(false);
  const [openPermanentDelete, setOpenPermanentDelete] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // -- Actions (safe dynamic import so missing exports won't crash the app) --
  const handleUnarchiveClick = (doc) => {
    setSelectedDoc(doc);
    setModalError("");
    setOpenUnarchive(true);
  };

  const handlePermanentDeleteClick = (doc) => {
    setSelectedDoc(doc);
    setModalError("");
    setOpenPermanentDelete(true);
  };

  const confirmUnarchive = async () => {
    if (!selectedDoc) return;
    setModalSubmitting(true);
    try {
      await restoreDocumentAPI(selectedDoc._id || selectedDoc.id);
      setArchivedDocs((prev) => prev.filter((d) => (d._id || d.id) !== (selectedDoc._id || selectedDoc.id)));
      setOpenUnarchive(false);
    } catch (e) {
      setModalError(e.message || "Failed to unarchive");
    } finally {
      setModalSubmitting(false);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!selectedDoc) return;
    setModalSubmitting(true);
    try {
      await permanentlyDeleteDocumentAPI(selectedDoc._id || selectedDoc.id);
      setArchivedDocs((prev) => prev.filter((d) => (d._id || d.id) !== (selectedDoc._id || selectedDoc.id)));
      setOpenPermanentDelete(false);
    } catch (e) {
      setModalError(e.message || "Failed to delete");
    } finally {
      setModalSubmitting(false);
    }
  };


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
        if (Array.isArray(list) && list.length) return list.filter(Boolean).join(", ");
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
      key: "action",
      label: "Actions",
      render: (row) => {
        const busy = rowBusy === (row._id || row.id);
        return (
          <div className="inline-flex items-center gap-2 whitespace-nowrap pl-2">
            <button 
              type="button"
              onClick={() => handleUnarchiveClick(row)}
              disabled={busy}
              className={`px-3 py-1 rounded text-xs font-semibold border ${
                busy
                  ? "bg-green-100 text-green-500 opacity-60 cursor-not-allowed"
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
              title="Unarchive"
            >
              Unarchive
            </button>
            <button
              type="button"
              onClick={() => handlePermanentDeleteClick(row)}
              disabled={busy}
              className={`px-3 py-1 rounded text-xs font-semibold border ${
                busy
                  ? "bg-red-100 text-red-500 opacity-60 cursor-not-allowed"
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
              title="Permanently delete"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  const fetchArchived = async () => {
    if (!user) return;
    setArchivedLoading(true);
    try {
      const params = {
        limit: PAGE_SIZE,
        page: pagination.currentPage,
        deleted: true, // soft-deleted = archived
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

  // Map _id → id so your Table has a stable key
  const rows = archivedDocs.map((d) => ({ id: d._id || d.id, ...d }));

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
            {/* Back button */}
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate("/documents"); // fallback route — change if your list route is different
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (window.history.length > 1) {
                      navigate(-1);
                    } else {
                      navigate("/documents");
                    }
                  }
                }}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors z-10 pointer-events-auto"
                aria-label="Back"
                title="Back"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="sr-only">Back</span>
              </button>


            <h1 className="text-2xl lg:text-3xl font-bold text-black-800 tracking-widest uppercase mt-3">
              ARCHIVES
            </h1>
          </div>

          <div className="ml-12 w-24 lg:w-30 h-1 bg-yellow-400 mb-4 lg:mb-6 rounded" />

          {/* Controls: search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mb-4">
            <div className="w-full sm:w-64">
              <SearchBar
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search archived documents..."
              />
            </div>
          </div>

          {/* Content: table */}
          {archivedLoading ? (
            <div className="w-full flex justify-center py-10">
              <Loader message="Loading archived documents..." />
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-lg border border-gray-200 sm:border-0 sm:overflow-visible sm:rounded-none">
              <Table columns={archivedColumns} data={rows} />
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

            {getEllipsedPages(pagination.currentPage, archivedTotalPages, 1).map((num, idx) =>
              num === "…" ? (
                <span key={`e-${idx}`} className="px-2 text-gray-400 select-none">…</span>
              ) : (
                <button
                  key={num}
                  onClick={() => pagination.handlePage(num)}
                  className={`px-3 py-1 rounded border ${
                    pagination.currentPage === num
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                  aria-current={pagination.currentPage === num ? "page" : undefined}
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
    <UnarchiveDocumentModal
      open={openUnarchive}
      onClose={() => setOpenUnarchive(false)}
      itemTitle={selectedDoc?.title}
      submitting={modalSubmitting}
      error={modalError}
      onConfirm={confirmUnarchive}
    />

    <PermanentlyDeleteDocumentModal
      open={openPermanentDelete}
      onClose={() => setOpenPermanentDelete(false)}
      itemTitle={selectedDoc?.title}
      submitting={modalSubmitting}
      error={modalError}
      onConfirm={confirmPermanentDelete}
    />
  </div>
  );
}
