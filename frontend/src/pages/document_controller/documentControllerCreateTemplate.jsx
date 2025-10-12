// src/pages/documentControllerCreateTemplate.jsx
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from 'react-hot-toast';
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
import PageSetupPanel from "../../layout/create_template/PageSetupPanel";
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
  const [headerFooter, setHeaderFooter] = useState({ header: {}, footer: {} });
  const [dateFormat, setDateFormat] = useState({ style: "numeric" });
  
  // Track last saved state for autosave/dirty
  const [lastSavedContent, setLastSavedContent] = useState(null);
  const [lastSavedTitle, setLastSavedTitle] = useState("");
  const [lastSavedId, setLastSavedId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [editableFields, setEditableFields] = useState([]);

  // UI
  const [selectedPanel, setSelectedPanel] = useState("font");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState([]);

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

      if (normalized.pageSetup) setPageSetup(normalized.pageSetup);
      if (normalized.fontSettings) setFontSettings(normalized.fontSettings);
      if (normalized.headerFooter) setHeaderFooter(normalized.headerFooter);
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

  const handleEditorReady = (editor) => {
    editorRef.current = editor;
    setEditorInstance(editor);
  };

  const htmlToBasicJSON = (html) => {
    if (!html) return { type: 'doc', content: [{ type: 'paragraph' }] };
    const parts = html.split(/<\/p>/i)
      .map(p => p.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);
    return {
      type: 'doc',
      content: parts.length
        ? parts.map(t => ({ type: 'paragraph', content: t ? [{ type: 'text', text: t }] : [] }))
        : [{ type: 'paragraph' }]
    };
  };
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

  // Autosave
  useEffect(() => {
    if (!templateId && !templateTitle && !templateContent) return;
    // Mark dirty if content or title changed
    const isDirty = templateContent !== lastSavedContent || templateTitle !== lastSavedTitle;
    setDirty(isDirty);
    if (!isDirty) return;
    const timeout = setTimeout(() => {
      handleSave();
    }, 2000); // 2s debounce
    return () => clearTimeout(timeout);
  }, [templateContent, templateTitle]);

  // Save on unmount/navigation if dirty
  useEffect(() => {
    const beforeUnload = (e) => {
      if (dirty) {
        handleSave();
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  // approval and publish handlers that refresh state
  const handleApprove = async () => {
    if (!templateId) return;
    try {
      await approveTemplateAPI(templateId);
      toast.success("Template approved successfully.");
      // Reload template to get updated state
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
      // Update status immediately
      setStatus("published");
      // Reload template to get updated state
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
      // Clear previous messages
      setError("");
      let deanId, secretaryId;
      
      if (Array.isArray(approverIds)) {
        // If it's an array, assume first is dean, second is secretary
        [deanId, secretaryId] = approverIds;
      } else if (typeof approverIds === 'object') {
        // If it's an object, extract dean and secretary
        deanId = approverIds.dean || approverIds.deanId;
        secretaryId = approverIds.secretary || approverIds.secretaryId;
      }
      
      // Validate if there's at least one approver
      if (!deanId && !secretaryId) {
        toast.error("Please select at least one approver.");
        return;
      }
      
      const response = await submitTemplateAPI(templateId, deanId, secretaryId);
      
      // Update status immediately
      setStatus("pending");
      toast.success("Template successfully submitted for approval!");
      // Reload template to get updated approval data
      await loadTemplate(templateId);
      
    } catch (e) {
      console.error("Failed to submit for approval:", e);
      
      // Handle specific error cases
      const errorMsg = e.response?.data?.message || e.message || "Failed to submit for approval.";
      
      // Check if template is already submitted
      if (e.response?.status === 400 && errorMsg.includes("already submitted")) {
        toast.success("This template has already been submitted for approval.");
        // Still reload to get latest state
        await loadTemplate(templateId);
      } else {
        toast.error(errorMsg);
      }
    }
  };

  // handle status updates from modal
  const handleStatusUpdate = (newStatus) => {
    setStatus(newStatus);
  };

  // handle approval updates from modal
  const handleApprovalsUpdate = (updatedApprovals, updatedApprovers) => {
    if (updatedApprovals) {
      setApprovals(updatedApprovals);
    }
    if (updatedApprovers) {
      setApprovers(updatedApprovers);
    }
    
    // reload template to ensure we have the latest data
    if (templateId) {
      loadTemplate(templateId);
    }
  };

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
            onApply={(newSetup) => setPageSetup({ ...newSetup })}
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
              />
            </main>
          </div>
        </div>
      </div>
    )}
  </div>
)};
