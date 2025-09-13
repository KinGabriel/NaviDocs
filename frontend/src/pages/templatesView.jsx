import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../layout/header";
import Sidebar from "../layout/sidebar";
import useUser from "../hooks/useUser";
import {
  ArrowLeft,
  UserPlus,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { getTemplateByIdAPI } from "../api/documentContollerAPI";
import { formatDate } from "../utils/formatters";


export default function SecretaryTemplateView() {
  const user = useUser();
  const navigate = useNavigate();
  const { id } = useParams();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getTemplateByIdAPI(id)
      .then(res => {
        console.log("Fetched template:", res);
        setTemplate(res.template);
        setLoading(false);
      })
      .catch(err => {
        setError("Failed to fetch template");
        setLoading(false);
      });
  }, [id]);

  // Button handlers 
  const handleAssign = () => alert("Assign Members (placeholder)");
  const handleApprove = () => alert("Approve Template (placeholder)");
  const handleRequestChange = () => alert("Request Change (placeholder)");

  // Use API data if loaded, else fallback to placeholder
  const t = template || 'No assignments are instruction';

  //  assigned members 
  const assignedNames = t.assignedNames || [];
  // deadline
  const deadline = t.deadline ? formatDate(t.deadline) : null;

  //  approvers 
  let approvalsArr = [];
  if (t.approvals && typeof t.approvals === 'object' && !Array.isArray(t.approvals)) {
    approvalsArr = Object.entries(t.approvals).map(([role, appr]) => ({
      role,
      name: appr.assigned_to_name || appr.assigned_to || '',
      isApproved: appr.isApproved,
    }));
  } else if (Array.isArray(t.approvals)) {
    approvalsArr = t.approvals;
  }

  //  handle to prepare notes 
  const notes = Array.isArray(t.notes) ? t.notes : [];

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="flex-none">
          <Sidebar user={user} active="Templates" />
        </div>

        {/* Dashboard-style wrapper for consistent spacing */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <main className="p-8 flex-1 overflow-y-auto">
            {/* Back + Page title */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <div>
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-black-800 tracking-widest uppercase">
                        View Template
                    </h1>
                <div className="w-30 h-1 bg-yellow-400 mt-1 rounded" />
             </div>
            </div>
            </div>

            {/* Chip header (code + title) */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex-1">
                <div className="bg-[#EFF3FF] text-gray-900 rounded-xl px-4 py-3 flex items-center gap-4">
                  <div className="text-sm font-semibold">
                    {t.code}
                    <div className="w-10 h-0.5 bg-yellow-400 mt-1 rounded" />
                  </div>
                  <div className="text-base sm:text-lg font-medium">{t.title}</div>
                </div>
              </div>

              {/* Right-side action buttons */}
              <div className="hidden lg:flex items-center gap-2">
                <button
                  onClick={handleAssign}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[#0035DA] text-[#0035DA] bg-white hover:bg-[#EFF3FF] transition"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="text-sm font-medium">Assign Members</span>
                </button>

                <button
                  onClick={handleApprove}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-green-600 text-green-700 bg-white hover:bg-green-50 transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Approve Templates</span>
                </button>

                <button
                  onClick={handleRequestChange}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-amber-500 text-amber-700 bg-white hover:bg-amber-50 transition"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm font-medium">Request Change</span>
                </button>
              </div>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left: template preview */}
              <section className="col-span-12 lg:col-span-9">
                <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-gray-50 p-6">
                    <div
                      className="mx-auto bg-white shadow border rounded-md w-full"
                      style={{ minHeight: 900 }}
                    >
                      {/* Replace with <iframe src={...}/> or <img/> once available */}
                      <div className="h-full w-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <div className="text-lg font-medium mb-1">
                            Template Preview
                          </div>
                          <div className="text-sm">
                            This is a placeholder surface for the PDF/image.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile action buttons (show below preview on small screens) */}
                <div className="lg:hidden mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleAssign}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[#0035DA] text-[#0035DA] bg-white hover:bg-[#EFF3FF] transition"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="text-sm font-medium">Assign Members</span>
                  </button>

                  <button
                    onClick={handleApprove}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-green-600 text-green-700 bg-white hover:bg-green-50 transition"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Approve Templates</span>
                  </button>

                  <button
                    onClick={handleRequestChange}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-amber-500 text-amber-700 bg-white hover:bg-amber-50 transition"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">Request Change</span>
                  </button>
                </div>
              </section>

              {/* Right: notes and members card */}
              <aside className="col-span-12 lg:col-span-3">
                <div className="bg-white border rounded-lg shadow-sm">
                  <div className="p-5">
                    {/* Deadline at the top */}
                      <div className="mb-4">
                       <h3 className="text-base font-bold tracking-widest text-gray-900 uppercase font-sans">
                         Deadline
                       </h3>
                        <div className="w-16 h-0.5 bg-yellow-400 mt-2 mb-2 rounded" />
                        <div className="text-base text-gray-900">{deadline}</div>
                      </div>
                    <h3 className="text-base font-bold tracking-widest text-gray-900 uppercase font-sans">
                      Assigned Members
                    </h3>
                    <div className="w-24 h-0.5 bg-yellow-400 mt-2 mb-4 rounded" />
                    <ul className="mb-6">
                      {assignedNames.length > 0 ? (
                        assignedNames.map((name, idx) => (
                          <li key={idx} className="text-sm text-gray-800 mb-1 flex items-center">
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            {name}
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-400">No members assigned.</li>
                      )}
                    </ul>
                    <h3 className="text-base font-bold tracking-widest text-gray-900 uppercase font-sans mt-6">
                      To be approved by
                    </h3>
                    <div className="w-16 h-0.5 bg-yellow-400 mt-2 mb-4 rounded" />
                    <ul className="mb-6">
                      {approvalsArr.length > 0 ? (
                        approvalsArr.map((approver, idx) => (
                          <li key={idx} className="flex mb-2 text-sm">
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 mt-1 flex-shrink-0"></span>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800 flex items-center">
                                {approver.name} ({approver.role})
                                {approver.isApproved ? (
                                  <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs">Approved</span>
                                ) : (
                                  <span className="ml-2 px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs">Pending</span>
                                )}
                              </span>
                            </div>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-400">No approvers assigned.</li>
                      )}
                    </ul>
                    <h3 className="text-base font-bold tracking-widest text-gray-900 uppercase font-sans mt-6">
                      Notes
                    </h3>
                    <div className="w-16 h-0.5 bg-yellow-400 mt-2 mb-4 rounded" />
                    <ul>
                      {notes.length > 0 ? (
                        notes.map((note, idx) => (
                          <li key={idx} className="mb-3">
                            <div className="text-xs text-gray-500 mb-1 font-sans">
                              {note.added_by_name || note.added_by || ''} &middot; {formatDate(note.created_at)}
                            </div>
                            <div className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">{note.type || 'Note'}</div>
                            <div className="text-base text-gray-800 font-sans">{note.message}</div>
                          </li>
                        ))
                      ) : (
                        <li className="text-base text-gray-400 font-sans">No notes available.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Helper row for details list
function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm text-gray-900 ml-4">{value}</span>
    </div>
  );
}
