import Table from '../../components/table';
import { useState, useEffect } from "react";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import Dropdown from "../../components/dropdowns/dropdown";
import usePagination from "../../hooks/usePagination";
import SearchBar from "../../components/searchbar";
import { fetchTemplatesAPI } from '../../api/documentContollerAPI';
import { StatusBadge,formatDateTime } from '../../utils/formatters.jsx';
import Loader from '../../components/loader';
import { useNavigate } from "react-router-dom"; 
import TaskAssignmentModal from '../../components/modals/taskAssignmentModal.jsx';
import {FileText} from "lucide-react";

export default function SecretaryTemplates() {
  const user = useUser();
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("Recent");
  const PAGE_SIZE = 10;
  const pagination = usePagination(totalPages, 1);
  const tabs = ["All","Published", "Pending Approvals", "Approved", "On Going", "Late"];
  const navigate = useNavigate();
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  

  // Map tabs to status values for API
  const tabToStatus = {
    "Pending Approvals": "Pending Approval",
    "Approved": "Approved",
    "On Going": "Draft",
    "Published": "Published"
  };

  // Fetch templates from API
  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTemplatesAPI({
        user,
        selectedSchool,
        selectedStatus: tabToStatus[selectedStatus] || selectedStatus,
        search,
        PAGE_SIZE,
        currentPage: pagination.currentPage
      });
      let templatesArray = [];
      if (res.success && res.data?.templates) {
        templatesArray = res.data.templates;
        setTotalPages(res.data.pagination.total_pages || 1);
      } else if (res.templates) {
        templatesArray = res.templates;
        setTotalPages(1);
      } else if (Array.isArray(res)) {
        templatesArray = res;
        setTotalPages(1);
      }
      // Hide drafts
      templatesArray = templatesArray.filter((t) => t.status !== 'draft');
    
      if (selectedStatus === 'Late') {
        const now = new Date();
        templatesArray = templatesArray.filter(t => {
          if (!t.deadline) return false;
          const deadlineDate = new Date(t.deadline);
          return t.status === 'draft' && deadlineDate < now;
        });
      }
      // Sorting
      if (sortOrder === 'A-Z') {
        templatesArray.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortOrder === 'Z-A') {
        templatesArray.sort((a, b) => b.title.localeCompare(a.title));
      } else if (sortOrder === 'Recent') {
        templatesArray.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
      }
      setTemplates(templatesArray);
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
    { key: "deadline", label: "Deadline", render: row => row.deadline ? formatDateTime(row.deadline) : "No Deadline set" },
    {
      key: "status",
      label: "Status",
      render: row => {
        let type = "-";

        if (row.status === "approved") {
          type = "Approved";
        } else if (row.status === "pending") {
          type = "Pending";
        } else if (row.status === "assigned") {
          if (row.deadline) {
            const now = new Date();
            const deadlineDate = new Date(row.deadline);
            if (!isNaN(deadlineDate.getTime()) && deadlineDate < now) {
              type = "Late";
            } else {
              type = "OnGoing";
            }
          } else {
            type = "OnGoing";
          }
        } else if (row.status === "published") {
          type = "Published";
        } 
        else if (row.status === "rejected") {
          type = "Rejected";
        } 
        else if (row.status === "returned") {
          type = "Returned";
        }

        return <StatusBadge type={type} />;
      }
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          onClick={() =>
            navigate(`/templates/${row._id || row.id || "placeholder"}`, {
              state: { from: "secretary-templates", doc: row },
            })
          }
          className="text-white hover:text-white font-medium transition-colors rounded-sm bg-blue-500 h-7 w-15 duration-200"
        >
          View
        </button>
      )
    }
  ];

  // School identifiers
  const schoolIdentifiers = {
    'University Wide': 'VAA',
    'SAMCIS': 'SMI',
    'STELA': 'STL',
  };

  // Use fetched data directly 
  const currentData = templates;

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Templates" />
       <main className="flex-1 bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
        {/* Header */}
        <div className="px-1 py-3">
          <h1 className="text-3xl font-bold text-black-800 tracking-widest uppercase mt-4">Templates</h1>
          <div className="w-30 h-1 bg-yellow-400 mt-1 rounded" />
        </div>

        {/* Controls Section */}
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
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

       <div className="mb-6 border-b border-gray-200">
          <button
            onClick={() => setIsAssignmentModalOpen(true)}
            className="bg-blue-700 text-white px-5 py-2 rounded font-semibold text-sm flex items-center gap-2 focus:outline-none focus:ring-0 hover:bg-blue-800"
          >
            <FileText className="h-5 w-5" />
            <span>Assign Templates</span>
          </button>

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
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader message='Loading templates...'/>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center py-20 text-red-500">{error}</div>
        ) : (
          <div className="mb-6">
            <Table columns={columns} data={templates} />
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-center items-center gap-2 mt-auto pt-4">
          <button
            onClick={pagination.handlePrev}
            disabled={pagination.currentPage === 1}
            className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
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
