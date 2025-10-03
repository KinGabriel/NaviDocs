import { useState } from 'react';
import { Calendar, FileText, Shield, X, Check, Edit2 } from 'lucide-react';
import { formatDate } from '../utils/formatters';

/**
 * DocumentDetailsCard 
 * 
 * @param {Object} props
 * @param {Object} props.template - Template object with document details
 * @param {Function} props.onUpdateDocumentDetails - Callback for updating doc code & effectivity
 * @param {Function} props.onUpdateISOCode - Callback for updating ISO code
 */
export default function DocumentDetailsCard({ template, onUpdateDocumentDetails, onUpdateISOCode }) {
  // State for inline editing
  const [isEditing, setIsEditing] = useState(false);
  const [documentCode, setDocumentCode] = useState('');
  const [revisionNumber, setRevisionNumber] = useState('');
  const [effectivityDate, setEffectivityDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // State for ISO Code modal
  const [isISOModalOpen, setIsISOModalOpen] = useState(false);
  const [isoCode, setIsoCode] = useState('');
  const [isSavingISO, setIsSavingISO] = useState(false);

  // Handle opening edit mode
  const handleStartEdit = () => {
    setDocumentCode(template?.document_code || '');
    setRevisionNumber(template?.revision_number || '');
    setEffectivityDate(template?.effectivity_date || '');
    setIsEditing(true);
  };

  // Handle opening ISO modal
  const handleOpenISOModal = () => {
    setIsoCode(template?.iso_code || '');
    setIsISOModalOpen(true);
  };

  // Handle saving document code and effectivity date
  const handleSave = async () => {
    if (!effectivityDate) {
      alert('Please fill in the Effectivity Date');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateDocumentDetails({
        document_code: documentCode,
        revision_number: revisionNumber,
        effectivity_date: effectivityDate
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving ISO code
  const handleSaveISO = async () => {
    if (!isoCode.trim()) {
      alert('Please enter an ISO Code');
      return;
    }

    setIsSavingISO(true);
    try {
      await onUpdateISOCode({ iso_code: isoCode });
      setIsISOModalOpen(false);
    } catch (error) {
      console.error('Failed to save ISO:', error);
    } finally {
      setIsSavingISO(false);
    }
  };

  // Handle cancel editing
  const handleCancel = () => {
    setDocumentCode(template?.document_code || '');
    setRevisionNumber(template?.revision_number || '');
    setEffectivityDate(template?.effectivity_date || '');
    setIsEditing(false);
  };

  // Format date for display
  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'Not set';
    return formatDate(dateString);
  };

  return (
    <>
      {/* Document Details Card */}
      <div className="bg-white border rounded-md shadow-sm mb-4">
        <div className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold tracking-widest text-gray-900 uppercase font-sans">
              Document Details
            </h3>
            {!isEditing && (
              <button
                onClick={handleStartEdit}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Edit document details"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="w-16 h-0.5 bg-yellow-400 mb-4 rounded" />

        {/* Document Code Section */}
        <div className="mb-4">
        <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Document Code
            </div>
            <div className="text-base text-gray-900">
                {template?.document_code || (
                <span className="text-gray-400 text-md italic">Not set</span>
                )}
            </div>
            </div>
        </div>
        </div>

          {/* Revision Number Section */}
          <div className="mb-4">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Revision Number
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={revisionNumber}
                    onChange={(e) => setRevisionNumber(e.target.value)}
                    placeholder="e.g., 00, 01, 02"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-base text-gray-900">
                    {(revisionNumber || template?.revision_number) || (
                      <span className="text-gray-400 text-md italic">Not set</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Effectivity Date Section */}
          <div className="mb-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Effectivity Date
                </div>
                {isEditing ? (
                  <input
                    type="date"
                    value={effectivityDate}
                    onChange={(e) => setEffectivityDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-base text-gray-900">
                    {formatDateDisplay(template?.effectivity_date)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons (shown when editing) */}
          {isEditing && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <Check className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}

          {/* ISO Code Section - Clickable to open modal */}
          <div
            onClick={handleOpenISOModal}
            className="flex items-start gap-2 cursor-pointer p-3 -mx-3 rounded-md hover:bg-gray-50 transition-colors group"
          >
            <Shield className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0 group-hover:text-blue-600" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-gray-500 tracking-wider mb-1 group-hover:text-blue-600">
                ISO Code (Optional) 
              </div>
              <div className="text-base text-gray-900">
                {template?.iso_code || (
                  <span className="text-gray-400 text-md italic group-hover:text-blue-500">
                    Click to add ISO code
                  </span>
                )}
              </div>
            </div>
            <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-blue-600 mt-0.5" />
          </div>
        </div>
      </div>

      {/* ISO Code Modal */}
      {isISOModalOpen && (
        <div className="fixed inset-0 backdrop-blur-[2px] bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Add ISO Code
                </h2>
              </div>
              <button
                onClick={() => setIsISOModalOpen(false)}
                disabled={isSavingISO}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                ISO Code
              </label>
              <input
                type="text"
                value={isoCode}
                onChange={(e) => setIsoCode(e.target.value)}
                placeholder="Enter ISO code (e.g., FM-VAA-001)"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter the ISO standard code associated with this document.
              </p>
            </div>

            <div className="flex gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setIsISOModalOpen(false)}
                disabled={isSavingISO}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveISO}
                disabled={isSavingISO || !isoCode.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isSavingISO ? 'Saving...' : 'Save ISO Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}