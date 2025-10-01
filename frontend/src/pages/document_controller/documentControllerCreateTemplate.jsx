// src/pages/documentControllerCreateTemplate.jsx
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getTemplateByIdAPI,
  updateTemplateAPI,
  fetchApproversAPI,
  approveTemplateAPI,
  publishTemplateAPI,
  createTemplateAPI,
  submitTemplateAPI,
} from "../../api/documentContollerAPI";
import useUser from "../../hooks/useUser";
import Header2 from "../../layout/header2";

// Panels
import FontPanel from "../../layout/create_template/fontPanel";
import PageSetupPanel from "../../layout/create_template/PageSetupPanel";
import LayoutPanel from "../../layout/create_template/layoutPanel";
import InsertPanel from "../../layout/create_template/insertPanel";
import HeaderFooterPanel from "../../layout/create_template/headerfooterPanel";
import DateFormatPanel from "../../layout/create_template/dateformatPanel";
import FieldsPanel from "../../layout/create_template/fieldsPanel";

// Sidebar
import TemplateSidebar from "../../layout/TemplateSidebar";

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
  const { user } = useUser?.() ?? { user: null };

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

  // template loading
  const loadTemplate = async (id) => {
    try {
      setLoading(true);
      const res = await getTemplateByIdAPI(id);
      if (!res) return;
      const tpl = res?.template || {};

      setTemplateTitle(tpl.title || "Untitled Template");
      setNotes(Array.isArray(tpl.notes) ? tpl.notes : []);
      setStatus(tpl.status || "draft");
      setTemplate(tpl);
      setApprovals(tpl.approvals || null);
      setApprovalMeta(tpl.approvalMeta || null);

      // Set content for editor from pages_json
      if (tpl.pages_json && tpl.pages_json.length > 0) {
        setTemplateContent(tpl.pages_json[0]); // Or hydrate editor directly
      } else {
        setTemplateContent(DEFAULT_CONTENT);
      }

      if (tpl.pageSetup) setPageSetup(tpl.pageSetup);
      if (tpl.fontSettings) setFontSettings(tpl.fontSettings);
      if (tpl.headerFooter) setHeaderFooter(tpl.headerFooter);
      if (tpl.dateFormat) setDateFormat(tpl.dateFormat);
      if (Array.isArray(tpl.fields)) setEditableFields(tpl.fields);

    } catch (e) {
      console.error(e);
      setError("Failed to load template.");
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
      } else {
        res = await createTemplateAPI(payload);
        if (res?.template?._id) setTemplateId(res.template._id);
      }
      setLastSavedContent(editor ? editor.getHTML() : templateContent);
      setLastSavedTitle(payload.title);
      setLastSavedId(res?.template?._id || templateId);
      setLastSavedAt(new Date());
      setDirty(false);
    } catch (e) {
      console.error(e);
      setError("Failed to save template.");
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
      // Reload template to get updated state
      await loadTemplate(templateId);
    } catch (e) {
      console.error(e);
      setError("Failed to approve template.");
    }
  };

  const handlePublish = async () => {
    if (!templateId) return;
    try {
      await publishTemplateAPI(templateId);
      // Update status immediately
      setStatus("published");
      // Reload template to get updated state
      await loadTemplate(templateId);
    } catch (e) {
      console.error(e);
      setError("Failed to publish template.");
    }
  };

  // handle submission from modal
  const handleSubmitForApproval = async (approverIds, instructions) => {
    if (!templateId) return;
    
    try {
      // submitTemplateAPI expects (templateId, deanId, secretaryId)
      const deanId = approverIds.find(id => {
        // Find dean ID from approvers list
        return approvers.some(a => a.id === id && a.role?.name === 'Dean');
      });
      const secretaryId = approverIds.find(id => {
        // Find secretary ID from approvers list  
        return approvers.some(a => a.id === id && a.role?.name === 'Secretary');
      });
      
      await submitTemplateAPI(templateId, deanId, secretaryId);
      
      // Update status immediately
      setStatus("pending");
      
      // Reload template to get updated approval data
      await loadTemplate(templateId);
      
    } catch (e) {
      console.error("Failed to submit for approval:", e);
      setError("Failed to submit for approval.");
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
            paperSize={pageSetup.paperSize}
            setPaperSize={(v) => setPageSetup({ ...pageSetup, paperSize: v })}
            orientation={pageSetup.orientation}
            setOrientation={(v) => setPageSetup({ ...pageSetup, orientation: v })}
            margins={pageSetup.margins}
            setMargins={(m) => setPageSetup({ ...pageSetup, margins: m })}
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
            {error && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
                <button 
                  onClick={() => setError("")}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            )}

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
  );
}