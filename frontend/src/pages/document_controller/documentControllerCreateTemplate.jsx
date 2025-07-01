import { useRef, useState, useLayoutEffect } from "react";
import useUser from '../../hooks/useUser';
import Header from "../../layout/header2";
import FontPanel from "../../layout/create_template/FontPanel";
import PageSetupPanel from "../../layout/create_template/PageSetupPanel";
import TextEditor from "../../layout/create_template/textEditor";
import Sidebar from "../../layout/TemplateSidebar";

const TABS = [
  { key: "font", label: "Fonts", icon: "T" },
  { key: "date", label: "Date Format", icon: "" },
  { key: "layout", label: "Layout", icon: "" },
  { key: "heading", label: "Heading", icon: "" },
  { key: "footer", label: "Footer", icon: "" },
  { key: "insert", label: "Insert", icon: "" },
  { key: "pageSetup", label: "Page setup", icon: "" },
];

const DEFAULT_MARGINS = { top: 1, bottom: 1, left: 1, right: 1 };
const DEFAULT_ORIENTATION = "Portrait";


function paginateContentByHeight(content, pageHeightPx) {
  const htmlContent = content || '<p></p>';
  const paragraphs = htmlContent.split('</p>').filter(p => p.trim()).map(p => p + '</p>');
  const pages = [];
  let currentPage = [];
  let tempContent = "";
  let measureDiv = document.getElementById("measure-div");

  for (let i = 0; i < paragraphs.length; i++) {
    currentPage.push(paragraphs[i]);
    tempContent = currentPage.join('');
    if (measureDiv) {
      measureDiv.innerHTML = tempContent; 
      if (measureDiv.offsetHeight > pageHeightPx) {
        currentPage.pop();
        pages.push(currentPage.join(''));
        currentPage = [paragraphs[i]];
      }
    }
  }
  if (currentPage.length) pages.push(currentPage.join(''));

  return pages.length > 0 ? pages : ['<p></p>'];
}

export default function CreateTemplate() {
  const user = useUser();
  const [activeTab, setActiveTab] = useState("font");
  const [title, setTitle] = useState("Untitled Template");
  const [content, setContent] = useState("");
  const [paperSize, setPaperSize] = useState("Letter");
  const [orientation, setOrientation] = useState(DEFAULT_ORIENTATION);
  const [margins, setMargins] = useState(DEFAULT_MARGINS);
  
  // Store editor instances for each page
  const [editorInstances, setEditorInstances] = useState({});
  const [activeEditorIndex, setActiveEditorIndex] = useState(0);
  
  // Text selection and formatting states
  const [selectedText, setSelectedText] = useState("");
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [editorStateUpdateTrigger, setEditorStateUpdateTrigger] = useState(0);
  
  // Default font settings for new text
  const [defaultFontSettings, setDefaultFontSettings] = useState({
    fontSize: 16,
    fontFamily: 'Times New Roman, serif',
    fontColor: '#000000',
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrikethrough: false,
    isSubscript: false,
    isSuperscript: false
  });

  // Get the active editor instance
  const getActiveEditor = () => {
    const editor = editorInstances[activeEditorIndex] || null;
    return editor;
  };

  // Handle editor registration
  const handleEditorRegister = (pageIndex, editor) => {
    setEditorInstances(prev => ({
      ...prev,
      [pageIndex]: editor
    }));
  };

  // Handle text selection
  const handleTextSelection = (pageIndex, start, end, text) => {
    setSelectedText(text);
    setSelectionStart(start);
    setSelectionEnd(end);
    setCurrentPageIndex(pageIndex);
    setActiveEditorIndex(pageIndex);
    setEditorStateUpdateTrigger(prev => prev + 1); 
    
    // Clear selection after a brief delay if no text is selected
    if (!text || text.length === 0) {
      setTimeout(() => {
        setSelectedText("");
        setSelectionStart(0);
        setSelectionEnd(0);
      }, 100);
    }
  };

  // Applies formatting to selected text or sets formatting for new text
  const applyFormattingToSelection = (formatType, value) => {
    const activeEditor = getActiveEditor();
    if (activeEditor) {
      switch (formatType) {
        case 'isBold':
          activeEditor.chain().focus().toggleBold().run();
          break;
        case 'isItalic':
          activeEditor.chain().focus().toggleItalic().run();
          break;
        case 'isUnderline':
          activeEditor.chain().focus().toggleUnderline().run();
          break;
        case 'isStrikethrough':
          activeEditor.chain().focus().toggleStrike().run();
          break;
        case 'fontColor':
          activeEditor.chain().focus().setColor(value).run();
          break;
        case 'fontFamily':
          activeEditor.chain().focus().setFontFamily(value).run();
          break;
        case 'fontSize':
          // For fontSize, we need to apply it as a style
          activeEditor.chain().focus().setFontSize(value + 'px').run();
          break;
        default:
          break;
      }
      
      // Also update default font settings for consistency
      setDefaultFontSettings(prev => ({
        ...prev,
        [formatType]: value
      }));
    } else {
      // No active editor, just update default formatting for new text
      setDefaultFontSettings(prev => ({
        ...prev,
        [formatType]: value
      }));
    }
  };

  const paperDimensions = {
    Letter: { width: 816, height: 1056 },
    A4: { width: 794, height: 1123 },
    Legal: { width: 816, height: 1344 },
  };
  const baseSize = paperDimensions[paperSize] || paperDimensions["Letter"];
  const docSize =
    orientation === "Landscape"
      ? { width: baseSize.height, height: baseSize.width }
      : baseSize;

  const pageRef = useRef(null);
  const [pages, setPages] = useState(['<p></p>']); 

  useLayoutEffect(() => {
    if (!pageRef.current) return;
    const pageHeightPx = pageRef.current.offsetHeight;
    const newPages = paginateContentByHeight(content, pageHeightPx);
    setPages(newPages);
  }, [content, docSize.height, margins]);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <Header title={title} setTitle={setTitle} user={user} />
      {/* Hidden measuring div */}
      <div
        id="measure-div"
        className="invisible absolute pointer-events-none whitespace-pre-wrap"
        style={{
          width: docSize.width,
          height: "auto",
          fontSize: "16px",
          fontFamily: "inherit",
          paddingTop: (margins.top || 1) * 96,
          paddingBottom: (margins.bottom || 1) * 96,
          paddingLeft: (margins.left || 1) * 96,
          paddingRight: (margins.right || 1) * 96,
        }}
      />
      <div className="flex flex-row h-[calc(100vh-64px)]">
        <Sidebar tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="w-[370px] bg-white shadow-lg border-r border-gray-200 p-6 overflow-y-auto">
          {activeTab === "font" && (
            <FontPanel 
              fontSettings={defaultFontSettings}
              onFontSettingsChange={setDefaultFontSettings}
              selectedText={selectedText}
              onApplyFormatting={applyFormattingToSelection}
              editor={getActiveEditor()}
              key={`font-panel-${activeEditorIndex}-${editorStateUpdateTrigger}`}
            />
          )}
          {activeTab === "pageSetup" && (
            <PageSetupPanel
              paperSize={paperSize}
              setPaperSize={setPaperSize}
              orientation={orientation}
              setOrientation={setOrientation}
              margins={margins}
              setMargins={setMargins}
              defaultOrientation={DEFAULT_ORIENTATION}
              defaultMargins={DEFAULT_MARGINS}
            />
          )}
        </div>
        {/* Document Editor */}
        <div className="flex-1 flex flex-col items-center overflow-y-auto bg-gray-50 p-8">
          <div className="space-y-8">
            {pages.map((pageContent, idx) => (
              <div
                key={idx}
                ref={idx === 0 ? pageRef : null}
                className="bg-white shadow-2xl border border-gray-200 transition-all duration-300 hover:shadow-3xl relative group"
                style={{
                  width: docSize.width,
                  height: docSize.height,
                  paddingTop: (margins.top || 1) * 96,
                  paddingBottom: (margins.bottom || 1) * 96,
                  paddingLeft: (margins.left || 1) * 96,
                  paddingRight: (margins.right || 1) * 96,
                  overflow: "hidden",
                }}
                onClick={() => {
                  console.log('Page clicked, setting active editor index:', idx);
                  setActiveEditorIndex(idx);
                }}
              >
                {/* Page number indicator */}
                <div className="absolute -top-6 right-0 text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Page {idx + 1}
                </div>
                
                <TextEditor
                  content={pageContent}
                  fontSettings={defaultFontSettings}
                  pageIndex={idx}
                  onTextSelection={handleTextSelection}
                  onEditorReady={handleEditorRegister}
                  onChange={newContent => {
                    const newPages = [...pages];
                    newPages[idx] = newContent;
                    setContent(newPages.join('')); 
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
