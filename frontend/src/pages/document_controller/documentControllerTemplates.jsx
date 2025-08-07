import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import Header from '../../layout/header'; 
import Sidebar from '../../layout/sidebar';
import useUser from '../../hooks/useUser'; 
import SearchBar from '../../components/searchbar';
import Dropdown from '../../components/dropdown';
import TemplateCard from '../../components/templatecard';
import CreateTemplateModal from '../../components/modals/createTemplateModal';
import usePagination from '../../hooks/usePagination';

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
  const [sortOrder, setSortOrder] = useState('A-Z');
  
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
    
    if (!user || (!user._id && !user.id)) {
      alert('User not logged in or user ID missing');
      setLoading(false);
      return;
    }
    
    try {
      const templateData = {
        school_identifier: templateFormData.school_identifier,
        revision_no: 0,
        effectivity: null,
        page_no: 1,
        title: templateFormData.title.trim(),
        document_size: templateFormData.document_size,
        margin: {
          top: 1,
          bottom: 1,
          left: 1,
          right: 1
        },
        created_by: user._id || user.id,
        created_at: new Date(),
        header: [],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Start typing your template content...'
                }
              ]
            }
          ]
        },
        footer: [],

        approval_workflow: {
          required_approvers: [],
          current_step: 0,
          completed_approvals: []
        },
        assigned: []
      };

      const response = await fetch('http://localhost:8002/api/templates/create-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify(templateData),
      });

      const responseText = await response.text();
      
      if (!responseText) {
        throw new Error('Empty response from server');
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create template');
      }

      console.log(' Template created:', result);
      setShowCreateModal(false);
      
      //  Refresh templates list after creation
      fetchTemplates();
      navigate(`/document-controller/create-template?templateId=${result.template._id}`);
      
    } catch (error) {
      console.error(' Full error details:', error);
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
      const params = new URLSearchParams();

      if (selectedSchool !== 'All') params.append('school', selectedSchool);
      if (selectedStatus !== 'All') {
        const statusMap = {
          'Draft': 'draft',
          'Pending Approval': 'pending',
          'Approved': 'approved',
          'Published': 'published'
        };
        params.append('status', statusMap[selectedStatus]);
      }
      if (search.trim()) params.append('search', search.trim());

      // Add pagination params
      params.append('limit', PAGE_SIZE);
      params.append('page', pagination.currentPage);

      const queryString = params.toString();
      const url = `http://localhost:8002/api/templates${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user.token}` },
      });

      if (response.ok) {
        const result = await response.json();
        let templatesArray = [];
        if (result.success && result.data?.templates) {
          templatesArray = result.data.templates;
          setTotalPages(result.data.pagination.total_pages || 1); // <-- update total pages
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
        }
        setTemplates(templatesArray);
      } else {
        setTemplates([]);
        setTotalPages(1);
      }
    } catch (error) {
      setTemplates([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
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
          <div className="flex-1 p-10">
            <h2 className="text-3xl font-semibold mb-2 tracking-wide">TEMPLATES</h2>
            <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />

            <div className="flex items-center gap-2 mb-4">
              {/* School Filter */}
              <Dropdown
                options={["All", ...Object.keys(schoolIdentifiers)]}
                value={selectedSchool}
                onChange={setSelectedSchool}
                width="w-50"
              />

     
              {/* Sort Order */}
              <Dropdown
                options={["A-Z", "Z-A"]}
                value={sortOrder}
                onChange={setSortOrder}
                width="w-36"
              />

              {/* Search Bar */}
              <div className="flex-1 flex justify-start m-2">
                <div className="w-64">
                  <SearchBar 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search templates..."
                  />
                </div>
              </div>

              {/* Create Template Button */}
              <div className="flex-1 flex justify-end">
                <button 
                  onClick={handleCreateTemplate}
                  className="flex items-center gap-2 bg-[#0035DA] hover:bg-[#043485] text-white font-semibold px-5 py-2 rounded shadow transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Template
                </button>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                    onSelect={() => navigate(`/document-controller/create-template?templateId=${template._id}`)}
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