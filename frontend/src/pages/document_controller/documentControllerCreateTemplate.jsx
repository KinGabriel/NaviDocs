// src/pages/documentControllerCreateTemplate.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// NOTE: Keeping the original (misspelled) import path to avoid breaking existing builds.
// If your API file is actually named documentControllerAPI.js, update this import accordingly.
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

// Panels (existing UI components)
import FontPanel from "../../layout/create_template/FontPanel";
import PageSetupPanel from "../../layout/create_template/pageSetupPanel";
import LayoutPanel from "../../layout/create_template/layoutPanel";
import InsertPanel from "../../layout/create_template/insertPanel";
import HeaderFooterPanel from "../../layout/create_template/headerfooterPanel";
import DateFormatPanel from "../../layout/create_template/dateformatPanel";

// Text editor (new core wired inside)
import TextEditor from "../../layout/create_template/textEditor";

// --- Helpers -----------------------------------------------------------------
const DEFAULT_CONTENT = null;
const DEFAULT_PAGE_SETUP = {
  paperSize: "A4",
  orientation: "Portrait",
  margins: { top: 1, bottom: 1, left: 1, right: 1 },
};

// --- Component ---------------------------------------------------------------
export default function DocumentControllerCreateTemplate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser?.() ?? { user: null };

  // Editor ref (Tiptap instance)
  const editorRef = useRef(null);

  // Template state
  const [templateId, setTemplateId] = useState(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateContent, setTemplateContent] = useState(DEFAULT_CONTENT);

  // Layout/config state (kept local for now; panels can write here)
  const [pageSetup, setPageSetup] = useState(DEFAULT_PAGE_SETUP);
  const [fontSettings, setFontSettings] = useState({});
  const [headerFooter, setHeaderFooter] = useState({ header: {}, footer: {} });
  const [dateFormat, setDateFormat] = useState({ style: "numeric" });

  // UI state
  const [selectedPanel, setSelectedPanel] = useState("font");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approvers, setApprovers] = useState([]);
  const [error, setError] = useState("");

  // --- Effects ---------------------------------------------------------------
  // Load existing template if navigated with an id
  useEffect(() => {
    const id = location?.state?.templateId || null;
    if (!id) return; // create mode
    setTemplateId(id);

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getTemplateByIdAPI(id);
        if (!res) return;
        if (cancelled) return;
        if (res.title) setTemplateTitle(res.title);
        if (res.content) setTemplateContent(res.content);
        if (res.pageSetup) setPageSetup(res.pageSetup);
        if (res.fontSettings) setFontSettings(res.fontSettings);
        if (res.headerFooter) setHeaderFooter(res.headerFooter);
        if (res.dateFormat) setDateFormat(res.dateFormat);
      } catch (e) {
        console.error(e);
        setError("Failed to load template.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location]);

  // Optionally fetch approvers list (if your flow uses it)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchApproversAPI?.();
        if (!cancelled && Array.isArray(res)) setApprovers(res);
      } catch (e) {
        // Non-blocking
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Handlers --------------------------------------------------------------
  const handleEditorReady = (editor) => {
    editorRef.current = editor;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const editor = editorRef.current;
      const content = editor ? editor.getHTML() : templateContent;

      const payload = {
        title: templateTitle?.trim() || "Untitled Template",
        content,
        pageSetup,
        fontSettings,
        headerFooter,
        dateFormat,
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
    try {
      await approveTemplateAPI(templateId);
    } catch (e) {
      console.error(e);
      setError("Failed to approve template.");
    }
  };

  const handlePublish = async () => {
    if (!templateId) return;
    try {
      await publishTemplateAPI(templateId);
    } catch (e) {
      console.error(e);
      setError("Failed to publish template.");
    }
  };

  // --- Render ---------------------------------------------------------------
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              placeholder="Template title"
              className="w-72 rounded-md border px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            {templateId && (
              <span className="text-xs text-slate-500">ID: {templateId}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={handleApprove}
              disabled={!templateId}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={handlePublish}
              disabled={!templateId}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Publish
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto grid w-full max-w-7xl grid-cols-12 gap-4 px-4 py-6">
        {/* Left rail: panels (core-first: these are optional and won’t affect editor stability) */}
        <aside className="col-span-3">
          <div className="sticky top-[72px] space-y-3">
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedPanel("font")}
                className={`rounded-md border px-3 py-2 text-sm ${selectedPanel === "font" ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-white"}`}
              >
                Font
              </button>
              <button
                onClick={() => setSelectedPanel("layout")}
                className={`rounded-md border px-3 py-2 text-sm ${selectedPanel === "layout" ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-white"}`}
              >
                Layout
              </button>
              <button
                onClick={() => setSelectedPanel("insert")}
                className={`rounded-md border px-3 py-2 text-sm ${selectedPanel === "insert" ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-white"}`}
              >
                Insert
              </button>
              <button
                onClick={() => setSelectedPanel("pagesetup")}
                className={`rounded-md border px-3 py-2 text-sm ${selectedPanel === "pagesetup" ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-white"}`}
              >
                Page Setup
              </button>
              <button
                onClick={() => setSelectedPanel("dateformat")}
                className={`rounded-md border px-3 py-2 text-sm ${selectedPanel === "dateformat" ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-white"}`}
              >
                Date Format
              </button>
              <button
                onClick={() => setSelectedPanel("headerfooter")}
                className={`rounded-md border px-3 py-2 text-sm ${selectedPanel === "headerfooter" ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-white"}`}
              >
                Header/Footer
              </button>
            </div>

            {/* Active panel */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              {selectedPanel === "font" && (
                <FontPanel
                  editor={editorRef.current}
                  fontSettings={fontSettings}
                  onFontSettingsChange={setFontSettings}
                />
              )}

              {selectedPanel === "layout" && (
                <LayoutPanel editor={editorRef.current} />
              )}

              {selectedPanel === "insert" && (
                <InsertPanel editor={editorRef.current} />
              )}

              {selectedPanel === "pagesetup" && (
                <PageSetupPanel
                  paperSize={pageSetup.paperSize}
                  setPaperSize={(v) => setPageSetup({ ...pageSetup, paperSize: v })}
                  orientation={pageSetup.orientation}
                  setOrientation={(v) => setPageSetup({ ...pageSetup, orientation: v })}
                  margins={pageSetup.margins}
                  setMargins={(m) => setPageSetup({ ...pageSetup, margins: m })}
                />
              )}

              {selectedPanel === "dateformat" && (
                <DateFormatPanel value={dateFormat} onChange={setDateFormat} />
              )}

              {selectedPanel === "headerfooter" && (
                <HeaderFooterPanel value={headerFooter} onChange={setHeaderFooter} />
              )}
            </div>
          </div>
        </aside>

        {/* Editor area */}
        <main className="col-span-9">
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
  );
}
