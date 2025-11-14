import React, { useState, useEffect } from 'react';
import { adjustTemplateDeadlineAPI } from '../../api/documentContollerAPI';
import { Calendar, Clock, X, Save, AlertCircle } from 'lucide-react';

export default function UpdateDeadlineModal(
  { isOpen,
    onClose,
    currentDeadline,
    onUpdate,
    templateTitle,
    templateId
  }) {
  const [deadline, setDeadline] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && currentDeadline) {
      // Parse existing deadline if available
      const date = new Date(currentDeadline);
      const dateStr = date.toISOString().split('T')[0];
      const timeStr = date.toTimeString().slice(0, 5);
      setDeadline(dateStr);
      setDeadlineTime(timeStr);
    } else if (isOpen) {
      // Default to today's date and current time
      const now = new Date();
      setDeadline(now.toISOString().split('T')[0]);
      setDeadlineTime(now.toTimeString().slice(0, 5));
    }
  }, [isOpen, currentDeadline]);

  const validateDeadline = () => {
    const newErrors = {};

    if (!deadline) {
      newErrors.deadline = 'Date is required';
    }
    if (!deadlineTime) {
      newErrors.deadlineTime = 'Time is required';
    }

    // Check if deadline is in the past
    if (deadline && deadlineTime) {
      const now = new Date();
      const selected = new Date(`${deadline}T${deadlineTime}`);
      if (selected < now) {
        newErrors.deadline = 'Deadline cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateDeadline()) return;
    setIsSubmitting(true);
    try {
      const newDeadline = new Date(`${deadline}T${deadlineTime}`);
      if (!templateId) throw new Error('No templateId provided');
      await adjustTemplateDeadlineAPI(templateId, newDeadline.toISOString());
      if (typeof onUpdate === 'function') await onUpdate(newDeadline.toISOString());
      onClose();
    } catch (error) {
      console.error('Error updating deadline:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDeadline('');
    setDeadlineTime('');
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-yellow-600" />
              Update Deadline
            </h2>
            <p className="text-sm text-gray-600">
              {templateTitle ? `For: ${templateTitle}` : 'Set new deadline for this template'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Deadline Display */}
          {currentDeadline && (
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <Clock size={14} className="text-yellow-600" />
                Current Deadline
              </h4>
              <div className="bg-white rounded-md p-3 border border-yellow-100">
                <p className="text-sm font-medium text-gray-900">
                  {new Date(currentDeadline).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  at {new Date(currentDeadline).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
            </div>
          )}

          {/* New Deadline Form */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-800">New Deadline</h4>

            {/* Date Input */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
                  <Calendar size={16} className="text-gray-400" />
                </div>
                <input
                  type="date"
                  className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 rounded-xl shadow-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all duration-200 ${errors.deadline
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                  value={deadline}
                  onChange={e => {
                    setDeadline(e.target.value);
                    if (errors.deadline) {
                      setErrors(prev => ({ ...prev, deadline: '' }));
                    }
                  }}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Time Input */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
                  <Clock size={16} className="text-gray-400" />
                </div>
                <input
                  type="time"
                  className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 rounded-xl shadow-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all duration-200 ${errors.deadlineTime
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                  value={deadlineTime}
                  onChange={e => {
                    setDeadlineTime(e.target.value);
                    if (errors.deadlineTime) {
                      setErrors(prev => ({ ...prev, deadlineTime: '' }));
                    }
                  }}
                />
              </div>
            </div>

            {/* Error Messages */}
            {(errors.deadline || errors.deadlineTime) && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-sm text-rose-700 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {errors.deadline || errors.deadlineTime}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-yellow-700 text-white rounded-lg hover:bg-yellow-800 rounded-md text-white font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Save size={16} />
            {isSubmitting ? 'Updating...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};