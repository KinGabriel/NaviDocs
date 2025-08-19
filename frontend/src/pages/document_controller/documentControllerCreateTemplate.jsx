// src/pages/documentControllerCreateTemplate.jsx
import { useRef, useState, useEffect } from "react";
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
import FontPanel from "../../layout/create_template/FontPanel";
import PageSetupPanel from "../../layout/create_template/pagesetupPanel";
import LayoutPanel from "../../layout/create_template/layoutPanel";
import TextEditor from "../../layout/create_template/textEditor";
import Sidebar from "../../layout/templateSidebar"; 
import HeaderFooterPanel from "../../layout/create_template/headerfooterPanel";
import InsertPanel from "../../layout/create_template/insertPanel";
import DateFormatPanel from "../../layout/create_template/dateformatPanel";
import "../../assets/css/global.css";

export default function DocumentControllerCreateTemplate() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser();

  const editorRef = useRef(null);

  const [templateId, setTemplateId] = useState(null);
  const [templateContent, setTemplateContent] = useState("<p></p>");
  const [selectedPanel, setSelectedPanel] = useState("font");

  // Global configuration state for the template
  const [fontSettings, setFontSettings] = useState({
    fontFamily: "Times New Roman, serif",
    fontSize: 16,
    fontColor: "#000000",
  });

  const [pageSetup, setPageSetup] = useState({
    paperSize: "A4",
    orientation: "Portrait",
    margins: { top: 1, bottom: 1, left: 1, right: 1 },
  });

  const [headerFooter, setHeaderFooter] = useState({
    header: {},
    footer: {},
  });

  // Load existing template (edit mode)
  useEffect(() => {
    const id = location?.state?.templateId;
    if (!id) return;
    setTemplateId(id);
    (async () => {
      const res = await getTemplateByIdAPI(id);
      if (res?.content) setTemplateContent(res.content);
      if (res?.pageSetup) setPageSetup(res.pageSetup);
      if (res?.fontSettings) setFontSettings(res.fontSettings);
      if (res?.headerFooter) setHeaderFooter(res.headerFooter);
    })();
  }, [location]);

  // Save
  const handleSave = async () => {
    const editor = editorRef.current;
    const content = editor ? editor.getHTML() : templateContent;

    const payload = {
      content,
      pageSetup,
      fontSettings,
      headerFooter,
      updatedBy: user?.id,
    };

    try {
      if (templateId) {
        await updateTemplateAPI(templateId, payload);
      } else {
        const res = await createTemplateAPI(payload);
        setTemplateId(res?.id);
      }
      alert("Template saved.");
    } catch (e) {
      console.error(e);
      alert("Save failed.");
    }
  };

  // Publish
  const handlePublish = async () => {
    if (!templateId) return alert("Save template before publishing.");
    try {
      await publishTemplateAPI(templateId);
      alert("Template published.");
      navigate("/document-controller/templates");
    } catch (e) {
      console.error(e);
      alert("Publish failed.");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />

      <div className="flex flex-1">
        {/* Left sidebar with panels */}
        <Sidebar selectedPanel={selectedPanel} onSelectPanel={setSelectedPanel}>
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

          {selectedPanel === "dateformat" && <DateFormatPanel />}

          {selectedPanel === "headerfooter" && (
            <HeaderFooterPanel
              value={headerFooter}
              onChange={setHeaderFooter}
            />
          )}

          {selectedPanel === "insert" && (
            <InsertPanel editor={editorRef.current} />
          )}

          {selectedPanel === "pagesetup" && (
            <PageSetupPanel
              paperSize={pageSetup.paperSize}
              setPaperSize={(v) => setPageSetup({ ...pageSetup, paperSize: v })}
              orientation={pageSetup.orientation}
              setOrientation={(v) =>
                setPageSetup({ ...pageSetup, orientation: v })
              }
              margins={pageSetup.margins}
              setMargins={(v) => setPageSetup({ ...pageSetup, margins: v })}
            />
          )}
        </Sidebar>

        {/* Right side: top action bar + editor canvas */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-end gap-3 p-3 border-b bg-white">
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-900"
            >
              Save
            </button>
            <button
              onClick={handlePublish}
              className="px-5 py-2 rounded bg-[#063c8d] hover:bg-[#052c6d] text-white"
            >
              Publish
            </button>
          </div>

          <TextEditor
            content={templateContent}
            pageSetup={pageSetup}
            onEditorReady={(editor) => {
              editorRef.current = editor;
            }}
            onContentChange={setTemplateContent}
          />
        </div>
      </div>
    </div>
  );
}
