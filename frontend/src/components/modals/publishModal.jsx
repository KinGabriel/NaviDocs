import { useState, useEffect } from "react";
import { X, FileText, Tag, Calendar, AlertTriangle } from "lucide-react";
import { formatDate } from "../../utils/formatters.jsx";
import { DOCUMENT_PREFIX_OPTIONS, DOCUMENT_IDENTIFIER_OPTIONS, SCHOOL_TO_IDENTIFIER_MAP } from "../../utils/options";

export default function PublishModal({ isOpen, onClose, template, onPublish }) {
  const [withCode, setWithCode] = useState(false);
  const [docPrefix, setDocPrefix] = useState(DOCUMENT_PREFIX_OPTIONS?.[0] || 'FM');
  const [documentIdentifier, setDocumentIdentifier] = useState('VAA');
  const [documentSerial, setDocumentSerial] = useState('');
  const [revisionNo, setRevisionNo] = useState('');
  const [effectivity, setEffectivity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setWithCode(false);
      // Pre-populate from existing template data
      const existing = template?.document_code || '';
      // Parse as <PREFIX>-<IDENTIFIER>-<SERIAL>
      const match = typeof existing === 'string' ? existing.match(/^([A-Z]{2,})-([A-Z]{2,})-?([0-9]{0,3})?$/i) : null;
      if (match) {
        const parsedPrefix = (match[1] || 'FM').toUpperCase();
        setDocPrefix(DOCUMENT_PREFIX_OPTIONS.includes(parsedPrefix) ? parsedPrefix : (DOCUMENT_PREFIX_OPTIONS?.[0] || 'FM'));
        setDocumentIdentifier((match[2] || 'VAA').toUpperCase());
        setDocumentSerial(match[3] || '');
      } else {
        setDocPrefix('FM');
        setDocumentIdentifier('VAA');
        setDocumentSerial('');
      }
      setRevisionNo(
        (() => {
          const raw = template?.revision_number ?? template?.revision_no;
          if (raw === undefined || raw === null || raw === '') return '';
          const num = Number(raw);
          if (!Number.isNaN(num)) return String(num).padStart(2, '0');
          return String(raw).padStart(2, '0');
        })()
      );
      // Expecting yyyy-mm-dd for input type=date
      const eff = template?.effectivity ? new Date(template.effectivity) : null;
      setEffectivity(eff ? new Date(eff.getTime() - eff.getTimezoneOffset()*60000).toISOString().slice(0,10) : "");
      setError("");
      setLoading(false);
    }
  }, [isOpen, template?._id]);

  if (!isOpen) return null;

  // Validation helpers (required when publishing with document code)
  const schoolCode = SCHOOL_TO_IDENTIFIER_MAP[template?.school] || template?.school?.toUpperCase?.();
  const identifierOptions = Array.from(new Set([...(DOCUMENT_IDENTIFIER_OPTIONS || []), schoolCode].filter(Boolean)));
  const prefixValid = DOCUMENT_PREFIX_OPTIONS.includes(String(docPrefix || '').trim().toUpperCase());
  const identifierValid = identifierOptions.includes(String(documentIdentifier || '').trim().toUpperCase());
  const serialValid = /^\d{1,3}$/.test(String(documentSerial || '').trim());
  const revisionValid = /^\d{1,2}$/.test(String(revisionNo || '').trim());
  // Effectivity must be present and not earlier than today (local)
  const todayStr = (() => {
    const now = new Date();
    now.setHours(0,0,0,0);
    const adj = new Date(now.getTime() - now.getTimezoneOffset()*60000);
    return adj.toISOString().slice(0,10);
  })();
  const hasEffectivity = Boolean(effectivity && String(effectivity).trim().length > 0);
  const notPast = hasEffectivity ? String(effectivity) >= todayStr : false;
  const effectivityValid = hasEffectivity && notPast;
  const canSubmit = !withCode || (prefixValid && identifierValid && serialValid && revisionValid && effectivityValid);

  const onSubmit = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      if (withCode && !canSubmit) {
        throw new Error("Please complete all required fields with valid values.");
      }
      const serialPadded = serialValid ? String(documentSerial).trim().padStart(3, '0') : '';
      const payload = withCode ? {
        document_code: `${(docPrefix || 'FM').toUpperCase()}-${(documentIdentifier || 'VAA').toUpperCase()}${documentSerial ? `-${serialPadded}` : ''}`,
        // Ensure revision_no is sent as a string (zero-padded)
        revision_no: revisionNo === '' ? undefined : String(revisionNo).padStart(2, '0'),
        effectivity: effectivity || undefined
      } : {};
      await onPublish(template, payload);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to publish template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-semibold">Publish Template</h3>
          <button className="p-2 hover:bg-gray-100 rounded" onClick={onClose} disabled={loading}>
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Template info */}
          <div className="bg-blue-50 p-4 rounded-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-700">Title</p>
                  <p className="font-medium text-gray-900">{template?.title || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-700">Status</p>
                  <p className="font-medium text-gray-900">Approved</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-700">Effectivity</p>
                  <p className="font-medium text-gray-900">{template?.effectivity ? formatDate(template.effectivity) : '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Choice */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input id="pub-no-code" type="radio" name="pub-code" checked={!withCode} onChange={() => setWithCode(false)} />
              <label htmlFor="pub-no-code" className="text-sm">Publish without document code</label>
            </div>
            <div className="flex items-center gap-3">
              <input id="pub-with-code" type="radio" name="pub-code" checked={withCode} onChange={() => setWithCode(true)} />
              <label htmlFor="pub-with-code" className="text-sm">Publish and set document code</label>
            </div>
          </div>

          {withCode && (
            <div className="space-y-4">
              {/* Document Code Parts (match DocumentDetailsCard layout) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Document Code</label>
                <div className="flex gap-2 relative z-50 overflow-visible">
                  {/* Changeable prefix as select so all options show even when a value is present */}
                  <select
                    value={docPrefix}
                    onChange={(e) => setDocPrefix(e.target.value)}
                    className={`px-3 py-2 border border-gray-300 text-sm rounded-l-md focus:outline-none focus:ring-2 bg-white ${withCode && !prefixValid ? 'border-red-400 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                  >
                    {DOCUMENT_PREFIX_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <select
                    value={documentIdentifier}
                    onChange={(e) => setDocumentIdentifier(e.target.value)}
                    className={`px-3 py-2 border border-gray-300 text-sm rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${withCode && !identifierValid ? 'border-red-400 focus:ring-red-500' : ''}`}
                  >
                    {identifierOptions.map(code => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                  {/* Serial as select so all options show regardless of current value */}
                  <select
                    value={documentSerial}
                    onChange={(e) => setDocumentSerial(e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 rounded-r-md bg-white ${withCode && !serialValid ? 'border-red-400 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                  >
                    <option value="" disabled>--</option>
                    {Array.from({ length: 999 }, (_, i) => i + 1).map((n) => {
                      const code = String(n).padStart(3, '0');
                      return <option key={code} value={code}>{code}</option>;
                    })}
                  </select>
                </div>
                {withCode && !prefixValid && (
                  <p className="mt-1 text-xs text-red-600">Prefix is required and must be at least 2 uppercase letters.</p>
                )}
                {withCode && !identifierValid && (
                  <p className="mt-1 text-xs text-red-600">Identifier is required and must be uppercase letters.</p>
                )}
                {withCode && !serialValid && (
                  <p className="mt-1 text-xs text-red-600">Serial is required and must be 1-3 digits (will be padded to 3).</p>
                )}
              </div>

              {/* Revision number (with datalist 00-99) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Revision Number</label>
                <select
                  value={revisionNo}
                  onChange={(e) => setRevisionNo(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 bg-white ${withCode && !revisionValid ? 'border-red-400 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                >
                  <option value="" disabled>00</option>
                  {Array.from({ length: 100 }, (_, i) => i).map((n) => {
                    const code = String(n).padStart(2, '0');
                    return <option key={code} value={code}>{code}</option>;
                  })}
                </select>
                {withCode && !revisionValid && (
                  <p className="mt-1 text-xs text-red-600">Revision is required and must be 0-99 (will be padded to 2 digits).</p>
                )}
              </div>

              {/* Effectivity date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Effectivity Date</label>
                <input type="date" value={effectivity} min={todayStr} onChange={e => setEffectivity(e.target.value)} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 ${withCode && !effectivityValid ? 'border-red-400 focus:ring-red-500' : 'focus:ring-blue-500'}`} />
                {withCode && !effectivityValid && (
                  <p className="mt-1 text-xs text-red-600">Effectivity date is required and cannot be earlier than today.</p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={onClose} disabled={loading} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button onClick={onSubmit} disabled={loading || !canSubmit} className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
