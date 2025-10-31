import React, { useMemo, useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import HeaderPublishedTemplateView from "../layout/headers/headerPublishedTemplateView";
import useUser from "../hooks/useUser";
import { getTemplateByIdAPI } from "../api/documentContollerAPI";
import { createDocumentAPI, deleteDocumentAPI } from "../api/documentsAPI";
import { exportDocumentPdfAPI } from "../api/assignmentDocumentsAPI";
import CreateDocumentModal from "../components/modals/createDocumentModal";
import TextEditor from "../layout/create_template/textEditor";
import DownloadingModal from "../components/modals/downloadingModal";
import axios from "axios";
import StoragePickerModal from "../components/modals/storagePickerModal";

const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");
const API_URL =
  API_URLS.find((url) => url.includes(window.location.hostname)) || API_URLS[0];

// Helper: create a temporary document from the template, export via the document exporter, then cleanup
async function exportTemplateViaDocument({ templateDoc, store = false, folderId, filename, html }) {
  const payload = {
    title: `${templateDoc.title || "Template"} (Export)`,
    template_id: templateDoc._id || templateDoc.id,
    pages_json: templateDoc.pages_json,
    pageSetup: templateDoc.pageSetup,
    field_values: templateDoc.field_values || {},
  };

  const createdRes = await createDocumentAPI(payload);
  const created = createdRes?.document || createdRes;
  const createdId = created?._id || created?.id || created?.document?._id;
  if (!createdId) throw new Error("Failed to create a temporary document for export");

  try {
    const resp = await exportDocumentPdfAPI(createdId, {
      store: !!store,
      folderId,
      filename,
      // If the caller provides raw HTML, forward it so backend renders exactly what the user sees
      ...(html ? { html, pageSetup: templateDoc.pageSetup } : {}),
      // Let backend build HTML from the document pages_json; no html/pageSetup override needed here
    });

    if (resp && resp.filePath) {
      // Server stored the PDF; open it and also trigger a download
      const path = String(resp.filePath);
      const url = /^https?:\/\//i.test(path) || path.startsWith("data:")
        ? path
        : `${API_URL.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
      // Open in new tab
      window.open(url, "_blank");
      // Best-effort: also start a direct download
      try {
        const r = await fetch(url, { credentials: 'include' });
        if (r.ok) {
          const blob = await r.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(blobUrl);
        }
      } catch {}
      return;
    }

    if (!store && resp && (resp.data || resp.base64)) {
      const b64 = resp.data || resp.base64;
      const contentType = resp.contentType || 'application/pdf';
      const dataUrl = b64.startsWith('data:') ? b64 : `data:${contentType};base64,${b64}`;
      const fetched = await fetch(dataUrl);
      const blob = await fetched.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      return;
    }

    const snapshot = resp && typeof resp === 'object' ? JSON.stringify({ keys: Object.keys(resp), filePath: resp.filePath || null }) : String(resp);
    throw new Error('Export did not return a file: ' + snapshot);
  } finally {
    // Cleanup the temporary document
    try { await deleteDocumentAPI(createdId); } catch (e) { /* ignore */ }
  }
}

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
  const [isLoading, setIsLoading] = useState(false); 
  const tpl = state?.doc || {};
  const [template, setTemplate] = useState(tpl);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [showStoragePicker, setShowStoragePicker] = useState(false);
  const previewRef = useRef(null);

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

  const handleExportDownload = async () => {
    setDownloadError("");
    setDownloading(true);
    try {
      const safeTitle = (template.title || "Template").replace(/[^a-z0-9\-_. ]/gi, "_");
      const html = buildExportHtmlFromPreview();
      await exportTemplateViaDocument({
        templateDoc: d,
        store: false,
        html: html || undefined,
        filename: `${safeTitle}.pdf`,
      });
      setDownloading(false);
    } catch (err) {
      console.error("Download failed:", err);
      setDownloadError(
        err?.response?.data?.message ||
          "We couldn't generate the PDF right now. Please try again."
      );
    }
  };

  const handleEdit = () => alert("Edit template (placeholder)");
  const handleUnpublish = () => alert("Unpublish template (placeholder)");

  const [createError, setCreateError] = useState(null);
  const [titleModalOpen, setTitleModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);

  const pageNodes = useMemo(() => {
    const baseDoc = d?.pages_json?.[0] || { type: "doc", content: [] };
    return (baseDoc.content || []).filter((n) => n.type === "page");
  }, [d]);

  const totalPages = pageNodes.length || 0;

  useEffect(() => {
    setCurrentPage(0);
  }, [d?._id || d?.id]);

  const contentForEditor = useMemo(() => {
    const baseDoc = d?.pages_json?.[0] || { type: "doc", content: [] };
    const pageNode =
      pageNodes[currentPage] ||
      (baseDoc.content || []).find((n) => n.type === "page");
    if (!pageNode) return baseDoc;
    return { ...baseDoc, content: [pageNode] };
  }, [d, pageNodes, currentPage]);

  // Build a full HTML document using the exact preview DOM and include current styles
  const buildExportHtmlFromPreview = () => {
    try {
      const node = previewRef.current;
      if (!node) return null;

      const headParts = [];
      const baseHref = window.location.origin + "/";
      headParts.push(`<base href="${baseHref}">`);
      const styleNodes = Array.from(document.querySelectorAll('head style, head link[rel="stylesheet"]'));
      for (const el of styleNodes) {
        if (el.tagName.toLowerCase() === 'style') {
          headParts.push(`<style>${el.innerHTML}</style>`);
        } else if (el.tagName.toLowerCase() === 'link') {
          const href = el.getAttribute('href');
          if (href) {
            const abs = href.startsWith('http') ? href : new URL(href, baseHref).href;
            headParts.push(`<link rel="stylesheet" href="${abs}">`);
          }
        }
      }

      // Choose the editor canvas only (avoid outer layout spacing)
      const canvas = node.querySelector('.rm-with-pagination') || node;

      // Export-only CSS to remove preview-only chrome, hide header rule, fix page gaps, and reduce widows/orphans
      const exportCss = `
        @page { margin: 0; }
        html, body { margin: 0; padding: 0; background: #fff; }
        /* Robust centering for headless PDF renderers */
        body { display: flex; justify-content: center; align-items: flex-start; }
        /* Neutralize PaginationPlus gaps/borders that can render as faint lines */
        :root, .rm-with-pagination { --pageGap: 0px !important; --pageGapBorderSize: 0px !important; }
        /* Keep canvas centered and remove any outer spacing */

        .rm-pagination-separator, .rm-page-gap { display: none !important; }
        .rm-page-break, .rm-page-container { background: #fff !important; box-shadow: none !important; border: 0 !important; outline: none !important; }
        .rm-page-break::before, .rm-page-break::after, .rm-page-container::before, .rm-page-container::after { display: none !important; content: none !important; }
        .rm-first-page-header, .rm-page-header { border: 0 !important; box-shadow: none !important; }
        /* Hide any header separator lines for export only */
        .rm-first-page-header .nv-header-line,
        .rm-page-header .nv-header-line,
        .nv-header-line { display: none !important; }
        
        /* Guard against top-collapsing margins from the first block on first page */
        .rm-page-break:first-child .ProseMirror > *:first-child { margin-top: 0 !important; padding-top: 0 !important; }
        /* Guard against bottom-collapsing margins on the last page */
        .rm-page-break:last-child .ProseMirror > *:last-child { margin-bottom: 0 !important; padding-bottom: 0 !important; }
        
        /* Last-page specific: ensure no separators or adornments render */
        .rm-page-break:last-child .rm-pagination-separator,
        .rm-page-break:last-child .rm-page-gap { display: none !important; }
        .rm-page-break:last-child::before,
        .rm-page-break:last-child::after,
        .rm-page-break:last-child .rm-page-container::before,
        .rm-page-break:last-child .rm-page-container::after { display: none !important; content: none !important; }
        
        /* Widow/Orphan control and break-inside avoidance for common blocks */
        .ProseMirror p,
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6,
        .ProseMirror ul, .ProseMirror ol,
        .ProseMirror li,
        .ProseMirror blockquote,
        .ProseMirror table,
        .ProseMirror tr,
        .ProseMirror figure,
        .ProseMirror pre,
        .ProseMirror code {
          page-break-inside: avoid !important;
          break-inside: avoid-page !important;
          widows: 3; orphans: 3;
          break-before: auto !important;
          break-after: auto !important; /* Relax end-of-doc behavior to avoid last-page artifacts */
        }
      `;

      const html = `<!doctype html><html><head>${headParts.join('\n')}<style>${exportCss}</style></head><body>${canvas.outerHTML}</body></html>`;
      return html;
    } catch (e) {
      console.warn('Failed to capture preview HTML:', e);
      return null;
    }
  };

  const normalizedHeaderConfig = (() => {
    const src = d?.headerConfig || d?.logoConfig || d?.headerFooter || {};
    const docCode = d?.document_code || d?.docCode || d?.documentCode || src?.documentStamp?.docCode || src?.document_code || src?.docCode || "";
    const revisionNo = (d?.revision_no ?? d?.revisionNo ?? src?.documentStamp?.revisionNo ?? src?.revision_no ?? src?.revisionNo ?? 0);
    const effectivity = d?.effectivity || d?.effectivity_date || d?.effectivity_date_iso || src?.documentStamp?.effectivity || src?.effectivity || "";
    return {
      ...src,
      showSLULogo: src.showSLULogo ?? src.showSLU ?? !!src.assets?.slu,
      showCICMLogo: src.showCICMLogo ?? src.showCICM ?? !!src.assets?.cicm,
      assets: {
        slu: src?.assets?.slu || src?.slu || "/assets/images/slu-logo.png",
        cicm: src?.assets?.cicm || src?.cicm || "/assets/images/cicm-logo.png",
      },
      center: src.center || {},
      // Ensure TextEditor can render stamp values via getCfg()
      documentStamp: {
        docCode,
        revisionNo,
        effectivity,
      },
      // Back-compat for getCfg() fallbacks
      document_code: docCode,
      revision_no: revisionNo,
      effectivity,
    };
  })();

  // Handler when user submits a title in the modal
  // now accepts autofill flag (boolean) as second arg
  const createWithTitle = async (title, autoFill = false) => {
    setIsLoading(true);
    setCreateError(null);
    
    try {
      const payload = {
        title: title || d.title || "Untitled Document",
        template_id: d._id || d.id,
        pages_json: d.pages_json,
        pageSetup: d.pageSetup,
        field_values: d.field_values || {},
      };

      const res = await createDocumentAPI(payload);
      const created = res?.document || res;
      const createdId = created._id || created.id || created.document?._id;
      
      if (!createdId) {
        throw new Error("Invalid response from server. Please try again.");
      }
 
         // Close modal then navigate; include flag and scope in state so editableFields can perform autofill
      setTitleModalOpen(false);
      const autofillFlag = !!autoFill;
      const autoFillScope =
        autofillFlag && typeof autoFill === "string"
          ? autoFill
          : autofillFlag
          ? "user"
          : false;

      navigate(`/documents/editable-fields/${createdId}`, {
        state: {
          doc: created,
          sidebarActive: "Documents",
          backTo: "/documents",
          autoFillFromSuggestions: autofillFlag,
          autoFillScope,
        },
      });
    } catch (err) {
      console.error("Failed to create document:", err);
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to create document";
      setCreateError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setCreateError(null);
    setTitleModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <HeaderPublishedTemplateView
        title={doc.title}
        onExportDownload={handleExportDownload}
        onExportToStorage={() => setShowStoragePicker(true)}
        onEdit={handleEdit}
        onUnpublish={handleUnpublish}
        user={user}
      />
      {/* Storage Picker */}
      <StoragePickerModal
        open={showStoragePicker}
        onClose={() => setShowStoragePicker(false)}
        user={user}
        onConfirm={async (folderId) => {
          setShowStoragePicker(false);
          setDownloadError("");
          setDownloading(true);
          try {
            const safeTitle = (template.title || "Template").replace(/[^a-z0-9\-_. ]/gi, "_");
            const html = buildExportHtmlFromPreview();
            await exportTemplateViaDocument({
              templateDoc: d,
              store: true,
              folderId,
              html: html || undefined,
              filename: `${safeTitle}.pdf`,
            });
            setDownloading(false);
          } catch (err) {
            console.error('Export to storage failed:', err);
            setDownloadError(err?.message || 'Failed to export and save to storage.');
          }
        }}
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:pl-2">
        <main className="p-8 flex-1 overflow-y-auto">
          <div className="grid grid-cols-12 gap-6">
            <section className="col-span-12 lg:col-span-8">
              {/* Render template preview using TextEditor (read-only). Build a single-page doc from pages_json */}
              {d && (
                <div className="w-full m">
              

                  <div ref={previewRef} id="template-preview-capture">
                  <TextEditor
                    content={contentForEditor}
                    pageSetup={d?.pageSetup}
                    className="pointer-events-none opacity-100 w-full"
                    onEditorReady={(editor) =>
                      editor && editor.setEditable(false)
                    }
                    mode="template"
                    headerConfig={normalizedHeaderConfig}
                    templateStatus={d?.status || "published"}
                    documentCode={
                      d?.document_code || d?.docCode || d?.documentCode
                    }
                    revisionNo={d?.revision_no ?? d?.revisionNo}
                    effectivity={
                      d?.effectivity ||
                      d?.effectivity_date ||
                      d?.effectivity_date_iso
                    }
                  />
                  </div>
                </div>
              )}
              {!d && (
                <div
                  className="h-full w-full flex items-center justify-center text-gray-400"
                  style={{ minHeight: 400 }}
                >
                  <div className="text-center">
                    <div className="text-lg font-medium mb-1">
                      Template Preview
                    </div>
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
                  <DetailRow
                    label="Revision No."
                    value={String(doc.revision_no)}
                  />
                  <DetailRow label="Effectivity" value={doc.effectivity} />
                  <DetailRow label="Pages" value={String(doc.pages)} />
                  <DetailRow
                    label="Document size"
                    value={doc.document_size}
                  />

                  <div className="mt-4 pt-4 border-t">
                    <button
                      onClick={() => setTitleModalOpen(true)}
                      disabled={isLoading}
                      className="w-full gap-3 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      {isLoading ? (
                        <>
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                           <path fill="#fff" d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8A8 8 0 0 1 12 20Z" opacity="0.5"/>
                           <path fill="#fff" d="M20 12h2A10 10 0 0 0 12 2V4A8 8 0 0 1 20 12Z"><animateTransform attributeName="transform" dur="1s" from="0 12 12" repeatCount="indefinite" to="360 12 12" type="rotate"/>
                           </path></svg>
                          Creating...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="12" y1="18" x2="12" y2="12"/>
                            <line x1="9" y1="15" x2="15" y2="15"/>
                          </svg>
                          Use Template
                        </>
                      )}
                    </button>

                     {/* Error Message
                    {createError && (
                      <div className="mt-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3 flex-1">
                            <h3 className="text-sm font-md text-red-800 mb-1">
                              Failed to Create Document
                            </h3>
                          </div>
                        </div>
                      </div>
                    )} */}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
      {/* Create Document Modal */  }
      <CreateDocumentModal
        open={titleModalOpen}
        onClose={() => setTitleModalOpen(false)}
        defaultTitle=""
        onCreate={createWithTitle}
        user={user}
        submitting={isLoading}
       
      />
 
      {/* Downloading Modal */  }
      <DownloadingModal
        open={downloading || !!downloadError}
        onClose={() => {
          setDownloading(false);
          setDownloadError("");
        }}
        isError={!!downloadError}
        title="Downloading PDF…"
        message={`"${
          template.title || "Template"
        }" is being prepared as a PDF. This may take a few seconds.`}
        errorText={downloadError}
      />
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm text-gray-900 ml-4 text-right">{value}</span>
    </div>
  );
}