import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";

// --- placeholders (use state.doc when present) ---
const FALLBACK_DOC = {
  title: "Course Name Syllabus",
  updatedAgo: "about 1 hour ago",
  document_code: "DOC-FAC-000",
  status: "Submitted",
  revision_no: 0,
  effectivity: "2025-03-01",
  pages: 12,
  document_size: "8.5 x 13",
};

export default function FacultyViewDocument() {
  const user = useUser();
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const doc = {
    title: state?.doc?.title || FALLBACK_DOC.title,
    updatedAgo: state?.doc?.updatedAgo || FALLBACK_DOC.updatedAgo,
    document_code:
      state?.doc?.document_code || state?.doc?.code || FALLBACK_DOC.document_code,
    status: state?.doc?.status || FALLBACK_DOC.status,
    revision_no: state?.doc?.revision_no ?? state?.doc?.rev ?? FALLBACK_DOC.revision_no,
    effectivity: state?.doc?.effectivity || state?.doc?.eff || FALLBACK_DOC.effectivity,
    pages: state?.doc?.pages ?? FALLBACK_DOC.pages,
    document_size: state?.doc?.document_size || FALLBACK_DOC.document_size,
  };

  const handleBack = () => navigate("/faculty/documents");
  const handleDownload = () => alert("Download as PDF (placeholder)");
  const handleEdit = () => alert("Edit (placeholder)");

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Documents" />

        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <main className="p-8 flex-1 overflow-y-auto">
            {/* Top row: back + actions */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M15 6l-6 6 6 6" />
                </svg>
                <span className="font-medium">My Documents</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 bg-[#0035DA] hover:bg-[#043485] text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors"
                >
                  {/* Proper download icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3v12m0 0l-4-4m4 4l4-4M4 17h16v4H4v-4z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Download as PDF
                </button>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center gap-2 bg-[#0035DA] hover:bg-[#043485] text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Edit
                </button>
              </div>
            </div>

            {/* Title chip */}
            <div className="bg-[#EFF3FF] text-gray-800 rounded-lg px-4 py-3 flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <span className="truncate font-medium">{doc.title}</span>
                <span className="text-gray-500 text-sm inline-flex items-center gap-1">
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 8v5l4 2l.75-1.86L13 11.7V8zm0-6a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z"
                    />
                  </svg>
                  Updated {doc.updatedAgo}
                </span>
              </div>
              {/* ✅ Removed the draft/status badge here */}
            </div>

            {/* Grid: preview + right info */}
            <div className="grid grid-cols-12 gap-6">
              {/* Preview */}
              <section className="col-span-12 lg:col-span-9">
                <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-gray-50 p-6">
                    <div
                      className="mx-auto bg-white shadow border rounded-md w-full"
                      style={{ minHeight: 900 }}
                    >
                      <div className="h-full w-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <div className="text-lg font-medium mb-1">
                            Document Preview
                          </div>
                          <div className="text-sm">
                            Placeholder surface for PDF/image.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Info panel */}
              <aside className="col-span-12 lg:col-span-3">
                <div className="bg-white border rounded-lg shadow-sm">
                  <div className="p-5">
                    <h3 className="text-sm font-semibold tracking-widest text-gray-900 uppercase">
                      Detailed Information
                    </h3>
                    <div className="w-24 h-0.5 bg-yellow-400 mt-2 mb-4 rounded" />

                    <DetailRow label="Document code" value={doc.document_code} />
                    <DetailRow label="Status" value={doc.status} />
                    <DetailRow label="Revision No." value={String(doc.revision_no)} />
                    <DetailRow label="Effectivity" value={doc.effectivity} />
                    <DetailRow label="Pages" value={String(doc.pages)} />
                    <DetailRow label="Document size" value={doc.document_size} />
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

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm text-gray-900 ml-4">{value}</span>
    </div>
  );
}
