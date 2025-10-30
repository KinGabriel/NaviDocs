import { useState, useEffect } from "react";
import { X, FileText, Tag, Calendar, AlertTriangle } from "lucide-react";
import { formatDate } from "../../utils/formatters.jsx";

export default function PublishModal({ isOpen, onClose, template, onPublish }) {
  const [withCode, setWithCode] = useState(false);
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
      const match = typeof existing === 'string' ? existing.match(/^FM-([A-Z]{2,})-?([0-9]{0,3})$/i) : null;
      if (match) {
        setDocumentIdentifier((match[1] || 'VAA').toUpperCase());
        setDocumentSerial(match[2] || '');
      } else {
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

  const onSubmit = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const payload = withCode ? {
        document_code: `FM-${(documentIdentifier || 'VAA').toUpperCase()}${documentSerial ? `-${String(documentSerial).trim().padStart(3,'0')}` : ''}`,
        revision_no: revisionNo === '' ? undefined : Number(revisionNo),
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
                  <span className="inline-flex items-center px-3 rounded-l-md border border-gray-300 bg-gray-50 text-sm">FM-</span>
                  <select
                    value={documentIdentifier}
                    onChange={(e) => setDocumentIdentifier(e.target.value)}
                    className="px-3 py-2 border border-gray-300 text-sm rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="VAA">VAA</option>
                    {(() => {
                      const schoolMap = { 'University Wide': 'VAA', SAMCIS: 'SMI', STELA: 'STL' };
                      const schoolId = schoolMap[template?.school] || template?.school?.toUpperCase?.();
                      if (schoolId && schoolId !== 'VAA') return <option value={schoolId}>{schoolId}</option>;
                      return null;
                    })()}
                  </select>
                  <input
                    list="document-serial-options-pub"
                    value={documentSerial}
                    onChange={(e) => setDocumentSerial(e.target.value)}
                    placeholder="--"
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-r-md"
                  />
                  <datalist id="document-serial-options-pub">
                    {Array.from({ length: 999 }, (_, i) => i + 1).map((n) => {
                      const code = String(n).padStart(3, '0');
                      return <option key={code} value={code}>{code}</option>;
                    })}
                  </datalist>
                </div>
              </div>

              {/* Revision number (with datalist 00-99) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Revision Number</label>
                <input
                  list="revision-options-pub"
                  value={revisionNo}
                  onChange={(e) => setRevisionNo(e.target.value)}
                  placeholder="00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="revision-options-pub">
                  {Array.from({ length: 100 }, (_, i) => i).map((n) => {
                    const code = String(n).padStart(2, '0');
                    return <option key={code} value={code}>{code}</option>;
                  })}
                </datalist>
              </div>

              {/* Effectivity date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Effectivity Date</label>
                <input type="date" value={effectivity} onChange={e => setEffectivity(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={onClose} disabled={loading} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button onClick={onSubmit} disabled={loading} className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700">
              {loading ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
