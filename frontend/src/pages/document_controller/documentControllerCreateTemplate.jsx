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
} from "../../api/documentContollerAPI";

import useUser from "../../hooks/useUser";
import Header from "../../layout/header2";

// Panels
import FontPanel from "../../layout/create_template/fontPanel";
import PageSetupPanel from "../../layout/create_template/PageSetupPanel";
import LayoutPanel from "../../layout/create_template/layoutPanel";
import InsertPanel from "../../layout/create_template/insertPanel";
import HeaderFooterPanel from "../../layout/create_template/headerfooterPanel";
import DateFormatPanel from "../../layout/create_template/dateformatPanel";
import FieldsPanel from "../../layout/create_template/fieldsPanel"; // ⬅ NEW

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

  // Layout/config state
  const [pageSetup, setPageSetup] = useState(DEFAULT_PAGE_SETUP);
  const [fontSettings, setFontSettings] = useState({});
  const [headerFooter, setHeaderFooter] = useState({ header: {}, footer: {} });
  const [dateFormat, setDateFormat] = useState({ style: "numeric" });

  // NEW: editable fields registry
  const [editableFields, setEditableFields] = useState([]); // [{key,type,required,placeholder,...}]

  // UI
  const [selectedPanel, setSelectedPanel] = useState("font");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approvers, setApprovers] = useState([]);
  const [error, setError] = useState("");

  // Load existing template if navigated with an id
  useEffect(() => {
    const id = location?.state?.templateId || null;
    if (!id) return;
    setTemplateId(id);

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getTemplateByIdAPI(id);
        if (!res || cancelled) return;
        if (res.title) setTemplateTitle(res.title);
        if (res.content !== undefined) setTemplateContent(res.content);
        if (res.pageSetup) setPageSetup(res.pageSetup);
        if (res.fontSettings) setFontSettings(res.fontSettings);
        if (res.headerFooter) setHeaderFooter(res.headerFooter);
        if (res.dateFormat) setDateFormat(res.dateFormat);
        if (Array.isArray(res.fields)) setEditableFields(res.fields); // ⬅ load fields
      } catch (e) {
        console.error(e);
        setError("Failed to load template.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [location]);

  // Optional approvers fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchApproversAPI?.();
        if (!cancelled && Array.isArray(res)) setApprovers(res);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const handleEditorReady = (editor) => {
    editorRef.current = editor;
    setEditorInstance(editor);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const editor = editorRef.current;
      const content = editor ? editor.getHTML() : templateContent;

      const payload = {
        title: (templateTitle || "").trim() || "Untitled Template",
        content,
        pageSetup,
        fontSettings,
        headerFooter,
        dateFormat,
        fields: editableFields, // ⬅ save fields to backend
      };

      if (templateId) {
        const res = await updateTemplateAPI(templateId, payload);
        if (res?.id) setTemplateId(res.id);
      } else {
        const res = await createTemplateAPI(payload);
        if (res?.id) setTemplateId(res.id);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!templateId) return;
    try { await approveTemplateAPI(templateId); }
    catch (e) { console.error(e); setError("Failed to approve template."); }
  };

  const handlePublish = async () => {
    if (!templateId) return;
    try { await publishTemplateAPI(templateId); }
    catch (e) { console.error(e); setError("Failed to publish template."); }
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
      case "fields": // ⬅ NEW
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
      <Header />
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

          {/* Editor area */}
          <main className="min-h-[60vh] flex-1">
            {error && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
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
