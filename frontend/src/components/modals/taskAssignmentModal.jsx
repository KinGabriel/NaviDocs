import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  CheckCircle,
  User,
  FileText,
  File,
  Clock,
  AlertCircle,
  X,
  ZoomOut,
  Search,
  ZoomIn,
  Eye,
  ChevronRight,
  Filter,
  RotateCcw
} from 'lucide-react';
import { fetchPublishedTemplatesAPI } from '../../api/documentContollerAPI';
import { getFacultyByDepartmentAPI } from '../../api/userAPI';
import { createSubmissionBinAPI } from '../../api/assignmentDocumentsAPI';
import TextEditor from '../../layout/create_template/textEditor';
import Loader from '../loader';

const ProgressSteps = ({ currentStep }) => {
  const steps = [
    { id: 1, name: 'Assignment Details', icon: File },
    { id: 2, name: 'Select Template', icon: FileText },
    { id: 3, name: 'Assign People', icon: Users },
    { id: 4, name: 'Review & Submit', icon: CheckCircle }
  ];

  return (
    <div className="overflow-x-auto mb-4 sm:mb-8">
      <div className="flex items-center justify-between min-w-max pr-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${step.id <= currentStep
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                  }`}
              >
                <step.icon size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div className="ml-2 sm:ml-3">
                <p
                  className={`text-xs sm:text-sm font-medium ${step.id <= currentStep ? 'text-blue-600' : 'text-gray-500'
                    }`}
                >
                  {step.name}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 sm:mx-4 ${step.id < currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// Document Preview Component
const DocumentPreview = ({ template, onClose, onSelect }) => {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const previewRef = useRef(null);
  const containerRef = useRef(null);

  const pageNodes = useMemo(() => {
    const baseDoc = template?.pages_json?.[0] || { type: 'doc', content: [] };
    return (baseDoc.content || []).filter((n) => n.type === 'page');
  }, [template]);

  const totalPages = pageNodes.length || 0;
  const isLandscape = template?.pageSetup?.orientation === 'landscape';

  const contentForEditor = useMemo(() => {
    const baseDoc = template?.pages_json?.[0] || { type: 'doc', content: [] };
    const pageNode =
      pageNodes[currentPage] ||
      (baseDoc.content || []).find((n) => n.type === 'page');
    if (!pageNode) return baseDoc;
    return { ...baseDoc, content: [pageNode] };
  }, [template, pageNodes, currentPage]);

  const normalizedHeaderConfig = useMemo(() => {
    const src =
      template?.headerConfig || template?.logoConfig || template?.headerFooter || {};
    const docCode =
      template?.document_code ||
      template?.docCode ||
      template?.documentCode ||
      src?.documentStamp?.docCode ||
      '';
    const revisionNo =
      template?.revision_no ??
      template?.revisionNo ??
      src?.documentStamp?.revisionNo ??
      0;
    const effectivity =
      template?.effectivity ||
      template?.effectivity_date ||
      src?.documentStamp?.effectivity ||
      '';
    return {
      ...src,
      showSLULogo: src.showSLULogo ?? src.showSLU ?? !!src.assets?.slu,
      showCICMLogo: src.showCICMLogo ?? src.showCICM ?? !!src.assets?.cicm,
      assets: {
        slu: src?.assets?.slu || src?.slu || '/assets/images/slu-logo.png',
        cicm: src?.assets?.cicm || src?.cicm || '/assets/images/cicm-logo.png'
      },
      center: src.center || {},
      documentStamp: { docCode, revisionNo, effectivity },
      document_code: docCode,
      revision_no: revisionNo,
      effectivity
    };
  }, [template]);

  useEffect(() => {
    if (template) {
      setLoading(false);
      if (isLandscape && containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth - 48;
        const estimatedPageWidth = 1400;
        const autoZoom = Math.min(containerWidth / estimatedPageWidth, 1);
        setZoom(autoZoom);
      }
    }
  }, [template, isLandscape]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.3));
  const handleZoomFit = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth - 48;
      const estimatedPageWidth = isLandscape ? 1400 : 900;
      const autoZoom = Math.min(containerWidth / estimatedPageWidth, 1);
      setZoom(autoZoom);
    }
  };
  const handleZoomReset = () => setZoom(1);

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-h-[98vh] sm:max-h-[95vh] overflow-hidden flex flex-col"
        style={{ maxWidth: '98vw' }}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200 flex items-start justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 truncate">
              Template Preview
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-2 truncate">
              {template.title}
            </p>
            <div className="flex gap-1 sm:gap-2 flex-wrap">
              {template.document_code && (
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                  {template.document_code}
                </span>
              )}
              {(template.revision_number || template.revision_no) && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                  Rev.{' '}
                  {String(
                    template.revision_number || template.revision_no
                  ).padStart(2, '0')}
                </span>
              )}
              {isLandscape && (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                  Landscape
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg flex-shrink-0"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="sticky top-0 z-10 px-2 sm:px-4 py-2 sm:py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={handleZoomOut}
                className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors border border-gray-300"
                title="Zoom Out"
              >
                <ZoomOut size={14} className="sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors border border-gray-300"
                title="Zoom In"
              >
                <ZoomIn size={14} className="sm:w-4 sm:h-4" />
              </button>
              <span className="text-xs sm:text-sm font-medium text-gray-700 min-w-[50px] sm:min-w-[60px] text-center bg-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomFit}
                className="hidden sm:block px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg transition-colors border border-gray-300"
              >
                Fit
              </button>
              <button
                onClick={handleZoomReset}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
                title="Reset"
              >
                <RotateCcw size={14} className="sm:w-4 sm:h-4 text-gray-600" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
            <div className="hidden md:block text-xs sm:text-sm text-gray-600">
              Scroll to navigate • Use zoom controls
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100"
          style={{
            padding: '2rem'
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center min-h-full w-full">
              <div className="text-center">
                <Loader message="Loading preview..." />
              </div>
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                paddingBottom: '2rem'
              }}
            >
              <div
                style={{
                  width: isLandscape ? '1200px' : '900px',
                  maxWidth: 'none'
                }}
              >
                <div
                  ref={previewRef}
                  className="transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center'
                  }}
                >
                  {template?.pages_json && template.pages_json.length > 0 ? (
                    <div style={{ width: 'fit-content', margin: '0 auto' }}>
                      <TextEditor
                        content={contentForEditor}
                        pageSetup={template?.pageSetup}
                        className="pointer-events-none opacity-100 w-full"
                        onEditorReady={(editor) =>
                          editor && editor.setEditable(false)
                        }
                        mode="template"
                        headerConfig={normalizedHeaderConfig}
                        templateStatus={template?.status || 'published'}
                        documentCode={
                          template?.document_code || template?.docCode
                        }
                        revisionNo={
                          template?.revision_no ?? template?.revisionNo
                        }
                        effectivity={
                          template?.effectivity || template?.effectivity_date
                        }
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 sm:p-12 text-center">
                      <FileText
                        size={36}
                        className="sm:w-12 sm:h-12 mx-auto text-gray-300 mb-4"
                      />
                      <p className="text-sm sm:text-base text-gray-600 mb-2">
                        Template preview not available
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        No content to display
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 bg-gradient-to-r from-white to-gray-50 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-3 sm:px-6 py-2 sm:py-2.5 border-2 border-gray-300 rounded-lg text-sm sm:text-base text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            Close
          </button>
          <button
            onClick={() => {
              onSelect(template);
              onClose();
            }}
            className="w-full sm:w-auto px-4 sm:px-8 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <CheckCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="hidden sm:inline">Select This Template</span>
            <span className="sm:hidden">Select</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TaskAssignmentModal({ isOpen, onClose, onAssign }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deadline, setDeadline] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('00:00');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [errors, setErrors] = useState({});

  // state for user management - fetch FACULTY MEMBERS via department API
  const [faculty, setFaculty] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Template filtering state
  const [selectedDocCode, setSelectedDocCode] = useState('All');
  const [selectedRevision, setSelectedRevision] = useState('All');
  const [showTemplateFilters, setShowTemplateFilters] = useState(false);

  // Fetch templates from API
  useEffect(() => {
    if (isOpen && currentStep === 2 && templates.length === 0) {
      fetchTemplates();
    }
  }, [isOpen, currentStep]);

  // Fetch users from API
  useEffect(() => {
    if (isOpen && faculty.length === 0) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setDeadlineTime('00:00');
      setAssignedUsers([]);
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const result = await fetchPublishedTemplatesAPI({ limit: 100, page: 1 });

      let templateList = [];
      if (result?.success && result.data?.templates) {
        templateList = result.data.templates;
      } else if (result?.templates) {
        templateList = result.templates;
      } else if (Array.isArray(result)) {
        templateList = result;
      }

      setTemplates(templateList);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const result = await getFacultyByDepartmentAPI();
      // Normalize to objects with id/_id + name/email
      const normalized = Array.isArray(result)
        ? result.map((u) => ({
          _id: u._id || u.id,
          id: u.id || u._id,
          name:
            u.name ||
            `${u.firstname || u.firstName || ''} ${u.lastname || u.lastName || ''
              }`.trim(),
          email: u.email || ''
        }))
        : [];
      setFaculty(normalized);
    } catch (error) {
      console.error('Error fetching users:', error);
      setFaculty([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Combine all users into a single array for the assignment step
  const allUsers = useMemo(() => faculty, [faculty]);

  if (!isOpen) return null;

  // Extract unique document codes and revisions
  const documentCodes = [...new Set(templates.map((t) => t.document_code).filter(Boolean))].sort();
  const revisionNumbers = [
    ...new Set(
      templates
        .map((t) => {
          const rev = t.revision_number ?? t.revision_no;
          return rev !== undefined && rev !== null
            ? String(rev).padStart(2, '0')
            : null;
        })
        .filter(Boolean)
    )
  ].sort();

  const filteredTemplates = templates.filter((template) => {
    const searchLower = templateSearch.toLowerCase();
    const matchesSearch =
      template.title?.toLowerCase().includes(searchLower) ||
      template.document_code?.toLowerCase().includes(searchLower);

    const matchesCode =
      selectedDocCode === 'All' || template.document_code === selectedDocCode;
    const matchesRevision =
      selectedRevision === 'All' ||
      String(template.revision_number ?? template.revision_no).padStart(
        2,
        '0'
      ) === selectedRevision;

    return matchesSearch && matchesCode && matchesRevision;
  });

  const filteredUsers = allUsers.filter((user) => {
    const searchLower = userSearch.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower)
    );
  });

  const validateStep = (step) => {
    const newErrors = {};
    if (step >= 1) {
      if (!title.trim()) newErrors.title = 'Title is required';
      if (!deadline) newErrors.deadline = 'Due date is required';
      if (!deadlineTime) newErrors.deadline = 'Due time is required';
      if (deadline && deadlineTime) {
        const now = new Date();
        const selected = new Date(`${deadline}T${deadlineTime}`);
        if (selected < now) {
          newErrors.deadline = 'Due date/time cannot be in the past';
        }
      }
    }
    if (step >= 2) {
      if (!selectedTemplate) newErrors.template = 'Please select a template';
    }
    if (step >= 3) {
      if (assignedUsers.length === 0)
        newErrors.assignedUsers = 'At least one user must be assigned';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleAssign = async () => {
    if (validateStep(4)) {
      setSubmitting(true);
      let deadlineISO = '';
      if (deadline && deadlineTime) {
        const localDate = new Date(`${deadline}T${deadlineTime}`);
        const y = localDate.getUTCFullYear();
        const m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
        const d = String(localDate.getUTCDate()).padStart(2, '0');
        const hh = String(localDate.getUTCHours()).padStart(2, '0');
        const mm = String(localDate.getUTCMinutes()).padStart(2, '0');
        deadlineISO = `${y}-${m}-${d}T${hh}:${mm}:00.000+00:00`;
      }
      try {
        const templateId = selectedTemplate?._id || selectedTemplate?.id;
        const payload = {
          title,
          instructions,
          deadline: deadlineISO || null,
          template_ids: templateId ? [templateId] : [],
          faculty_ids: assignedUsers,
          target_scope: 'selected',
          submissions: assignedUsers.map((uid) => ({
            template: templateId,
            faculty: uid,
            instructions: ''
          }))
        };
        const created = await createSubmissionBinAPI(payload);
        onAssign?.(created);
        // Reset form
        setTitle('');
        setInstructions('');
        setDeadline('');
        setDeadlineTime('00:00');
        setSelectedTemplate(null);
        setTemplateSearch('');
        setUserSearch('');
        setAssignedUsers([]);
        setCurrentStep(1);
        onClose?.();
      } catch (e) {
        alert(
          e?.responseData?.message ||
          e?.message ||
          'Failed to create submission bin'
        );
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleSelectFromPreview = (template) => {
    setSelectedTemplate(template);
    if (errors.template) {
      setErrors((prev) => ({ ...prev, template: '' }));
    }
  };

  const toggleUserSelection = (userId) => {
    setAssignedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
    if (errors.assignedUsers) {
      setErrors((prev) => ({ ...prev, assignedUsers: '' }));
    }
  };

  const getUserDisplayName = (user) => {
    if (user.name) return user.name;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    return 'Unknown User';
  };

  const addUser = (user) => {
    const userId = user._id || user.id;
    if (!assignedUsers.includes(userId)) {
      setAssignedUsers((prev) => [...prev, userId]);
      if (errors.assignedUsers) {
        setErrors((prev) => ({ ...prev, assignedUsers: '' }));
      }
    }
    setUserSearch('');
  };

  const removeUser = (userId) => {
    setAssignedUsers((prev) => prev.filter((id) => id !== userId));
  };

  return (
    <>
      <div className="w-full max-w-6xl mx-auto bg-white rounded-t-xl sm:rounded-xl shadow-lg border border-gray-200 max-h-[calc(100vh-2rem)] sm:max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              Create Assignment
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Assign tasks to members
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={22} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content (scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
          <ProgressSteps currentStep={currentStep} />

          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FileText size={16} />
                    Assignment Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.title
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500'
                      }`}
                    placeholder="Enter assignment title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title) {
                        setErrors((prev) => ({ ...prev, title: '' }));
                      }
                    }}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.title}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Instructions{' '}
                    <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                    placeholder="Provide detailed instructions, expectations, or context for this assignment..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Clock size={16} />
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
                      <input
                        type="date"
                        className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 placeholder-gray-400 ${errors.deadline
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500'
                          }`}
                        value={deadline}
                        onChange={(e) => {
                          setDeadline(e.target.value);
                          if (errors.deadline)
                            setErrors((prev) => ({ ...prev, deadline: '' }));
                        }}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <span className="hidden sm:inline text-gray-400">at</span>
                      <input
                        type="time"
                        className={`w-full sm:w-40 px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 placeholder-gray-400 ${errors.deadline
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500'
                          }`}
                        value={deadlineTime}
                        onChange={(e) => {
                          setDeadlineTime(e.target.value);
                          if (errors.deadline)
                            setErrors((prev) => ({ ...prev, deadline: '' }));
                        }}
                        min="00:00"
                        max="23:59"
                      />
                    </div>
                    {errors.deadline && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {errors.deadline}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Select a Template
                </h3>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-80">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => setShowTemplateFilters(!showTemplateFilters)}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm ${showTemplateFilters
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <Filter size={16} />
                    Filters
                  </button>
                </div>
              </div>

              {showTemplateFilters && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Document Code
                      </label>
                      <select
                        value={selectedDocCode}
                        onChange={(e) => setSelectedDocCode(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="All">All Codes</option>
                        {documentCodes.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Revision Number
                      </label>
                      <select
                        value={selectedRevision}
                        onChange={(e) => setSelectedRevision(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="All">All Revisions</option>
                        {revisionNumbers.map((rev) => (
                          <option key={rev} value={rev}>
                            Revision {rev}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {errors.template && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">{errors.template}</span>
                </div>
              )}

              {loadingTemplates ? (
                <div className="text-center py-12">
                  <Loader message="Loading templates..." />
                </div>
              ) : (
                <>
                  <div className="max-h-64 sm:max-h-96 overflow-y-auto space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                    {filteredTemplates.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText
                          size={48}
                          className="mx-auto text-gray-300 mb-3"
                        />
                        <p className="text-gray-600">No templates found</p>
                      </div>
                    ) : (
                      filteredTemplates.map((template) => {
                        const templateId = template._id || template.id;
                        const isSelected =
                          selectedTemplate &&
                          (selectedTemplate._id || selectedTemplate.id) ===
                          templateId;

                        return (
                          <div
                            key={templateId}
                            className={`p-4 rounded-lg border-2 transition-all ${isSelected
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                              }`}
                          >
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-semibold text-gray-900 truncate">
                                    {template.title}
                                  </h4>
                                  {isSelected && (
                                    <CheckCircle
                                      size={20}
                                      className="text-blue-600 flex-shrink-0"
                                    />
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2 mt-2">
                                  {template.document_code && (
                                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                                      {template.document_code}
                                    </span>
                                  )}
                                  {(template.revision_number ||
                                    template.revision_no) && (
                                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                                        Rev.{' '}
                                        {String(
                                          template.revision_number ||
                                          template.revision_no
                                        ).padStart(2, '0')}
                                      </span>
                                    )}
                                  {template.school && (
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                                      {template.school}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                                <button
                                  onClick={() => handlePreview(template)}
                                  className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Eye size={16} />
                                  Preview
                                </button>

                                {!isSelected && (
                                  <button
                                    onClick={() => {
                                      setSelectedTemplate(template);
                                      if (errors.template) {
                                        setErrors((prev) => ({
                                          ...prev,
                                          template: ''
                                        }));
                                      }
                                    }}
                                    className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                                  >
                                    <CheckCircle size={16} />
                                    Select
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {selectedTemplate && (
                    <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-blue-900 mb-1">
                            Selected Template
                          </h4>
                          <p className="text-sm text-blue-700 truncate">
                            {selectedTemplate.title}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedTemplate.document_code && (
                              <span className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded font-medium">
                                {selectedTemplate.document_code}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedTemplate(null)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Users size={16} />
                  Assign To <span className="text-red-500">*</span>
                </label>

                {errors.assignedUsers && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle size={16} />
                    <span className="text-sm font-medium">
                      {errors.assignedUsers}
                    </span>
                  </div>
                )}

                {/* Selected users tags */}
                {assignedUsers.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                      <span className="text-sm font-semibold text-blue-900">
                        {assignedUsers.length}{' '}
                        {assignedUsers.length === 1 ? 'person' : 'people'} selected
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allUsers
                        .filter((u) => assignedUsers.includes(u._id || u.id))
                        .map((user) => {
                          const userId = user._id || user.id;
                          return (
                            <div
                              key={userId}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-300 rounded-full text-sm"
                            >
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <User size={12} className="text-blue-600" />
                              </div>
                              <span className="text-gray-900">
                                {getUserDisplayName(user)}
                              </span>
                              <button
                                onClick={() => removeUser(userId)}
                                className="hover:bg-blue-100 rounded-full p-0.5 transition-colors text-gray-600 hover:text-gray-900"
                                aria-label="Remove user"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Search input */}
                <div className="relative mb-4">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search people by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Suggested/Filtered Users List */}
                <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700">
                      {userSearch.trim() ? 'Search Results' : 'Suggested People'}
                    </h4>
                  </div>

                  <div className="max-h-64 sm:max-h-80 overflow-y-auto">
                    {loadingUsers ? (
                      <div className="p-8 text-center">
                        <Loader message="Loading faculty members..." />
                      </div>
                    ) : allUsers.length === 0 ? (
                      <div className="p-8 text-center">
                        <Users
                          size={48}
                          className="mx-auto text-gray-300 mb-3"
                        />
                        <p className="text-sm text-gray-600 font-medium">
                          No faculty members available
                        </p>
                      </div>
                    ) : (
                      (userSearch.trim() ? filteredUsers : allUsers)
                        .filter((user) => !assignedUsers.includes(user._id || user.id))
                        .slice(0, 10)
                        .map((user) => {
                          const userId = user._id || user.id;
                          return (
                            <button
                              key={userId}
                              onClick={() => addUser(user)}
                              className="w-full flex items-center gap-3 p-4 hover:bg-blue-50 transition-colors border-b last:border-b-0 text-left group"
                            >
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                                <User size={24} className="text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {getUserDisplayName(user)}
                                </p>
                                {user.email && (
                                  <p className="text-xs text-gray-500 truncate">
                                    {user.email}
                                  </p>
                                )}
                              </div>
                              <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight size={20} />
                              </div>
                            </button>
                          );
                        })
                    )}
                  </div>

                  {/* Show "Load more" if there are more users */}
                  {!userSearch.trim() &&
                    allUsers.filter((u) => !assignedUsers.includes(u._id || u.id))
                      .length > 10 && (
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
                        <p className="text-xs text-gray-600">
                          Showing 10 of{' '}
                          {
                            allUsers.filter(
                              (u) => !assignedUsers.includes(u._id || u.id)
                            ).length
                          }{' '}
                          people.
                          <span className="text-blue-600 font-medium">
                            {' '}
                            Use search to find more
                          </span>
                        </p>
                      </div>
                    )}
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  Click on a person to add them to this assignment
                </p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Review Assignment Details
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Title</h4>
                      <p className="text-gray-900 break-words">{title}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">
                        Due Date
                      </h4>
                      <p className="text-gray-900">
                        {deadline && deadlineTime
                          ? new Date(
                            `${deadline}T${deadlineTime}`
                          ).toLocaleString()
                          : 'Not set'}
                      </p>
                    </div>
                  </div>

                  {instructions && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">
                        Instructions
                      </h4>
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {instructions}
                      </p>
                    </div>
                  )}

                  {selectedTemplate && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">
                        Selected Template
                      </h4>
                      <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg">
                        <p className="font-medium text-gray-900">
                          {selectedTemplate.title}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedTemplate.document_code && (
                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                              {selectedTemplate.document_code}
                            </span>
                          )}
                          {(selectedTemplate.revision_number ||
                            selectedTemplate.revision_no) && (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                Rev.{' '}
                                {String(
                                  selectedTemplate.revision_number ||
                                  selectedTemplate.revision_no
                                ).padStart(2, '0')}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Assigned To ({assignedUsers.length}{' '}
                      {assignedUsers.length === 1 ? 'person' : 'people'})
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {allUsers
                        .filter((u) => assignedUsers.includes(u._id || u.id))
                        .map((user) => (
                          <div
                            key={user._id || user.id}
                            className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-lg"
                          >
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User size={16} className="text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {getUserDisplayName(user)}
                              </p>
                              {user.email && (
                                <p className="text-xs text-gray-500 truncate">
                                  {user.email}
                                </p>
                              )}
                            </div>
                            <CheckCircle
                              size={16}
                              className="text-green-500 flex-shrink-0"
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                className="w-full sm:w-auto px-8 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleAssign}
                disabled={submitting}
                className={`w-full sm:w-auto px-8 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2 ${submitting
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                  }`}
              >
                <CheckCircle size={18} />
                {submitting ? 'Creating…' : 'Create Assignment'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showPreview && previewTemplate && (
        <DocumentPreview
          template={previewTemplate}
          onClose={() => setShowPreview(false)}
          onSelect={handleSelectFromPreview}
        />
      )}
    </>
  );
}