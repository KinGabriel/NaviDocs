import React, { useState, useEffect } from "react"; // <-- add useState, useEffect
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Header from "../layout/header";
import Sidebar from "../layout/sidebar";
import useUser from "../hooks/useUser";
import SearchBar from "../components/searchBar";
import Dropdown from "../components/dropdowns/dropdown";
import TemplateCard from "../components/templatecard";
import usePagination from "../hooks/usePagination";
import { fetchTemplatesAPI } from "../api/documentContollerAPI";
import RenameDocumentModal from "../components/modals/RenameDocumentModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function renameDocumentAPI(id, title) {
  const res = await axios.patch(
    `${API_URL}/api/documents/${id}`,
    { title },
    { withCredentials: true }
  );
  return res.data;
}

export default function GlobalTemplates() {
  const user = useUser();
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const pagination = usePagination(totalPages, 1);

  const [selectedSchool, setSelectedSchool] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("Recent");

  const navigate = useNavigate();

  const [openMenuId, setOpenMenuId] = useState(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameSubmitting, setRenameSubmitting] = useState(false);
  const [renameError, setRenameError] = useState("");
  const [activeDoc, setActiveDoc] = useState(null);

  const schoolIdentifiers = {
    "University Wide": "VAA",
    SAMCIS: "SMI",
    STELA: "STL",
  };

  const statusOptions = ["All", "Draft", "Pending Approval", "Approved", "Published"];
  const PAGE_SIZE = 8;

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await fetchTemplatesAPI({
        user,
        selectedSchool,
        selectedStatus,
        search,
        PAGE_SIZE,
        currentPage: pagination.currentPage,
      });

      let templatesArray = [];
      if (result.success && result.data?.templates) {
        templatesArray = result.data.templates;
        setTotalPages(result.data.pagination.total_pages || 1);
      } else if (result.templates) {
        templatesArray = result.templates;
        setTotalPages(1);
      } else if (Array.isArray(result)) {
        templatesArray = result;
        setTotalPages(1);
      }

      if (sortOrder === "A-Z") templatesArray.sort((a, b) => a.title.localeCompare(b.title));
      if (sortOrder === "Z-A") templatesArray.sort((a, b) => b.title.localeCompare(a.title));
      if (sortOrder === "Recent")
        templatesArray.sort(
          (a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)
        );

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
  }, [user, selectedSchool, selectedStatus, search, sortOrder, pagination.currentPage]);

  const openRename = (doc) => {
    setActiveDoc(doc);
    setRenameError("");
    setRenameOpen(true);
  };

  const handleRenameSubmit = async (newTitle) => {
    if (!activeDoc?._id) return;
    setRenameSubmitting(true);
    setRenameError("");
    try {
      await renameDocumentAPI(activeDoc._id, newTitle);
      // optimistic local update
      setTemplates((prev) =>
        prev.map((t) =>
          (t._id || t.id) === activeDoc._id ? { ...t, title: newTitle } : t
        )
      );
      setRenameOpen(false);
      setActiveDoc(null);
    } catch (e) {
      setRenameError(e?.response?.data?.message || "Failed to rename document.");
    } finally {
      setRenameSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Documents" /> {/* <-- switch to Documents */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <div className="flex-1 px-1 py-5">
            <h1 className="text-3xl font-bold text-black-800 tracking-widest uppercase mt-3">
              DOCUMENTS
            </h1>
            <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />

          <div className="flex items-center justify-between gap-2 mb-4">
             {/* Select Template Button */}
              <div className="flex-1 flex justify-start ml-1">
                <button
                  onClick={() => navigate("/templates")}
                  className="flex items-center gap-2 bg-[#0035DA] hover:bg-[#043485] text-white font-semibold px-5 py-2 rounded shadow transition-colors"
                >
              {/* plus icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Select Template
                </button>
              </div>

             {/* Controls */}
             <div className="flex items-center gap-2">
               {/* School Filter */}
               <Dropdown
                 options={["All", ...Object.keys(schoolIdentifiers)]}
                 value={selectedSchool}
                 onChange={setSelectedSchool}
                 width="w-50"
               />
   
               {/* Sort Order */}
               <Dropdown
                 options={["Recent", "A-Z", "Z-A"]}
                 value={sortOrder}
                 onChange={setSortOrder}
                 width="w-36"
               />
   
               {/* Search Bar */}
               <div className="w-64">
                 <SearchBar
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   placeholder="Search templates..."
                 />
               </div>
             </div>   
            </div>        

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {loading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-gray-600">No templates found</p>
                </div>
              ) : (
                templates.map((template, i) => {
                  const id = template._id || i;
                  return (
                    <div
                      key={id}
                      className="relative group"
                      onClick={() =>
                        navigate(`/documents/${id}`, {
                          state: {
                            doc: template,
                            sidebarActive: "Documents",
                            backTo: "/documents",
                          },
                        })
                      }
                    >
                      {/* 3-dots button */}
                      <button
                        className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-1.5 bg-white/90 shadow hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((cur) => (cur === id ? null : id));
                        }}
                        aria-label="Open menu"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 3a2 2 0 110 4 2 2 0 010-4zm0 5a2 2 0 110 4 2 2 0 010-4zm0 5a2 2 0 110 4 2 2 0 010-4z" />
                        </svg>
                      </button>

                      {/* Context menu */}
                      {openMenuId === id && (
                        <div
                          className="absolute right-2 top-9 z-20 w-40 rounded-md border bg-white shadow-md"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            onClick={() => {
                              setOpenMenuId(null);
                              openRename(template);
                            }}
                          >
                            Rename
                          </button>
                          {/* add more menu items here if needed */}
                        </div>
                      )}

                      <TemplateCard template={template} user={user} onSelect={() => {}} />
                    </div>
                  );
                })
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

      {/* Rename modal */}
      <RenameDocumentModal
        open={renameOpen}
        onClose={() => { setRenameOpen(false); setActiveDoc(null); }}
        currentTitle={activeDoc?.title}
        submitting={renameSubmitting}
        error={renameError}
        onSubmit={handleRenameSubmit}
      />
      
    </div>
  );
}
