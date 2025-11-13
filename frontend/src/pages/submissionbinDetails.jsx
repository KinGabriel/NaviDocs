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
  UserPlus,
  Eye,
  Trash2,
  Search,
  Check,
  X,
} from "lucide-react";
import { getSubmissionBinAPI, updateSubmissionBinAPI, forwardSubmissionBinAPI, upsertSubmissionAPI } from "../api/assignmentDocumentsAPI";
import { getFacultyByDepartmentAPI, getUsersInfoByIdsAPI } from "../api/userAPI";
import { getTemplateByIdAPI, fetchPublishedTemplatesAPI } from "../api/documentContollerAPI";
import TextEditor from "../layout/create_template/textEditor";
import Loader from "../components/loader";
import toast from "react-hot-toast";
import { getSubmissionBinStatus } from "../utils/submissionStatus";

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
  const isDean = roleName.toLowerCase() === 'dean';
  const isSecretary = roleName.toLowerCase() === 'secretary';
  const isDeanOrSecretary = isDean || isSecretary;
  const userId = user?._id || user?.id;

  // edit form state
  const [form, setForm] = useState({ title: '', instructions: '', deadline: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [forwarding, setForwarding] = useState(false);

  // assign form state
  const [assignForm, setAssignForm] = useState({ template: '', facultyIds: [], instructions: '' });
  const [facultyList, setFacultyList] = useState([]);
  const [assigning, setAssigning] = useState(false);

  // Faculty user details cache (for displaying names instead of IDs)
  const [facultyUsers, setFacultyUsers] = useState({});

  const toInputDateTime = (d) => {
    if (!d) return '';
    try { return new Date(d).toISOString().slice(0,16); } catch { return ''; }
  };

 const handleViewSubmission = (submissionItem) => {
  // Get the first document ID from the submission
  const documentId = Array.isArray(submissionItem.documents) && submissionItem.documents.length > 0
    ? (submissionItem.documents[0]._id || submissionItem.documents[0].id || submissionItem.documents[0])
    : (submissionItem.document?._id || submissionItem.document?.id || submissionItem.document);
  
  if (!documentId) {
    toast.warning("No document found in this submission");
    return;
  }
  navigate(`/submissions/${id}/${documentId}`);
};

  // Check if bin should be marked as completed
  const binShouldBeCompleted = useMemo(() => {
      if (!bin || !Array.isArray(bin.submissions)) return false;
       
      const items = bin.submissions;
      if (items.length === 0) return false;
      
    // Check if ANY submission is returned - if so, bin should NOT be completed
    const hasReturnedSubmissions = items.some(sub => 
      sub.status === 'returned' || 
      (Array.isArray(sub.notes) && sub.notes.some(n => String(n.type).toLowerCase() === 'returned'))
    );
    
    // If any submission is returned, bin should not be completed
    if (hasReturnedSubmissions) return false;
    
      // Check if all submissions have documents AND are submitted
      const allSubmitted = items.every(sub => {
        const hasDocuments = (Array.isArray(sub.documents) && sub.documents.length > 0) || 
                              (sub.document && sub.document !== null);
        const isSubmitted = sub.submitted_at && hasDocuments;
        return isSubmitted;
      });
      
      return allSubmitted;
    }, [bin?.submissions]);

  // Determine the actual display status for the bin
  const binDisplayStatus = useMemo(() => {
      return getSubmissionBinStatus(bin);
    }, [bin]);

    // Auto-update bin status to completed
    useEffect(() => {
      if (!bin || !isDeptHead) return;
    
    // Check if ANY submission is returned
    const hasReturnedSubmissions = bin.submissions?.some(sub => 
      sub.status === 'returned' || 
      (Array.isArray(sub.notes) && sub.notes.some(n => String(n.type).toLowerCase() === 'returned'))
    );
    
    if (binShouldBeCompleted && bin.status !== 'completed' && !hasReturnedSubmissions) {
      // Silently update the bin status
      updateSubmissionBinAPI(bin._id || bin.id, { status: 'completed' })
        .then(updated => setBin(updated))
        .catch(err => console.error('Failed to auto-complete bin:', err));
    }
  }, [binShouldBeCompleted, bin?.status, bin?._id, bin?.id, isDeptHead, bin?.submissions]);

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
  
    // Count returned submissions 
    const returned = items.filter(u =>
      u.status === 'returned' ||
      (Array.isArray(u.notes) &&
        u.notes.some(n => String(n.type).toLowerCase() === 'returned'))
    ).length;
    
    // Count submitted (has documents, submitted_at, and NOT returned)
    const submitted = items.filter((u) => {
      const isReturned = u.status === 'returned' || 
        (Array.isArray(u.notes) && u.notes.some(n => String(n.type).toLowerCase() === 'returned'));
      
      const hasDocuments = (Array.isArray(u.documents) && u.documents.length > 0) || 
                            (u.document && u.document !== null);
      
      return hasDocuments && u.submitted_at && !isReturned;
    }).length;
    
    // Pending (no documents OR no submitted_at, BUT NOT returned)
    const pending = items.filter((u) => {
      const isReturned = u.status === 'returned' || 
        (Array.isArray(u.notes) && u.notes.some(n => String(n.type).toLowerCase() === 'returned'));
      
      const hasDocuments = (Array.isArray(u.documents) && u.documents.length > 0) || 
                            (u.document && u.document !== null);
      
      // Pending (hasn't submitted yet (no documents or no timestamp) AND not returned)
      return (!hasDocuments || !u.submitted_at) && !isReturned;
    }).length;
    
    const late = 0;
    const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, pending, returned, late, percentage };
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
  const loadFaculty = async () => {
    if (facultyList.length === 0) {
      try {
        const data = await getFacultyByDepartmentAPI();
        setFacultyList(data);
      } catch (err) {
        console.error('Failed to load faculty:', err);
      }
    }
  };
  
  loadFaculty();
}, []); 

  // Fetch faculty user details for submissions
  useEffect(() => {
    if (!bin || !Array.isArray(bin.submissions) || bin.submissions.length === 0) return;
    
    const facultyIds = bin.submissions
      .map(sub => sub.faculty)
      .filter(Boolean)
      .map(String);
    
    if (facultyIds.length === 0) return;
    
    let cancelled = false;
    (async () => {
      try {
        const users = await getUsersInfoByIdsAPI(facultyIds);
        if (!cancelled) {
          const usersMap = {};
          users.forEach(u => {
            const id = String(u.userId || u.id || u._id);
            usersMap[id] = {
              name: u.name || `${u.firstname || ''} ${u.lastname || ''}`.trim() || u.email || id,
              email: u.email,
              firstname: u.firstname,
              lastname: u.lastname
            };
          });
          setFacultyUsers(usersMap);
        }
      } catch (err) {
        console.error('Failed to fetch faculty users:', err);
      }
    })();
    
    return () => { cancelled = true; };
  }, [bin?.submissions]); 

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

  // If user is Dean/Secretary and bin hasn't been forwarded, show restricted message
  if (isDeanOrSecretary && !bin.is_forwarded) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} />
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Restricted</h2>
              <p className="text-gray-600 mb-4">This submission bin has not been forwarded to your office. You can view it once the Department Head forwards it.</p>
              <button onClick={() => navigate(-1)} className="px-4 py-2 rounded bg-blue-600 text-white">Go back</button>
            </div>
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
                  <StatusBadge type={binDisplayStatus} />
                  {(isDeptHead || String(bin.created_by||'')===String(userId||'')) && (
                    <>
                      {!bin.is_forwarded && (
                        <button
                          onClick={async () => {
                            // Check both bin status AND that no submissions are returned
                            const hasReturned = bin.submissions?.some(sub => 
                              sub.status === 'returned' || 
                              (Array.isArray(sub.notes) && sub.notes.some(n => String(n.type).toLowerCase() === 'returned'))
                            );
                            
                            if (String(bin.status).toLowerCase() !== 'completed' || hasReturned) return;
                            try {
                              setForwarding(true);
                              const updated = await forwardSubmissionBinAPI(bin._id || bin.id);
                              setBin(updated);
                            } catch (err) {
                              toast.error(err?.responseData?.message || err?.message || 'Failed to forward');
                            } finally {
                              setForwarding(false);
                            }
                          }}
                          disabled={forwarding || String(bin.status).toLowerCase() !== 'completed' || (() => {
                            const hasReturned = bin.submissions?.some(sub => 
                              sub.status === 'returned' || 
                              (Array.isArray(sub.notes) && sub.notes.some(n => String(n.type).toLowerCase() === 'returned'))
                            );
                            return hasReturned;
                          })()}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            forwarding || String(bin.status).toLowerCase() !== 'completed' || (() => {
                              const hasReturned = bin.submissions?.some(sub => 
                                sub.status === 'returned' || 
                                (Array.isArray(sub.notes) && sub.notes.some(n => String(n.type).toLowerCase() === 'returned'))
                              );
                              return hasReturned;
                            })()
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                              : 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md'
                          }`}
                          title={(() => {
                            const hasReturned = bin.submissions?.some(sub => 
                              sub.status === 'returned' || 
                              (Array.isArray(sub.notes) && sub.notes.some(n => String(n.type).toLowerCase() === 'returned'))
                            );
                            if (hasReturned) return 'Cannot forward: Some submissions have been returned';
                            if (String(bin.status).toLowerCase() !== 'completed') return 'Set status to Completed to enable forwarding';
                            return 'Forward to Secretary/Dean';
                          })()}
                        >
                          <Send size={16} /> {forwarding ? 'Forwarding…' : 'Forward'}
                        </button>
                      )}
                      <button
                        onClick={() => setShowAssign(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                      >
                        <UserPlus size={16} /> Assign
                      </button>
                      <button
                        onClick={() => setShowEdit(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-gray-600 text-white hover:bg-gray-700 transition-all shadow-sm hover:shadow-md"
                      >
                        <Pencil size={16} /> Edit
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Instructions and Deadline*/}
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
                <div className="mt-6 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
                  <div className="mb-4">
                      <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-gray-700" />
                          <p className="text-base font-semibold text-gray-900">
                            Templates required for Submissions:
                          </p>
                        </div>
                        {(isDeptHead || String(bin.created_by || '') === String(userId || '')) && (
                          <button
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md text-sm font-medium"
                            onClick={() => setShowAddTemplate(true)}
                          >
                            <Plus size={16} /> Add Template
                          </button>
                        )}
                      </div>

                      {loadingTemplates && (
                        <div className="flex justify-center mt-2">
                          <Loader message="Loading..." />
                        </div>
                      )}
                    </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {(templatesInfo.length ? templatesInfo : bin.template_ids).map((t) => {
                      const id = typeof t === 'string' ? t : (t._id || t.id);
                      const title = typeof t === 'string' ? String(t) : (t.title || String(id));
                      const docCode = typeof t === 'string' ? '' : (t.document_code || t.docCode || '');
                      const revision = typeof t === 'string' ? '' : (t.revision_no ?? t.revision_number);
                      const effectivity = typeof t === 'string' ? '' : (t.effectivity || t.effectivity_date || '');
                      return (
                        <div key={String(id)} className="border border-gray-200 rounded-lg bg-white p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 truncate mb-2" title={title}>{title}</p>
                            <div className="flex flex-wrap gap-2">
                              {docCode && (
                                <span className="text-xs px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md font-medium">
                                  {docCode}
                                </span>
                              )}
                              {(revision !== undefined && revision !== null && revision !== '') && (
                                <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-md font-medium">
                                  Rev. {String(revision).padStart(2,'0')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                            <button
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => { setTplToPreview(typeof t === 'string' ? null : t); setTplCurrentPage(0); setShowTplPreview(true); }}
                              disabled={typeof t === 'string'}
                              title={typeof t === 'string' ? 'Details still loading…' : 'Preview template'}
                            >
                              <Eye size={14} />
                              Preview
                            </button>
                            {(isDeptHead || String(bin.created_by||'')===String(userId||'')) && (
                              <button
                                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                onClick={async () => {
                                  if (!confirm('Remove this template from the bin? Existing submissions using it will remain as-is.')) return;
                                  try {
                                    const nextIds = (bin.template_ids || []).map(String).filter(x => x !== String(id));
                                    const updated = await updateSubmissionBinAPI(bin._id || bin.id, { template_ids: nextIds });
                                    setBin(updated);
                                    setTemplatesInfo(prev => prev.filter(x => String(x._id||x.id) !== String(id)));
                                  } catch (e) {
                                    toast.error(e?.responseData?.message || e?.message || 'Failed to remove template');
                                  }
                                }}
                                title="Remove template"
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
              <StatsCard label="Pending" value={stats.pending} icon={Clock} color="yellow" />
              <StatsCard label="Returned" value={stats.returned} icon={Clock} color="orange" />
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
                     {bin.submissions.map((item) => {
                        // Check if actually has documents
                        const hasDocuments = (Array.isArray(item.documents) && item.documents.length > 0) || 
                                              (item.document && item.document !== null);
                        const isReturned = item.status === 'returned' || 
                        (Array.isArray(item.notes) && item.notes.some(n => String(n.type).toLowerCase() === 'returned'));

                          const actualStatus = isReturned 
                            ? 'returned' 
                            : (hasDocuments && item.submitted_at ? 'submitted' : 'pending');

                    
                          console.log('Submission item:', {
                            faculty: item.faculty_name || item.faculty_user?.name,
                            hasDocuments,
                            documents: item.documents,
                            document: item.document,
                            submitted_at: item.submitted_at
                          });
                        
                        return (
                          <tr key={item._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {(() => {
                                const facultyId = String(item.faculty || '');
                                // First try cached faculty user details
                                if (facultyUsers[facultyId]) {
                                  return facultyUsers[facultyId].name;
                                }
                                // Then try submission-provided name fields
                                if (item.faculty_name) return item.faculty_name;
                                if (item.faculty_user?.name) return item.faculty_user.name;
                                if (item.faculty_user?.fullname) return item.faculty_user.fullname;
                                const fullName = `${item.faculty_user?.firstname || ''} ${item.faculty_user?.lastname || ''}`.trim();
                                if (fullName) return fullName;
                                // Fallback to email if available
                                if (item.faculty_user?.email) return item.faculty_user.email;
                                // Last resort: show loading or unknown
                                return 'Loading...';
                              })()}
                            </td>
                            <td className="px-6 py-4"><StatusBadge type={actualStatus} /></td>
                            <td className="px-6 py-4 text-sm text-gray-600">{item.submitted_at && hasDocuments ? formatDateTime(item.submitted_at) : '-'}</td>
                            <td className="px-6 py-4">
                              {actualStatus === 'submitted' && hasDocuments ? (
                                <button
                                  className="inline-flex items-center justify-center px-4 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                                  onClick={() => handleViewSubmission(item)}
                                >
                                  View
                                </button>
                              ) : (
                                <span className="text-sm text-gray-400">Not yet submitted</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
  <div className="fixed inset-0 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-fadeIn">
    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 transform animate-slideUp">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
        <div>
          <h3 className="font-semibold text-xl text-gray-900">Edit Bin Settings</h3>
          <p className="text-sm text-gray-500 mt-0.5">Update your submission bin details</p>
        </div>
        <button 
          onClick={() => setShowEdit(false)} 
          className="text-gray-400 hover:text-gray-600 hover:bg-white rounded-full p-2 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Form */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            setSaving(true);
            const payload = {
              title: form.title,
              instructions: form.instructions,
              deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
              status: form.status,
            };
            const updated = await updateSubmissionBinAPI(bin._id || bin.id, payload);
            setBin(updated);
            setShowEdit(false);
          } catch (err) {
            toast.error(err?.responseData?.message || err?.message || 'Failed to update bin');
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Bin Name
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter bin name"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          {/* Instructions Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Instructions
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 min-h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              placeholder="Provide instructions for this submission..."
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            />
          </div>

          {/* Deadline & Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Deadline Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Deadline
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
            </div>

            {/* Status Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white cursor-pointer"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-gray-50 rounded-b-2xl">
          <button 
            type="button" 
            onClick={() => setShowEdit(false)} 
            className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={assigning || assignForm.facultyIds.length === 0}
            className={`px-6 py-2.5 rounded-lg font-medium text-white transition-all ${
              saving 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md'
            }`}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
  {showAddTemplate && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
    <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <FileText size={20} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Select Templates</h3>
        </div>
        <button onClick={() => { setShowAddTemplate(false); setSelectedTemplateIds([]); }} className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg p-1 transition-colors">
          <X size={20} />
        </button>
      </div>
      <div className="p-6 space-y-4">
        {/* Search + Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Search templates..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white hover:bg-gray-50 transition-colors" value={selectedDocCode} onChange={(e)=>setSelectedDocCode(e.target.value)}>
              <option value="All">All Codes</option>
              {addTplDocCodes.map(code => <option key={code} value={code}>{code}</option>)}
            </select>
            <select className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white hover:bg-gray-50 transition-colors" value={selectedRevision} onChange={(e)=>setSelectedRevision(e.target.value)}>
              <option value="All">All Revisions</option>
              {addTplRevisions.map(rev => <option key={rev} value={rev}>Rev. {rev}</option>)}
            </select>
          </div>
        </div>

        {/* List */}
        <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-gray-200">
          {addTplLoading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <Loader message="Loading templates..." />
            </div>
          ) : filteredAddTemplates.length === 0 ? (
            <div className="py-12 text-center">
              <FileText size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium">No templates found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAddTemplates.map(t => {
                const id = t._id || t.id;
                const docCode = t.document_code;
                const rev = t.revision_number ?? t.revision_no;
                const school = t.school_identifier || t.school || t.school_code;
                const alreadyInBin = (bin.template_ids || []).map(String).includes(String(id));
                const isSelected = selectedTemplateIds.includes(String(id));
                return (
                  <div key={String(id)} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate mb-2" title={t.title}>{t.title}</p>
                      <div className="flex flex-wrap gap-2">
                        {docCode && <span className="text-xs px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md font-medium">{docCode}</span>}
                        {(rev !== undefined && rev !== null) && <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-md font-medium">Rev. {String(rev).padStart(2,'0')}</span>}
                        {school && <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">{school}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                        onClick={() => { setTplToPreview(t); setTplCurrentPage(0); setShowTplPreview(true); }}
                      >
                        <Eye size={14} />
                        Preview
                      </button>
                      {alreadyInBin ? (
                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg font-medium">Already added</span>
                      ) : (
                        <button
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            isSelected 
                              ? 'px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2' 
                              : 'border bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            setSelectedTemplateIds(prev => prev.includes(String(id)) ? prev.filter(x => x !== String(id)) : [...prev, String(id)]);
                          }}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle size={14} className="inline mr-1" />
                              Selected
                            </>
                          ) : 'Select'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
        <button 
          onClick={() => { setShowAddTemplate(false); setSelectedTemplateIds([]); }} 
          className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
            addingTpl || selectedTemplateIds.length === 0 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
          }`}
              disabled={addingTpl || selectedTemplateIds.length === 0}
              onClick={async () => {
                try {
                  setAddingTpl(true);
                
                  // Get current template_ids or empty array if null/undefined
                  const currentTemplateIds = Array.isArray(bin.template_ids) ? bin.template_ids : [];
                  
                  // Merge with selected templates
                  const next = Array.from(new Set([
                    ...currentTemplateIds.map(String), 
                    ...selectedTemplateIds
                  ]));
                  
                  const updated = await updateSubmissionBinAPI(bin._id || bin.id, { 
                    template_ids: next.length > 0 ? next : [] 
                  });
                  
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
                  toast.error(e?.responseData?.message || e?.message || 'Failed to add templates');
                } finally {
                  setAddingTpl(false);
                }
              }}
            >
          {addingTpl ? 'Adding...' : `Add ${selectedTemplateIds.length > 0 ? `(${selectedTemplateIds.length})` : ''} Template${selectedTemplateIds.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  </div>
)}

{showAssign && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
    <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-green-50 to-green-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-600 rounded-lg">
            <UserPlus size={20} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Assign Faculty</h3>
        </div>
        <button onClick={() => setShowAssign(false)} className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg p-1 transition-colors">
          <X size={20} />
        </button>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                setAssigning(true);
                if (!Array.isArray(bin.template_ids) || bin.template_ids.length === 0) {
                  toast.warning('No templates are configured for this bin. Ask the owner to add templates first.');
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
                toast.error(err?.responseData?.message || err?.message || 'Failed to assign');
              } finally {
                setAssigning(false);
              }
            }}
          >
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Templates for this bin</label>
            {Array.isArray(bin.template_ids) && bin.template_ids.length > 0 ? (
              <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {(templatesInfo.length ? templatesInfo : bin.template_ids).map((t) => {
                  const id = typeof t === 'string' ? t : (t._id || t.id);
                  const title = typeof t === 'string' ? String(t) : (t.title || String(id));
                  return (
                    <div key={String(id)} className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-gray-200">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-800 truncate max-w-[70%]" title={title}>
                        {title}
                      </span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-blue-600 text-xs font-medium hover:underline disabled:opacity-50"
                        onClick={() => { if (typeof t !== 'string') { setTplToPreview(t); setShowTplPreview(true); } }}
                        disabled={typeof t === 'string'}
                      >
                        <Eye size={12} />
                        Preview
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 font-medium">No templates configured</p>
                <p className="text-xs text-red-500 mt-1">You cannot assign until templates are added.</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Faculty Members</label>
            <div 
              className="w-full border border-gray-300 rounded-lg overflow-hidden transition-all" >
              <div className="max-h-60 overflow-y-auto bg-gray-50">
                {facultyList.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <Loader message="Loading faculty..." />
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {facultyList.map(f => {
                      const id = String(f.id || f._id);
                      const isSelected = assignForm.facultyIds.includes(id);
                      
                      return (
                        <label
                          key={id}
                          className={`flex items-center px-4 py-3 cursor-pointer transition-colors hover:bg-green-50 ${
                            isSelected ? 'bg-green-100' : 'bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            value={id}
                            checked={isSelected}
                            onChange={(e) => {
                              const newIds = e.target.checked
                                ? [...assignForm.facultyIds, id]
                                : assignForm.facultyIds.filter(fid => fid !== id);
                              setAssignForm({ ...assignForm, facultyIds: newIds });
                            }}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                          <span className="ml-3 text-gray-700">
                            {f.name || f.email || id}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              {assignForm.facultyIds.length > 0 && (
                <div className="px-4 py-2 bg-green-50 border-t border-green-200 text-sm text-green-700">
                  {assignForm.facultyIds.length} faculty selected
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-28 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              placeholder="Add any specific instructions for this assignment..."
              value={assignForm.instructions}
              onChange={(e) => setAssignForm({ ...assignForm, instructions: e.target.value })}
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t bg-gray-50 flex gap-3 justify-end">
          <button 
            type="button" 
            onClick={() => setShowAssign(false)} 
            className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={assigning || !Array.isArray(bin.template_ids) || bin.template_ids.length === 0} 
            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
              (assigning || !Array.isArray(bin.template_ids) || bin.template_ids.length === 0) 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md'
            }`}
            title={!Array.isArray(bin.template_ids) || bin.template_ids.length === 0 ? 'Add templates to this bin first' : ''}
          >
            {assigning ? 'Assigning...' : 'Assign Faculty'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{showTplPreview && tplToPreview && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
    <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
      <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-purple-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-gray-900">Template Preview</h3>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-2">{tplToPreview.title}</p>
            <div className="flex flex-wrap gap-2">
              {tplToPreview.document_code && (
                <span className="text-xs px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md font-medium">{tplToPreview.document_code}</span>
              )}
              {(tplToPreview.revision_number !== undefined || tplToPreview.revision_no !== undefined) && (
                <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-md font-medium">Rev. {String(tplToPreview.revision_number ?? tplToPreview.revision_no).padStart(2,'0')}</span>
              )}
              {(tplToPreview.effectivity || tplToPreview.effectivity_date) && (
                <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">
                  Eff. {formatDate(tplToPreview.effectivity || tplToPreview.effectivity_date, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setShowTplPreview(false)} className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg p-1 transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
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
                <div className="bg-white rounded-xl p-5 shadow-lg">
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Page {Math.min(tplCurrentPage+1, totalPages || 1)} of {totalPages || 1}</span>
                    {totalPages > 1 && (
                      <div className="flex gap-2">
                    <button 
                      className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                      disabled={tplCurrentPage<=0} 
                      onClick={() => setTplCurrentPage(p=>Math.max(0,p-1))}
                    >
                      Prev
                    </button>
                    <button 
                      className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                      disabled={tplCurrentPage>=totalPages-1} 
                      onClick={() => setTplCurrentPage(p=>Math.min(totalPages-1,p+1))}
                    >
                      Next
                    </button>
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
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-white">
            <FileText size={56} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 font-semibold mb-1">No preview available</p>
            <p className="text-sm text-gray-500">This template has no stored page content.</p>
          </div>
        )}
      </div>
      <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
        <button 
          onClick={() => setShowTplPreview(false)} 
          className="px-5 py-2.5 rounded-lg bg-gray-600 text-white hover:bg-gray-700 font-medium transition-all shadow-sm hover:shadow-md"
        >
          Close Preview
        </button>
        </div>
      </div>
    </div>
    )}
  </>
  )

function StatsCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    red: "bg-red-50 text-red-600 border-red-100",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-100",
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
}}