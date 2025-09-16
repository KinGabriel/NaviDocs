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
  // Track template workflow status
  const [status, setStatus] = useState("draft");
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
  
  // Track last saved state for autosave/dirty
  const [lastSavedContent, setLastSavedContent] = useState(null);
  const [lastSavedTitle, setLastSavedTitle] = useState("");
  const [lastSavedId, setLastSavedId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  
  // NEW: editable fields registry
  const [editableFields, setEditableFields] = useState([]); // [{key,type,required,placeholder,...}]

  // UI
  const [selectedPanel, setSelectedPanel] = useState("font");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approvers, setApprovers] = useState([]);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState([]);

  // Parse templateId from query string
  const params = new URLSearchParams(location.search);
  const templateIdFromQuery = params.get("templateId");

  // Load existing template if navigated with an id
  useEffect(() => {
    const id = templateIdFromQuery || null;
    if (!id) return;
    setTemplateId(id);

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getTemplateByIdAPI(id);
        if (!res || cancelled) return;
        const tpl = res?.template || {};
  if (tpl.title) setTemplateTitle(tpl.title);
  // Set notes from API response (tpl.notes)
  if (Array.isArray(tpl.notes)) setNotes(tpl.notes);
        console.log("Fetched template data:", res);
        // Set status from API, fallback to draft
        setStatus(tpl.status || "draft");

        // Extract approvers from approvals (prefer tpl.approvals, fallback to tpl.status_meta.approvals)
        const approvalsObj = tpl.approvals || (tpl.status_meta && tpl.status_meta.approvals) || {};
        const approversArr = [];
        if (approvalsObj.dean && approvalsObj.dean.assigned_to) {
          approversArr.push({
            id: approvalsObj.dean.assigned_to,
            name: approvalsObj.dean.assigned_to_name || 'Dean',
            role: 'Dean',
            ...approvalsObj.dean
          });
        }
        if (approvalsObj.secretary && approvalsObj.secretary.assigned_to) {
          approversArr.push({
            id: approvalsObj.secretary.assigned_to,
            name: approvalsObj.secretary.assigned_to_name || 'Secretary',
            role: 'Secretary',
            ...approvalsObj.secretary
          });
        }
        setApprovers(approversArr);

        // Prefer body (HTML) if present, else fallback to content
        let html = null;
        if (tpl.body !== undefined && tpl.body !== null) {
          html = tpl.body;
        } else if (tpl.content !== undefined) {
          html = tpl.content;
        }
        // Remove unwanted header/footer fields from HTML before rendering
        if (html) {
          // Remove <header> elements containing any of the header fields (Full Name, Student ID, University, School)
          html = html.replace(/<header[^>]*>\s*((Full Name|Student ID|University|School)[^<]*)+<\/header>/gi, '');
          // Remove <footer> with only date or page number
          html = html.replace(/<footer[^>]*>\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*<\/footer>/g, '');
          html = html.replace(/<footer[^>]*>\s*Page \d+\s*<\/footer>/gi, '');
          html = html.replace(/<footer[^>]*>\s*\d+\/\d+\s*<\/footer>/g, '');
          setTemplateContent(html);
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
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [templateIdFromQuery]);

  // Optional approvers fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchApproversAPI();
        if (!cancelled && Array.isArray(res)) setApprovers(res);
        console.log(res);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const handleEditorReady = (editor) => {
    editorRef.current = editor;
    setEditorInstance(editor);
  };



  // ---  HTML to JSON fallback for pages_json ---
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
      const content = editor ? editor.getHTML() : templateContent;
      const rawPagesJson = editor ? editor.getJSON() : null;
      // Always send pages_json as an array (even if only one page)
      let pages_json = rawPagesJson ? [rawPagesJson] : [htmlToBasicJSON(content)];
      // Apply headerFooter to all pages in pages_json
      pages_json = pages_json.map(page => {
        if (page && page.content && Array.isArray(page.content)) {
          page.content = page.content.map(p => {
            if (p && p.attrs) {
              p.attrs = {
                ...p.attrs,
                headerFields: headerFooter.header || {},
                footerFields: headerFooter.footer || {},
              };
            }
            return p;
          });
        }
        return page;
      });

      const payload = {
        title: (templateTitle || "").trim() || "Untitled Template",
        content,
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
      // Update last saved state
      setLastSavedContent(content);
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

  // Autosave: save after changes with debounce
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
    // eslint-disable-next-line
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
    // eslint-disable-next-line
  }, [dirty]);

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
      {/* App main header (sticky, global navigation) */}
      <Header
        title={templateTitle}
        setTitle={setTemplateTitle}
        user={user}
        onApprove={handleApprove}
        onPublish={handlePublish}
        saving={saving}
        approvers={approvers}
        templateStatus={status}
        reviewNotes={notes}
        templateId={templateId || ""}
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
