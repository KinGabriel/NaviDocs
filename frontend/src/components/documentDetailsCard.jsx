import { useState, useEffect } from 'react';
import { Calendar, FileText, Shield, X, Check, Edit2 } from 'lucide-react';
import { insertDocumentCodeAPI } from '../api/documentContollerAPI';
import { formatDate, toISODate } from '../utils/formatters';

/**
 * DocumentDetailsCard 
 * 
 * @param {Object} props
 * @param {Object} props.template - Template object with document details
 * @param {Function} props.onUpdateDocumentDetails - Callback for updating doc code & effectivity
 * @param {Function} props.onUpdateISOCode - Callback for updating ISO code
 * @param {boolean} props.canEdit - Whether the user can edit 
 */
export default function DocumentDetailsCard({ template, onUpdateDocumentDetails, onUpdateISOCode, canEdit = false }) {
  // State for inline editing
  const [isEditing, setIsEditing] = useState(false);
  const [documentCode, setDocumentCode] = useState('');
  const [documentIdentifier, setDocumentIdentifier] = useState('VAA');
  const [documentSerial, setDocumentSerial] = useState('');
  const [revisionNumber, setRevisionNumber] = useState('');
  const [effectivityDate, setEffectivityDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [conflictError, setConflictError] = useState(null);

  // State for ISO Code modal
  const [isISOModalOpen, setIsISOModalOpen] = useState(false);
  const [isoCode, setIsoCode] = useState('');
  const [isSavingISO, setIsSavingISO] = useState(false);

  // Handle opening edit mode
  const handleStartEdit = () => {
    setDocumentCode(template?.document_code || '');
    // support both revision_number and revision_no fields
  // normalize revision to two-digit string
  const rawRev = template?.revision_number ?? template?.revision_no ?? 0;
  const revStr = String(rawRev ?? '').padStart(2, '0');
  setRevisionNumber(revStr);
    // effectivity may be ISO string, Date, or { $date: '...' }; normalize to YYYY-MM-DD
  setEffectivityDate(toISODate(template?.effectivity ?? template?.effectivity_date));
    // Parse document_code into FM-<ID>-<NO>
    const existing = template?.document_code || '';
    const match = typeof existing === 'string' ? existing.match(/^FM-([A-Z]{2,})-?(\d*)$/i) : null;
    if (match) {
      setDocumentIdentifier((match[1] || 'VAA').toUpperCase());
      setDocumentSerial(match[2] || '');
    } else {
      // default identifier: VAA or mapped school
      setDocumentSerial('');
    }
    setIsEditing(true);
  };

  // Helper to display revision no. into a zero-padded two-digit string or empty string
  const displayRevisionNo = (t) => {
    const raw = t?.revision_number ?? t?.revision_no;
    if (raw === undefined || raw === null || raw === '') return '';
    const num = Number(raw);
    if (!Number.isNaN(num)) return String(num).padStart(2, '0');
    return String(raw).padStart(2, '0');
  };

  // Keep revisionNumber state synchronized with incoming template when not actively editing
  useEffect(() => {
    if (!isEditing) {
      setRevisionNumber(displayRevisionNo(template));
    }
  }, [template, isEditing]);

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
      // Build document_code from parts: FM-<IDENT>-<SERIAL>
      let finalDocumentCode = documentCode;
      // If user edited using the new parts, prefer those
      if ((documentIdentifier || documentSerial) && (!template?.document_code || documentCode === template?.document_code)) {
        // Ensure identifier
        const id = (documentIdentifier || 'VAA').toUpperCase();
        const serial = documentSerial ? String(documentSerial).trim() : '';
        finalDocumentCode = `FM-${id}${serial ? `-${serial}` : ''}`;
      }

      // Call API to insert document code (Dean-only)
      if (template?._id) {
        const payload = {
          document_code: finalDocumentCode || undefined,
          effectivity: effectivityDate || undefined,
          revision_no: revisionNumber !== '' ? Number(revisionNumber) : undefined
        };
        try {
          await insertDocumentCodeAPI(template._id, payload);
          setConflictError(null);
        } catch (apiErr) {
          const resp = apiErr?.response;
          if (resp && resp.status === 409) {
            // store full response data so we have both message and conflict info
            setConflictError(resp.data || { message: resp.data?.message || 'Conflict' });
            setIsSaving(false);
            return; // don't proceed to close editor
          }
          throw apiErr;
        }
      }

      // Call parent updater to sync UI state if provided
      if (typeof onUpdateDocumentDetails === 'function') {
        await onUpdateDocumentDetails({
          document_code: finalDocumentCode,
          revision_number: revisionNumber,
          effectivity_date: effectivityDate
        });
      }
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
    const rawRevCancel = template?.revision_number ?? template?.revision_no ?? 0;
    setRevisionNumber(String(rawRevCancel ?? '').padStart(2, '0'));
  setEffectivityDate(toISODate(template?.effectivity ?? template?.effectivity_date));
    // reset document code parts
    setDocumentIdentifier('VAA');
    setDocumentSerial('');
    setIsEditing(false);
  };

  // Format date for display
  const formatDateDisplay = (dateString) => {
    const iso = toISODate(dateString);
    if (!iso) return 'Not set';
    return formatDate(iso);
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
            {!isEditing && canEdit && (
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
                    {isEditing ? (
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-sm">FM-</span>
                        <select
                          value={documentIdentifier}
                          onChange={(e) => { setDocumentIdentifier(e.target.value); setConflictError(null); }}
                          className="px-3 py-2 border border-gray-300 text-sm rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {/* Always include VAA */}
                          <option value="VAA">VAA</option>
                          {/* Include template school identifier if present and not VAA */}
                          {(() => {
                            const schoolMap = {
                              'University Wide': 'VAA',
                              'SAMCIS': 'SMI',
                              'STELA': 'STL',
                            };
                            const schoolId = schoolMap[template?.school] || template?.school?.toUpperCase?.();
                            if (schoolId && schoolId !== 'VAA') {
                              return <option value={schoolId}>{schoolId}</option>;
                            }
                            return null;
                          })()}
                        </select>
                        <select
                          value={documentSerial}
                          onChange={(e) => { setDocumentSerial(e.target.value); setConflictError(null); }}
                          className="w-full px-3 py-2 border-t border-b border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">--</option>
                          {Array.from({ length: 999 }, (_, i) => i + 1).map(n => {
                            const code = String(n).padStart(3, '0');
                            return (
                              <option key={code} value={code}>{code}</option>
                            );
                          })}
                        </select>
                      </div>
                    ) : (
                      (template?.document_code) || (
                        <span className="text-gray-400 text-md italic">Not set</span>
                      )
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
                        <select
                          value={revisionNumber}
                          onChange={(e) => { setRevisionNumber(e.target.value); setConflictError(null); }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Array.from({ length: 100 }, (_, i) => i).map(n => {
                            const code = String(n).padStart(2, '0');
                            return (
                              <option key={code} value={code}>{code}</option>
                            );
                          })}
                        </select>
                      ) : (
                        <div className="text-base text-gray-900">{(revisionNumber || template?.revision_number) || (<span className="text-gray-400 text-md italic">Not set</span>)}</div>
                      )}
              </div>
            </div>
          </div>
          {/* Inline conflict message for duplicate document_code+revision */}
          {conflictError && (
            <div className="text-sm text-red-600 mt-1">
              {conflictError?.message || 'Conflict detected.'}
              {conflictError?.conflict?.title ? ` — ${conflictError.conflict.title}` : ''}
            </div>
          )}

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
                    {formatDateDisplay(template?.effectivity ?? template?.effectivity_date)}
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
            onClick={canEdit ? handleOpenISOModal : undefined}
            className={`flex items-start gap-2 p-3 -mx-3 rounded-md transition-colors group ${
              canEdit ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
            }`}
          >
            <Shield className={`w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0 ${canEdit ? 'group-hover:text-blue-600' : ''}`} />
            <div className="flex-1">
              <div className={`text-xs font-semibold text-gray-500 tracking-wider mb-1 ${canEdit ? 'group-hover:text-blue-600' : ''}`}>
                ISO Code (Optional) 
              </div>
              <div className="text-base text-gray-900">
                {template?.iso_code || (
                  <span className={`text-gray-400 text-md italic ${canEdit ? 'group-hover:text-blue-500' : ''}`}>
                    {canEdit ? 'Click to add ISO code' : 'Not set'}
                  </span>
                )}
              </div>
            </div>
            {canEdit && <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-blue-600 mt-0.5" />}
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