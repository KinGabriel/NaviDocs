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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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
  const statusOptions = ["All", "Draft", "Pending Approval", "Approved", "Published"];

  const deriveInitialStatus = () => {
    const fromState = location.state?.status;
    const fromQuery = searchParams.get("status");
    if (statusOptions.includes(fromState)) return fromState;
    if (statusOptions.includes(fromQuery)) return fromQuery;
    return "All";
  };

  const [selectedStatus, setSelectedStatus] = useState(deriveInitialStatus());
  const [sortOrder, setSortOrder] = useState("Recent");

  useEffect(() => {
    const next = deriveInitialStatus();
    setSelectedStatus(next);
    pagination.handlePage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, searchParams]);

  const [selectOpen, setSelectOpen] = useState(false);
  const [publishedLoading, setPublishedLoading] = useState(false);
  const [publishedTemplatesCache, setPublishedTemplatesCache] = useState([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [documentsCache, setDocumentsCache] = useState([]);
  const [documentsCacheLoading, setDocumentsCacheLoading] = useState(false);

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
      if (selectedStatus && selectedStatus !== "All") {
        const statusMap = {
          Draft: "draft",
          "Pending Approval": "pending",
          Approved: "approved",
          Published: "published",
        };
        params.status = statusMap[selectedStatus] || selectedStatus;
      }
      if (search && search.trim()) params.search = search.trim();

      const result = await listDocumentsAPI(params);

      let templatesArray = [];
      if (result && Array.isArray(result.documents)) {
        templatesArray = result.documents;
        if (result.pagination && result.pagination.total_pages)
          setTotalPages(result.pagination.total_pages);
        else setTotalPages(1);
      } else if (result && result.success && Array.isArray(result.data?.templates)) {
        templatesArray = result.data.templates;
        setTotalPages(result.data.pagination?.total_pages || 1);
      } else if (Array.isArray(result)) {
        templatesArray = result;
        setTotalPages(1);
      }

      const lastActivity = (t) => new Date(t.updatedAt || 0).getTime();
      if (sortOrder === "A-Z") templatesArray.sort((a, b) => a.title.localeCompare(b.title));
      if (sortOrder === "Z-A") templatesArray.sort((a, b) => b.title.localeCompare(a.title));
      if (sortOrder === "Recent") templatesArray.sort((a, b) => lastActivity(b) - lastActivity(a));

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedSchool, selectedStatus, search, sortOrder, pagination.currentPage]);

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
    setTemplates((prev) => prev.filter((t) => (t._id || t.id) !== id));
  };

  const extractFieldsFromDoc = (doc) => {
    if (!doc) return [];
    const fromFields = doc?.from_template?.fields || doc?.fields || doc?.template?.fields;
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

  const StatusPill = ({ value }) => {
    const val = (value || "").toString();
    return (
      <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
        <span className="h-2 w-2 rounded-full bg-yellow-500" />
        {val || "-"}
      </span>
    );
  };

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

  const columns = [
    { key: "title", label: "Template Name", render: (row) => row.title || "Untitled" },
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
      key: "deadline",
      label: "Deadline",
      render: (row) =>
        row.deadline ? new Date(row.deadline).toLocaleString() : "No Deadline set",
    },
    { key: "status", label: "Status", render: (row) => <StatusPill value={row.status} /> },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          onClick={() => handleView(row)}
          className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Documents" />

        {/* Prevent horizontal overflow inside the white panel */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-4 md:px-8 mx-3 md:mx-6 mt-4 md:mt-8 rounded-xl overflow-x-hidden">
          <div className="flex-1 px-1 py-5">
            <h1 className="text-3xl font-bold text-black-800 tracking-widest uppercase mt-3">
              DOCUMENTS
            </h1>
            <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />

            {/* Controls Row */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4 w-full">
              {/* Buttons stack on small screens */}
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
                      else if (pubRes?.templates) setPublishedTemplatesCache(pubRes.templates);
                      else if (Array.isArray(pubRes)) setPublishedTemplatesCache(pubRes);

                      if (docsRes && Array.isArray(docsRes.documents))
                        setDocumentsCache(docsRes.documents);
                      else if (docsRes?.success && Array.isArray(docsRes.data?.documents))
                        setDocumentsCache(docsRes.data.documents);
                      else if (Array.isArray(docsRes)) setDocumentsCache(docsRes);
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

              {/* Filters / search / view toggle */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-end gap-3 w-full">
                {/* row 1: trash + dropdowns + (desktop toggle) */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Recently Deleted */}
                  <button
                    type="button"
                    onClick={() => navigate("/recently-deleted")}
                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 w-10 h-10"
                    aria-label="Recently deleted"
                    title="Recently deleted"
                  >
                    {/* trash icon */}
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5 text-[#0035DA]"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 6h18M9 6v-1a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

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

                  {/* desktop view toggle (>=lg) */}
                  <div className="hidden lg:block">
                    <ViewToggle mode={viewMode} onChange={setViewMode} />
                  </div>
                </div>

                {/* row 2: search + (mobile/tablet toggle) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
                  {/* search full width on mobile, fixed on desktop */}
                  <div className="w-full sm:w-64 lg:w-64">
                    <SearchBar
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search documents..."
                    />
                  </div>

                  {/* toggle <lg */}
                  <div className="flex sm:justify-start lg:hidden">
                    <ViewToggle mode={viewMode} onChange={setViewMode} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 border-b border-gray-200">
              <div className="flex space-x-8">
                {statusOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setSelectedStatus(opt);
                      pagination.handlePage(1);
                    }}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      selectedStatus === opt
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
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
              {pagination.getPageNumbers().map((num, idx) =>
                num === "..." ? (
                  <span key={idx} className="px-2 text-gray-400">
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
    </div>
  );
}

/* ---------- Inline helper: Toggle pill ---------- */
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
