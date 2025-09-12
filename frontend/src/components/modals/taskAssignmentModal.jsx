import React, { useState, useEffect } from 'react';
import MultiSelectDropdown from '../../components/MultiSelectDropdown';
import Dropdown3 from '../../components/dropdowns/dropdown3';
import useUser from '../../hooks/useUser';
import { fetchSchoolStaffAPI } from '../../api/userAPI';
import { assignUsersToTemplate } from '../../api/assignmentAPI';

export default function TaskAssignmentModal({ templateId, isOpen, onClose, onAssign }) {
  const user = useUser();
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [docControllers, setDocControllers] = useState([]);
  const [secretaries, setSecretaries] = useState([]);
  const [deans, setDeans] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [assignedApprover, setAssignedApprover] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch staff when modal opens
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  // Determine role
  const userRole = user?.role?.name === 'Secretary' ? 'Secretary' : 'Dean';

  // Assign options depending on role
  let assignUserOptions = [];
  let approverOptions = [];
  let approverLabel = '';
  let approverPlaceholder = '';

  if (userRole === 'Dean') {
    assignUserOptions = secretaries;
    approverOptions = docControllers;
    approverLabel = 'Document Controller (Approver/Checker)';
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
  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Assignment title is required';
    if (!deadline) {
      newErrors.deadline = 'Due date is required';
    } else {
      const today = new Date();
      const selectedDate = new Date(deadline);
      if (selectedDate < today) newErrors.deadline = 'Due date cannot be in the past';
    }
    if (assignedUsers.length === 0) newErrors.assignedUsers = 'Please assign at least one user';
    if (!assignedApprover) newErrors.assignedApprover = 'Please select an approver';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle assign
  const handleAssign = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const templateData = { title, instructions };
      const result = await assignUsersToTemplate(
        templateId,
        assignedUsers,
        assignedApprover,
        templateData,
        deadline ? deadline : undefined
      );
      onAssign?.(result);

      // Reset form
      setTitle('');
      setInstructions('');
      setDeadline('');
      setAssignedUsers(assignUserOptions.length > 0 ? [assignUserOptions[0].id] : []);
      setAssignedApprover(approverOptions.length > 0 ? approverOptions[0].id : '');
      setErrors({});
      onClose?.();
    } catch (error) {
      console.error('Assignment failed:', error);
      setErrors({ submit: 'Failed to create assignment. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setInstructions('');
    setDeadline('');
    setErrors({});
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {loadingStaff ? (
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Loading staff...</span>
            </div>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Create Assignment</h2>
                    <p className="text-gray-600">Assign tasks to members</p>
                  </div>
                </div>
                <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* FORM */}
            <div className="p-6 space-y-8">
              {/* Assignment Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Assignment Details
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Assignment Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`w-full px-4 py-3 text-base border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.title ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 hover:border-gray-400 focus:border-blue-500'
                      }`}
                      placeholder="Enter assignment title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    {errors.title && <p className="mt-2 text-sm text-red-600">{errors.title}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Instructions <span className="font-normal text-xs text-gray-500">(optional)</span>
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm"
                      placeholder="Provide detailed instructions, expectations, or context for this assignment..."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Assignment Config */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Assignment People
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <MultiSelectDropdown
                    label="Assign User(s)" 
                    options={assignUserOptions.map((u) => ({ value: u.id, label: u.name }))}
                    value={assignedUsers}
                    onChange={setAssignedUsers}
                    placeholder="Select user(s)..."
                    
                  />
                  <Dropdown3
                    label={approverLabel}
                    value={assignedApprover}
                    onChange={setAssignedApprover}
                    options={approverOptions.map((u) => ({ value: u.id, label: u.name }))}
                    placeholder={approverPlaceholder}
                  />
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date <span className="text-red-500">*</span> </label> 
                    <input
                      type="date"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={handleClose} className="px-6 py-2 border rounded-lg">Cancel</button>
              <button
                onClick={handleAssign}
                disabled={isSubmitting}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {isSubmitting ? 'Creating...' : 'Assign'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
