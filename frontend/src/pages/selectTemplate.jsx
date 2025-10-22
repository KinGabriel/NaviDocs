import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../layout/headers/header";
import useUser from "../hooks/useUser";
import PublishedCard from "../components/cards/publishedCard"; 
import SearchBar from "../components/searchbar";
import Dropdown from "../components/dropdowns/dropdown";
import usePagination from "../hooks/usePagination";
import { fetchPublishedTemplatesAPI, unpublishTemplateAPI } from "../api/documentContollerAPI";
import { History, FileText, RotateCcw, SlidersHorizontal, FileDigit, FileCode, X } from "lucide-react";
import Loader from "../components/loader";  

export default function SelectTemplate() {
  const navigate = useNavigate();
  const user = useUser(); 

  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("Recent");
  const [selectedSchool, setSelectedSchool] = useState("All");
  const [selectedDocumentCode, setSelectedDocumentCode] = useState("All");
  const [selectedRevision, setSelectedRevision] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [documentCodes, setDocumentCodes] = useState([]);
  const [revisionNumbers, setRevisionNumbers] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const PAGE_SIZE = 10;
  const pagination = usePagination(totalPages, 1);
  const schoolIdentifiers = {
    "University Wide": "VAA",
    SAMCIS: "SMI",
    STELA: "STL",
  };

  // Extract unique codes & revisions
  useEffect(() => {
    const codes = [...new Set(templates.map(t => t.document_code).filter(Boolean))].sort();
    const revisions = [...new Set(
      templates
        .map(t => {
          const rev = t.revision_number ?? t.revision_no;
          return rev !== undefined && rev !== null ? String(rev).padStart(2, "0") : null;
        })
        .filter(Boolean)
    )].sort();

    setDocumentCodes(codes);
    setRevisionNumbers(revisions);
  }, [templates]);

  // Apply client-side filters
  useEffect(() => {
    let filtered = [...templates];

    if (selectedDocumentCode !== "All") {
      filtered = filtered.filter(t => t.document_code === selectedDocumentCode);
    }
    if (selectedRevision !== "All") {
      filtered = filtered.filter(t => {
        const rev = t.revision_number ?? t.revision_no;
        const revStr = rev !== undefined && rev !== null ? String(rev).padStart(2, "0") : "";
        return revStr === selectedRevision;
      });
    }

    setFilteredTemplates(filtered);
  }, [templates, selectedDocumentCode, selectedRevision]);

  // Fetch templates
  useEffect(() => {
  let ignore = false;
  const fetchPublished = async () => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, page: pagination.currentPage };
      if (selectedSchool && selectedSchool !== "All") params.school = selectedSchool;
      if (search && search.trim()) params.search = search.trim();

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

      if (sortOrder === "A-Z") arr.sort((a, b) => a.title.localeCompare(b.title));
      if (sortOrder === "Z-A") arr.sort((a, b) => b.title.localeCompare(a.title));
      if (sortOrder === "Recent") {
        arr.sort(
          (a, b) =>
            new Date(b.createdAt || b.created_at) -
            new Date(a.createdAt || a.created_at)
        );
      }

      if (!ignore) setTemplates(arr);
    } catch {
      if (!ignore) {
        setTemplates([]);
        setTotalPages(1);
      }
    } finally {
      if (!ignore) setLoading(false);
    }
  };

  fetchPublished();
  return () => { ignore = true; };
}, [selectedSchool, search, sortOrder, pagination.currentPage, refreshTrigger]); 

const handleAssign = (updatedTemplate) => {
  // Update the template in the local state
  setTemplates(prev => prev.map(t => 
    (t._id || t.id) === (updatedTemplate._id || updatedTemplate.id) 
      ? updatedTemplate 
      : t
  ));
  setFilteredTemplates(prev => prev.map(t => 
    (t._id || t.id) === (updatedTemplate._id || updatedTemplate.id) 
      ? updatedTemplate 
      : t
  ));
};

const handleUnpublish = async (templateId) => {
  try {
    await unpublishTemplateAPI(templateId);
    // Refresh the templates list
    setRefreshTrigger(prev => prev + 1);
    return { success: true };
  } catch (err) {
    console.error('Unpublish error:', err);
    throw err;
  }
};
  // Reset filters
  const handleResetFilters = () => {
    setSelectedDocumentCode("All");
    setSelectedRevision("All");
    setSelectedSchool("All");
    setSearch("");
  };

  const activeFiltersCount = [
    selectedDocumentCode !== "All",
    selectedRevision !== "All",
    selectedSchool !== "All",
    search.trim() !== "",
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      {/* Page Subheader */}
      <div className="bg-white border-b shadow-sm mt-2 md:mt-2">
        <div className="px-8 py-6">
          {/* Top row: title on left, ALL CONTROLS on right */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left: Back icon + Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/documents")}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Back"
                title="Back"
              >
                {/* icon-only */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="sr-only">Back</span>
              </button>

              <div className="border-l border-gray-300 h-8" />

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">Select Template</h1>
                </div>
                <p className="text-sm text-gray-600">
                  Choose a published template from Document Controller
                </p>
              </div>
            </div>

            {/* Right: ALL controls aligned right */}
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <div className="w-full sm:w-[300px]">
                <SearchBar
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, code, or description..."
                />
              </div>

              <Dropdown
                options={["All", ...Object.keys(schoolIdentifiers)]}
                value={selectedSchool}
                onChange={setSelectedSchool}
                width="w-48"
              />

              <Dropdown
                options={["Recent", "A-Z", "Z-A"]}
                value={sortOrder}
                onChange={setSortOrder}
                width="w-32"
              />

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all font-medium ${
                  showFilters
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {/* Version Filters toggle */}
                <SlidersHorizontal className="w-4 h-4" />
                Version Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-semibold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Version Filters panel */}
          {showFilters && (
            <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-2 mb-3">
               <History className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Version History Filters</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Filter documents by their document code and revision number to view version history
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Document Code */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    <FileCode className="w-4 h-4" />
                    Document Code
                  </label>
                  <select
                    value={selectedDocumentCode}
                    onChange={(e) => setSelectedDocumentCode(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="All">All Document Codes</option>
                    {documentCodes.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </div>

                {/* Revision Number */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    <FileDigit className="w-4 h-4" />
                    Revision Number
                  </label>
                  <select
                    value={selectedRevision}
                    onChange={(e) => setSelectedRevision(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="All">All Revisions</option>
                    {revisionNumbers.map((rev) => (
                      <option key={rev} value={rev}>Revision {rev}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Filters Tags */}
              {activeFiltersCount > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Active Filters:
                    </span>
                    
                    {selectedSchool !== "All" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        <span>School: {selectedSchool}</span>
                        <button
                          onClick={() => setSelectedSchool("All")}
                          className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                          aria-label="Remove school filter"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {selectedDocumentCode !== "All" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-200 text-purple-700 rounded-full text-xs font-medium">
                        <span>Code: {selectedDocumentCode}</span>
                        <button
                          onClick={() => setSelectedDocumentCode("All")}
                          className="hover:bg-violet-200 rounded-full p-0.5 transition-colors"
                          aria-label="Remove document code filter"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {selectedRevision !== "All" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        <span>Revision: {selectedRevision}</span>
                        <button
                          onClick={() => setSelectedRevision("All")}
                          className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                          aria-label="Remove revision filter"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {search.trim() !== "" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        <span>Search: "{search}"</span>
                        <button
                          onClick={() => setSearch("")}
                          className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                          aria-label="Remove search filter"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RESULTS SUMMARY*/}
      <div className="bg-white">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">
              Showing{" "}
              <span className="font-semibold text-gray-900">{filteredTemplates.length}</span> of{" "}
              <span className="font-semibold text-gray-900">{templates.length}</span> templates
            </div>
          </div>
        </div>
      </div>

      {/* TEMPLATE GRID  */}
      <div className="bg-white">
        <div className="px-8 py-4">
          {loading ? (
            <div className="text-center py-20">
              <Loader message="Loading published templates..." />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600 mb-4">
                {activeFiltersCount > 0
                  ? "Try adjusting your filters to see more results"
                  : "No published template versions are available"}
              </p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-5 gap-6">
            {filteredTemplates.map((t, i) => {
              const id = t._id || t.id || i;
              return (
                <PublishedCard
                  key={id}
                  template={t}
                  user={user}
                  onSelect={() => {
                    const tid = t._id || t.id;
                    navigate(`/templates/published/${tid}`, {
                      state: { doc: t, sidebarActive: "Templates", backTo: "/documents" },
                    });
                  }}
                  onAssign={handleAssign}
                  onUnpublish={handleUnpublish}
                />
              );
            })}
          </div>
          )}
        </div>
      </div>

      {/* PAGINATION  */}
      <div className="bg-white">
        <div className="px-8 py-6 border-t flex justify-center items-center gap-2">
          <button
            onClick={pagination.handlePrev}
            disabled={pagination.currentPage === 1}
            className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Prev
          </button>
          {pagination.getPageNumbers().map((num, idx) =>
            num === "..." ? (
              <span key={idx} className="px-2 text-gray-400">…</span>
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