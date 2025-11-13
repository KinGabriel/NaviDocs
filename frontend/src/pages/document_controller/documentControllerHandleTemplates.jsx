import Table from '../../components/table';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import SearchBar from "../../components/searchbar";
import Dropdown from "../../components/dropdowns/dropdown";
import usePagination from "../../hooks/usePagination";
import { StatusBadge, formatDateTime } from '../../utils/formatters';
import Loader from '../../components/loader';
import { fetchTemplatesAPI as fetchDeanTemplatesAPI, approveTemplateAPI,createTemplateAPI } from "../../api/documentContollerAPI";
import TaskAssignmentModal from '../../components/modals/taskAssignmentModal';
import {FileText} from "lucide-react";

export default function DeanTemplates() {
  const user = useUser();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("Recent");
  const tabs = ["All", "Assigned", "Pending Approvals", "Approved"];
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  const tabToStatus = {
    "Pending Approvals": "Pending Approval",
    "Approved": "Approved",
  };

  const PAGE_SIZE = 10;
  const pagination = usePagination(totalPages, 1);

  const schoolIdentifiers = {
    "University Wide": "VAA",
    SAMCIS: "SMI",
    STELA: "STL",
  };

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiStatus =
        selectedStatus === "Assigned" ? "All" : tabToStatus[selectedStatus] || selectedStatus;

      const res = await fetchDeanTemplatesAPI({
        user,
        selectedSchool,
        selectedStatus: apiStatus,
        search,
        PAGE_SIZE,
        currentPage: pagination.currentPage,
      });

      let arr = [];
      if (res?.success && res.data?.templates) {
        arr = res.data.templates;
        setTotalPages(res.data.pagination?.total_pages || 1);
      } else if (res?.templates) {
        arr = res.templates;
        setTotalPages(1);
      } else if (Array.isArray(res)) {
        arr = res;
        setTotalPages(1);
      }

      // Hide drafts
      arr = arr.filter((t) => t.status !== 'draft');

      // Assigned tab: keep only templates with assignees (client-side)
      if (selectedStatus === "Assigned") {
        arr = arr.filter(
          (t) =>
            (Array.isArray(t.assigned) && t.assigned.length > 0) ||
            (Array.isArray(t.assignees) && t.assignees.length > 0)
        );
      }

      // Sorting
      if (sortOrder === "A-Z") {
        arr.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortOrder === "Z-A") {
        arr.sort((a, b) => b.title.localeCompare(a.title));
      } else {
        arr.sort(
          (a, b) =>
            new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)
        );
      }

      setTemplates(arr);
    } catch (err) {
      setError(err.message || "Failed to fetch templates");
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

  // Table columns
  const columns = [
    { key: "title", label: "Template Name" },
    { key: "createdByName", label: "Assigned To", render: row =>
      Array.isArray(row.assignedNames) && row.assignedNames.length > 0
        ? row.assignedNames.filter(Boolean).join(", ")
        : row.createdByName || row.created_by_name || "-" },
    {
      key: "status",
      label: "Status",
      render: row => {
        let type = "-";
        if (row.status === "approved") type = "Approved";
        else if (row.status === "pending") type = "Pending";
        else if (row.status === "assigned") type = "Draft";
        else if (row.status === "published") type = "Published";
        else if (row.status === "rejected") type = "Rejected";
        else if (row.status === "returned") type = "Returned";
        return <StatusBadge type={type} />;
      }
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          onClick={() =>
            navigate(`/templates/${row._id || row.id}`, {
              state: { from: "dean-templates", template: row },
            })
          }
          className="text-white hover:text-white font-medium transition-colors rounded-sm bg-blue-500 h-7 w-15 duration-200"
        >
          View
        </button>
      )
    }
  ];

  function getEllipsedPages(current, total, siblings = 1) {
    const pages = [];
    const start = Math.max(2, current - siblings);
    const end = Math.min(total - 1, current + siblings);
    pages.push(1);
    if (start > 2) pages.push("…");
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < total - 1) pages.push("…");
    if (total > 1) pages.push(total);
    return Array.from(new Set(pages)).filter(p => (p >= 1 && p <= total) || p === "…");
  }

  return (
    <div className="h-screen bg-gray-200 flex flex-col overflow-hidden">
      <Header user={user} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar user={user} active="Templates" />
        <main className="flex-1 bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-1 py-3">
            <h1 className="text-3xl font-bold text-black-800 tracking-widest uppercase mt-4">
              Templates
            </h1>
            <div className="w-30 h-1 bg-yellow-400 mt-1 rounded" />
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-end">
            {/* Archived Documents */}
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

            {/* Search */}
            <div className="flex justify-start lg:justify-end">
              <div className="flex items-center gap-2">
                <div className="w-64">
                  <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
              <Dropdown
                options={["All", ...Object.keys(schoolIdentifiers)]}
                value={selectedSchool}
                onChange={setSelectedSchool}
                width="w-50"
              />
              <Dropdown
                options={["Recent", "A-Z", "Z-A"]}
                value={sortOrder}
                onChange={setSortOrder}
                width="w-36"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-4 border-b border-gray-200">
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedStatus(tab)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    selectedStatus === tab
                      ? "border-[#003DA5] text-[#003DA5]"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Table + Pagination area: fills remaining height */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {loading ? (
              <div className="flex-1 flex justify-center items-center">
                <Loader message="Loading templates..." />
              </div>
            ) : error ? (
              <div className="flex-1 flex justify-center items-center text-red-500">
                {error}
              </div>
            ) : (
              <div className="flex-1 mb-4 overflow-hidden">
                <Table columns={columns} data={templates} fillHeight />
              </div>
            )}

            {/* Pagination */}
            <div className="flex justify-center items-center gap-2 mt-auto pt-2">
              <button
                onClick={pagination.handlePrev}
                disabled={pagination.currentPage === 1}
                className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Prev
              </button>
              {getEllipsedPages(pagination.currentPage, totalPages, 1).map((num, idx) =>
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
                disabled={pagination.currentPage === totalPages}
                className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Assignment Modal */}
      {isAssignmentModalOpen && (
        <div className="fixed inset-0 z-50 inset-0 bg-opacity-30 backdrop-blur-[2px] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <TaskAssignmentModal
              templateId={selectedTemplateId}
              isOpen={isAssignmentModalOpen}
              onClose={() => setIsAssignmentModalOpen(false)}
              onAssign={(result) => {
                console.log('Assignment created:', result);
                fetchTemplates();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
