/** FUTURE USE : DUPLICATED VERSION OF publishedTemplateView.jsx */
import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import HeaderDocumentView from "../layout/headers/headerPublishedTemplateView";
import useUser from "../hooks/useUser";
import { getTemplateByIdAPI } from "../api/documentContollerAPI";
import { useState, useEffect } from "react";
import DownloadingModal from "../components/modals/downloadingModal";

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

const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");
const API_URL =
  API_URLS.find((url) => url.includes(window.location.hostname)) || API_URLS[0];

/**
 * Try various ways to download a template as PDF:
 * 1) If the template has a direct pdfUrl, use that.
 * 2) Otherwise, try a conventional REST route: /api/templates/:id/pdf
 * 3) Fallback to a blob the backend returns under another field (if any).
 */
async function downloadTemplatePDF({ id, title, pdfUrl }) {
  // Prefer explicit URL if provided on the template
  if (pdfUrl && /^https?:\/\//i.test(pdfUrl)) {
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${(title || "template").replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  // Try a common REST endpoint
  const endpoint = `${API_URL.replace(/\/$/, "")}/api/templates/${id}/pdf`;

  const response = await axios.get(endpoint, {
    responseType: "blob",
  });

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

  const [fetchedDoc, setFetchedDoc] = useState(null);
  const [loading, setLoading] = useState(false);

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    // If no doc was passed in state, try fetching by URL id
    if (!state?.doc && id) {
      let ignore = false;
      const load = async () => {
        setLoading(true);
        try {
          const res = await getTemplateByIdAPI(id);
          const tpl = res?.template || res;
          if (!ignore) setFetchedDoc(tpl);
        } catch (err) {
          console.error('Failed to fetch template for view:', err);
        } finally {
          if (!ignore) setLoading(false);
        }
      };
      load();
      return () => { ignore = true; };
    }
  }, [id, state]);

  // Prefer the document passed from the list page; otherwise use fetchedDoc or fallback placeholders
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

  const handleBack = () => {
    // Go back to where the user came from, otherwise default to /documents
    if (state?.backTo) navigate(state.backTo);
    else navigate(-1);
  };

  const handleDownload = async () => {
    setDownloadError("");
    setDownloading(true);
    try {
      await downloadTemplatePDF({
        id: doc.id,
        title: doc.title,
        pdfUrl: doc.pdfUrl,
      });
      // Close the modal after the browser starts the file download
      setDownloading(false);
    } catch (err) {
      console.error("Download failed:", err);
      setDownloadError(
        err?.response?.data?.message ||
          "We couldn’t generate the PDF right now. Please try again."
      );
      // Keep modal open but switch to error state; user can close it.
    }
  };

  const handleEdit = () => alert("Edit document (placeholder)");
  const handleUnpublish = () => alert("Unpublish document (placeholder)");

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <HeaderDocumentView user={user} />

      {/* Top action bar */}
      <div className="mx-auto w-full max-w-7xl px-4 md:pl-2 mt-4">
        <div className="flex items-center justify-between bg-white border rounded-lg shadow-sm px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm"
            >
              ← Back
            </button>
            <div className="text-sm text-gray-500">
              Last updated {doc.updatedAgo}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Download as PDF */}
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm shadow"
              title="Download this template as a PDF"
            >
              {/* download icon */}
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M7 10l5 5 5-5" />
                <path d="M12 15V3" />
              </svg>
              Download as PDF
            </button>

            {/* (Optional) Other actions retained for future use */}
            <button
              onClick={handleEdit}
              className="px-3 py-2 rounded border text-sm hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              onClick={handleUnpublish}
              className="px-3 py-2 rounded border text-sm hover:bg-gray-50"
            >
              Unpublish
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:pl-2">
        <main className="p-8 flex-1 overflow-y-auto">
          {/* Content grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Preview */}
            <section className="col-span-12 lg:col-span-8">
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
            <aside className="col-span-12 lg:col-span-4">
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

      {/* Downloading Modal */}
      <DownloadingModal
        open={downloading || !!downloadError}
        onClose={() => {
          setDownloading(false);
          setDownloadError("");
        }}
        isError={!!downloadError}
        title="Downloading PDF…"
        message={`"${doc.title}" is being prepared as a PDF. This may take a few seconds.`}
        errorText={downloadError}
      />
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
