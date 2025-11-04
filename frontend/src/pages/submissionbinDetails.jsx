import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../layout/headers/header";
import Sidebar from "../layout/sidebars/sidebar";
import useUser from "../hooks/useUser";
import { StatusBadge, formatDate, formatDateTime } from "../utils/formatters";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  MoreVertical,
  Pencil,
  Send,
  Plus,
  Trash2,
} from "lucide-react";
import { getSubmissionBinAPI, updateSubmissionBinAPI, forwardSubmissionBinAPI, upsertSubmissionAPI } from "../api/assignmentDocumentsAPI";
import { getFacultyByDepartmentAPI } from "../api/userAPI";
import { getTemplateByIdAPI, fetchPublishedTemplatesAPI } from "../api/documentContollerAPI";
import TextEditor from "../layout/create_template/textEditor";


export default function SubmissionDetails() {
  const user = useUser();
  const navigate = useNavigate();
  const { id } = useParams();
  const [bin, setBin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const roleName = (user?.role?.name || user?.role || '').toString();
  const isDeptHead = roleName.toLowerCase() === 'department head' || roleName.toLowerCase() === 'department_head' || roleName.toLowerCase() === 'dept-head' || roleName.toLowerCase() === 'dept head' || roleName.toLowerCase() === 'department-head';
  const userId = user?._id || user?.id;

  // edit form state
  const [form, setForm] = useState({ title: '', instructions: '', deadline: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [forwarding, setForwarding] = useState(false);

  // assign form state
  const [assignForm, setAssignForm] = useState({ template: '', facultyIds: [], instructions: '' });
  const [facultyList, setFacultyList] = useState([]);
  const [assigning, setAssigning] = useState(false);

  const toInputDateTime = (d) => {
    if (!d) return '';
    try { return new Date(d).toISOString().slice(0,16); } catch { return ''; }
  };

  const handleViewSubmission = (submissionId) => {
    navigate(`/submissions/${submissionId}`);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getSubmissionBinAPI(id);
        if (!mounted) return;
        setBin(data);
        // seed form from data
        const status = String(data?.status || 'active').toLowerCase();
        setForm({
          title: data?.title || '',
          instructions: data?.instructions || '',
          deadline: toInputDateTime(data?.deadline || ''),
          status,
        });
        // seed assign template default
        const firstTpl = Array.isArray(data?.template_ids) && data.template_ids.length ? String(data.template_ids[0]) : '';
        setAssignForm(prev => ({ ...prev, template: firstTpl }));
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load submission bin");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const stats = useMemo(() => {
    const items = Array.isArray(bin?.submissions) ? bin.submissions : [];
    const total = items.length;
    const submitted = items.filter((u) => String(u.status) === "submitted").length;
    const pending = items.filter((u) => String(u.status) === "assigned").length;
    const late = 0; // not tracked explicitly yet
    const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, pending, late, percentage };
  }, [bin]);

  const daysUntilDue = useMemo(() => {
    const d = bin?.deadline ? new Date(bin.deadline) : null;
    if (!d) return Number.POSITIVE_INFINITY;
    return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  }, [bin?.deadline]);
  const isOverdue = daysUntilDue < 0;

  const handleBack = () => navigate(-1);

  // Load and cache details for templates configured on this bin
  const [templatesInfo, setTemplatesInfo] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTplPreview, setShowTplPreview] = useState(false);
  const [tplToPreview, setTplToPreview] = useState(null);
  const [tplCurrentPage, setTplCurrentPage] = useState(0);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [addingTpl, setAddingTpl] = useState(false);
  // Add-template catalog state (replicates TaskAssignmentModal list UX)
  const [addTplTemplates, setAddTplTemplates] = useState([]);
  const [addTplLoading, setAddTplLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedDocCode, setSelectedDocCode] = useState("All");
  const [selectedRevision, setSelectedRevision] = useState("All");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);

  useEffect(() => {
    const ids = Array.isArray(bin?.template_ids) ? [...new Set(bin.template_ids.map(String))] : [];
    if (!ids.length) { setTemplatesInfo([]); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoadingTemplates(true);
        const results = await Promise.allSettled(ids.map(async (id) => {
          try {
            const res = await getTemplateByIdAPI(id);
            const tpl = res?.template || res?.data?.template || res?.data || res;
            return { ...tpl, _id: tpl?._id || tpl?.id || id };
          } catch (e) { return null; }
        }));
        if (!cancelled) {
          setTemplatesInfo(results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean));
        }
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bin?.template_ids]);

  // Load templates catalog when opening Add Template modal
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!showAddTemplate) return;
      if (addTplTemplates.length) return;
      try {
        setAddTplLoading(true);
        const res = await fetchPublishedTemplatesAPI({ limit: 100, page: 1 });
        let templateList = [];
        if (res?.success && res.data?.templates) templateList = res.data.templates;
        else if (res?.templates) templateList = res.templates;
        else if (Array.isArray(res)) templateList = res;
        if (!cancelled) setAddTplTemplates(templateList);
      } catch (e) {
        if (!cancelled) setAddTplTemplates([]);
      } finally {
        if (!cancelled) setAddTplLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showAddTemplate]);

  // Derive filters and filtered list
  const addTplDocCodes = useMemo(() => (
    [...new Set(addTplTemplates.map(t => t.document_code).filter(Boolean))].sort()
  ), [addTplTemplates]);
  const addTplRevisions = useMemo(() => (
    [...new Set(addTplTemplates.map(t => {
      const rev = t.revision_number ?? t.revision_no;
      return rev !== undefined && rev !== null ? String(rev).padStart(2,'0') : null;
    }).filter(Boolean))].sort()
  ), [addTplTemplates]);
  const filteredAddTemplates = useMemo(() => {
    const searchLower = templateSearch.toLowerCase();
    return addTplTemplates.filter(t => {
      const matchesSearch = (
        t.title?.toLowerCase().includes(searchLower) ||
        t.document_code?.toLowerCase().includes(searchLower)
      );
      const matchesCode = selectedDocCode === 'All' || t.document_code === selectedDocCode;
      const matchesRevision = selectedRevision === 'All' || String(t.revision_number ?? t.revision_no).padStart(2,'0') === selectedRevision;
      return matchesSearch && matchesCode && matchesRevision;
    });
  }, [addTplTemplates, templateSearch, selectedDocCode, selectedRevision]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} />
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-600">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !bin) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} />
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <FileText size={64} className="text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Bin Not Found</h2>
            <p className="text-gray-600 mb-6">{error || "The submission bin you're looking for doesn't exist."}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

 return (
   <>
   <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-4 md:px-8 mx-3 md:mx-6 mt-4 md:mt-8 rounded-xl overflow-x-hidden">
          <div className="flex-1 px-1 py-5">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="inline-flex items-center px-4 py-2 gap-2 text-[#0035DA] hover:bg-blue-50 rounded-lg mb-6 font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              Back
            </button>

            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText size={24} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {bin.title}
                      </h1>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock size={16} />
                          Created
                          <span>{formatDate(bin.createdAt || bin.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge type={bin.status} />
                  {(isDeptHead || String(bin.created_by||'')===String(userId||'')) && (
                    <>
                      {!bin.is_forwarded && (
                        <button
                          onClick={async () => {
                            if (String(bin.status).toLowerCase() !== 'completed') return; // guard when disabled
                            try {
                              setForwarding(true);
                              const updated = await forwardSubmissionBinAPI(bin._id || bin.id);
                              setBin(updated);
                            } catch (err) {
                              alert(err?.responseData?.message || err?.message || 'Failed to forward');
                            } finally {
                              setForwarding(false);
                            }
                          }}
                          disabled={forwarding || String(bin.status).toLowerCase() !== 'completed'}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border ${forwarding || String(bin.status).toLowerCase() !== 'completed' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                          title={String(bin.status).toLowerCase() === 'completed' ? 'Forward to Secretary/Dean' : 'Set status to Completed to enable forwarding'}
                        >
                          <Send size={16} /> {forwarding ? 'Forwarding…' : 'Forward'}
                        </button>
                      )}
                      <button
                        onClick={() => setShowAssign(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50"
                      >
                        + Assign
                      </button>
                      <button
                        onClick={() => setShowEdit(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil size={16} /> Edit
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Instructions and Deadline - Same Width */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Instructions */}
                {bin.instructions && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Instructions:</p>
                    <p className="text-sm text-gray-600">{bin.instructions}</p>
                  </div>
                )}

                {/* Deadline Banner */}
                <div
                  className={`p-4 rounded-lg flex items-center gap-3 ${
                    isOverdue
                      ? "bg-red-50 border border-red-200"
                      : daysUntilDue <= 3
                      ? "bg-orange-50 border border-orange-200"
                      : "bg-blue-50 border border-blue-200"
                  }`}
                >
                  <Calendar
                    size={20}
                    className={
                      isOverdue
                        ? "text-red-600"
                        : daysUntilDue <= 3
                        ? "text-orange-600"
                        : "text-blue-600"
                    }
                  />
                  <div className="flex-1">
                    <p
                      className={`font-semibold ${
                        isOverdue
                          ? "text-red-900"
                          : daysUntilDue <= 3
                          ? "text-orange-900"
                          : "text-blue-900"
                      }`}
                    >
                      Due {formatDateTime(bin.deadline)}
                    </p>
                    <p
                      className={`text-sm ${
                        isOverdue
                          ? "text-red-700"
                          : daysUntilDue <= 3
                          ? "text-orange-700"
                          : "text-blue-700"
                      }`}
                    >
                    </p>
                  </div>
                </div>
              </div>

              {/* Templates Required */}
              {Array.isArray(bin.template_ids) && bin.template_ids.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">Templates required for submissions:</p>
                    <div className="flex items-center gap-2">
                      {loadingTemplates && <span className="text-xs text-gray-500">Loading templates…</span>}
                      {(isDeptHead || String(bin.created_by||'')===String(userId||'')) && (
                        <button
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white text-gray-700 hover:bg-gray-50 text-sm"
                          onClick={() => setShowAddTemplate(true)}
                        >
                          <Plus size={14}/> Add Template
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {(templatesInfo.length ? templatesInfo : bin.template_ids).map((t) => {
                      const id = typeof t === 'string' ? t : (t._id || t.id);
                      const title = typeof t === 'string' ? String(t) : (t.title || String(id));
                      const docCode = typeof t === 'string' ? '' : (t.document_code || t.docCode || '');
                      const revision = typeof t === 'string' ? '' : (t.revision_no ?? t.revision_number);
                      const effectivity = typeof t === 'string' ? '' : (t.effectivity || t.effectivity_date || '');
                      return (
                        <div key={String(id)} className="border rounded-lg bg-white p-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate" title={title}>{title}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {docCode && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">{docCode}</span>}
                              {(revision !== undefined && revision !== null && revision !== '') && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Rev. {String(revision).padStart(2,'0')}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              className="text-blue-600 text-sm font-medium hover:underline"
                              onClick={() => { setTplToPreview(typeof t === 'string' ? null : t); setTplCurrentPage(0); setShowTplPreview(true); }}
                              disabled={typeof t === 'string'}
                              title={typeof t === 'string' ? 'Details still loading…' : 'Preview template'}
                            >
                              Preview
                            </button>
                            {(isDeptHead || String(bin.created_by||'')===String(userId||'')) && (
                              <button
                                className="text-red-600 text-sm font-medium hover:underline"
                                onClick={async () => {
                                  if (!confirm('Remove this template from the bin? Existing submissions using it will remain as-is.')) return;
                                  try {
                                    const nextIds = (bin.template_ids || []).map(String).filter(x => x !== String(id));
                                    const updated = await updateSubmissionBinAPI(bin._id || bin.id, { template_ids: nextIds });
                                    setBin(updated);
                                    setTemplatesInfo(prev => prev.filter(x => String(x._id||x.id) !== String(id)));
                                  } catch (e) {
                                    alert(e?.responseData?.message || e?.message || 'Failed to remove template');
                                  }
                                }}
                              >
                                <Trash2 size={16}/>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard label="Total Assigned" value={stats.total} icon={Users} color="blue" />
              <StatsCard label="Submitted" value={stats.submitted} icon={CheckCircle} color="green" />
              <StatsCard label="Pending" value={stats.pending} icon={Clock} color="orange" />
              <StatsCard label="Late/Missing" value={stats.late} icon={AlertCircle} color="red" />
            </div>

            {/* Submitted Documents/File Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Submitted Files</h3>
              </div>
              {Array.isArray(bin.submissions) && bin.submissions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                      
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Faculty</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Submitted On</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bin.submissions.map((item) => (
                        <tr key={item._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {item.faculty_name || item.faculty_user?.name || item.faculty_user?.fullname || `${item.faculty_user?.firstname || ''} ${item.faculty_user?.lastname || ''}`.trim() || String(item.faculty)}
                          </td>
                          <td className="px-6 py-4"><StatusBadge type={item.status} /></td>
                          <td className="px-6 py-4 text-sm text-gray-600">{item.submitted_at ? formatDateTime(item.submitted_at) : '-'}</td>
                          <td className="px-6 py-4">
                            {item.status === 'submitted' && item.document ? (
                              <button
                                className="inline-flex items-center justify-center px-4 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                                onClick={() => handleViewSubmission(item._id)}
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-sm text-gray-400">Not yet submitted</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-600">No submissions assigned yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
  </div>
  {showEdit && (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
        <div className="bg-white w-full max-w-xl rounded-lg shadow-lg border border-gray-200">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Edit Bin Settings</h3>
            <button onClick={() => setShowEdit(false)} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                setSaving(true);
                const payload = {
                  title: form.title,
                  instructions: form.instructions,
                  deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
                };
                // status: allow toggle only if not completed
                payload.status = form.status;
                const updated = await updateSubmissionBinAPI(bin._id || bin.id, payload);
                setBin(updated);
                setShowEdit(false);
              } catch (err) {
                alert(err?.responseData?.message || err?.message || 'Failed to update bin');
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full border rounded-md px-3 py-2"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 min-h-24"
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded-md px-3 py-2"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div className="px-5 py-4 border-t flex gap-3 justify-end">
              <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className={`px-4 py-2 rounded-md ${saving ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    {showAddTemplate && (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
        <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between bg-gray-50">
            <h3 className="font-semibold text-gray-900">Select a Template</h3>
            <button onClick={() => { setShowAddTemplate(false); setSelectedTemplateIds([]); }} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <div className="p-5 space-y-4">
            {/* Search + Filters */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch">
              <input
                type="text"
                className="flex-1 border rounded-md px-3 py-2"
                placeholder="Search templates..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
              />
              <div className="flex gap-2">
                <select className="border rounded-md px-2 py-2" value={selectedDocCode} onChange={(e)=>setSelectedDocCode(e.target.value)}>
                  <option value="All">All Codes</option>
                  {addTplDocCodes.map(code => <option key={code} value={code}>{code}</option>)}
                </select>
                <select className="border rounded-md px-2 py-2" value={selectedRevision} onChange={(e)=>setSelectedRevision(e.target.value)}>
                  <option value="All">All Revisions</option>
                  {addTplRevisions.map(rev => <option key={rev} value={rev}>Rev. {rev}</option>)}
                </select>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[55vh] overflow-y-auto divide-y">
              {addTplLoading ? (
                <div className="py-8 text-center text-gray-600">Loading templates…</div>
              ) : filteredAddTemplates.length === 0 ? (
                <div className="py-8 text-center text-gray-600">No templates found.</div>
              ) : (
                filteredAddTemplates.map(t => {
                  const id = t._id || t.id;
                  const docCode = t.document_code;
                  const rev = t.revision_number ?? t.revision_no;
                  const school = t.school_identifier || t.school || t.school_code;
                  const alreadyInBin = (bin.template_ids || []).map(String).includes(String(id));
                  const isSelected = selectedTemplateIds.includes(String(id));
                  return (
                    <div key={String(id)} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate" title={t.title}>{t.title}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {docCode && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">{docCode}</span>}
                          {(rev !== undefined && rev !== null) && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Rev. {String(rev).padStart(2,'0')}</span>}
                          {school && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{school}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          className="px-3 py-1.5 border rounded-md text-blue-600 hover:bg-blue-50 text-sm"
                          onClick={() => { setTplToPreview(t); setTplCurrentPage(0); setShowTplPreview(true); }}
                        >
                          Preview
                        </button>
                        {alreadyInBin ? (
                          <span className="text-xs text-gray-400">Already added</span>
                        ) : (
                          <button
                            className={`px-3 py-1.5 rounded-md text-sm ${isSelected ? 'bg-blue-600 text-white' : 'border bg-white text-gray-700 hover:bg-gray-50'}`}
                            onClick={() => {
                              setSelectedTemplateIds(prev => prev.includes(String(id)) ? prev.filter(x => x !== String(id)) : [...prev, String(id)]);
                            }}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2">
            <button onClick={() => { setShowAddTemplate(false); setSelectedTemplateIds([]); }} className="px-4 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
            <button
              className={`px-4 py-2 rounded-md ${addingTpl || selectedTemplateIds.length === 0 ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
              disabled={addingTpl || selectedTemplateIds.length === 0}
              onClick={async () => {
                try {
                  setAddingTpl(true);
                  const next = Array.from(new Set([...(bin.template_ids||[]).map(String), ...selectedTemplateIds]));
                  const updated = await updateSubmissionBinAPI(bin._id || bin.id, { template_ids: next });
                  setBin(updated);
                  // Merge selected template objects into templatesInfo
                  setTemplatesInfo(prev => {
                    const byId = new Map(prev.map(x => [String(x._id||x.id), x]));
                    filteredAddTemplates.forEach(t => {
                      const id = String(t._id || t.id);
                      if (selectedTemplateIds.includes(id) && !byId.has(id)) byId.set(id, t);
                    });
                    return Array.from(byId.values());
                  });
                  setShowAddTemplate(false);
                  setSelectedTemplateIds([]);
                } catch (e) {
                  alert(e?.responseData?.message || e?.message || 'Failed to add templates');
                } finally {
                  setAddingTpl(false);
                }
              }}
            >
              Add {selectedTemplateIds.length || ''} {selectedTemplateIds.length === 1 ? 'Template' : 'Templates'}
            </button>
          </div>
        </div>
      </div>
    )}
    {showAssign && (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
        <div className="bg-white w-full max-w-xl rounded-lg shadow-lg border border-gray-200">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Assign Faculty</h3>
            <button onClick={() => setShowAssign(false)} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                setAssigning(true);
                if (!Array.isArray(bin.template_ids) || bin.template_ids.length === 0) {
                  alert('No templates are configured for this bin. Ask the owner to add templates first.');
                  return;
                }
                let updated = bin;
                for (const fid of assignForm.facultyIds) {
                  for (const t of bin.template_ids) {
                    updated = await upsertSubmissionAPI(
                      bin._id || bin.id,
                      { template: String(t), faculty: fid, instructions: assignForm.instructions }
                    );
                  }
                }
                setBin(updated);
                setShowAssign(false);
              } catch (err) {
                alert(err?.responseData?.message || err?.message || 'Failed to assign');
              } finally {
                setAssigning(false);
              }
            }}
          >
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Templates for this bin</label>
                {Array.isArray(bin.template_ids) && bin.template_ids.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {(templatesInfo.length ? templatesInfo : bin.template_ids).map((t) => {
                      const id = typeof t === 'string' ? t : (t._id || t.id);
                      const title = typeof t === 'string' ? String(t) : (t.title || String(id));
                      return (
                        <div key={String(id)} className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 truncate max-w-[70%]" title={title}>
                            {title}
                          </span>
                          <button
                            type="button"
                            className="text-blue-600 text-xs font-medium hover:underline"
                            onClick={() => { if (typeof t !== 'string') { setTplToPreview(t); setShowTplPreview(true); } }}
                            disabled={typeof t === 'string'}
                          >
                            Preview
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-red-600">No templates configured. You cannot assign until templates are added.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Faculty (multi-select)</label>
                <select
                  multiple
                  className="w-full border rounded-md px-3 py-2 min-h-32"
                  value={assignForm.facultyIds}
                  onChange={(e) => setAssignForm({ ...assignForm, facultyIds: Array.from(e.target.selectedOptions).map(o => o.value) })}
                  onFocus={async () => {
                    if (facultyList.length) return;
                    try { setFacultyList(await getFacultyByDepartmentAPI()); } catch (_) {}
                  }}
                  required
                >
                  {facultyList.length === 0 ? (
                    <option value="" disabled>Loading faculty…</option>
                  ) : (
                    facultyList.map(f => (
                      <option key={String(f.id || f._id)} value={String(f.id || f._id)}>{f.name || f.email || String(f.id || f._id)}</option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions (optional)</label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 min-h-24"
                  value={assignForm.instructions}
                  onChange={(e) => setAssignForm({ ...assignForm, instructions: e.target.value })}
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t flex gap-3 justify-end">
              <button type="button" onClick={() => setShowAssign(false)} className="px-4 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={assigning || !Array.isArray(bin.template_ids) || bin.template_ids.length === 0} className={`px-4 py-2 rounded-md ${(assigning || !Array.isArray(bin.template_ids) || bin.template_ids.length === 0) ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700'} text-white`} title={!Array.isArray(bin.template_ids) || bin.template_ids.length === 0 ? 'Add templates to this bin first' : ''}>
                {assigning ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    {showTplPreview && tplToPreview && (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
        <div className="bg-white w-full max-w-5xl rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
          <div className="px-5 py-4 border-b flex items-center justify-between bg-gray-50">
            <div>
              <h3 className="font-semibold text-gray-900">Template Preview</h3>
              <p className="text-sm text-gray-600">{tplToPreview.title}</p>
              <div className="flex gap-2 mt-1">
                {tplToPreview.document_code && (
                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">{tplToPreview.document_code}</span>
                )}
                {(tplToPreview.revision_number !== undefined || tplToPreview.revision_no !== undefined) && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Rev. {String(tplToPreview.revision_number ?? tplToPreview.revision_no).padStart(2,'0')}</span>
                )}
                {tplToPreview.effectivity || tplToPreview.effectivity_date ? (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Eff. {new Date(tplToPreview.effectivity || tplToPreview.effectivity_date).toLocaleDateString()}</span>
                ) : null}
              </div>
            </div>
            <button onClick={() => setShowTplPreview(false)} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
            {(() => {
              const baseDoc = tplToPreview?.pages_json?.[0] || { type: 'doc', content: [] };
              const pageNodes = (baseDoc.content || []).filter((n) => n.type === 'page');
              const totalPages = pageNodes.length || 0;
              const pageNode = pageNodes[tplCurrentPage] || pageNodes[0];
              const contentForEditor = pageNode ? { ...baseDoc, content: [pageNode] } : baseDoc;
              const src = tplToPreview?.headerConfig || tplToPreview?.logoConfig || tplToPreview?.headerFooter || {};
              const docCode = tplToPreview?.document_code || tplToPreview?.docCode || src?.documentStamp?.docCode || '';
              const revisionNo = (tplToPreview?.revision_no ?? tplToPreview?.revision_number ?? src?.documentStamp?.revisionNo ?? 0);
              const effectivity = tplToPreview?.effectivity || tplToPreview?.effectivity_date || src?.documentStamp?.effectivity || '';
              const normalizedHeaderConfig = {
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
              return tplToPreview?.pages_json?.length ? (
                <div className="bg-white rounded-lg p-4 shadow">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-gray-500">Page {Math.min(tplCurrentPage+1, totalPages || 1)} of {totalPages || 1}</span>
                    {totalPages > 1 && (
                      <div className="flex gap-2">
                        <button className="px-2 py-1 text-sm border rounded disabled:opacity-50" disabled={tplCurrentPage<=0} onClick={() => setTplCurrentPage(p=>Math.max(0,p-1))}>Prev</button>
                        <button className="px-2 py-1 text-sm border rounded disabled:opacity-50" disabled={tplCurrentPage>=totalPages-1} onClick={() => setTplCurrentPage(p=>Math.min(totalPages-1,p+1))}>Next</button>
                      </div>
                    )}
                  </div>
                  <TextEditor
                    content={contentForEditor}
                    pageSetup={tplToPreview?.pageSetup}
                    className="pointer-events-none opacity-100 w-full"
                    onEditorReady={(editor) => editor && editor.setEditable(false)}
                    mode="template"
                    headerConfig={normalizedHeaderConfig}
                    templateStatus={tplToPreview?.status || 'published'}
                    documentCode={docCode}
                    revisionNo={revisionNo}
                    effectivity={effectivity}
                  />
                </div>
              ) : null;
            })() || (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center bg-white">
                <p className="text-gray-600 mb-1">No preview available</p>
                <p className="text-sm text-gray-500">This template has no stored page content.</p>
              </div>
            )}
          </div>
          <div className="px-5 py-3 border-t bg-gray-50 flex justify-end">
            <button onClick={() => setShowTplPreview(false)} className="px-4 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50">Close</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function StatsCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    red: "bg-red-50 text-red-600 border-red-100",
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}