import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Header from '../../layout/headers/header';
import Sidebar from '../../layout/sidebars/sidebar';
import useUser from '../../hooks/useUser';
import SearchBar from '../../components/searchbar';
import Dropdown from '../../components/dropdowns/dropdown';
import TemplateCard from '../../components/cards/templatecard';
import usePagination from '../../hooks/usePagination';
import { fetchTemplatesAPI } from '../../api/documentContollerAPI';
import AssignTemplateModal from '../../components/modals/assignTemplateModal';
import Loader from '../../components/loader';

import { fetchFacultyAPI, assignTemplateAPI } from '../../api/departmentHeadAPI';

export default function DepartmentHeadTemplates() {
  const user = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const pagination = usePagination(totalPages, 1);

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [faculty, setFaculty] = useState([]);              // list to choose from
  const [selectedFacultyIds, setSelectedFacultyIds] = useState([]); // chosen assignees
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // School identifiers for filtering
  const schoolIdentifiers = {
    'University Wide': 'VAA',
    'SAMCIS': 'SMI',
    'STELA': 'STL',
  };

  const PAGE_SIZE = 8;

  // Include Published in status options
  const statusOptions = ['All', 'Draft', 'Pending Approval', 'Approved', 'Published'];

  // Derive initial status from navigation state or query (?status=)
  const initialStatus =
    (statusOptions.includes(location.state?.status) && location.state.status) ||
    (statusOptions.includes(searchParams.get('status')) && searchParams.get('status')) ||
    'All';

  const [selectedSchool, setSelectedSchool] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState(initialStatus); // ⬅ use derived default
  const [sortOrder, setSortOrder] = useState('Recent');

  // Fetch templates
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
      if (result?.success && result.data?.templates) {
        templatesArray = result.data.templates;
        setTotalPages(result.data.pagination?.total_pages || 1);
      } else if (result?.templates) {
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
        templatesArray.sort(
          (a, b) =>
            new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)
        );
      }

      setTemplates(templatesArray);
    } catch (error) {
      setTemplates([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Load data on filters / pagination change
  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedSchool, selectedStatus, search, sortOrder, pagination.currentPage]);

  // Keep selectedStatus in sync with navigation state or query string
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

  const openPreview = (template, i) => {
    navigate(`/dept-head/templates/${template._id || i}`, {
      state: {
        doc: template,
        sidebarActive: 'Templates',
        backTo: '/dept-head/templates',
      },
    });
  };

  // Open assign modal
  const handleOpenAssign = async (template) => {
    setSelectedTemplate(template);
    setSelectedFacultyIds([]);
    setShowAssignModal(true);
    await loadFaculty();
  };

  // Fetch faculty (same department as Dept Head)
  const loadFaculty = async () => {
    if (!user) return;
    setFacultyLoading(true);
    try {
      // You can adjust how you derive departmentId from user
      const departmentId = user?.department?._id || user?.department || null;
      const res = await fetchFacultyAPI({ departmentId });
      const list = res?.data?.faculty || res?.faculty || [];
      setFaculty(list);
    } catch (e) {
      console.error('Failed to load faculty list:', e);
      setFaculty([]); // fallback
    } finally {
      setFacultyLoading(false);
    }
  };

  // Confirm assignment
  const handleConfirmAssign = async () => {
    if (!selectedTemplate || selectedFacultyIds.length === 0) {
      alert('Please select at least one faculty to assign.');
      return;
    }
    setAssignLoading(true);
    try {
      const payload = {
        templateId: selectedTemplate._id,
        assignees: selectedFacultyIds,
        assignedBy: user?._id || user?.id,
      };
      const res = await assignTemplateAPI(payload);
      if (res?.success) {
        setShowAssignModal(false);
        setSelectedTemplate(null);
        setSelectedFacultyIds([]);
        alert('Template assigned successfully.');
      } else {
        throw new Error(res?.message || 'Assignment failed');
      }
    } catch (e) {
      console.error('Assignment error:', e);
      alert(e?.message || 'Failed to assign template');
    } finally {
      setAssignLoading(false);
    }
  };

  // Toggle select faculty
  const toggleFaculty = (id) => {
    setSelectedFacultyIds((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Templates" />
        {/* prevent horizontal overflow + responsive margins/padding */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-4 md:px-8 mx-3 md:mx-6 mt-4 md:mt-8 rounded-xl overflow-x-hidden">
          <div className="flex-1 px-1 py-5">
            <h1 className="text-3xl font-bold text-black-800 tracking-widest uppercase mt-3">
              TEMPLATES
            </h1>
            <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4 justify-start lg:justify-end">
              {/* Archived Documents */}
              <button
                type="button"
                onClick={() => navigate('/archived-documents')}
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

              <div className="w-64">
                <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>

              <Dropdown
                options={['All', ...Object.keys(schoolIdentifiers)]}
                value={selectedSchool}
                onChange={setSelectedSchool}
                width="w-50"
              />

              {/* NEW: Status filter (shows current tab/status) */}
              <Dropdown
                options={statusOptions}
                value={selectedStatus}
                onChange={setSelectedStatus}
                width="w-48"
              />

              <Dropdown
                options={['Recent', 'A-Z', 'Z-A']}
                value={sortOrder}
                onChange={setSortOrder}
                width="w-36"
              />
            </div>

            {/* Templates Grid */}
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
                  <div key={template._id || i} className="flex flex-col min-w-0">
                    {/* Click the card => open preview */}
                    <div
                      className="cursor-pointer"
                      onClick={() => openPreview(template, i)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) =>
                        (e.key === 'Enter' || e.key === ' ') && openPreview(template, i)
                      }
                    >
                      <TemplateCard
                        template={template}
                        user={user}
                        onSelect={() => {}}
                        onAssign={(updatedTemplate) => {
                          setTemplates((prev) =>
                            prev.map((t) =>
                              t._id === updatedTemplate._id ? { ...t, ...updatedTemplate } : t
                            )
                          );
                        }}
                      />
                    </div>

                    {/* Assign button */}
                    <div className="flex justify-start px-3 pb-3">
                      <button
                        onClick={() => handleOpenAssign(template)}
                        className="inline-flex items-center justify-center 
                          bg-blue-600 hover:bg-blue-700 text-white 
                          text-xs font-medium px-4 py-1 rounded shadow w-20"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {templates.length > 0 && (
              <div className="mt-4 text-sm text-gray-600 text-center">
                Showing {templates.length} of {totalPages * PAGE_SIZE} template
                {templates.length !== 1 ? 's' : ''}
                {selectedSchool !== 'All' && ` for ${selectedSchool}`}
                {selectedStatus !== 'All' && ` with status: ${selectedStatus}`}
                {search && ` matching "${search}"`}
              </div>
            )}
            <div className="flex justify-center items-center mt-6 gap-2">
              <button
                onClick={pagination.handlePrev}
                disabled={pagination.currentPage === 1}
                className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Prev
              </button>
              {pagination.getPageNumbers().map((num, idx) =>
                num === '...' ? (
                  <span key={idx} className="px-2 text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={num}
                    onClick={() => pagination.handlePage(num)}
                    className={`px-3 py-1 rounded border ${
                      pagination.currentPage === num
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
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

      {showAssignModal && (
        <AssignTemplateModal
          open={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedTemplate(null);
          }}
          template={selectedTemplate}
          faculty={faculty}
          facultyLoading={facultyLoading}
          selectedFacultyIds={selectedFacultyIds}
          toggleFaculty={toggleFaculty}
          onConfirm={handleConfirmAssign}
          loading={assignLoading}
        />
      )}
    </div>
  );
}
