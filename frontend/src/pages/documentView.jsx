import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import HeaderDocumentView from "../components/HeaderDocumentView";
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
      <HeaderDocumentView user={user} />
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:pl-2">
          <main className="p-8 flex-1 overflow-y-auto">
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
