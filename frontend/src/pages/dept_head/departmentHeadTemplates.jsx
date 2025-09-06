import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../layout/header';
import Sidebar from '../../layout/sidebar';
import useUser from '../../hooks/useUser';
import SearchBar from '../../components/searchBar';
import Dropdown from '../../components/dropdown';
import TemplateCard from '../../components/templatecard';
import usePagination from '../../hooks/usePagination';
import { fetchTemplatesAPI } from '../../api/documentContollerAPI';

export default function DepartmentHeadTemplates() {
  const user = useUser();
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const pagination = usePagination(totalPages, 1);
  const [selectedSchool, setSelectedSchool] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortOrder, setSortOrder] = useState('Recent');
  const navigate = useNavigate();

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

  useEffect(() => {
    fetchTemplates();
  }, [user, selectedSchool, selectedStatus, search, sortOrder, pagination.currentPage]);

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
        // Optional: refresh list or show toast
        // fetchTemplates();
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
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <div className="flex-1 px-1 py-5">
            <h1 className="text-3xl font-bold text-black-800 tracking-widest uppercase mt-3">TEMPLATES</h1>
            <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />

            {/* Filters */}
            <div className="flex items-center gap-2 mb-4">
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
              <div className="flex-1 flex justify-start m-2">
                <div className="w-64">
                  <SearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search templates..."
                  />
                </div>
              </div>
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
                  <div key={template._id} className="flex flex-col">
                    <TemplateCard
                      template={template}
                      user={user}
                      onSelect={() => handleOpenAssign(template)}
                    />

                    {/* Assign button*/}
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
                Showing {templates.length} of {totalPages * PAGE_SIZE} template{templates.length !== 1 ? 's' : ''}
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
    </div>

  );
}
