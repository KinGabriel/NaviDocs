// src/pages/documentControllerCreateTemplate.jsx
import { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import {
  updateTemplateAPI,
  fetchApproversAPI,
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
import HeaderFooterPanel from "../../layout/create_template/headerfooterPanel";
import DateFormatPanel from "../../layout/create_template/dateformatPanel";
import FieldsPanel from "../../layout/create_template/fieldsPanel";

// Sidebar
import TemplateSidebar from "../../layout/sidebars/templateSidebar";

// Text editor
import TextEditor from "../../layout/create_template/textEditor";

// --- Helpers -----------------------------------------------------------------
const DEFAULT_CONTENT = null;

// Page setup now includes header/footer band heights (INCHES)
const DEFAULT_PAGE_SETUP = {
  paperSize: "A4",
  orientation: "Portrait",
  margins: { top: 1, bottom: 1, left: 1, right: 1 },
  headerHeight: 1.0, // in
  footerHeight: 0.6, // in
};

// Match the panel/Page defaults so everything stays in sync
const DEFAULT_HEADER_FOOTER = {
  header: {
    fields: {
      sluLogo: true,
      university: true,
      schoolName: true,
      title: true,
      documentStamp: true,
    },
    config: {
      university: { fontSize: 18, fontWeight: "bold", align: "center", color: "#000" },
      schoolName: { fontSize: 14, italic: true, align: "center", color: "#000" },
      title: {
        text: "Document Title",
        uppercase: false,
        fontSize: 16,
        fontWeight: "bold",
        align: "center",
        color: "#000",
      },
      documentStamp: {
        firstColumnFixed: ["Document Code", "Revision No.", "Effectivity", "Page"],
        secondColumnEditable: ["", "", "", ""],
        align: "right",
      },
    },
    margins: { top: 12, bottom: 12 },
  },
  footer: {
    fields: { pageNumber: true, date: true },
    align: "center",
    margins: { top: 12, bottom: 12 },
  },
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

// --- Small helpers to map config -> Pagination Plus text (LEFT/RIGHT) --------
function buildHeaderParts(h) {
  if (!h) return ["", ""];
  const leftChunks = [];
  if (h.fields?.university) leftChunks.push("Saint Louis University");
  if (h.fields?.schoolName) leftChunks.push("School Name");

  if (h.fields?.title) {
    const t = h.config?.title?.text || "Document Title";
    leftChunks.push(h.config?.title?.uppercase ? String(t).toUpperCase() : t);
  }

  let right = "";
  if (h.fields?.documentStamp) {
    const labels = h.config?.documentStamp?.firstColumnFixed || [];
    const values = h.config?.documentStamp?.secondColumnEditable || [];
    const pairs = labels.slice(0, 4).map((lab, i) => `${lab}: ${values[i] ?? ""}`.trim());
    right = pairs.filter(Boolean).join(" | ");
  }

  const left = leftChunks.filter(Boolean).join(" · ");
  return [left, right];
}

function buildFooterParts(f) {
  if (!f) return ["", ""];
  const page = f.fields?.pageNumber ? "{page}" : "";
  const date = f.fields?.date ? new Date().toLocaleDateString() : "";
  const joined = [page, date].filter(Boolean).join(" · ");
  const align = f.align || "center";
  if (align === "left") return [joined, ""];
  if (align === "right") return ["", joined];
  if (align === "justify") return [page, date];
  return ["", joined]; // center
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
  const [headerFooter, setHeaderFooter] = useState(DEFAULT_HEADER_FOOTER);
  const [dateFormat, setDateFormat] = useState({ style: "numeric" });
  const [editableFields, setEditableFields] = useState([]);

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

      // Page setup (ensure header/footer heights exist)
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
          headerHeight: normalized.pageSetup.headerHeight ?? DEFAULT_PAGE_SETUP.headerHeight,
          footerHeight: normalized.pageSetup.footerHeight ?? DEFAULT_PAGE_SETUP.footerHeight,
        });
      }

      if (normalized.fontSettings) setFontSettings(normalized.fontSettings);

      // Header/footer config (deep-merge with defaults)
      if (normalized.headerFooter && (normalized.headerFooter.header || normalized.headerFooter.footer)) {
        setHeaderFooter({
          header: { ...DEFAULT_HEADER_FOOTER.header, ...(normalized.headerFooter.header || {}) },
          footer: { ...DEFAULT_HEADER_FOOTER.footer, ...(normalized.headerFooter.footer || {}) },
        });
      } else {
        setHeaderFooter(DEFAULT_HEADER_FOOTER);
      }

      if (normalized.dateFormat) setDateFormat(normalized.dateFormat);
      if (Array.isArray(normalized.editableFields)) setEditableFields(normalized.editableFields);
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

  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState([]);

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

  // Remove any leftover direct header/footer editor mutations.
  // TextEditor will apply geometry + header/footer strings from props.

  // Save handler matching backend expectations
  const handleSave = async () => {
    try {
      setSaving(true);
      const editor = editorRef.current;
      // Always get JSON from editor
      const rawPagesJson = editor ? editor.getJSON() : htmlToBasicJSON(templateContent);
      const pages_json = Array.isArray(rawPagesJson) ? rawPagesJson : [rawPagesJson];

      const payload = {
        title: (templateTitle || "").trim() || "Untitled Template",
        pages_json,
        pageSetup,
        dateFormat,
        headerFooter, // persist header/footer config
        fields: editableFields,
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

    // Simple change detection including header/footer + key layout bits
    const isDirty =
      templateContent !== lastSavedContent ||
      templateTitle !== lastSavedTitle ||
      JSON.stringify(headerFooter) !== JSON.stringify(DEFAULT_HEADER_FOOTER) || // drift from defaults
      JSON.stringify(pageSetup) !== JSON.stringify(DEFAULT_PAGE_SETUP) ||
      JSON.stringify(dateFormat) !== JSON.stringify({ style: "numeric" });

    setDirty(isDirty);
    if (!isDirty) return;

    const timeout = setTimeout(() => {
      handleSave();
    }, 2000); // 2s debounce
    return () => clearTimeout(timeout);
  }, [templateContent, templateTitle, headerFooter, pageSetup, dateFormat]);

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
  const handleSubmitForApproval = async (approverIds, instructions) => {
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

      const response = await submitTemplateAPI(templateId, deanId, secretaryId);
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

  // Derive header/footer LEFT/RIGHT strings for TextEditor props
  const [headerLeft, headerRight] = useMemo(
    () => buildHeaderParts(headerFooter.header),
    [headerFooter.header]
  );
  const [footerLeft, footerRight] = useMemo(
    () => buildFooterParts(headerFooter.footer),
    [headerFooter.footer]
  );

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
                headerHeight: newSetup.headerHeight, // keep inches
                footerHeight: newSetup.footerHeight, // keep inches
              })
            }
          />
        );
      case "dateformat":
        return <DateFormatPanel value={dateFormat} onChange={setDateFormat} />;
      case "headerfooter":
        return (
          <HeaderFooterPanel
            editor={editorInstance}
            value={headerFooter}
            onChange={setHeaderFooter}
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

  const [selectedPanel, setSelectedPanel] = useState("font");

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
                  // NEW: provide header/footer strings directly to the editor
                  header={{ left: headerLeft, right: headerRight }}
                  footer={{ left: footerLeft, right: footerRight }}
                />
              </main>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
