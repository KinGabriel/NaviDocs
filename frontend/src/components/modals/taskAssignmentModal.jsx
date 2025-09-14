import React, { useState, useEffect } from 'react';
import {Users, CheckCircle, User, FileText, Clock, AlertCircle, X, Calendar} from 'lucide-react';
import useUser from '../../hooks/useUser';
import { fetchSchoolStaffAPI } from '../../api/userAPI';
import { assignUsersToTemplate } from '../../api/assignmentAPI';
import MultiSelectDropdown from '../MultiSelectDropdown';
import SingleSelectDropdown from '../SingleSelectDropdown';

const ProgressSteps = ({ currentStep }) => {
  const steps = [
    { id: 1, name: 'Assignment Details', icon: FileText },
    { id: 2, name: 'Assign People', icon: Users },
    { id: 3, name: 'Review & Submit', icon: CheckCircle }
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

export default function TaskAssignmentModal({ templateId, isOpen, onClose, onAssign }) {
  const user = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deadline, setDeadline] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('00:00'); // format: HH:mm, default to 12:00am
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [assignedApprover, setAssignedApprover] = useState('');
  const [docControllers, setDocControllers] = useState([]);
  const [secretaries, setSecretaries] = useState([]);
  const [deans, setDeans] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});


  if (!isOpen) return null;
  // Fetch staff when modal opens
  useEffect(() => {
    setLoadingStaff(true);
    fetchSchoolStaffAPI()
      .then(({ docControllers, secretaries, deans }) => {
        setDocControllers(docControllers || []);
        setSecretaries(secretaries || []);
        setDeans(deans || []);
        setAssignedUsers([]);
        setAssignedApprover('');
      })
      .catch(() => {
        setDocControllers([]);
        setSecretaries([]);
        setDeans([]);
        setAssignedUsers([]);
        setAssignedApprover('');
      })
      .finally(() => setLoadingStaff(false));
    // Reset deadline time to 00:00 (12:00am) when modal opens
    setDeadlineTime('00:00');
  }, []);

  // Determine role
  const userRole = user?.role?.name === 'Secretary' ? 'Secretary' : 'Dean';

  // Assign options depending on role
  let assignUserOptions = [];
  let approverOptions = [];
  let approverLabel = '';
  let approverPlaceholder = '';

  if (userRole === 'Dean') {
    assignUserOptions = docControllers;
    approverOptions = secretaries;
    approverLabel = 'Secretary (Approver/Checker)';
    approverPlaceholder = 'Select document controller...';
  } else {
    assignUserOptions = docControllers;
    approverOptions = deans;
    approverLabel = 'Dean (Approver/Checker)';
    approverPlaceholder = 'Select dean...';
  }

  // Defaults
  useEffect(() => {
    if (approverOptions.length > 0) {
      setAssignedApprover(approverOptions[0].id);
    } else {
      setAssignedApprover('');
    }
  }, [userRole, approverOptions]);

  useEffect(() => {
    if (assignUserOptions.length > 0) {
      setAssignedUsers([assignUserOptions[0].id]);
    } else {
      setAssignedUsers([]);
    }
  }, [userRole, assignUserOptions]);

  // Validation
  const validateStep = (step) => {
    const newErrors = {};
    if (step >= 1) {
      if (!title.trim()) newErrors.title = 'Title is required';
      if (!deadline) newErrors.deadline = 'Due date is required';
      if (!deadlineTime) newErrors.deadline = 'Due time is required';
      // Check if deadline is in the past
      if (deadline && deadlineTime) {
        const now = new Date();
        const selected = new Date(`${deadline}T${deadlineTime}`);
        if (selected < now) {
          newErrors.deadline = 'Due date/time cannot be in the past';
        }
      }
    }
    if (step >= 2) {
      if (assignedUsers.length === 0) newErrors.assignedUsers = 'At least one user must be assigned';
      if (!assignedApprover) newErrors.assignedApprover = 'An approver must be selected';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Handle assign
  const handleAssign = async () => {
    if (validateStep(3)) {
      // Combine date and time for deadline, format as UTC ISO string with +00:00
      let deadlineISO = '';
      if (deadline && deadlineTime) {
        // Create a Date object in local time
        const localDate = new Date(`${deadline}T${deadlineTime}`);
        // Convert to UTC and format as 'YYYY-MM-DDTHH:mm:00.000+00:00'
        const y = localDate.getUTCFullYear();
        const m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
        const d = String(localDate.getUTCDate()).padStart(2, '0');
        const hh = String(localDate.getUTCHours()).padStart(2, '0');
        const mm = String(localDate.getUTCMinutes()).padStart(2, '0');
        deadlineISO = `${y}-${m}-${d}T${hh}:${mm}:00.000+00:00`;
      }
      console.log("Assigning template:", { title, instructions, deadline: deadlineISO, assignedUsers, assignedApprover, templateId });
      const templateData = { title, instructions };
      const result = await assignUsersToTemplate(
        templateId,
        assignedUsers,
        assignedApprover,
        templateData,
        deadlineISO || undefined
      );
      onAssign?.(result);
      // Reset form
      setTitle('');
      setInstructions('');
      setDeadline('');
      setDeadlineTime('00:00');
      setAssignedUsers(assignUserOptions.length > 0 ? [assignUserOptions[0].id] : []);
      setAssignedApprover(approverOptions.length > 0 ? approverOptions[0].id : '');
      setCurrentStep(1);
      onClose?.(); 
    }
  };

  if (loadingStaff) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-gray-600">Loading staff...</div>
      </div>
    );
  }

  return (
  <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200">
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={errors.assignedUsers ? 'ring-2 ring-red-200 rounded-lg p-4 -m-4' : ''}>
                <MultiSelectDropdown
                  label={
                    <span className="flex items-center gap-1">
                      Assign User(s) <span className="text-red-500">*</span>
                    </span>
                  }
                  icon={Users}
                  options={assignUserOptions.map(u => ({
                    value: u.id,
                    label: u.name,
                    email: u.email
                  }))}
                  value={assignedUsers}
                  onChange={value => {
                    setAssignedUsers(value);
                    if (errors.assignedUsers) {
                      setErrors(prev => ({ ...prev, assignedUsers: '' }));
                    }
                  }}
                  placeholder="Select user(s)..."
                />

                {errors.assignedUsers && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.assignedUsers}
                  </p>
                )}
              </div>
              
              <div className={errors.assignedApprover ? 'ring-2 ring-red-200 rounded-lg p-4 -m-4' : ''}>
                <SingleSelectDropdown
                  label={
                    <span className="flex items-center gap-1">
                      {approverLabel} <span className="text-red-500">*</span>
                    </span>
                  }
                  icon={User}
                  value={assignedApprover}
                  onChange={value => {
                    setAssignedApprover(value);
                    if (errors.assignedApprover) {
                      setErrors(prev => ({ ...prev, assignedApprover: '' }));
                    }
                  }}
                  options={approverOptions.map(u => ({
                    value: u.id,
                    label: u.name,
                    email: u.email
                  }))}
                  placeholder={approverPlaceholder}
                />
                {errors.assignedApprover && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.assignedApprover}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {currentStep === 3 && (
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
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Approver</h4>
                    <p className="text-gray-900">
                      {approverOptions.find(u => u.id === assignedApprover)?.name || 'Not selected'}
                    </p>
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
            {currentStep < 3 ? (
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
  );
}