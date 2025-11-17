/**
 * @fileoverview DocumentDetailsCard component for displaying and editing document metadata
 * @module components/cards/DocumentDetailsCard
 */

import { useState, useEffect } from 'react';
import { Calendar, FileText, Shield, X, Check, Edit2 } from 'lucide-react';
import { insertDocumentCodeAPI } from '../../api/documentContollerAPI';
import { formatDate, toISODate } from '../../utils/formatters';
import { DOCUMENT_PREFIX_OPTIONS, DOCUMENT_IDENTIFIER_OPTIONS, SCHOOL_TO_IDENTIFIER_MAP } from '../../utils/options';

/**
 * DocumentDetailsCard Component
 * 
 * Displays and allows inline editing of document details including document code,
 * revision number, effectivity date, and ISO code. Provides validation and conflict
 * detection for document codes.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.template - Template/document object containing details
 * @param {string} [props.template._id] - Document ID
 * @param {string} [props.template.document_code] - Full document code (e.g., "FM-VAA-001")
 * @param {number|string} [props.template.revision_number] - Document revision number
 * @param {number|string} [props.template.revision_no] - Alternative field for revision number
 * @param {string|Date|Object} [props.template.effectivity] - Document effectivity date
 * @param {string|Date|Object} [props.template.effectivity_date] - Alternative field for effectivity
 * @param {string} [props.template.iso_code] - ISO standard code
 * @param {string} [props.template.school] - Associated school name
 * @param {Function} props.onUpdateDocumentDetails - Callback for updating document code and effectivity
 * @param {Function} props.onUpdateISOCode - Callback for updating ISO code
 * @param {boolean} [props.canEdit=false] - Whether the user has permission to edit details
 * 
 * @returns {JSX.Element} Rendered DocumentDetailsCard component
 * 
 * @example
 * <DocumentDetailsCard
 *   template={documentTemplate}
 *   onUpdateDocumentDetails={handleUpdateDetails}
 *   onUpdateISOCode={handleUpdateISO}
 *   canEdit={userRole === 'dean'}
 * />
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
  const [docPrefix, setDocPrefix] = useState(DOCUMENT_PREFIX_OPTIONS?.[0] || 'FM');

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
    // Parse document_code into <PREFIX>-<IDENTIFIER>-<SERIAL>
    const existing = template?.document_code || '';
    const match = typeof existing === 'string' ? existing.match(/^([A-Z]{2,})-([A-Z]{2,})-?(\d*)$/i) : null;
    if (match) {
      const parsedPrefix = (match[1] || 'FM').toUpperCase();
      setDocPrefix(DOCUMENT_PREFIX_OPTIONS.includes(parsedPrefix) ? parsedPrefix : (DOCUMENT_PREFIX_OPTIONS?.[0] || 'FM'));
      setDocumentIdentifier((match[2] || 'VAA').toUpperCase());
      setDocumentSerial(match[3] || '');
    } else {
      setDocPrefix(DOCUMENT_PREFIX_OPTIONS?.[0] || 'FM');
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
  // Validation helpers (same rules as publish modal)
  const schoolCode = SCHOOL_TO_IDENTIFIER_MAP[template?.school] || template?.school?.toUpperCase?.();
  const identifierOptions = Array.from(new Set([...(DOCUMENT_IDENTIFIER_OPTIONS || []), schoolCode].filter(Boolean)));
  const prefixValid = DOCUMENT_PREFIX_OPTIONS.includes(String(docPrefix || '').trim().toUpperCase());
  const identifierValid = identifierOptions.includes(String(documentIdentifier || '').trim().toUpperCase());
  const serialValid = /^\d{1,3}$/.test(String(documentSerial || '').trim());
  const revisionValid = /^\d{1,2}$/.test(String(revisionNumber || '').trim());
  // Effectivity must be present and not earlier than today (local)
  const todayStr = (() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const adj = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return adj.toISOString().slice(0, 10);
  })();
  const hasEffectivity = Boolean(effectivityDate && String(effectivityDate).trim().length > 0);
  const notPast = hasEffectivity ? String(effectivityDate) >= todayStr : false;
  const effectivityValid = hasEffectivity && notPast;
  const canSubmit = prefixValid && identifierValid && serialValid && revisionValid && effectivityValid;

  const handleSave = async () => {
    if (!canSubmit) {
      alert('Please complete all required fields with valid values.');
      return;
    }

    setIsSaving(true);
    try {
      // Build document_code from parts: <PREFIX>-<IDENT>-<SERIAL>
      let finalDocumentCode = documentCode;
      // If user edited using the new parts, prefer those
      if ((documentIdentifier || documentSerial) && (!template?.document_code || documentCode === template?.document_code)) {
        const prefix = (docPrefix || 'FM').toUpperCase();
        const id = (documentIdentifier || 'VAA').toUpperCase();
        const serial = serialValid ? String(documentSerial).trim().padStart(3, '0') : '';
        finalDocumentCode = `${prefix}-${id}${serial ? `-${serial}` : ''}`;
      }

      // Call API to insert document code (Dean-only)
      if (template?._id) {
        const payload = {
          document_code: finalDocumentCode || undefined,
          effectivity: effectivityDate || undefined,
          // Send revision_no as a zero-padded string for consistency
          revision_no: revisionNumber !== '' ? String(revisionNumber).padStart(2, '0') : undefined
        };
        try {
          await insertDocumentCodeAPI(template._id, payload);
          setConflictError(null);
        } catch (apiErr) {
          const resp = apiErr?.response;
          if (resp && resp.status === 409) {
            const existingCode = resp.data?.existing?.document_code || payload.document_code;
            const existingRev = resp.data?.existing?.revision_no ?? payload.revision_no;

            setConflictError({
              message: `A document with code "${existingCode}" and revision number "${String(existingRev).padStart(2, '0')}" already exists. Please use a different revision number or code.`,
            });
            setIsSaving(false);
            return; // stop save
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
    setDocPrefix(DOCUMENT_PREFIX_OPTIONS?.[0] || 'FM');
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

  // timer for conflict message
  useEffect(() => {
    if (conflictError) {
      const timer = setTimeout(() => {
        setConflictError(null);
      }, 5000); // disappears after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [conflictError]);


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
          <div className="mb-4 overflow-visible">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Document Code
                </div>
                <div className="text-base text-gray-900">
                  {isEditing ? (
                    <>
                      <div className="flex gap-2 relative z-50 overflow-visible">
                        {/* Changeable prefix as select so all options show even when a value is present */}
                        <select
                          value={docPrefix}
                          onChange={(e) => { setDocPrefix(e.target.value); setConflictError(null); }}
                          className={`px-3 py-2 border border-gray-300 text-sm rounded-l-md focus:outline-none focus:ring-2 bg-white ${!prefixValid ? 'border-red-400 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                        >
                          {DOCUMENT_PREFIX_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>

                        {/* Identifier dropdown */}
                        <select
                          value={documentIdentifier}
                          onChange={(e) => {
                            setDocumentIdentifier(e.target.value);
                            setConflictError(null);
                          }}
                          className={`px-3 py-2 border border-gray-300 text-sm rounded-none focus:outline-none focus:ring-2 bg-white ${!identifierValid ? 'border-red-400 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                        >
                          {identifierOptions.map(code => (
                            <option key={code} value={code}>{code}</option>
                          ))}
                        </select>

                        {/* Serial number dropdown but typeable */}
                        <select
                          value={documentSerial}
                          onChange={(e) => {
                            setDocumentSerial(e.target.value);
                            setConflictError(null);
                          }}
                          className={`w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 rounded-r-md bg-white ${!serialValid ? 'border-red-400 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                        >
                          <option value="" disabled>--</option>
                          {Array.from({ length: 999 }, (_, i) => i + 1).map((n) => {
                            const code = String(n).padStart(3, '0');
                            return (
                              <option key={code} value={code}>
                                {code}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      {/* Inline validation messages */}
                      {!prefixValid && (
                        <p className="mt-1 text-xs text-red-600">Prefix is required and must match allowed options.</p>
                      )}
                      {!identifierValid && (
                        <p className="mt-1 text-xs text-red-600">Identifier is required and must match allowed options.</p>
                      )}
                      {!serialValid && (
                        <p className="mt-1 text-xs text-red-600">Serial is required and must be 1-3 digits (will be padded to 3).</p>
                      )}
                    </>
                  ) : (
                    template?.document_code || (
                      <span className="text-gray-400 text-md italic">Not set</span>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Revision Number Section */}
          <div className="mb-4 overflow-visible">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Revision Number
                </div>
                {isEditing ? (
                  <>
                    <select
                      value={revisionNumber}
                      onChange={(e) => {
                        setRevisionNumber(e.target.value);
                        setConflictError(null);
                      }}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 bg-white ${!revisionValid ? 'border-red-400 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                    >
                      <option value="" disabled>00</option>
                      {Array.from({ length: 100 }, (_, i) => i).map((n) => {
                        const code = String(n).padStart(2, '0');
                        return (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        );
                      })}
                    </select>
                  </>
                ) : (
                  <div className="text-base text-gray-900">
                    {revisionNumber || template?.revision_number || (
                      <span className="text-gray-400 text-md italic">Not set</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Inline conflict message for duplicate document_code+revision */}
          {conflictError && (
            <div
              className="text-sm text-red-600 mt-2 mb-5 bg-red-50 border border-red-200 p-2 rounded-md transition-opacity duration-500 ease-in-out"
            >
              <strong>Conflict:</strong> {conflictError.message}
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
                    min={todayStr}
                    onChange={(e) => setEffectivityDate(e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 ${!effectivityValid ? 'border-red-400 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                  />
                ) : (
                  <div className="text-base text-gray-900">
                    {formatDateDisplay(template?.effectivity ?? template?.effectivity_date)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Validation message for effectivity */}
          {isEditing && !effectivityValid && (
            <p className="mt-1 text-xs text-red-600">Effectivity date is required and cannot be earlier than today.</p>
          )}

          {/* Action Buttons (shown when editing) */}
          {isEditing && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleSave}
                disabled={isSaving || !canSubmit}
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
          {/* <div
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
          </div> */}
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