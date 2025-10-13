import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../layout/headers/header.jsx"; 
import useUser from "../hooks/useUser";
import PublishedCard from "../components/cards/publishedCard";
import SearchBar from "../components/searchbar";
import Dropdown from "../components/dropdowns/dropdown";
import usePagination from "../hooks/usePagination";
import { fetchPublishedTemplatesAPI } from "../api/documentContollerAPI";
import { History, FileText, RotateCcw, Filter } from "lucide-react";

export default function SelectTemplate() {
  const navigate = useNavigate();
  const user = useUser();

  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("Recent");
  const [selectedSchool, setSelectedSchool] = useState("All");
  
  // New filters for version history
  const [selectedDocumentCode, setSelectedDocumentCode] = useState("All");
  const [selectedRevision, setSelectedRevision] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  // Extract unique document codes and revisions from templates
  const [documentCodes, setDocumentCodes] = useState([]);
  const [revisionNumbers, setRevisionNumbers] = useState([]);

  const PAGE_SIZE = 10;
  const pagination = usePagination(totalPages, 1);

  const schoolIdentifiers = {
    "University Wide": "VAA",
    SAMCIS: "SMI",
    STELA: "STL",
  };

  // Extract unique document codes and revision numbers
  useEffect(() => {
    const codes = [...new Set(templates.map(t => t.document_code).filter(Boolean))].sort();
    const revisions = [...new Set(templates.map(t => {
      const rev = t.revision_number ?? t.revision_no;
      return rev !== undefined && rev !== null ? String(rev).padStart(2, '0') : null;
    }).filter(Boolean))].sort();
    
    setDocumentCodes(codes);
    setRevisionNumbers(revisions);
  }, [templates]);

  // Apply client-side filtering for document code and revision
  useEffect(() => {
    let filtered = [...templates];

    // Filter by document code
    if (selectedDocumentCode !== "All") {
      filtered = filtered.filter(t => t.document_code === selectedDocumentCode);
    }

    // Filter by revision number
    if (selectedRevision !== "All") {
      filtered = filtered.filter(t => {
        const rev = t.revision_number ?? t.revision_no;
        const revStr = rev !== undefined && rev !== null ? String(rev).padStart(2, '0') : '';
        return revStr === selectedRevision;
      });
    }

    setFilteredTemplates(filtered);
  }, [templates, selectedDocumentCode, selectedRevision]);

  useEffect(() => {
    let ignore = false;
    const fetchPublished = async () => {
      setLoading(true);
      try {
        const params = {
          limit: PAGE_SIZE,
          page: pagination.currentPage,
        };
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
      } catch (e) {
        if (!ignore) {
          setTemplates([]);
          setTotalPages(1);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchPublished();
    return () => {
      ignore = true;
    };
  }, [selectedSchool, search, sortOrder, pagination.currentPage]);

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
    search.trim() !== ""
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Global App Header
       <div className="sticky top-0 z-50 bg-[#f3f3f3] shadow-sm">
      <Header user={user} />
        </div> */}
      {/* Page Subheader */}
      <div className="bg-white border-b shadow-sm mt-4 md:mt-6 sticky top-0 z-50">
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/documents")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
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
              Back
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
        </div>
      </div>

      {/* Enhanced Controls */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-8 py-4">
          {/* Top Row - Main Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
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
              
              {/* Version History Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all font-medium ${
                  showFilters 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
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

            <div className="w-full sm:w-auto sm:min-w-[300px]">
              <SearchBar
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, code, or description..."
              />
            </div>
          </div>

          {/* Version History Filters Panel */}
          {showFilters && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
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
                {/* Document Code Filter */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    <FileText className="w-4 h-4" />
                    Document Code
                  </label>
                  <select
                    value={selectedDocumentCode}
                    onChange={(e) => setSelectedDocumentCode(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="All">All Document Codes</option>
                    {documentCodes.map(code => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedDocumentCode === "All" 
                      ? `${documentCodes.length} unique document codes available`
                      : `Showing versions of ${selectedDocumentCode}`
                    }
                  </p>
                </div>

                {/* Revision Number Filter */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    <RotateCcw className="w-4 h-4" />
                    Revision Number
                  </label>
                  <select
                    value={selectedRevision}
                    onChange={(e) => setSelectedRevision(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="All">All Revisions</option>
                    {revisionNumbers.map(rev => (
                      <option key={rev} value={rev}>Revision {rev}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedRevision === "All" 
                      ? `${revisionNumbers.length} revision versions available`
                      : `Showing revision ${selectedRevision} only`
                    }
                  </p>
                </div>
              </div>

              {/* Active Filters Summary */}
              {activeFiltersCount > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-medium text-gray-600">Active filters:</span>
                    {selectedDocumentCode !== "All" && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                        Code: {selectedDocumentCode}
                      </span>
                    )}
                    {selectedRevision !== "All" && (
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                        Rev: {selectedRevision}
                      </span>
                    )}
                    {selectedSchool !== "All" && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                        School: {selectedSchool}
                      </span>
                    )}
                    {search.trim() && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        Search: "{search}"
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="px-8 py-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filteredTemplates.length}</span> of{" "}
            <span className="font-semibold text-gray-900">{templates.length}</span> templates
          </div>
        </div>
      </div>

   {/* Template Grid */}
      <div className="px-8 py-4">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto" />
            <p className="mt-4 text-gray-600 font-medium">Loading templates…</p>
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
                : "No published template versions are available"
              }
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
          const revisionNo = t.revision_number ?? t.revision_no;
          const displayRev = revisionNo !== undefined && revisionNo !== null 
            ? String(revisionNo).padStart(2, '0') 
            : 'N/A';
          
          return (
            <PublishedCard
              key={id}
              template={t}
              user={user}
              onSelect={() => {
                const id = t._id || t.id;
                navigate(`/templates/published/${id}`, {
                  state: {
                    doc: t,
                    sidebarActive: "Templates",
                    backTo: "/documents",
                  },
                });
              }}
            />
          );
        })}
      </div>
        )}
      </div>

      {/* Pagination */}
      <div className="px-8 py-6 border-t bg-white flex justify-center items-center gap-2">
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
  );
}