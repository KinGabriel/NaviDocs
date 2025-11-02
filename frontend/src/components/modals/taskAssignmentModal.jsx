import React, { useState, useEffect, useMemo, useRef } from 'react';
import {Users, CheckCircle, User, FileText, File, Clock, AlertCircle, X, Calendar, Search, FileCode, History, Eye, ChevronRight, ZoomIn, Download, Filter} from 'lucide-react';
import { fetchPublishedTemplatesAPI } from '../../api/documentContollerAPI';
import { fetchSchoolStaffAPI } from '../../api/userAPI';
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
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              step.id <= currentStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              <step.icon size={20} />
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                step.id <= currentStep ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {step.name}
              </p>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-4 ${
              step.id < currentStep ? 'bg-blue-500' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// Document Preview Component
const DocumentPreview = ({ template, onClose, onSelect }) => {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const previewRef = useRef(null);

  const pageNodes = useMemo(() => {
    const baseDoc = template?.pages_json?.[0] || { type: "doc", content: [] };
    return (baseDoc.content || []).filter((n) => n.type === "page");
  }, [template]);

  const totalPages = pageNodes.length || 0;

  const contentForEditor = useMemo(() => {
    const baseDoc = template?.pages_json?.[0] || { type: "doc", content: [] };
    const pageNode = pageNodes[currentPage] || (baseDoc.content || []).find((n) => n.type === "page");
    if (!pageNode) return baseDoc;
    return { ...baseDoc, content: [pageNode] };
  }, [template, pageNodes, currentPage]);

  const normalizedHeaderConfig = useMemo(() => {
    const src = template?.headerConfig || template?.logoConfig || template?.headerFooter || {};
    const docCode = template?.document_code || template?.docCode || template?.documentCode || src?.documentStamp?.docCode || "";
    const revisionNo = (template?.revision_no ?? template?.revisionNo ?? src?.documentStamp?.revisionNo ?? 0);
    const effectivity = template?.effectivity || template?.effectivity_date || src?.documentStamp?.effectivity || "";
    return {
      ...src,
      showSLULogo: src.showSLULogo ?? src.showSLU ?? !!src.assets?.slu,
      showCICMLogo: src.showCICMLogo ?? src.showCICM ?? !!src.assets?.cicm,
      assets: {
        slu: src?.assets?.slu || src?.slu || "/assets/images/slu-logo.png",
        cicm: src?.assets?.cicm || src?.cicm || "/assets/images/cicm-logo.png",
      },
      center: src.center || {},
      documentStamp: { docCode, revisionNo, effectivity },
      document_code: docCode,
      revision_no: revisionNo,
      effectivity,
    };
  }, [template]);

  useEffect(() => {
    if (template) {
      setLoading(false);
    }
  }, [template]);

  return (
    <div className="fixed inset-0 backdrop-blur-[2px] bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-start justify-between bg-gray-50">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Template Preview</h3>
            <p className="text-sm text-gray-600 mb-2">{template.title}</p>
            <div className="flex gap-2">
              {template.document_code && (
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                  {template.document_code}
                </span>
              )}
              {(template.revision_number || template.revision_no) && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                  Rev. {String(template.revision_number || template.revision_no).padStart(2, '0')}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader message='Loading preview...' />
              </div>
            </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
              <div ref={previewRef} className="overflow-hidden bg-white">
                {template?.pages_json && template.pages_json.length > 0 ? (
                  <TextEditor
                    content={contentForEditor}
                    pageSetup={template?.pageSetup}
                    className="pointer-events-none opacity-100 w-full"
                    onEditorReady={(editor) => editor && editor.setEditable(false)}
                    mode="template"
                    headerConfig={normalizedHeaderConfig}
                    templateStatus={template?.status || "published"}
                    documentCode={template?.document_code || template?.docCode}
                    revisionNo={template?.revision_no ?? template?.revisionNo}
                    effectivity={template?.effectivity || template?.effectivity_date}
                  />
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600 mb-2">Template preview not available</p>
                    <p className="text-sm text-gray-500">No content to display</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Close Preview
          </button>
          <button
            onClick={() => {
              onSelect(template);
              onClose();
            }}
            className="px-8 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <CheckCircle size={18} />
            Select This Template
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
  
  // state for user management - TODO: CHANGE THIS PART, SHOULD FETCH FACULTY MEMBERS
  const [docControllers, setDocControllers] = useState([]);
  const [secretaries, setSecretaries] = useState([]);
  const [deans, setDeans] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  
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
    if (isOpen && docControllers.length === 0) {
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
      console.log('Starting to fetch users...'); 
      const result = await fetchSchoolStaffAPI();
      console.log('Fetched staff:', result); 
      
      // TODO: should be adjusted, must fetch faculty members 
      setDocControllers(result?.docControllers || []);
      setSecretaries(result?.secretaries || []);
      setDeans(result?.deans || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setDocControllers([]);
      setSecretaries([]);
      setDeans([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Combine all users into a single array for the assignment step
  const allUsers = useMemo(() => {
    return [...docControllers, ...secretaries, ...deans];
  }, [docControllers, secretaries, deans]);

  if (!isOpen) return null;

  // Extract unique document codes and revisions
  const documentCodes = [...new Set(templates.map(t => t.document_code).filter(Boolean))].sort();
  const revisionNumbers = [...new Set(
    templates.map(t => {
      const rev = t.revision_number ?? t.revision_no;
      return rev !== undefined && rev !== null ? String(rev).padStart(2, '0') : null;
    }).filter(Boolean)
  )].sort();

  const filteredTemplates = templates.filter(template => {
    const searchLower = templateSearch.toLowerCase();
    const matchesSearch = (
      template.title?.toLowerCase().includes(searchLower) ||
      template.document_code?.toLowerCase().includes(searchLower)
    );
    
    const matchesCode = selectedDocCode === 'All' || template.document_code === selectedDocCode;
    const matchesRevision = selectedRevision === 'All' || 
      String(template.revision_number ?? template.revision_no).padStart(2, '0') === selectedRevision;
    
    return matchesSearch && matchesCode && matchesRevision;
  });

  const filteredUsers = allUsers.filter(user => {
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
      if (assignedUsers.length === 0) newErrors.assignedUsers = 'At least one user must be assigned';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleAssign = async () => {
    if (validateStep(4)) {
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
      
      const result = {
        title,
        instructions,
        deadline: deadlineISO,
        template: selectedTemplate,
        assignedUsers,
      };
      
      onAssign?.(result);
      
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
    }
  };

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleSelectFromPreview = (template) => {
    setSelectedTemplate(template);
    if (errors.template) {
      setErrors(prev => ({ ...prev, template: '' }));
    }
  };

  const toggleUserSelection = (userId) => {
    setAssignedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
    if (errors.assignedUsers) {
      setErrors(prev => ({ ...prev, assignedUsers: '' }));
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
      setAssignedUsers(prev => [...prev, userId]);
      if (errors.assignedUsers) {
        setErrors(prev => ({ ...prev, assignedUsers: '' }));
      }
    }
    setUserSearch('');
  };

  const removeUser = (userId) => {
    setAssignedUsers(prev => prev.filter(id => id !== userId));
  };

  return (
    <>
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Assignment</h2>
            <p className="text-gray-600">Assign tasks to members</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
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
                    className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.title ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="Enter assignment title"
                    value={title}
                    onChange={e => {
                      setTitle(e.target.value);
                      if (errors.title) {
                        setErrors(prev => ({ ...prev, title: '' }));
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
                    Instructions <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                    placeholder="Provide detailed instructions, expectations, or context for this assignment..."
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Clock size={16} />
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="date"
                        className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 placeholder-gray-400 ${
                          errors.deadline ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                        value={deadline}
                        onChange={e => {
                          setDeadline(e.target.value);
                          if (errors.deadline) setErrors(prev => ({ ...prev, deadline: '' }));
                        }}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <span className="text-gray-400">at</span>
                      <input
                        type="time"
                        className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 placeholder-gray-400 ${
                          errors.deadline ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                        value={deadlineTime}
                        onChange={e => {
                          setDeadlineTime(e.target.value);
                          if (errors.deadline) setErrors(prev => ({ ...prev, deadline: '' }));
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
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Select a Template</h3>
                <div className="flex items-center gap-3">
                  <div className="relative w-80">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                      showTemplateFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Filter size={16} />
                    Filters
                  </button>
                </div>
              </div>

              {showTemplateFilters && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">Document Code</label>
                      <select
                        value={selectedDocCode}
                        onChange={(e) => setSelectedDocCode(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="All">All Codes</option>
                        {documentCodes.map(code => (
                          <option key={code} value={code}>{code}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">Revision Number</label>
                      <select
                        value={selectedRevision}
                        onChange={(e) => setSelectedRevision(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="All">All Revisions</option>
                        {revisionNumbers.map(rev => (
                          <option key={rev} value={rev}>Revision {rev}</option>
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
                  <div className="max-h-96 overflow-y-auto space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                    {filteredTemplates.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-600">No templates found</p>
                      </div>
                    ) : (
                      filteredTemplates.map((template) => {
                        const templateId = template._id || template.id;
                        const isSelected = selectedTemplate && (selectedTemplate._id || selectedTemplate.id) === templateId;
                        
                        return (
                          <div
                            key={templateId}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-semibold text-gray-900 truncate">{template.title}</h4>
                                  {isSelected && (
                                    <CheckCircle size={20} className="text-blue-600 flex-shrink-0" />
                                  )}
                                </div>
                                
                                <div className="flex gap-2 mt-2">
                                  {template.document_code && (
                                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                                      {template.document_code}
                                    </span>
                                  )}
                                  {(template.revision_number || template.revision_no) && (
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                                      Rev. {String(template.revision_number || template.revision_no).padStart(2, '0')}
                                    </span>
                                  )}
                                  {template.school && (
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                                      {template.school}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handlePreview(template)}
                                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                                >
                                  <Eye size={16} />
                                  Preview
                                </button>
                                
                                {!isSelected && (
                                  <button
                                    onClick={() => {
                                      setSelectedTemplate(template);
                                      if (errors.template) {
                                        setErrors(prev => ({ ...prev, template: '' }));
                                      }
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
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
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-blue-900 mb-1">Selected Template</h4>
                          <p className="text-sm text-blue-700">{selectedTemplate.title}</p>
                          <div className="flex gap-2 mt-2">
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
                    <span className="text-sm font-medium">{errors.assignedUsers}</span>
                  </div>
                )}

                {/* Selected users tags */}
                {assignedUsers.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-900">
                        {assignedUsers.length} {assignedUsers.length === 1 ? 'person' : 'people'} selected
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allUsers
                        .filter(u => assignedUsers.includes(u._id || u.id))
                        .map(user => {
                          const userId = user._id || user.id;
                          return (
                            <div
                              key={userId}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-300 rounded-full text-sm"
                            >
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <User size={12} className="text-blue-600" />
                              </div>
                              <span className="text-gray-900">{getUserDisplayName(user)}</span>
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
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

                  <div className="max-h-80 overflow-y-auto">
                    {loadingUsers ? (
                      <div className="p-8 text-center">
                        <Loader message="Loading faculty members..." />
                      </div>
                    ) : allUsers.length === 0 ? (
                      <div className="p-8 text-center">
                        <Users size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-sm text-gray-600 font-medium">No faculty members available</p>
                      </div>
                    ) : (
                      (userSearch.trim() ? filteredUsers : allUsers)
                        .filter(user => !assignedUsers.includes(user._id || user.id))
                        .slice(0, 10)
                        .map(user => {
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
                   allUsers.filter(u => !assignedUsers.includes(u._id || u.id)).length > 10 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
                      <p className="text-xs text-gray-600">
                        Showing 10 of {allUsers.filter(u => !assignedUsers.includes(u._id || u.id)).length} people. 
                        <span className="text-blue-600 font-medium"> Use search to find more</span>
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
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Assignment Details</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Title</h4>
                      <p className="text-gray-900">{title}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Due Date</h4>
                      <p className="text-gray-900">
                        {deadline && deadlineTime
                          ? new Date(`${deadline}T${deadlineTime}`).toLocaleString()
                          : 'Not set'}
                      </p>
                    </div>
                  </div>
                  
                  {instructions && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Instructions</h4>
                      <p className="text-gray-900 whitespace-pre-wrap">{instructions}</p>
                    </div>
                  )}

                  {selectedTemplate && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Selected Template</h4>
                      <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg">
                        <p className="font-medium text-gray-900">{selectedTemplate.title}</p>
                        <div className="flex gap-2 mt-2">
                          {selectedTemplate.document_code && (
                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                              {selectedTemplate.document_code}
                            </span>
                          )}
                          {(selectedTemplate.revision_number || selectedTemplate.revision_no) && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                              Rev. {String(selectedTemplate.revision_number || selectedTemplate.revision_no).padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Assigned To ({assignedUsers.length} {assignedUsers.length === 1 ? 'person' : 'people'})
                    </h4>
                    <div className="space-y-2">
                      {allUsers
                        .filter(u => assignedUsers.includes(u._id || u.id))
                        .map(user => (
                          <div key={user._id || user.id} className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-lg">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User size={16} className="text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{getUserDisplayName(user)}</p>
                            </div>
                            <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            <div className="flex gap-3">
              {currentStep < 4 ? (
                <button
                  onClick={nextStep}
                  className="px-8 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleAssign}
                  className="px-8 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
                >
                  <CheckCircle size={18} />
                  Create Assignment
                </button>
              )}
            </div>
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