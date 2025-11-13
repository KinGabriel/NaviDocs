// src/pages/documentControllerCreateTemplate.jsx
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import {
  updateTemplateAPI,
  approveTemplateAPI,
  publishTemplateAPI,
  createTemplateAPI,
  submitTemplateAPI,
} from "../../api/documentContollerAPI";
import fetchAndNormalizeTemplate from "../../utils/templateLoader";
import useUser from "../../hooks/useUser";
import Header2 from "../../layout/headers/header2";
import VersionHistory from "../version_history/templateVersionHistory";

// Panels
import FontPanel from "../../layout/create_template/fontPanel";
import PageSetupPanel from "../../layout/create_template/pageSetupPanel";
import InsertPanel from "../../layout/create_template/insertPanel";
import FieldsPanel from "../../layout/create_template/fieldsPanel";
import HeaderFooterPanel from "../../layout/create_template/headerfooterPanel";

// Sidebar
import TemplateSidebar from "../../layout/sidebars/templateSidebar";

// Text editor
import TextEditor from "../../layout/create_template/textEditor";

/* ---------------------------------- consts ---------------------------------- */
const DEFAULT_CONTENT = null;

const DEFAULT_PAGE_SETUP = {
  paperSize: "A4",
  orientation: "Portrait",
  margins: { top: 1, bottom: 1, left: 1, right: 1 },
};

function useHeaderHeight() {
  const [h, setH] = useState(80);
  useLayoutEffect(() => {
    const pick = () =>
      document.querySelector("[data-app-header]") ||
      document.querySelector("header") ||
      document.querySelector(".sticky.top-0");
    const read = () => {
      const el = pick();
      if (el) setH(Math.round(el.getBoundingClientRect().height));
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return h;
}

// Deep merge utility (keeps nested structure like footer.pageNumber/body)
function deepMerge(base, over) {
  if (!over || typeof over !== "object") return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(over)) {
    const bv = base?.[k];
    const ov = over[k];
    out[k] =
      bv && typeof bv === "object" && !Array.isArray(bv) && ov && typeof ov === "object" && !Array.isArray(ov)
        ? deepMerge(bv, ov)
        : ov;
  }
  return out;
}

// Sensible defaults for header/footer so something shows on first render
const DEFAULT_HEADER_CONFIG = {
  headerEnabled: true,
  footerEnabled: true,
  headerMarginIn: 0.5,
  footerMarginIn: 0.5,
  assets: {
    slu: "/assets/images/slu-logo.png",
    cicm: "/assets/images/cicm-logo.png",
  },
  header: {
    logos: {
      slu: { enabled: true, sizePx: 72, xPercent: 6 },
      cicm: { enabled: false, sizePx: 72, xPercent: 94 },
    },
    centerText: {
      enabled: true,
      line1: "Saint Louis University",
      line2: "",
      line3: "",
      line4: "",
      showLine4: false,
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: 14,
      bold: false,
      italic: false,
      color: "#000000",
      showHeaderLine: false,
    },
  },
  documentStamp: { docCode: "", revisionNo: "", effectivity: "" },
  footer: {
    pageNumber: {
      enabled: true,
      pattern: "{page} of {total}",
      align: "center",
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: 12,
      bold: false,
      italic: false,
      color: "#000000",
    },
    body: {
      enabled: false,
      text: "",
      align: "left",
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: 12,
      bold: false,
      italic: false,
      color: "#000000",
    },
  },
};

// Ensure any loaded config has the full structure (esp. footer block)
function withHeaderDefaults(cfg) {
  const merged = deepMerge(DEFAULT_HEADER_CONFIG, cfg || {});
  if (!merged.footer) merged.footer = DEFAULT_HEADER_CONFIG.footer;
  if (!merged.footer.pageNumber) merged.footer.pageNumber = DEFAULT_HEADER_CONFIG.footer.pageNumber;
  if (!merged.footer.body) merged.footer.body = DEFAULT_HEADER_CONFIG.footer.body;
  return merged;
}

/* --------------------------------- component -------------------------------- */
export default function DocumentControllerCreateTemplate() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser();

  const editorRef = useRef(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const headerH = useHeaderHeight();

  // Template state
  const [templateId, setTemplateId] = useState(null);
  const [templateTitle, setTemplateTitle] = useState("Untitled Template");
  const [templateContent, setTemplateContent] = useState(DEFAULT_CONTENT);

  const [status, setStatus] = useState("draft");
  const [approvers, setApprovers] = useState([]);
  const [approvals, setApprovals] = useState(null);
  const [approvalMeta, setApprovalMeta] = useState(null);
  const [template, setTemplate] = useState(null);

  // Layout/config
  const [pageSetup, setPageSetup] = useState(DEFAULT_PAGE_SETUP);
  const [fontSettings, setFontSettings] = useState({});
  const [editableFields, setEditableFields] = useState([]);

  // HeaderFooter config
  const [headerConfig, setHeaderConfig] = useState(DEFAULT_HEADER_CONFIG);

  // Document stamp (top-level)
  const [documentCode, setDocumentCode] = useState("");
  const [revisionNo, setRevisionNo] = useState(0);
  const [effectivity, setEffectivity] = useState("");

  // Dirty tracking
  const [lastSavedContent, setLastSavedContent] = useState(null);
  const [lastSavedTitle, setLastSavedTitle] = useState("");
  const [lastSavedId, setLastSavedId] = useState(null);
  const [lastSavedHeaderConfig, setLastSavedHeaderConfig] = useState(DEFAULT_HEADER_CONFIG);
  const [lastSavedPageSetup, setLastSavedPageSetup] = useState(DEFAULT_PAGE_SETUP);
  const [lastSavedDocumentCode, setLastSavedDocumentCode] = useState("");
  const [lastSavedRevisionNo, setLastSavedRevisionNo] = useState(0);
  const [lastSavedEffectivity, setLastSavedEffectivity] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Query param
  const params = new URLSearchParams(location.search);
  const templateIdFromQuery = params.get("templateId");

  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Check if the current user is the creator and template is published
  const isCreator = template?.created_by && user?.id && String(template.created_by) === String(user.id);
  const isPublished = status === "published";
  const userRole = user?.role?.name || user?.role || "";
  const normalizedRole = String(userRole).toLowerCase().replace(/[_\s]+/g, " ").trim();
  const isDocumentControlOfficer =
    normalizedRole === "document control officer" || normalizedRole === "document_controller_officer";

  // Creators cannot edit published templates unless they are Document Control Officers
  const isReadOnly = isPublished && isCreator && !isDocumentControlOfficer;

  /* ------------------------------- load template ------------------------------ */
  const loadTemplate = async (id) => {
    try {
      setLoading(true);
      const normalized = await fetchAndNormalizeTemplate(id);

      setTemplateTitle(normalized.templateTitle);
      setNotes(normalized.notes);
      setStatus(normalized.status);
      setTemplate(normalized.template);
      setApprovals(normalized.approvals);
      setApprovalMeta(normalized.approvalMeta);
      setApprovers(normalized.approvers);
      setTemplateContent(normalized.templateContent || DEFAULT_CONTENT);

      if (normalized.pageSetup) {
        setPageSetup({
          paperSize: normalized.pageSetup.paperSize || DEFAULT_PAGE_SETUP.paperSize,
          orientation: normalized.pageSetup.orientation || DEFAULT_PAGE_SETUP.orientation,
          margins: {
            top: normalized.pageSetup.margins?.top ?? DEFAULT_PAGE_SETUP.margins.top,
            bottom: normalized.pageSetup.margins?.bottom ?? DEFAULT_PAGE_SETUP.margins.bottom,
            left: normalized.pageSetup.margins?.left ?? DEFAULT_PAGE_SETUP.margins.left,
            right: normalized.pageSetup.margins?.right ?? DEFAULT_PAGE_SETUP.margins.right,
          },
        });
      }

      if (normalized.fontSettings) setFontSettings(normalized.fontSettings);
      if (Array.isArray(normalized.editableFields)) setEditableFields(normalized.editableFields);

      const loadedHeader =
        normalized.headerConfig && Object.keys(normalized.headerConfig).length
          ? normalized.headerConfig
          : DEFAULT_HEADER_CONFIG;
      setHeaderConfig(loadedHeader);

      if (normalized.document_code !== undefined) setDocumentCode(normalized.document_code ?? "");
      if (normalized.revision_no !== undefined) setRevisionNo(normalized.revision_no ?? 0);
      if (normalized.effectivity !== undefined) setEffectivity(normalized.effectivity ?? "");

      setLastSavedTitle(normalized.templateTitle || "");
      setLastSavedPageSetup(normalized.pageSetup || DEFAULT_PAGE_SETUP);
      setLastSavedHeaderConfig(loadedHeader);
      setLastSavedDocumentCode((normalized.document_code ?? "").toString());
      setLastSavedRevisionNo(Number(normalized.revision_no ?? 0));
      setLastSavedEffectivity(normalized.effectivity ?? null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load template.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = templateIdFromQuery || null;
    if (!id) return;
    setTemplateId(id);
    loadTemplate(id);
  }, [templateIdFromQuery]);

  /* --------------------------------- editor ---------------------------------- */
  const handleEditorReady = (editor) => {
    editorRef.current = editor;
    setEditorInstance(editor);
  };

  const htmlToBasicJSON = (html) => {
    if (!html) return { type: "doc", content: [{ type: "paragraph" }] };
    const parts = html
      .split(/<\/p>/i)
      .map((p) => p.replace(/<[^>]+>/g, "").trim())
      .filter(Boolean);
    return {
      type: "doc",
      content: parts.length
        ? parts.map((t) => ({ type: "paragraph", content: t ? [{ type: "text", text: t }] : [] }))
        : [{ type: "paragraph" }],
    };
  };

  /* ----------------------------------- save ---------------------------------- */
  const handleSave = async () => {
    try {
      setSaving(true);
      const editor = editorRef.current;
      const rawPagesJson = editor ? editor.getJSON() : htmlToBasicJSON(templateContent);
      const pages_json = Array.isArray(rawPagesJson) ? rawPagesJson : [rawPagesJson];

      const normDocumentCode = documentCode == null ? "" : String(documentCode);
      const normRevisionNo = Number.isNaN(Number(revisionNo)) ? 0 : Number(revisionNo);
      let normEffectivity = null;
      if (effectivity !== undefined && effectivity !== null && effectivity !== "") {
        if (typeof effectivity === "object" && effectivity.$date) {
          normEffectivity = effectivity.$date;
        } else {
          const d = new Date(effectivity);
          normEffectivity = isNaN(d) ? effectivity : d.toISOString();
        }
      }

      const payload = {
        title: (templateTitle || "").trim() || "Untitled Template",
        pages_json,
        body: editor ? editor.getHTML() : typeof templateContent === "string" ? templateContent : "",
        pageSetup,
        fields: editableFields,
        headerConfig,
        document_code: normDocumentCode,
        revision_no: normRevisionNo,
        effectivity: normEffectivity,
      };

      let res;
      if (templateId) {
        res = await updateTemplateAPI(templateId, payload);
        if (res?.template?._id) setTemplateId(res.template._id);
        toast.success("Template updated successfully.");
      } else {
        res = await createTemplateAPI(payload);
        if (res?.template?._id) setTemplateId(res.template._id);
        toast.success("Template created successfully.");
      }

      setLastSavedContent(editor ? editor.getHTML() : templateContent);
      setLastSavedTitle(payload.title);
      setLastSavedId(res?.template?._id || templateId);
      setLastSavedHeaderConfig(headerConfig);
      setLastSavedPageSetup(pageSetup);
      setLastSavedDocumentCode(normDocumentCode.toString());
      setLastSavedRevisionNo(Number(normRevisionNo));
      setLastSavedEffectivity(normEffectivity ?? null);
      setLastSavedAt(new Date());
      setDirty(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  // Autosave
  useEffect(() => {
    // Skip autosave if template is read-only
    if (isReadOnly) return;

    if (!templateId && !templateTitle && !templateContent) return;

    const isDirty =
      templateContent !== lastSavedContent ||
      templateTitle !== lastSavedTitle ||
      JSON.stringify(pageSetup) !== JSON.stringify(lastSavedPageSetup) ||
      JSON.stringify(headerConfig) !== JSON.stringify(lastSavedHeaderConfig) ||
      String(documentCode ?? "") !== String(lastSavedDocumentCode ?? "") ||
      Number(revisionNo ?? 0) !== Number(lastSavedRevisionNo ?? 0) ||
      (effectivity ?? null) !== (lastSavedEffectivity ?? null);

    setDirty(isDirty);
    if (!isDirty) return;

    const timeout = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => clearTimeout(timeout);
  }, [
    isReadOnly,
    templateContent,
    templateTitle,
    pageSetup,
    headerConfig,
    documentCode,
    revisionNo,
    effectivity,
    lastSavedPageSetup,
    lastSavedHeaderConfig,
    lastSavedDocumentCode,
    lastSavedRevisionNo,
    lastSavedEffectivity,
  ]);

  // Save on unmount/navigation if dirty
  useEffect(() => {
    const beforeUnload = (e) => {
      // Don't save if read-only
      if (dirty && !isReadOnly) {
        handleSave();
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, isReadOnly]);

  /* ----------------------------- approval actions ---------------------------- */
  const handleApprove = async () => {
    if (!templateId) return;
    try {
      await approveTemplateAPI(templateId);
      toast.success("Template approved successfully.");
      await loadTemplate(templateId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to approve template.");
    }
  };

  const handlePublish = async () => {
    if (!templateId) return;
    try {
      await publishTemplateAPI(templateId);
      toast.success("Template published successfully.");
      setStatus("published");
      await loadTemplate(templateId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to publish template.");
    }
  };

  const handleSubmitForApproval = async (approverIds) => {
    if (!templateId) {
      toast.error("Please save the template before submitting for approval.");
      return;
    }
    try {
      setError("");
      let deanId, secretaryId;
      if (Array.isArray(approverIds)) {
        [deanId, secretaryId] = approverIds;
      } else if (approverIds && typeof approverIds === "object") {
        deanId = approverIds.dean || approverIds.deanId;
        secretaryId = approverIds.secretary || approverIds.secretaryId;
      }
      if (!deanId && !secretaryId) {
        await submitTemplateAPI(templateId);
      } else {
        await submitTemplateAPI(templateId, deanId, secretaryId);
      }
      setStatus("pending");
      toast.success("Template successfully submitted for approval!");
      await loadTemplate(templateId);
    } catch (e) {
      console.error("Failed to submit for approval:", e);
      const errorMsg = e.response?.data?.message || e.message || "Failed to submit for approval.";
      if (e.response?.status === 400 && errorMsg.includes("already submitted")) {
        toast.success("This template has already been submitted for approval.");
        await loadTemplate(templateId);
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const handleStatusUpdate = (newStatus) => setStatus(newStatus);

  const handleApprovalsUpdate = (updatedApprovals, updatedApprovers) => {
    if (updatedApprovals) setApprovals(updatedApprovals);
    if (updatedApprovers) setApprovers(updatedApprovers);
    if (templateId) loadTemplate(templateId);
  };

  /* ---------------------------------- panels --------------------------------- */
  const [selectedPanel, setSelectedPanel] = useState("font");

  const renderPanel = () => {
    // If read-only, show a message instead of editable panels
    if (isReadOnly) {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="text-center text-gray-700">
            <p className="mb-2 text-lg font-semibold">Template is Published</p>
            <p className="text-sm text-gray-600">
              This template cannot be edited after being published by the Document Control Officer.
            </p>
          </div>
        </div>
      );
    }

    switch (selectedPanel) {
      case "font":
        return (
          <FontPanel
            editor={editorInstance}
            fontSettings={fontSettings}
            onFontSettingsChange={setFontSettings}
          />
        );
      case "insert":
        return <InsertPanel editor={editorInstance} />;
      case "pagesetup":
        return (
          <PageSetupPanel
            pageSetup={pageSetup}
            onApply={(newSetup) =>
              setPageSetup({
                paperSize: newSetup.paperSize,
                orientation: newSetup.orientation,
                margins: { ...newSetup.margins },
              })
            }
          />
        );
      case "headerfooter": {
        const headerValue = {
          ...(headerConfig || {}),
          docCode:
            documentCode ??
            headerConfig?.documentStamp?.docCode ??
            headerConfig?.docCode ??
            headerConfig?.document_code ??
            "",
          revisionNo:
            revisionNo ??
            headerConfig?.documentStamp?.revisionNo ??
            headerConfig?.revisionNo ??
            headerConfig?.revision_no ??
            0,
          effectivity:
            effectivity ??
            headerConfig?.documentStamp?.effectivity ??
            headerConfig?.effectivity ??
            "",
        };

        return (
          <HeaderFooterPanel
            value={headerValue}
            onChange={(val) => {
              const topDocCode =
                val?.document_code ?? val?.docCode ?? val?.documentStamp?.docCode ?? "";
              const topRevisionNo =
                val?.revision_no ?? val?.revisionNo ?? val?.documentStamp?.revisionNo ?? 0;
              const topEffectivity =
                val?.effectivity ?? val?.documentStamp?.effectivity ?? "";

              setDocumentCode(topDocCode);
              setRevisionNo(topRevisionNo);
              setEffectivity(topEffectivity);

              const copy = { ...val };
              delete copy.documentStamp;
              delete copy.document_code;
              delete copy.revision_no;
              delete copy.effectivity;

              setHeaderConfig(withHeaderDefaults(copy));
            }}
          />
        );
      }
      case "fields":
        return (
          <FieldsPanel
            editor={editorInstance}
            fields={editableFields}
            onChange={setEditableFields}
          />
        );
      default:
        return null;
    }
  };

  /* ----------------------------------- ui ------------------------------------ */
  // max height for the editor column so it scrolls under the sticky header
  const editorMaxHeight = `calc(100vh - ${headerH + 24}px)`; // header height + small gap

  return (
    <div>
      {showVersionHistory ? (
        <VersionHistory
          onClose={() => setShowVersionHistory(false)}
          templateId={templateId}
          currentContent={templateContent}
          pageSetup={pageSetup}
          TextEditor={TextEditor}
        />
      ) : (
        <div className="flex min-h-screen flex-col bg-slate-50">
          <Header2
            title={templateTitle}
            setTitle={setTemplateTitle}
            user={user}
            onSubmitForApproval={handleSubmitForApproval}
            onApprove={handleApprove}
            onPublish={handlePublish}
            saving={saving}
            lastSavedAt={lastSavedAt}
            dirty={dirty}
            templateStatus={status}
            approvals={approvals}
            approvalMeta={approvalMeta}
            approvers={approvers}
            loadingApprovers={loading}
            reviewNotes={notes}
            assignedIds={[]}
            templateId={templateId || ""}
            onStatusUpdate={handleStatusUpdate}
            onApprovalsUpdate={handleApprovalsUpdate}
            template={template}
            onShowVersionHistory={() => setShowVersionHistory(true)}
          />

          {/* MAIN LAYOUT UNDER HEADER */}
          <div className="flex flex-1">
            {/* Sidebar flush to the very left */}
            <TemplateSidebar
              selectedPanel={selectedPanel}
              onSelectPanel={setSelectedPanel}
              topOffsetPx={headerH + 12}
              bottomOffsetPx={16}
            >
              {renderPanel()}
            </TemplateSidebar>

            {/* Centered editor/document area */}
            <div className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 md:pl-6">
              <main
                className="flex-1 overflow-auto"
                style={{ maxHeight: editorMaxHeight }}
              >
                <TextEditor
                  content={templateContent}
                  pageSetup={pageSetup}
                  onEditorReady={handleEditorReady}
                  onContentChange={setTemplateContent}
                  headerConfig={{
                    ...(headerConfig || {}),
                    documentStamp: {
                      docCode: documentCode ?? "",
                      revisionNo: revisionNo ?? 0,
                      effectivity: effectivity ?? "",
                    },
                  }}
                  templateStatus={status}
                  documentCode={documentCode}
                  revisionNo={revisionNo}
                  effectivity={effectivity}
                  readOnly={isReadOnly}
                />
              </main>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
