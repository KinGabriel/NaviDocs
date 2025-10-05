import React, { useMemo, useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import HeaderPublishedTemplateView from "../layout/headerPublishedTemplateView";
import useUser from "../hooks/useUser";
import { getTemplateByIdAPI } from "../api/documentContollerAPI";
import TextEditor from "../layout/create_template/textEditor";

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

export default function PublishedTemplateView() {
  const user = useUser();
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [fetchedDoc, setFetchedDoc] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!state?.doc && id) {
      let ignore = false;
      const load = async () => {
        setLoading(true);
        try {
          const res = await getTemplateByIdAPI(id);
          const tpl = res?.template || res;
          if (!ignore) setFetchedDoc(tpl);
        } catch (err) {
          console.error("Failed to fetch template for view:", err);
        } finally {
          if (!ignore) setLoading(false);
        }
      };
      load();
      return () => {
        ignore = true;
      };
    }
  }, [id, state]);

  const d = state?.doc || fetchedDoc || {};
  const doc = {
    title: d.title || FALLBACK_DOC.title,
    updatedAgo: d.updatedAgo || FALLBACK_DOC.updatedAgo,
    document_code: d.document_code || d.code || FALLBACK_DOC.document_code,
    revision_no: d.revision_no ?? d.rev ?? FALLBACK_DOC.revision_no,
    effectivity: d.effectivity || d.eff || FALLBACK_DOC.effectivity,
    pages: d.pages ?? FALLBACK_DOC.pages,
    document_size: d.document_size || FALLBACK_DOC.document_size,
  };

  const handleDownload = () => alert("Download as PDF (placeholder)");
  const handleEdit = () => alert("Edit template (placeholder)");
  const handleUnpublish = () => alert("Unpublish template (placeholder)");

  // Page preview state: allow navigating pages in the template preview
  const [currentPage, setCurrentPage] = useState(0);

  const pageNodes = useMemo(() => {
    const baseDoc = d?.pages_json?.[0] || { type: "doc", content: [] };
    return (baseDoc.content || []).filter((n) => n.type === "page");
  }, [d]);

  const totalPages = pageNodes.length || 0;

  useEffect(() => {
    // reset current page when the template changes
    setCurrentPage(0);
  }, [d?._id || d?.id]);

  const contentForEditor = useMemo(() => {
    const baseDoc = d?.pages_json?.[0] || { type: "doc", content: [] };
    const pageNode = pageNodes[currentPage] || (baseDoc.content || []).find((n) => n.type === "page");
    if (!pageNode) return baseDoc;
    return { ...baseDoc, content: [pageNode] };
  }, [d, pageNodes, currentPage]);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <HeaderPublishedTemplateView
        title={doc.title}
        onDownloadPDF={handleDownload}
        onEdit={handleEdit}
        onUnpublish={handleUnpublish}
        user={user}
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:pl-2">
        <main className="p-8 flex-1 overflow-y-auto">
          <div className="grid grid-cols-12 gap-6">
            <section className="col-span-12 lg:col-span-8">
              
                    {/* Render template preview using TextEditor (read-only). Build a single-page doc from pages_json */}
                    {d && (
                      <div className="w-full">
                        {/* Page controls */}
                        {totalPages > 0 && (
                          <div className="flex items-center justify-between mb-2">
                      <button
                        className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage + 1} of {totalPages}
                      </span>
                      <button
                        className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage === totalPages - 1}
                      >
                        Next
                      </button>
                       </div>
                        )}

                        <TextEditor
                          content={contentForEditor}
                          pageSetup={d?.pageSetup}
                          className="pointer-events-none opacity-100 w-full"
                          onEditorReady={(editor) => editor && editor.setEditable(false)}
                          mode="template"
                        />
                      </div>
                    )}
                    {!d && (
                      <div className="h-full w-full flex items-center justify-center text-gray-400" style={{ minHeight: 400 }}>
                        <div className="text-center">
                          <div className="text-lg font-medium mb-1">Template Preview</div>
                          <div className="text-sm">Loading preview…</div>
                        </div>
                      </div>
                    )}

            </section>

            <aside className="col-span-12 lg:col-span-4">
              <div className="bg-white border rounded-lg shadow-sm">
                <div className="p-5">
                  <h3 className="text-sm font-semibold tracking-widest text-gray-900 uppercase">
                    Template Details
                  </h3>
                  <div className="w-24 h-0.5 bg-yellow-400 mt-2 mb-4 rounded" />
                  <DetailRow label="Template title" value={doc.title} />
                  <DetailRow label="Document code" value={doc.document_code} />
                  <DetailRow label="Revision No." value={String(doc.revision_no)} />
                  <DetailRow label="Effectivity" value={doc.effectivity} />
                  <DetailRow label="Pages" value={String(doc.pages)} />
                  <DetailRow label="Document size" value={doc.document_size} />

                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <button
                      onClick={() => navigate('/documents/new', { state: { template: d, from: 'published-template' } })}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold"
                    >
                      Use Template
                    </button>
                  </div>
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
