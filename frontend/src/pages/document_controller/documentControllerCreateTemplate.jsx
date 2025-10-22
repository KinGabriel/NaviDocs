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
import LayoutPanel from "../../layout/create_template/layoutPanel";
import InsertPanel from "../../layout/create_template/insertPanel";
import DateFormatPanel from "../../layout/create_template/dateformatPanel";
import FieldsPanel from "../../layout/create_template/fieldsPanel";
import HeaderFooterPanel from "../../layout/create_template/headerFooterPanel"; 

// Sidebar
import TemplateSidebar from "../../layout/sidebars/templateSidebar";

// Text editor
import TextEditor from "../../layout/create_template/textEditor";

// --- Helpers -----------------------------------------------------------------
const DEFAULT_CONTENT = null;

// Page setup (no header/footer band heights)
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

// --- Component ---------------------------------------------------------------
export default function DocumentControllerCreateTemplate() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser(); // Current logged-in user

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

  // Layout/config state
  const [pageSetup, setPageSetup] = useState(DEFAULT_PAGE_SETUP);
  const [fontSettings, setFontSettings] = useState({});
  const [dateFormat, setDateFormat] = useState({ style: "numeric" });
  const [editableFields, setEditableFields] = useState([]);

  // HeaderFooter panel state (logos)
  const [logoConfig, setLogoConfig] = useState({});
  // Top-level document stamp fields (persisted at top-level)
  const [documentCode, setDocumentCode] = useState(null);
  const [revisionNo, setRevisionNo] = useState(0);
  const [effectivity, setEffectivity] = useState(null);


  // Track last saved state for autosave/dirty
  const [lastSavedContent, setLastSavedContent] = useState(null);
  const [lastSavedTitle, setLastSavedTitle] = useState("");
  const [lastSavedId, setLastSavedId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Parse templateId from query string
  const params = new URLSearchParams(location.search);
  const templateIdFromQuery = params.get("templateId");

  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState([]);

  // template loading using shared loader
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

      // Page setup
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
      if (normalized.dateFormat) setDateFormat(normalized.dateFormat);
      if (Array.isArray(normalized.editableFields)) setEditableFields(normalized.editableFields);

  // Hydrate logoConfig and top-level document stamp fields (normalized by loader)
  if (normalized.logoConfig) setLogoConfig(normalized.logoConfig || {});
  if (normalized.document_code !== undefined) setDocumentCode(normalized.document_code);
  if (normalized.revision_no !== undefined) setRevisionNo(normalized.revision_no);
  if (normalized.effectivity !== undefined) setEffectivity(normalized.effectivity);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load template.");
    } finally {
      setLoading(false);
    }
  };

  // Load existing template if navigated with an id
  useEffect(() => {
    const id = templateIdFromQuery || null;
    if (!id) return;
    setTemplateId(id);
    loadTemplate(id);
  }, [templateIdFromQuery]);

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

  // Save handler matching backend expectations
  const handleSave = async () => {
    try {
      setSaving(true);
      const editor = editorRef.current;
      const rawPagesJson = editor ? editor.getJSON() : htmlToBasicJSON(templateContent);
      const pages_json = Array.isArray(rawPagesJson) ? rawPagesJson : [rawPagesJson];

      // Normalize top-level stamp fields
      const normDocumentCode = documentCode === null || documentCode === undefined ? "" : String(documentCode);
      const normRevisionNo = Number.isNaN(Number(revisionNo)) ? 0 : Number(revisionNo);
      let normEffectivity = null;
      if (effectivity !== undefined && effectivity !== null && effectivity !== "") {
        // Accept several shapes but send an ISO date string (not {$date: ...}) so
        // Mongoose can cast it to Date on the backend.
        if (typeof effectivity === 'object' && effectivity.$date) {
          // incoming form like { $date: ISO }
          normEffectivity = effectivity.$date;
        } else {
          const d = new Date(effectivity);
          if (!isNaN(d)) {
            normEffectivity = d.toISOString();
          } else {
            // fallback: store raw string
            normEffectivity = effectivity;
          }
        }
      }

      const payload = {
        title: (templateTitle || "").trim() || "Untitled Template",
        pages_json,
        pageSetup,
        dateFormat,
        fields: editableFields,
        logoConfig,
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
      setLastSavedAt(new Date());
      setDirty(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  const [saving, setSaving] = useState(false);

  // Autosave
  useEffect(() => {
    if (!templateId && !templateTitle && !templateContent) return;

    const isDirty =
      templateContent !== lastSavedContent ||
      templateTitle !== lastSavedTitle ||
      JSON.stringify(pageSetup) !== JSON.stringify(DEFAULT_PAGE_SETUP) ||
      JSON.stringify(dateFormat) !== JSON.stringify({ style: "numeric" });

    setDirty(isDirty);
    if (!isDirty) return;

    const timeout = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => clearTimeout(timeout);
  }, [templateContent, templateTitle, pageSetup, dateFormat]);

  // Save on unmount/navigation if dirty
  useEffect(() => {
    const beforeUnload = (e) => {
      if (dirty) {
        handleSave();
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  // approval and publish handlers that refresh state
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

  // handle submission from modal
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
      } else if (typeof approverIds === "object") {
        deanId = approverIds.dean || approverIds.deanId;
        secretaryId = approverIds.secretary || approverIds.secretaryId;
      }

      if (!deanId && !secretaryId) {
        toast.error("Please select at least one approver.");
        return;
      }

      await submitTemplateAPI(templateId, deanId, secretaryId);
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

  const [error, setError] = useState("");

  // handle status updates from modal
  const handleStatusUpdate = (newStatus) => {
    setStatus(newStatus);
  };

  // handle approval updates from modal
  const handleApprovalsUpdate = (updatedApprovals, updatedApprovers) => {
    if (updatedApprovals) setApprovals(updatedApprovals);
    if (updatedApprovers) setApprovers(updatedApprovers);
    if (templateId) loadTemplate(templateId);
  };

  const [selectedPanel, setSelectedPanel] = useState("font");

  const renderPanel = () => {
    switch (selectedPanel) {
      case "font":
        return (
          <FontPanel
            editor={editorInstance}
            fontSettings={fontSettings}
            onFontSettingsChange={setFontSettings}
          />
        );
      case "layout":
        return <LayoutPanel editor={editorInstance} />;
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
      case "dateformat":
        return <DateFormatPanel value={dateFormat} onChange={setDateFormat} />;
      case "headerfooter":
        // Merge top-level stamp values into the logoConfig passed to the panel so
        // the panel shows authoritative values regardless of where they were stored.
        const headerValue = {
          ...(logoConfig || {}),
          docCode: (documentCode ?? logoConfig?.documentStamp?.docCode ?? logoConfig?.docCode ?? logoConfig?.document_code ?? ""),
          revisionNo: (revisionNo ?? logoConfig?.documentStamp?.revisionNo ?? logoConfig?.revisionNo ?? logoConfig?.revision_no ?? 0),
          effectivity: (effectivity ?? logoConfig?.documentStamp?.effectivity ?? logoConfig?.effectivity ?? null),
        };

        return (
          <HeaderFooterPanel
            value={headerValue}
            onChange={(val) => {
              // HeaderFooterPanel emits a nested documentStamp for backwards compat.
              // Prefer top-level fields when present, otherwise pull from nested shape.
              const topDocCode = val?.document_code ?? val?.docCode ?? val?.documentStamp?.docCode ?? "";
              const topRevisionNo = val?.revision_no ?? val?.revisionNo ?? val?.documentStamp?.revisionNo ?? 0;
              const topEffectivity = val?.effectivity ?? val?.effectivity ?? val?.documentStamp?.effectivity ?? null;

              if (topDocCode !== undefined) setDocumentCode(topDocCode);
              if (topRevisionNo !== undefined) setRevisionNo(topRevisionNo);
              if (topEffectivity !== undefined) setEffectivity(topEffectivity);

              // store the rest of the logo config but strip nested documentStamp to avoid duplication
              const copy = { ...val };
              if (copy.documentStamp) delete copy.documentStamp;
              delete copy.document_code;
              delete copy.revision_no;
              delete copy.effectivity;
              setLogoConfig(copy);
            }}
          />
        );
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

          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:pl-2">
            <div className="flex gap-4">
              <TemplateSidebar
                selectedPanel={selectedPanel}
                onSelectPanel={setSelectedPanel}
                topOffsetPx={110}
                bottomOffsetPx={16}
              >
                {renderPanel()}
              </TemplateSidebar>

              <main className="min-h-[60vh] flex-1">
                <TextEditor
                  content={templateContent}
                  pageSetup={pageSetup}
                  onEditorReady={handleEditorReady}
                  onContentChange={setTemplateContent}
                  logoConfig={logoConfig}
                  templateStatus={status}
                  documentCode={documentCode}
                  revisionNo={revisionNo}
                  effectivity={effectivity}
                />
              </main>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
