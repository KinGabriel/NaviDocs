import React, { useState, useEffect } from "react"; // <-- add useState, useEffect
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Header from "../layout/headers/header";
import Sidebar from "../layout/sidebars/sidebar";
import useUser from "../hooks/useUser";
import SearchBar from "../components/searchbar";
import Dropdown from "../components/dropdowns/dropdown";
import DocumentCard from "../components/cards/documentcard";
import usePagination from "../hooks/usePagination";
import { fetchPublishedTemplatesAPI } from "../api/documentContollerAPI";
import { listDocumentsAPI, getDocumentByIdAPI } from "../api/documentsAPI";
import RenameDocumentModal from "../components/modals/renameModal";
import DeleteDocumentModal from "../components/modals/deleteDocumentModal";
import SelectTemplateModal from "../components/modals/selectTemplateModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameSubmitting, setRenameSubmitting] = useState(false);
  const [renameError, setRenameError] = useState("");
  const [activeDoc, setActiveDoc] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [selectOpen, setSelectOpen] = useState(false);
  const [publishedLoading, setPublishedLoading] = useState(false);
  const [publishedTemplatesCache, setPublishedTemplatesCache] = useState([]);

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
      const params = {
        limit: PAGE_SIZE,
        page: pagination.currentPage
      };
      if (selectedSchool && selectedSchool !== 'All') params.school = selectedSchool;
      if (selectedStatus && selectedStatus !== 'All') {
        const statusMap = {
          'Draft': 'draft',
          'Pending Approval': 'pending',
          'Approved': 'approved',
          'Published': 'published'
        };
        params.status = statusMap[selectedStatus] || selectedStatus;
      }
      if (search && search.trim()) params.search = search.trim();

      const result = await listDocumentsAPI(params);

      // backend returns { documents: [...] } (and may include pagination fields)
      let templatesArray = [];
      if (result && Array.isArray(result.documents)) {
        templatesArray = result.documents;
        // if backend includes pagination info, use it
        if (result.pagination && result.pagination.total_pages) setTotalPages(result.pagination.total_pages);
        else setTotalPages(1);
      } else if (result && result.success && Array.isArray(result.data?.templates)) {
        templatesArray = result.data.templates;
        setTotalPages(result.data.pagination?.total_pages || 1);
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

  const openDelete = (doc) => {
    setActiveDoc(doc);
    setDeleteError("");
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!activeDoc?._id) return;
    setDeleteSubmitting(true);
    setDeleteError("");
    try {
      await deleteDocumentAPI(activeDoc._id);
      // remove from grid
+      setTemplates((prev) => prev.filter((t) => (t._id || t.id) !== activeDoc._id));
      setDeleteOpen(false);
      setActiveDoc(null);
    } catch (e) {
      setDeleteError(e?.response?.data?.message || "Failed to delete document.");
    } finally {
      setDeleteSubmitting(false);
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
                  onClick={async () => {
                    // Trigger fetching published templates before opening modal
                    try {
                      setPublishedLoading(true);
                      const res = await fetchPublishedTemplatesAPI({ limit: PAGE_SIZE, page: 1 });
                      // Cache result for potential future use
                      if (res?.success && res.data?.templates) setPublishedTemplatesCache(res.data.templates);
                      else if (res?.templates) setPublishedTemplatesCache(res.templates);
                      else if (Array.isArray(res)) setPublishedTemplatesCache(res);
                    } catch (err) {
                      // ignore errors for now; modal will still open
                      console.error('Failed to fetch published templates:', err);
                    } finally {
                      setPublishedLoading(false);
                      setSelectOpen(true);
                    }
                  }}
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
                  <p className="text-gray-600">No Documents found</p>
                </div>
              ) : (
                templates.map((template, i) => {
                  const id = template._id || i;
                  return (
                    <DocumentCard
                      key={id}
                      document={template}
                      user={user}
                      onSelect={async () => {
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
                          console.error('Failed to fetch document by id', err);                      
                        } finally {
                          setLoading(false);
                        }
                      }}
                      onRename={() => openRename(template)}
                      onDelete={() => openDelete(template)}
                    />
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

      {/* Delete modal */}
      <DeleteDocumentModal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setActiveDoc(null); }}
        documentTitle={activeDoc?.title}
        submitting={deleteSubmitting}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
      />

      {/* Select Template modal (Published templates) */}
      <SelectTemplateModal
        open={selectOpen}
        onClose={() => setSelectOpen(false)}
        user={user}
        onPickTemplate={(tpl) => {
          setSelectOpen(false);
          const id = tpl._id || tpl.id;
          // Navigate to the published template view and pass the template as state
          navigate(`/templates/published/${id}`, {
            state: {
              doc: tpl,
              sidebarActive: "Templates",
              backTo: "/documents",
            },
          });
        }}
      />
      
    </div>
  );
}
