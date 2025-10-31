import React, { useState, useEffect } from 'react';
import {Users, CheckCircle, User, FileText, Clock, AlertCircle, X, Calendar, Search, FileCode, History, Eye, ChevronRight, ZoomIn, Download} from 'lucide-react';
import Loader from '../loader';
import useUser from '../../hooks/useUser';
import { fetchSchoolStaffAPI } from '../../api/userAPI';
import { assignUsersToTemplate } from '../../api/assignmentAPI';
import MultiSelectDropdown from '../dropdowns/multiSelectDropdown';
import SingleSelectDropdown from '../dropdowns/singleSelectDropdown';

const ProgressSteps = ({ currentStep }) => {
  const steps = [
    { id: 1, name: 'Assignment Details', icon: FileText },
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
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPreview = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockUrl = template.file_url || template.document_url || '';
        setPreviewUrl(mockUrl);
      } catch (err) {
        setError('Failed to load document preview');
        console.error('Preview error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (template) {
      loadPreview();
    }
  }, [template]);

  return (
    <div className="fixed inset-0 backdrop-blue-[2px] bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-start justify-between bg-gray-50">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Document Preview</h3>
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
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader message='Loading published templates..'  />
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
                <p className="text-red-600 mb-2">{error}</p>
                <p className="text-sm text-gray-500">Unable to load document preview</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                <p className="text-gray-900">{template.description || 'No description available'}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">School</h4>
                  <p className="text-gray-900">{template.school || 'N/A'}</p>
                </div>
              </div>

              {previewUrl ? (
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                  <div className="aspect-[8.5/11] bg-gray-50 flex items-center justify-center">
                    <iframe
                      src={previewUrl}
                      className="w-full h-full"
                      title="Document Preview"
                    />
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 mb-2">Document preview not available</p>
                  <p className="text-sm text-gray-500">
                    The document will be accessible after assignment
                  </p>
                </div>
              )}
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

  const assignUserOptions = [
    { id: 1, name: "John Doe", email: "johndoe@slu.edu.ph" },
    { id: 2, name: "John Doe", email: "johndoe@slu.edu.ph" },
    { id: 3,  name: "John Doe", email: "johndoe@slu.edu.ph" }
  ];


  useEffect(() => {
    if (isOpen && currentStep === 2 && templates.length === 0) {
      fetchTemplates();
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (isOpen) {
      setDeadlineTime('00:00');
      setAssignedUsers(assignUserOptions.length > 0 ? [assignUserOptions[0].id] : []);
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockTemplates = [
        {
          _id: '1',
          title: 'Document Title',
          description: 'description of the document template',
          document_code: 'FA-VAA-001',
          revision_number: 3,
          school: 'STELA',
          file_url: null,
        },
        {
          _id: '2',
          title: 'Document Title',
          description: 'description of the document template',
          document_code: 'FA-VAA-001',
          revision_number: 5,
          school: 'STELA',
          file_url: null,
        },
        {
          _id: '3',
          title: 'Document Title',
          description: 'description of the document template',
          document_code: 'FA-VAA-001',
          revision_number: 2,
          school: 'STELA',
          file_url: null,
        }
      ];
      
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  if (!isOpen) return null;

  const filteredTemplates = templates.filter(template => {
    const searchLower = templateSearch.toLowerCase();
    return (
      template.title?.toLowerCase().includes(searchLower) ||
      template.document_code?.toLowerCase().includes(searchLower) ||
      template.description?.toLowerCase().includes(searchLower)
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
      
      setTitle('');
      setInstructions('');
      setDeadline('');
      setDeadlineTime('00:00');
      setSelectedTemplate(null);
      setTemplateSearch('');
      setAssignedUsers(assignUserOptions.length > 0 ? [assignUserOptions[0].id] : []);
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Select a Template</h3>
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
              </div>

              {errors.template && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">{errors.template}</span>
                </div>
              )}

              {loadingTemplates ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading templates...</p>
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
                                <p className="text-sm text-gray-600 line-clamp-2">{template.description || 'No description available'}</p>
                                
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
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {assignUserOptions.map(user => (
                    <label
                      key={user.id}
                      className="flex items-center p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-gray-300"
                    >
                      <input
                        type="checkbox"
                        checked={assignedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignedUsers(prev => [...prev, user.id]);
                          } else {
                            setAssignedUsers(prev => prev.filter(id => id !== user.id));
                          }
                          if (errors.assignedUsers) {
                            setErrors(prev => ({ ...prev, assignedUsers: '' }));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="ml-3 flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.assignedUsers && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.assignedUsers}
                  </p>
                )}
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
                        <p className="text-sm text-gray-600 mt-1">{selectedTemplate.description}</p>
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Assigned To</h4>
                      <div className="mt-1">
                        {assignUserOptions
                          .filter(u => assignedUsers.includes(u.id))
                          .map(user => (
                            <div key={user.id} className="flex items-center gap-2 text-gray-900">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              {user.name}
                            </div>
                          ))}
                      </div>
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