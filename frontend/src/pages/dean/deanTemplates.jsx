import Table from '../../components/table';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import SearchBar from "../../components/searchBar";
import Dropdown from "../../components/dropdown";
import usePagination from "../../hooks/usePagination";
import { formatDate, StatusBadge } from '../../utils/formatters.jsx';
import Loader from '../../components/loader';
import { fetchTemplatesAPI as fetchDeanTemplatesAPI, approveTemplateAPI } from "../../api/documentContollerAPI";

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
      // Pass only dean-relevant statuses to the API
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

      // Assigned tab: keep only templates with assignees (client-side)
      if (selectedStatus === "Assigned") {
        arr = arr.filter(
          (t) =>
            (Array.isArray(t.assigned) && t.assigned.length > 0) ||
            (Array.isArray(t.assignees) && t.assignees.length > 0)
        );
      }

      // Sorting (same as your other pages)
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

  // Table columns (Secretary look; Dean actions)
  const columns = [
    { key: "title", label: "Template Name" },
    {
      key: "document_code",
      label: "Document Code",
      render: (row) => row.document_code || "-",
    },
    {
      key: "createdByName",
      label: "Created By",
      render: (row) => row.createdByName || row.created_by_name || "-",
    },
    {
      key: "school",
      label: "School",
      render: (row) => {
        const code = row.document_code || "";
        const match = code.match(/^FM-([A-Z]+)-/);
        if (match) {
          const codePart = match[1];
          const name = Object.keys(schoolIdentifiers).find(
            (k) => schoolIdentifiers[k] === codePart
          );
          return name || codePart;
        }
        return "-";
      },
    },
    {
      key: "deadline",
      label: "Deadline",
      render: (row) => (row.deadline ? formatDate(row.deadline) : "No Deadline set"),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        // Render friendly status; Dean monitors Pending/Approved best here
        let type = "-";
        if (row.status === "approved") type = "Approved";
        else if (row.status === "pending") type = "Pending";
        else if (row.status === "draft") type = "Draft";
        else if (row.status === "published") type = "Published"; // may appear in data; not tabbed
        return <StatusBadge type={type} />;
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() =>
              navigate(`/dean/templates/${row._id || row.id || "placeholder"}`, {
                state: { from: "dean-templates", template: row },
              })
            }
            className="text-white font-medium transition-colors rounded-sm bg-blue-500 hover:bg-blue-600 h-7 px-3"
          >
            View
          </button>
          <button
            onClick={() =>
              navigate(`/dean/templates/${row._id || row.id || "placeholder"}/assign`, {
                state: { from: "dean-templates", template: row },
              })
            }
            className="text-white font-medium transition-colors rounded-sm bg-indigo-500 hover:bg-indigo-600 h-7 px-3"
          >
            Assign
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Templates" />
        <main className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          {/* Header */}
          <div className="flex-1 px-1 py-3">
            <h1 className="text-3xl font-bold text-black-800 tracking-widest uppercase mt-4">
              Templates
            </h1>
            <div className="w-30 h-1 bg-yellow-400 mt-1 rounded" />
          </div>

          {/* Controls (right-aligned like Secretary) */}
          <div className="flex items-center justify-end gap-2 mb-4">
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
            <div className="w-64">
              <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Dean-only tabs */}
          <div className="mb-6 border-b border-gray-200">
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

          {/* Body */}
          {loading ? (
            <Loader />
          ) : error ? (
            <div className="flex justify-center items-center h-40 text-red-500">{error}</div>
          ) : (
            <Table columns={columns} data={templates} />
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
        </main>
      </div>
    </div>
  );
}