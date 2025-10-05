import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";

const FALLBACK_TEMPLATE = {
  title: "Template Preview",
  updatedAgo: "just now",
  document_code: "TMP-DEPT-001",
  revision_no: 0,
  effectivity: "—",
  pages: 1,
  document_size: "A4",
};

export default function DepartmentHeadTemplateView() {
  const user = useUser();
  const { id } = useParams(); // available if you need to fetch the template by id
  const navigate = useNavigate();
  const { state } = useLocation();

  // keep left nav on Templates for DH context
  const sidebarActive = state?.sidebarActive || "Templates";

  const t = state?.doc || {};
  const template = {
    title: t.title || FALLBACK_TEMPLATE.title,
    updatedAgo: t.updatedAgo || FALLBACK_TEMPLATE.updatedAgo,
    document_code: t.document_code || t.code || FALLBACK_TEMPLATE.document_code,
    revision_no: t.revision_no ?? t.rev ?? FALLBACK_TEMPLATE.revision_no,
    effectivity: t.effectivity || t.eff || FALLBACK_TEMPLATE.effectivity,
    pages: t.pages ?? FALLBACK_TEMPLATE.pages,
    document_size: t.document_size || FALLBACK_TEMPLATE.document_size,
  };

  const handleBack = () => {
    if (state?.backTo) navigate(state.backTo);
    else navigate(-1);
  };

  const handleDownload = () => alert("Download as PDF (placeholder)");

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
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 3v10.59l3.3-3.3l1.4 1.42L12 17.4l-4.7-4.7l1.4-1.42l3.3 3.3V3zM5 19h14v2H5z"
                    />
                  </svg>
                  Download as PDF
                </button>
              </div>
            </div>

            {/* Title chip */}
            <div className="bg-[#EFF3FF] text-gray-800 rounded-lg px-4 py-3 flex items-center gap-3 mb-6">
              <div className="font-medium truncate">{template.title}</div>
              <div className="text-gray-500 text-sm flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 8v5l4 2l.75-1.86L13 11.7V8zm0-6a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z"
                  />
                </svg>
                Updated {template.updatedAgo}
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
                          <div className="text-lg font-medium mb-1">Template Preview</div>
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
                      Template Details
                    </h3>
                    <div className="w-24 h-0.5 bg-yellow-400 mt-2 mb-4 rounded" />
                    <DetailRow label="Document code" value={template.document_code} />
                    <DetailRow label="Revision No." value={String(template.revision_no)} />
                    <DetailRow label="Effectivity" value={template.effectivity} />
                    <DetailRow label="Pages" value={String(template.pages)} />
                    <DetailRow label="Document size" value={template.document_size} />
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