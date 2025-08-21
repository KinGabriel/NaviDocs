import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";

// ----- Placeholder document 
const PLACEHOLDER_DOC = {
  title: "Student Form",
  updatedAgo: "about 1 hour ago",
  document_code: "FM-VAA-047",
  revision_no: 0,
  effectivity: "2023-08-01",
  pages: 1,
  document_size: "8.5 x 13",
};

export default function DocumentControllerViewDocuments() {
  const user = useUser();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // Where did we come from? ('documents' | 'workflow')
  const from =
    location.state?.from ||
    (location.pathname.includes("/document-workflow/") ? "workflow" : "documents");

  // Show correct sidebar highlight
  const activeLabel = from === "workflow" ? "Document Workflow" : "Documents";

  // Prefer doc passed from "View" button, else fall back to placeholder
  const passedDoc = location.state?.doc;
  const doc = {
    title: passedDoc?.title || PLACEHOLDER_DOC.title,
    updatedAgo: passedDoc?.updatedAgo || PLACEHOLDER_DOC.updatedAgo,
    document_code:
      passedDoc?.document_code || passedDoc?.code || PLACEHOLDER_DOC.document_code,
    revision_no: passedDoc?.revision_no ?? passedDoc?.rev ?? PLACEHOLDER_DOC.revision_no,
    effectivity: passedDoc?.effectivity || passedDoc?.eff || PLACEHOLDER_DOC.effectivity,
    pages: passedDoc?.pages ?? PLACEHOLDER_DOC.pages,
    document_size: passedDoc?.document_size || PLACEHOLDER_DOC.document_size,
  };

  // Button actions (placeholders)
  const handleDownload = () => alert("Download as PDF (placeholder)");
  const handleEdit = () =>
    navigate(`/document-controller/create-template?templateId=${id || "placeholder"}`);
  const handleUnpublish = () => alert("Unpublish (placeholder)");

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        {/* Sidebar fixed width */}
        <div className="flex-none">
          <Sidebar user={user} active={activeLabel} />
        </div>

        {/* Wrapper */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <main className="p-8 flex-1 overflow-y-auto">
            {/* Page title */}
            <h1 className="text-3xl font-semibold tracking-wide mb-6">Documents</h1>

            {/* Document chip + actions */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
              <div className="flex-1">
                <div className="bg-[#EFF3FF] text-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
                  <div className="font-medium">{doc.title}</div>
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
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md shadow text-white bg-[#0035DA] hover:bg-[#043485] font-semibold transition-colors"
                >
                  {/* Download Icon */}
                < svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
                Download as PDF
                </button>

                <button
                  onClick={handleEdit}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md shadow text-white bg-[#0035DA] hover:bg-[#043485] font-semibold transition-colors"
                >
                  {/* Edit Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
                </svg>
                Edit
                </button>

                <button
                  onClick={handleUnpublish}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md shadow text-white bg-[#0035DA] hover:bg-[#043485] font-semibold transition-colors"
                >
                  {/* Unpublish / Archive Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-6 4h8" />
                </svg>
                Unpublish
                </button>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left: Document preview */}
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
                          <div className="text-sm">Placeholder surface for PDF/image.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Right: Details panel */}
              <aside className="col-span-12 lg:col-span-3">
                <div className="bg-white border rounded-lg shadow-sm">
                  <div className="p-5">
                    <h3 className="text-sm font-semibold tracking-widest text-gray-900 uppercase">
                      Detailed Information
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

// Helper row
function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm text-gray-900 ml-4">{value}</span>
    </div>
  );
}
