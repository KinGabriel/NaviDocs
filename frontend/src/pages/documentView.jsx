import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import Header from "../layout/header";
import Sidebar from "../layout/sidebar";
import useUser from "../hooks/useUser";

/** Fallback placeholders (used if you navigate directly or state.doc is absent) */
const FALLBACK_DOC = {
  title: "Department Head Form",
  updatedAgo: "about 2 hours ago",
  document_code: "FM-DEPT-001",
  revision_no: 0,
  effectivity: "2023-09-01",
  pages: 1,
  document_size: "8.5 x 13",
};

/**
 * Global document view (reusable for ALL modules)
 * - Accepts `state.doc` as the document payload
 * - Accepts `state.sidebarActive` to highlight the correct nav item
 *   (e.g. "Documents", "Document Workflow", "Templates")
 * - If nothing is passed, uses FALLBACK_DOC + defaults.
 */
export default function DocumentView() {
  const user = useUser();
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  // Pick sidebar label if provided (keeps the left nav highlight correct per module)
  const sidebarActive =
    state?.sidebarActive ||
    "Documents"; 

  // Prefer the document passed from the list page; otherwise, fallback placeholders
  const d = state?.doc || {};
  const doc = {
    title: d.title || FALLBACK_DOC.title,
    updatedAgo: d.updatedAgo || FALLBACK_DOC.updatedAgo,
    document_code: d.document_code || d.code || FALLBACK_DOC.document_code,
    revision_no: d.revision_no ?? d.rev ?? FALLBACK_DOC.revision_no,
    effectivity: d.effectivity || d.eff || FALLBACK_DOC.effectivity,
    pages: d.pages ?? FALLBACK_DOC.pages,
    document_size: d.document_size || FALLBACK_DOC.document_size,
  };

  const handleBack = () => {
    // Go back to where the user came from, otherwise default to /documents
    if (state?.backTo) navigate(state.backTo);
    else navigate(-1);
  };

  const handleDownload = () => alert("Download as PDF (placeholder)");
  const handleEdit = () => alert("Edit document (placeholder)");
  const handleUnpublish = () => alert("Unpublish document (placeholder)");

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active={sidebarActive} />

        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <main className="p-8 flex-1 overflow-y-auto">
            {/* Back + actions */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M15 6l-6 6 6 6" />
                </svg>
                <span className="font-medium">Back</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 bg-[#0035DA] hover:bg-[#043485] text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors"
                >
                  {/* correct orientation for download arrow */}
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 3v10.59l3.3-3.3l1.4 1.42L12 17.4l-4.7-4.7l1.4-1.42l3.3 3.3V3zM5 19h14v2H5z"
                    />
                  </svg>
                  Download as PDF
                </button>

                <button
                  onClick={handleEdit}
                  className="inline-flex items-center gap-2 bg-[#0035DA] hover:bg-[#043485] text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm18-10.5a1.003 1.003 0 0 0 0-1.41l-2.34-2.34a1.003 1.003 0 0 0-1.41 0l-1.83 1.83l3.75 3.75L21 6.75z"
                    />
                  </svg>
                  Edit
                </button>

                <button
                  onClick={handleUnpublish}
                  className="inline-flex items-center gap-2 bg-[#0035DA] hover:bg-[#043485] text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M19 13H5v-2h14v2Z"
                    />
                  </svg>
                  Unpublish
                </button>
              </div>
            </div>

            {/* Title chip */}
            <div className="bg-[#EFF3FF] text-gray-800 rounded-lg px-4 py-3 flex items-center gap-3 mb-6">
              <div className="font-medium truncate">{doc.title}</div>
              <div className="text-gray-500 text-sm flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 8v5l4 2l.75-1.86L13 11.7V8zm0-6a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z"
                  />
                </svg>
                Updated {doc.updatedAgo}
              </div>
            </div>

            {/* Content grid */}
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
                          <div className="text-lg font-medium mb-1">Document Preview</div>
                          <div className="text-sm">Placeholder for PDF/Image preview.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Details */}
              <aside className="col-span-12 lg:col-span-3">
                <div className="bg-white border rounded-lg shadow-sm">
                  <div className="p-5">
                    <h3 className="text-sm font-semibold tracking-widest text-gray-900 uppercase">
                      Document Details
                    </h3>
                    <div className="w-24 h-0.5 bg-yellow-400 mt-2 mb-4 rounded" />
                    <DetailRow label="Document code" value={doc.document_code} />
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
