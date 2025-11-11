import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'; 
import Header from '../../layout/headers/header'; 
import Sidebar from '../../layout/sidebars/sidebar';
import useUser from '../../hooks/useUser'; 
import SearchBar from '../../components/searchbar';
import Dropdown from '../../components/dropdowns/dropdown';
import TemplateCard from '../../components/cards/templatecard';
import CreateTemplateModal from '../../components/modals/createTemplateModal';
import usePagination from '../../hooks/usePagination';
import { fetchTemplatesAPI, createTemplateAPI, approveTemplateAPI, publishTemplateAPI } from '../../api/documentContollerAPI';
import toast from 'react-hot-toast';
import Loader from '../../components/loader';

export default function DocumentControllerTemplates() {
  const user = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const pagination = usePagination(totalPages, 1);
  
  // Status options for filtering
  const statusOptions = [
    'All',
    'Draft',
    'Pending Approval', 
    'Approved',
    'Published'
  ];

  // ⬇ derive initial selectedStatus from navigation state or ?status=
  const initialStatus =
    (statusOptions.includes(location.state?.status) && location.state.status) ||
    (statusOptions.includes(searchParams.get('status')) && searchParams.get('status')) || 'All';

  //  status filtering state
  const [selectedSchool, setSelectedSchool] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortOrder, setSortOrder] = useState('Recent');

  useEffect(() => {
    const fromState = location.state?.status;
    const fromQuery = searchParams.get('status');
    if (statusOptions.includes(fromState) && fromState !== selectedStatus) {
      setSelectedStatus(fromState);
    } else if (statusOptions.includes(fromQuery) && fromQuery !== selectedStatus) {
      setSelectedStatus(fromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, searchParams]);

  // School identifiers for filtering, sorting, and modal
  const schoolIdentifiers = {
    'University Wide': 'VAA',
    'SAMCIS': 'SMI', 
    'STELA': 'STL',
  };

  const handleCreateTemplate = () => {
    setShowCreateModal(true);
  };

  const handleModalSubmit = async (templateFormData) => {
    setLoading(true);
    try {
      // document size selector into a proper pageSetup object
      const sizeKey = String(templateFormData.document_size || 'A4').toLowerCase();
      const paperSize = sizeKey === 'letter' ? 'Letter' : sizeKey === 'legal' ? 'Legal' : 'A4';
      const templateData = {
        title: templateFormData.title.trim(),
        // Keep the original field for backward compatibility, but also provide structured pageSetup
        document_size: templateFormData.document_size,
        pageSetup: {
          paperSize,
          orientation: 'Portrait',
          margins: { top: 1, bottom: 1, left: 1, right: 1 },
        },
        created_by: user._id || user.id,
      };
      const result = await createTemplateAPI(templateData);
      if (!result || !result.template) {
        throw new Error(result?.message || 'Failed to create template');
      }
      toast.success('Template created successfully!');
      setShowCreateModal(false);
      navigate(`/document-controller/create-template?templateId=${result.template._id}`);
    } catch (error) {
      console.error('Full error details:', error);
      toast.error(`Failed to create template: ${error.message}`);
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
      const lastActivity = (t) => {
        return new Date(
          t.updatedAt || t.updated_at || t.status_meta?.last_activity_at || t.last_activity_at || t.createdAt || t.created_at || 0
        ).getTime();
      };
      if (sortOrder === 'A-Z') {
        templatesArray.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortOrder === 'Z-A') {
        templatesArray.sort((a, b) => b.title.localeCompare(a.title));
      } else if (sortOrder === 'Recent') {
        templatesArray.sort((a, b) => lastActivity(b) - lastActivity(a));
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
      setTemplates(prev => prev.map(t => t._id === template._id ? { ...t, ...res.template, approvalMeta: res.approvalMeta || res.template?.approvalMeta } : t));
      toast.success('Template approved!');
    } catch (e) {
      console.error('Approve failed', e);
      toast.error(e.response?.data?.message || 'Approve failed');
    }
  };

  // Inline publish handler
  const handleInlinePublish = async (template) => {
    try {
      const res = await publishTemplateAPI(template._id);
      setTemplates(prev => prev.map(t => t._id === template._id ? { ...t, ...res.template, approvalMeta: res.approvalMeta || res.template?.approvalMeta } : t));
      toast.success('Template published!');
    } catch (e) {
      console.error('Publish failed', e);
      toast.error(e.response?.data?.message || 'Publish failed');
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
        const lastActivity = (t) => new Date(t.updatedAt || t.updated_at || t.status_meta?.last_activity_at || t.last_activity_at || t.createdAt || t.created_at || 0).getTime();
        sortedTemplates.sort((a, b) => lastActivity(b) - lastActivity(a));
      }
      setTemplates(sortedTemplates);
    }
  }, [sortOrder]);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Templates" />
        {/* prevent horizontal overflow + comfy responsive padding/margins */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-4 md:px-8 mx-3 md:mx-6 mt-4 md:mt-8 rounded-xl overflow-x-hidden">
          <div className="flex-1 px-1 py-5">
            <h1 className="text-3xl font-bold text-black-800 tracking-widest uppercase mt-3">TEMPLATES</h1>
            <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />

            {/* Controls row: stacks on small screens */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
              
              
              {/* Create button (keeps full size; stacks above filters on small screens) */}
              <div className="flex flex-col sm:flex-row gap-3">
                
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
              </div>

              {/* Filters + Search */}
              <div className="flex items-center gap-2">
              {/* Archived Documents */}
                <button
                  type="button"
                  onClick={() => navigate("/archived-documents")}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 w-10 h-10"
                  aria-label="Archived documents"
                  title="Archived documents"
                >
                  {/* archive icon */}
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

                {/* Search Bar */}
                <div className="w-64">
                  <SearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search templates..."
                  />
                </div>
                
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

            {/* Templates Grid — auto-fill to prevent overlap */}
            <div className="grid [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))] gap-5 sm:gap-6">
              {loading ? (
                <div className="col-span-full text-center py-8">
                  <Loader message="Loading templates..." />
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
                  <div key={template._id || i} className="min-w-0">
                    <TemplateCard
                      template={template}
                      user={user}
                      onApprove={handleInlineApprove}
                      onPublish={handleInlinePublish}
                      onSelect={() => navigate(`/document-controller/create-template?templateId=${template._id}`)}
                      onAssign={(updatedTemplate) => {
                        setTemplates(prev => prev.map(t => (t._id === updatedTemplate._id ? { ...t, ...updatedTemplate } : t)));
                      }}
                    />
                  </div>
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
