 /**
 Utility to export a document to PDF, optionally upload to Storage, then download/open
 Contract:
- Inputs: {
   documentId: string,
     fileName: string, // e.g., 'document.pdf'
    html?: string | null,
    pageSetup?: any,
    store?: boolean, // default true
     folderId?: string | null | undefined, // when defined and store=false, will upload client-side then download
    userId?: string, // used for storage upload owner/uploader
     fileServiceBaseUrl?: string // optional override for file base resolution
  }
- Behavior:
     Calls exportDocumentPdfAPI; if server stores and returns filePath, opens it. If returns base64 and store=false,
     converts to Blob, optionally uploads to storage (folder or orphan), and triggers browser download.
   - Returns: { opened?: boolean, downloaded?: boolean, uploaded?: boolean, filePath?: string }
 */
import { exportDocumentPdfAPI } from "../api/assignmentDocumentsAPI";
import { addDocumentsAPI, addOrphanFileAPI } from "../api/storageAPI";

const sanitizeFileName = (name) => {
  const base = (name || "document").replace(/[^a-z0-9\-_. ]/gi, "_") || "document";
  return base.endsWith(".pdf") ? base : base + ".pdf";
};

const resolveFileBase = (override) => {
  if (override && typeof override === "string") {
    let b = String(override).trim();
    if (b.startsWith("http//")) b = "http://" + b.slice(6);
    if (b.startsWith("https//")) b = "https://" + b.slice(7);
    return b.replace(/\/$/, "");
  }
  const rawBases = (import.meta.env.VITE_FILE_SERVICE_URL || import.meta.env.VITE_API_URL || "http://localhost:3000").split(",");
  let pickBase = rawBases.find((u) => u && u.includes(window.location.hostname)) || rawBases[0] || "";
  pickBase = String(pickBase).trim();
  if (pickBase.startsWith("http//")) pickBase = "http://" + pickBase.slice(6); // fix missing colon if present
  if (pickBase.startsWith("https//")) pickBase = "https://" + pickBase.slice(7);
  return pickBase.replace(/\/$/, "");
};

export async function exportDocumentPdf({
  documentId,
  fileName,
  html = null,
  pageSetup = null,
  store = true,
  folderId = undefined,
  userId = undefined,
  fileServiceBaseUrl = undefined,
} = {}) {
  if (!documentId) throw new Error("exportDocumentPdf: documentId is required");
  const FILE_BASE = resolveFileBase(fileServiceBaseUrl);
  const finalName = sanitizeFileName(fileName);

  const resp = await exportDocumentPdfAPI(documentId, {
    store: !!store,
    html,
    pageSetup,
    folderId,
    filename: finalName,
  });

  // If server returned a stored file path, open it in a new tab
  if (resp && resp.filePath) {
    const path = String(resp.filePath || "");
    const url = /^https?:\/\//i.test(path) || path.startsWith("data:") ? path : `${FILE_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
    window.open(url, "_blank");
    return { opened: true, filePath: path };
  }

  // If server returned inline base64 data, convert to blob and download
  if (!store && resp && (resp.data || resp.base64)) {
    const b64 = resp.data || resp.base64;
    const contentType = resp.contentType || "application/pdf";
    let blob;
    try {
      const dataUrl = b64.startsWith("data:") ? b64 : `data:${contentType};base64,${b64}`;
      const fetched = await fetch(dataUrl);
      blob = await fetched.blob();
    } catch (e) {
      // fallback to manual base64 decode
      try {
        const sanitized = String(b64).replace(/\s+/g, "");
        const byteCharacters = atob(sanitized);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: contentType });
      } catch (e2) {
        console.error("exportDocumentPdf: base64 decode failed", e2);
        throw e2;
      }
    }

    let uploaded = false;
    if (typeof folderId !== "undefined" && blob) {
      // optional client-side upload to Storage (folder or orphan)
      try {
        const file = new File([blob], finalName, { type: contentType });
        if (folderId) {
          await addDocumentsAPI(folderId, [file], userId, userId);
        } else {
          await addOrphanFileAPI([file], userId, userId);
        }
        uploaded = true;
      } catch (uploadErr) {
        console.error("exportDocumentPdf: upload to storage failed", uploadErr);
        // continue to download even if upload fails
      }
    }

    // trigger browser download
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);

    return { downloaded: true, uploaded };
  }

  const snapshot =
    resp && typeof resp === "object"
      ? JSON.stringify({ keys: Object.keys(resp), hasData: !!(resp.data || resp.base64), filePath: resp.filePath || null })
      : String(resp);
  throw new Error("Export completed but no file was returned: " + snapshot);
}

export default exportDocumentPdf;
