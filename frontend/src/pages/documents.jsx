import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Header from "../layout/headers/header";
import Sidebar from "../layout/sidebars/sidebar";
import useUser from "../hooks/useUser";
import SearchBar from "../components/searchbar";
import Dropdown from "../components/dropdowns/dropdown";
import DocumentCard from "../components/cards/documentCard";
import usePagination from "../hooks/usePagination";
import { fetchPublishedTemplatesAPI } from "../api/documentContollerAPI";
import { listDocumentsAPI, getDocumentByIdAPI } from "../api/documentsAPI";
import Loader from "../components/loader";
import ManageSuggestionsModal from "../components/modals/manageSuggestionsModal";
import Table from "../components/table";
import { toast } from "react-hot-toast";
import RenameModal from "../components/modals/renameModal";
import DuplicateModal from "../components/modals/duplicateModal";
import DeleteModal from "../components/modals/deleteModal";
import {
  renameDocumentAPI,
  duplicateDocumentAPI,
  deleteDocumentAPI,
} from "../api/documentsAPI";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/* Inline helper: Toggle pill */
function ViewToggle({ mode = "grid", onChange }) {
  const isTable = mode === "table";
  return (
    <div className="inline-flex items-stretch rounded-full border border-gray-300 overflow-hidden">
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`px-2.5 py-2 sm:px-3 sm:py-2 flex items-center ${
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
        className={`px-2.5 py-2 sm:px-3 sm:py-2 flex items-center ${
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

// Lightweight portal-free popover for row actions
function useOutsideClose(ref, onClose) {
  React.useEffect(() => {
    function onDocClick(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onClose?.();
    }
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, onClose]);
}

function RowKebabMenu({ row, onView, onRename, onMakeCopy, onDelete }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  useOutsideClose(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="More actions"
      >
        {/* 3-dot icon */}
        <svg
          width="20"
          height="20"
          fill="currentColor"
          viewBox="0 0 20 20"
          className="text-gray-700"
        >
          <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 16.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow-lg z-20 py-1"
        >
          {/* RENAME */}
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
            onClick={() => {
              setOpen(false);
              onRename?.(row);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
              <path d="m15 5 4 4" />
            </svg>
            Rename
          </button>

          {/* MAKE A COPY */}
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
            onClick={() => {
              setOpen(false);
              onMakeCopy?.(row);
            }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Make a Copy
          </button>

          <div className="my-1 h-px bg-gray-100" />

          {/* ARCHIVE */}
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            onClick={() => {
              setOpen(false);
              onDelete?.(row);
            }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Archive
          </button>
        </div>
      )}
    </div>
  );
}

function getEllipsedPages(current, total, siblings = 1) {
  const pages = [];
  const start = Math.max(2, current - siblings);
  const end = Math.min(total - 1, current + siblings);

  pages.push(1);

  if (start > 2) pages.push("…");

  for (let p = start; p <= end; p++) {
    pages.push(p);
  }

  if (end < total - 1) pages.push("…");

  if (total > 1) pages.push(total);

  // de-dup when total is small
  return Array.from(new Set(pages)).filter(
    (p) => (p >= 1 && p <= total) || p === "…"
  );
}

export default function GlobalTemplates() {
  const user = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const pagination = usePagination(totalPages, 1);

  const [selectedSchool, setSelectedSchool] = useState("All");
  const [sortOrder, setSortOrder] = useState("Recent");

  const [selectOpen, setSelectOpen] = useState(false);
  const [publishedLoading, setPublishedLoading] = useState(false);
  const [publishedTemplatesCache, setPublishedTemplatesCache] = useState([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [documentsCache, setDocumentsCache] = useState([]);
  const [documentsCacheLoading, setDocumentsCacheLoading] = useState(false);

  /* Kebab + modals state for TABLE view */
  const [activeRow, setActiveRow] = useState(null);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState("");

  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const schoolIdentifiers = {
    "University Wide": "VAA",
    SAMCIS: "SMI",
    STELA: "STL",
  };

  const PAGE_SIZE = 8;

  const [viewMode, setViewMode] = useState("grid");

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = {
        limit: PAGE_SIZE,
        page: pagination.currentPage,
      };
      if (selectedSchool && selectedSchool !== "All") params.school = selectedSchool;
      if (search && search.trim()) params.search = search.trim();

      const result = await listDocumentsAPI(params);

      let templatesArray = [];
      if (result && Array.isArray(result.documents)) {
        templatesArray = result.documents;
        if (result.pagination && result.pagination.total_pages)
          setTotalPages(result.pagination.total_pages);
        else setTotalPages(1);
      } else if (
        result &&
        result.success &&
        Array.isArray(result.data?.templates)
      ) {
        templatesArray = result.data.templates;
        setTotalPages(result.data.pagination?.total_pages || 1);
      } else if (Array.isArray(result)) {
        templatesArray = result;
        setTotalPages(1);
      }

      const lastActivity = (t) => new Date(t.updatedAt || 0).getTime();
      if (sortOrder === "A-Z")
        templatesArray.sort((a, b) => a.title.localeCompare(b.title));
      if (sortOrder === "Z-A")
        templatesArray.sort((a, b) => b.title.localeCompare(a.title));
      if (sortOrder === "Recent")
        templatesArray.sort((a, b) => lastActivity(b) - lastActivity(a));

      setTemplates(templatesArray);
    } catch {
      setTemplates([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [user, selectedSchool, search, sortOrder, pagination.currentPage]);

  const handleCardRename = (updated) => {
    if (!updated) return;
    const id = updated._id || updated.id;
    if (!id) return;
    setTemplates((prev) =>
      prev.map((t) => ((t._id || t.id) === id ? { ...t, ...(updated || {}) } : t))
    );
  };

  const handleCardDelete = (deleted) => {
    const id = deleted?._id || deleted?.id;
    if (!id) return;
    setTemplates((prev) =>
      prev.filter((t) => (t._id || t.id) !== id)
    );
  };

  /* ROW action handlers (table view) */
  const openRowRename = (row) => {
    setActiveRow(row);
    setRenameError("");
    setRenameOpen(true);
  };

  const submitRowRename = async (newTitle) => {
    if (!activeRow?._id && !activeRow?.id) return;
    try {
      setRenaming(true);
      const id = activeRow._id || activeRow.id;
      const resp = await renameDocumentAPI(id, newTitle);
      if (resp && (resp.success || resp.document)) {
        toast.success("Document renamed");
        const updated = resp.document || { ...activeRow, title: newTitle };
        setTemplates((prev) =>
          prev.map((t) =>
            (t._id || t.id) === id ? { ...t, ...updated } : t
          )
        );
        setRenameOpen(false);
      } else {
        const msg = resp?.message || "Failed to rename document";
        setRenameError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Error renaming";
      setRenameError(msg);
      toast.error(msg);
    } finally {
      setRenaming(false);
    }
  };

  const openRowDuplicate = (row) => {
    setActiveRow(row);
    setDuplicateOpen(true);
  };

  const submitRowDuplicate = async (newDoc) => {
    if (!activeRow?._id && !activeRow?.id) return;
    try {
      setDuplicating(true);
      const id = activeRow._id || activeRow.id;
      const title = newDoc?.title || `${activeRow.title || "Untitled"} (Copy)`;
      const resp = await duplicateDocumentAPI(id, title);
      if (resp && resp.success) {
        toast.success("Document duplicated");
        const newItem = resp.document || resp.data;
        if (newItem) {
          setTemplates((prev) => [newItem, ...prev]);
        }
        setDuplicateOpen(false);
      } else {
        toast.error(resp?.message || "Failed to duplicate document");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Error duplicating"
      );
    } finally {
      setDuplicating(false);
    }
  };

  const openRowDelete = (row) => {
    setActiveRow(row);
    setDeleteError("");
    setDeleteOpen(true);
  };

  const confirmRowDelete = async () => {
    if (!activeRow?._id && !activeRow?.id) return;
    try {
      setDeleting(true);
      const id = activeRow._id || activeRow.id;
      const resp = await deleteDocumentAPI(id);
      if (resp && resp.success) {
        toast.success("Document archived");
        setTemplates((prev) =>
          prev.filter((t) => (t._id || t.id) !== id)
        );
        setDeleteOpen(false);
      } else {
        const msg = resp?.message || "Failed to archive";
        setDeleteError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Error archiving";
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const extractFieldsFromDoc = (doc) => {
    if (!doc) return [];
    const fromFields =
      doc?.from_template?.fields || doc?.fields || doc?.template?.fields;
    if (Array.isArray(fromFields) && fromFields.length > 0) {
      return fromFields
        .map((f) => {
          if (!f) return null;
          if (typeof f === "string") return { name: f, label: f };
          return {
            name: f.name || f.key || f.id || f.field || String(f),
            label: f.label || f.title || f.name || f.key || String(f),
          };
        })
        .filter(Boolean);
    }

    const out = [];
    const addIfValid = (name, label) => {
      if (!name) return;
      out.push({ name: String(name), label: label || String(name) });
    };

    try {
      const pages = doc?.pages_json || doc?.pages || null;
      if (pages && Array.isArray(pages)) {
        const walk = (node) => {
          if (!node) return;
          if (node.type === "editableField") {
            addIfValid(
              node.name || node.key || node.field || node.id,
              node.label || node.title || node.placeholder
            );
          }
          if (Array.isArray(node.content)) node.content.forEach(walk);
          if (Array.isArray(node.pages)) node.pages.forEach(walk);
          if (Array.isArray(node.fields)) node.fields.forEach(walk);
        };
        pages.forEach((p) => walk(p));
      }
    } catch (e) {}

    return out;
  };

  const allTemplates = [
    ...(publishedTemplatesCache || []),
    ...(templates || []),
    ...(documentsCache || []),
  ];
  const map = new Map();
  allTemplates.forEach((tpl) => {
    const list = extractFieldsFromDoc(tpl) || [];
    list.forEach((f) => {
      if (!f || !f.name) return;
      const key = String(f.name);
      if (!map.has(key)) map.set(key, { name: key, label: f.label || key });
    });
  });
  const fields = Array.from(map.values());

  const handleView = async (tpl) => {
    const id = tpl?._id || tpl?.id;
    if (!id) return;
    try {
      setLoading(true);
      const resp = await getDocumentByIdAPI(id);
      const doc = resp?.document || resp;
      navigate(`/documents/editable-fields/${id}`, {
        state: {
          doc,
          sidebarActive: "Documents",
          backTo: "/documents",
        },
      });
    } catch (err) {
      console.error("Failed to fetch document by id", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 STATUS COLUMN REMOVED FOR FACULTY MODULE
  const columns = [
    { key: "title", label: "Template Name", render: (row) => row.title || "Untitled" },
    {
      key: "assignedTo",
      label: "Assigned To",
      render: (row) => {
        const list = row.assignedNames || row.assigned || [];
        if (Array.isArray(list) && list.length)
          return list.filter(Boolean).join(", ");
        return row.createdByName || row.created_by_name || "-";
      },
    },
    {
      key: "deadline",
      label: "Deadline",
      render: (row) =>
        row.deadline
          ? new Date(row.deadline).toLocaleString()
          : "No Deadline set",
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="inline-flex items-center gap-2">
          <button
            onClick={() => handleView(row)}
            className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            View
          </button>

          <RowKebabMenu
            row={row}
            onView={() => handleView(row)}
            onRename={() => openRowRename(row)}
            onMakeCopy={() => openRowDuplicate(row)}
            onDelete={() => openRowDelete(row)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Documents" />

        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-4 md:px-8 mx-3 md:mx-6 mt-4 md:mt-8 rounded-xl overflow-x-hidden">
          <div className="flex-1 px-1 py-5">
            <h1 className="text-3xl font-bold text-black-800 tracking-widest uppercase mt-3">
              DOCUMENTS
            </h1>
            <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />

            {/* Controls Row */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4 w-full">
              <div className="flex flex-col sm:flex-row gap-3 justify-start ml-1">
                <button
                  onClick={() => navigate("/select-template")}
                  className="flex items-center gap-2 bg-[#0035DA] hover:bg-[#043485] text-white font-semibold px-5 py-2 rounded shadow transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Select Template
                </button>

                <button
                  onClick={async () => {
                    try {
                      setPublishedLoading(true);
                      setDocumentsCacheLoading(true);

                      const [pubRes, docsRes] = await Promise.all([
                        fetchPublishedTemplatesAPI({
                          limit: PAGE_SIZE,
                          page: pagination.currentPage,
                        }),
                        listDocumentsAPI({
                          limit: PAGE_SIZE,
                          page: pagination.currentPage,
                        }),
                      ]);

                      if (pubRes?.success && pubRes.data?.templates)
                        setPublishedTemplatesCache(pubRes.data.templates);
                      else if (pubRes?.templates)
                        setPublishedTemplatesCache(pubRes.templates);
                      else if (Array.isArray(pubRes))
                        setPublishedTemplatesCache(pubRes);

                      if (docsRes && Array.isArray(docsRes.documents))
                        setDocumentsCache(docsRes.documents);
                      else if (
                        docsRes?.success &&
                        Array.isArray(docsRes.data?.documents)
                      )
                        setDocumentsCache(docsRes.data.documents);
                      else if (Array.isArray(docsRes))
                        setDocumentsCache(docsRes);
                    } catch (err) {
                      console.error(
                        "Failed to prefetch published templates or documents:",
                        err
                      );
                    } finally {
                      setPublishedLoading(false);
                      setDocumentsCacheLoading(false);
                      setManageOpen(true);
                    }
                  }}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-800 font-semibold px-4 py-2 rounded shadow transition-colors border"
                >
                  Manage saved values
                </button>
              </div>

              <div className="lg:hidden w-full">
                {/* Row: School + Sort + Archived icon */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="shrink-0">
                    <Dropdown
                      options={["All", ...Object.keys(schoolIdentifiers)]}
                      value={selectedSchool}
                      onChange={(v) => {
                        setSelectedSchool(v);
                        pagination.handlePage(1);
                      }}
                      width="w-50"
                    />
                  </div>

                  <div className="shrink-0">
                    <Dropdown
                      options={["Recent", "A-Z", "Z-A"]}
                      value={sortOrder}
                      onChange={(v) => {
                        setSortOrder(v);
                        pagination.handlePage(1);
                      }}
                      width="w-36"
                    />
                  </div>

                  {/* Archived icon beside sort */}
                  <button
                    type="button"
                    onClick={() => navigate("/archived-documents")}
                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 w-10 h-10"
                    aria-label="Archived documents"
                    title="Archived documents"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5 text-[#0035DA]"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.75 7.5h16.5M4.5 7.5l.62-2.32A2.25 2.25 0 0 1 7.25 3.75h9.5a2.25 2.25 0 0 1 2.13 1.43l.62 2.32"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M20.25 7.5l-.63 10.63a2.25 2.25 0 0 1-2.25 2.12H6.63a2.25 2.25 0 0 1-2.25-2.12L3.75 7.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 11.625v5.625m0 0l2.25-2.25M12 17.25l-2.25-2.25"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>

                {/* Search below the dropdowns + toggle on its right (same widths) */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-64">
                    <SearchBar
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search documents..."
                    />
                  </div>
                  <ViewToggle mode={viewMode} onChange={setViewMode} />
                </div>
              </div>

              <div className="hidden lg:flex lg:items-center lg:justify-end gap-3 w-full">
                <button
                  type="button"
                  onClick={() => navigate("/archived-documents")}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 w-10 h-10"
                  aria-label="Archived documents"
                  title="Archived documents"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-[#0035DA]"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3.75 7.5h16.5M4.5 7.5l.62-2.32A2.25 2.25 0 0 1 7.25 3.75h9.5a2.25 2.25 0 0 1 2.13 1.43l.62 2.32"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M20.25 7.5l-.63 10.63a2.25 2.25 0 0 1-2.25 2.12H6.63a2.25 2.25 0 0 1-2.25-2.12L3.75 7.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 11.625v5.625m0 0l2.25-2.25M12 17.25l-2.25-2.25"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Search + Toggle together */}
                <div className="flex items-center gap-2">
                  <div className="w-64">
                    <SearchBar
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search documents..."
                    />
                  </div>
                  <ViewToggle mode={viewMode} onChange={setViewMode} />
                </div>

                <Dropdown
                  options={["All", ...Object.keys(schoolIdentifiers)]}
                  value={selectedSchool}
                  onChange={(v) => {
                    setSelectedSchool(v);
                    pagination.handlePage(1);
                  }}
                  width="w-50"
                />

                <Dropdown
                  options={["Recent", "A-Z", "Z-A"]}
                  value={sortOrder}
                  onChange={(v) => {
                    setSortOrder(v);
                    pagination.handlePage(1);
                  }}
                  width="w-36"
                />
              </div>
            </div>

            {/* List OR Grid */}
            {viewMode === "table" ? (
              loading ? (
                <div className="w-full flex justify-center py-10">
                  <Loader message="Loading documents..." />
                </div>
              ) : (
                <Table columns={columns} data={templates} />
              )
            ) : (
              <div className="grid [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))] gap-5 sm:gap-6">
                {loading ? (
                  <div className="col-span-full text-center py-8">
                    <Loader message="Loading documents..." />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-600">No Documents found</p>
                  </div>
                ) : (
                  templates.map((template, i) => {
                    const id = template._id || i;
                    return (
                      <div key={id} className="min-w-0">
                        <DocumentCard
                          document={{ ...template }}
                          user={user}
                          className="w-full"
                          onSelect={() => handleView(template)}
                          onRename={(updated) => handleCardRename(updated)}
                          onDelete={(deleted) => handleCardDelete(deleted)}
                          // 🔹 Hide status pill for Faculty module
                          hideStatusPill
                        />
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Pagination */}
            <div className="flex justify-center items-center mt-6 gap-2">
              <button
                onClick={pagination.handlePrev}
                disabled={pagination.currentPage === 1}
                className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Prev
              </button>

              {getEllipsedPages(
                pagination.currentPage,
                totalPages,
                1
              ).map((num, idx) =>
                num === "…" ? (
                  <span
                    key={`e-${idx}`}
                    className="px-2 text-gray-400 select-none"
                  >
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
                    aria-current={
                      pagination.currentPage === num ? "page" : undefined
                    }
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
      </div>

      <ManageSuggestionsModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        fields={fields}
        user={user}
      />

      {/* Row modals (table view) */}
      <RenameModal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        currentTitle={activeRow?.title || "Untitled"}
        submitting={renaming}
        error={renameError}
        onSubmit={submitRowRename}
      />

      <DuplicateModal
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        type="document"
        item={activeRow}
        submitting={duplicating}
        onDuplicate={submitRowDuplicate}
      />

      <DeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        itemType="document"
        itemTitle={activeRow?.title || "Untitled"}
        onConfirm={confirmRowDelete}
        submitting={deleting}
        error={deleteError}
      />
    </div>
  );
}
