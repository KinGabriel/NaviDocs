import React, { useMemo, useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import HeaderPublishedTemplateView from "../layout/headers/headerPublishedTemplateView";
import useUser from "../hooks/useUser";
import { getTemplateByIdAPI } from "../api/documentContollerAPI";
import { createDocumentAPI } from "../api/documentsAPI";
import CreateDocumentModal from "../components/modals/createDocumentModal";
import TextEditor from "../layout/create_template/textEditor";
import DownloadingModal from "../components/modals/downloadingModal";
import axios from "axios";

const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");
const API_URL =
  API_URLS.find((url) => url.includes(window.location.hostname)) || API_URLS[0];

async function downloadTemplatePDF({ id, title, pdfUrl }) {
  if (pdfUrl && /^https?:\/\//i.test(pdfUrl)) {
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${(title || "template").replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  const endpoint = `${API_URL.replace(/\/$/, "")}/api/templates/${id}/pdf`;
  const response = await axios.get(endpoint, { responseType: "blob" });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(title || "template").replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

  const handleDownload = async () => {
    setDownloadError("");
    setDownloading(true);
    try {
      await downloadTemplatePDF({
        id: template._id || template.id || id,
        title: template.title || "Template",
        pdfUrl: template.pdfUrl || template.pdf_url,
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

  const normalizedLogoConfig = (() => {
    const src = d?.logoConfig || d?.headerFooter || {};
    return {
      ...src,
      showSLULogo: src.showSLULogo ?? src.showSLU ?? !!src.assets?.slu,
      showCICMLogo: src.showCICMLogo ?? src.showCICM ?? !!src.assets?.cicm,
      assets: {
        slu: src?.assets?.slu || src?.slu || "/assets/images/slu-logo.png",
        cicm: src?.assets?.cicm || src?.cicm || "/assets/images/cicm-logo.png",
      },
      center: src.center || {},
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
                  {totalPages > 0 && (
                    <div className="flex items-center justify-between mb-2">
                      <button
                        className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(0, p - 1))
                        }
                        disabled={currentPage === 0}
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage + 1} of {totalPages}
                      </span>
                      <button
                        className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        onClick={() =>
                          setCurrentPage((p) =>
                            Math.min(totalPages - 1, p + 1)
                          )
                        }
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
                    onEditorReady={(editor) =>
                      editor && editor.setEditable(false)
                    }
                    mode="template"
                    logoConfig={normalizedLogoConfig}
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
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                            <circle cx="12" cy="2" r="0" fill="#fff">
                              <animate attributeName="r" begin="0" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                            </circle>
                            <circle cx="12" cy="2" r="0" fill="#fff" transform="rotate(45 12 12)">
                              <animate attributeName="r" begin="0.125s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                            </circle>
                            <circle cx="12" cy="2" r="0" fill="#fff" transform="rotate(90 12 12)">
                              <animate attributeName="r" begin="0.25s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                            </circle>
                            <circle cx="12" cy="2" r="0" fill="#fff" transform="rotate(135 12 12)">
                              <animate attributeName="r" begin="0.375s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                            </circle>
                            <circle cx="12" cy="2" r="0" fill="#fff" transform="rotate(180 12 12)">
                              <animate attributeName="r" begin="0.5s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                            </circle>
                            <circle cx="12" cy="2" r="0" fill="#fff" transform="rotate(225 12 12)">
                              <animate attributeName="r" begin="0.625s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                            </circle>
                            <circle cx="12" cy="2" r="0" fill="#fff" transform="rotate(270 12 12)">
                              <animate attributeName="r" begin="0.75s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                            </circle>
                            <circle cx="12" cy="2" r="0" fill="#fff" transform="rotate(315 12 12)">
                              <animate attributeName="r" begin="0.875s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                            </circle>
                          </svg>
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