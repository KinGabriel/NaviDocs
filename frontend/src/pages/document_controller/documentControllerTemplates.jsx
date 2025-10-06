import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import Header from '../../layout/headers/header'; 
import Sidebar from '../../layout/sidebars/sidebar';
import useUser from '../../hooks/useUser'; 
import SearchBar from '../../components/searchbar';
import Dropdown from '../../components/dropdowns/dropdown';
import TemplateCard from '../../components/cards/templatecard';
import CreateTemplateModal from '../../components/modals/createTemplateModal';
import usePagination from '../../hooks/usePagination';
import { fetchTemplatesAPI, createTemplateAPI, approveTemplateAPI, publishTemplateAPI } from '../../api/documentContollerAPI';

export default function DocumentControllerTemplates() {
  const user = useUser();
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const pagination = usePagination(totalPages, 1);
  
  //  status filtering state
  const [selectedSchool, setSelectedSchool] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortOrder, setSortOrder] = useState('Recent');
  
  const navigate = useNavigate(); 

  // School identifiers for filtering, sorting, and modal
  const schoolIdentifiers = {
    'University Wide': 'VAA',
    'SAMCIS': 'SMI', 
    'STELA': 'STL',
  };

  // Status options for filtering
  const statusOptions = [
    'All',
    'Draft',
    'Pending Approval', 
    'Approved',
    'Published'
  ];

  const handleCreateTemplate = () => {
    setShowCreateModal(true);
  };

  const handleModalSubmit = async (templateFormData) => {
    setLoading(true);
    try {
      const templateData = {
        title: templateFormData.title.trim(),
        document_size: templateFormData.document_size,
        created_by: user._id || user.id,       
      };
      const result = await createTemplateAPI(templateData);
      if (!result || !result.template) {
        throw new Error(result?.message || 'Failed to create template');
      }
      setShowCreateModal(false);
      navigate(`/document-controller/create-template?templateId=${result.template._id}`);
    } catch (error) {
      console.error('Full error details:', error);
      alert(`Failed to create template: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const PAGE_SIZE = 8; // Number of templates per page

  //  Get templates
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
        currentPage: pagination.currentPage
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
      // Sorting
      if (sortOrder === 'A-Z') {
        templatesArray.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortOrder === 'Z-A') {
        templatesArray.sort((a, b) => b.title.localeCompare(a.title));
      } else if (sortOrder === 'Recent') {
        templatesArray.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
      }
      setTemplates(templatesArray);
    } catch (error) {
      setTemplates([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Inline approve handler
  const handleInlineApprove = async (template) => {
    if (!user) return;
    const role = (user.role || '').toLowerCase();
    if (!['secretary','dean'].includes(role)) return;
    try {
      const res = await approveTemplateAPI(template._id, role);
      // Update the specific template in list
      setTemplates(prev => prev.map(t => t._id === template._id ? { ...t, ...res.template, approvalMeta: res.approvalMeta || res.template?.approvalMeta } : t));
    } catch (e) {
      console.error('Approve failed', e);
      alert(e.response?.data?.message || 'Approve failed');
    }
  };

  // Inline publish handler
  const handleInlinePublish = async (template) => {
    try {
      const res = await publishTemplateAPI(template._id);
      setTemplates(prev => prev.map(t => t._id === template._id ? { ...t, ...res.template, approvalMeta: res.approvalMeta || res.template?.approvalMeta } : t));
    } catch (e) {
      console.error('Publish failed', e);
      alert(e.response?.data?.message || 'Publish failed');
    }
  };

  // Fetch templates when filters change
  useEffect(() => {
    fetchTemplates();
  }, [user, selectedSchool, selectedStatus, search, sortOrder, pagination.currentPage]);

  //  Re-sort when sort order changes
  useEffect(() => {
    if (templates.length > 0) {
      const sortedTemplates = [...templates];
      if (sortOrder === 'A-Z') {
        sortedTemplates.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortOrder === 'Z-A') {
        sortedTemplates.sort((a, b) => b.title.localeCompare(a.title));
      } else if (sortOrder === 'Recent') {
        sortedTemplates.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
      }
      setTemplates(sortedTemplates);
    }
  }, [sortOrder]);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Templates" />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <div className="flex-1 px-1 py-5">
            <h1 className="text-3xl font-bold text-black-800 tracking-widest uppercase mt-3">TEMPLATES</h1>
            <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />

          <div className="flex items-center justify-between gap-2 mb-4">
          {/* Create Template Button */}
          <button
            onClick={handleCreateTemplate}
            className="flex items-center gap-2 bg-[#0035DA] hover:bg-[#043485] text-white font-semibold px-5 py-2 rounded shadow transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Create Template
          </button>

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

            {/*  Status Toggle Buttons  */}
            <div className="flex gap-1 mb-4">
              {statusOptions.map((status) => {
                const getStatusStyle = (status, isSelected) => {
                  const baseStyle = "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 border";
                  
                  if (isSelected) {
                    return `${baseStyle} bg-blue-600 text-white border-blue-600 shadow-sm`;
                  } else {
                    return `${baseStyle} bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400`;
                  }
                };

                return (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={getStatusStyle(status, selectedStatus === status)}
                  >
                    {status}
                  </button>
                );
              })}
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {loading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-gray-600">No templates found</p>
                  {(selectedSchool !== 'All' || selectedStatus !== 'All' || search) && (
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
                  )}
                </div>
              ) : (
                templates.map((template, i) => (
                  <TemplateCard
                    key={template._id || i}
                    template={template}
                    user={user}
                    onApprove={handleInlineApprove}
                    onPublish={handleInlinePublish}
                    onSelect={() => navigate(`/document-controller/create-template?templateId=${template._id}`)}
                    onAssign={(updatedTemplate) => {
                      setTemplates(prev => prev.map(t => (t._id === updatedTemplate._id ? { ...t, ...updatedTemplate } : t)));
                    }}
                  />
                ))
              )}
            </div>

            {/*  Results Summary */}
            {templates.length > 0 && (
              <div className="mt-4 text-sm text-gray-600 text-center">
                Showing {templates.length} of {totalPages * PAGE_SIZE} template{templates.length !== 1 ? 's' : ''}
                {selectedSchool !== 'All' && ` for ${selectedSchool}`}
                {selectedStatus !== 'All' && ` with status: ${selectedStatus}`}
                {search && ` matching "${search}"`}
              </div>
            )}

            {/* Pagination Controls */}
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
                  <span key={idx} className="px-2 text-gray-400">...</span>
                ) : (
                  <button
                    key={num}
                    onClick={() => pagination.handlePage(num)}
                    className={`px-3 py-1 rounded border ${pagination.currentPage === num ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
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

      {/* Create Template Modal */}
      <CreateTemplateModal
        showModal={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleModalSubmit}
        loading={loading}
        schoolIdentifiers={schoolIdentifiers}
        user={user}
      />
    </div>
  );
}