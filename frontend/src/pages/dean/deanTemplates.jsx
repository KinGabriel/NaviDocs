import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import SearchBar from "../../components/searchBar";
import Dropdown from "../../components/dropdown";
import TemplateCard from "../../components/templatecard";
import usePagination from "../../hooks/usePagination";
import { fetchTemplatesAPI as fetchDeanTemplatesAPI, approveTemplateAPI } from "../../api/documentContollerAPI";

export default function DeanTemplates() {
  const user = useUser();
  const navigate = useNavigate();

  // UI/filter state
  const [search, setSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("Recent");

  // data state
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // pagination
  const PAGE_SIZE = 8;
  const [totalPages, setTotalPages] = useState(1);
  const pagination = usePagination(totalPages, 1);

  // filters (same keys as controller page)
  const schoolIdentifiers = {
    "University Wide": "VAA",
    SAMCIS: "SMI",
    STELA: "STL",
  };

  const statusOptions = ["All", "Assigned", "Draft", "Pending Approval", "Approved", "Published"];

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const statusParam = selectedStatus === "Assigned" ? "All" : selectedStatus;
      const result = await fetchDeanTemplatesAPI({
        user,
        selectedSchool,
        selectedStatus: statusParam,
        search,
        PAGE_SIZE,
        currentPage: pagination.currentPage,
      });

      let arr = [];
      if (result.success && result.data?.templates) {
        arr = result.data.templates;
        setTotalPages(result.data.pagination.total_pages || 1);
      } else if (result?.templates) {
        arr = result.templates;
        setTotalPages(1);
      } else if (Array.isArray(result)) {
        arr = result;
        setTotalPages(1);
      }

      // If Assigned tab: keep only templates that already have assignees
      if (selectedStatus === "Assigned") {
        arr = arr.filter(
          (t) => (Array.isArray(t.assigned) && t.assigned.length > 0) ||
                 (Array.isArray(t.assignees) && t.assignees.length > 0)
        );
      }

      // sort
      if (sortOrder === "A-Z") arr.sort((a, b) => a.title.localeCompare(b.title));
      else if (sortOrder === "Z-A") arr.sort((a, b) => b.title.localeCompare(a.title));
      else arr.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));

      setTemplates(arr);
    } catch (e) {
      console.error(e);
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

  // keep resorting if user changes order (no refetch needed)
  useEffect(() => {
    if (!templates.length) return;
    const sorted = [...templates];
    if (sortOrder === "A-Z") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortOrder === "Z-A") sorted.sort((a, b) => b.title.localeCompare(a.title));
    else sorted.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
    setTemplates(sorted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder]);

  // View + Assign
  const handleView = (template) => navigate(`/dean/templates/${template._id || template.id}`);
  const handleAssign = (template) =>
    navigate(`/dean/templates/${template._id || template.id}/assign`, {
      state: { from: "dean-templates", template },
    });

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Templates" />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <div className="flex-1 px-1 py-5">
            <h2 className="text-3xl font-bold tracking-widest uppercase mt-3">TEMPLATES</h2>
            <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />

            {/* Filter | Sort | Search */}
            <div className="flex items-center gap-2 mb-4">
              <Dropdown
                options={["All", ...Object.keys(schoolIdentifiers)]}
                value={selectedSchool}
                onChange={setSelectedSchool}
                width="w-44"
                label="Filter by"
                buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
              />
              <Dropdown
                options={["Recent", "A-Z", "Z-A"]}
                value={sortOrder}
                onChange={setSortOrder}
                width="w-36"
                label="Sort by"
                buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
              />
              <div className="flex-1 md:ml-auto w-full md:w-80">
                <SearchBar
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                />
              </div>
            </div>

            {/* status chips */}
            <div className="flex gap-1 mb-4">
              {statusOptions.map((status) => {
                const selected = selectedStatus === status;
                const base = "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 border";
                const cls = selected
                  ? `${base} bg-blue-600 text-white border-blue-600 shadow-sm`
                  : `${base} bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400`;
                return (
                  <button key={status} className={cls} onClick={() => setSelectedStatus(status)}>
                    {status}
                  </button>
                );
              })}
            </div>

            {/* Templates Grid (view-only) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {loading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                  <p className="mt-2 text-gray-600">Loading templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-gray-600">No templates found</p>
                  {(selectedSchool !== "All" || selectedStatus !== "All" || search) && (
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
                  )}
                </div>
              ) : (
                templates.map((template, i) => (
                  <div key={template._id || template.id || i} className="group">
                    <TemplateCard
                      template={template}
                      user={user}
                      onSelect={() => handleView(template)}
                    />
                    {/* Actions under each card */}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleView(template)}
                        className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleAssign(template)}
                        className="px-3 py-1 rounded bg-[#0035DA] text-white hover:bg-[#043485]"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

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
                      pagination.currentPage === num ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
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
    </div>
  );
}