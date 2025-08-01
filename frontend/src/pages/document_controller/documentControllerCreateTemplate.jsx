import { useRef, useState, useLayoutEffect, useCallback } from "react";
import useUser from '../../hooks/useUser';
import Header from "../../layout/header2";
import FontPanel from "../../layout/create_template/FontPanel";
import PageSetupPanel from "../../layout/create_template/pagesetupPanel";
import LayoutPanel from "../../layout/create_template/layoutPanel";
import TextEditor from "../../layout/create_template/textEditor";
import Sidebar from "../../layout/TemplateSidebar";
import HeaderFooterPanel from "../../layout/create_template/headerfooterPanel";

const TABS = [
  { key: "font", label: "Fonts", icon: 
    <svg xmlns="http://www.w3.org/2000/svg" width="1.3em" height="1.3em" viewBox="0 0 16 16">
      <path fill="#000" fill-rule="evenodd" d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 1 0V5c0-2 .5-3 3-3h1.5a.5.5 0 0 1 .5.5V13a1 1 0 0 1-1 1H4.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1H10a1 1 0 0 1-1-1V2.5a.5.5 0 0 1 .5-.5H11c2.5 0 3 1 3 3v.5a.5.5 0 0 0 1 0v-4a.5.5 0 0 0-.5-.5z" clip-rule="evenodd"/>
    </svg>
   },
  { key: "date", label: "Date Format", icon: 
    <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24">
      <path fill="#000" d="M8 13.885q-.31 0-.54-.23t-.23-.54t.23-.539t.54-.23t.54.23t.23.54t-.23.539t-.54.23m4 0q-.31 0-.54-.23t-.23-.54t.23-.539t.54-.23t.54.23t.23.54t-.23.539t-.54.23m4 0q-.31 0-.54-.23t-.23-.54t.23-.539t.54-.23t.54.23t.23.54t-.23.539t-.54.23M5.616 21q-.691 0-1.153-.462T4 19.385V6.615q0-.69.463-1.152T5.616 5h1.769V3.308q0-.233.153-.386t.385-.153t.386.153t.153.386V5h7.154V3.27q0-.214.143-.358t.357-.143t.356.143t.144.357V5h1.769q.69 0 1.153.463T20 6.616v12.769q0 .69-.462 1.153T18.384 21zm0-1h12.769q.23 0 .423-.192t.192-.424v-8.768H5v8.769q0 .23.192.423t.423.192M5 9.615h14v-3q0-.23-.192-.423T18.384 6H5.616q-.231 0-.424.192T5 6.616zm0 0V6z"/>
    </svg>
   },
  { key: "layout", label: "Layout", icon: 
    <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 256 256">
      <path fill="#000" d="M120 64a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h72a8 8 0 0 1 8 8m-8 32H40a8 8 0 0 0 0 16h72a8 8 0 0 0 0-16m0 40H40a8 8 0 0 0 0 16h72a8 8 0 0 0 0-16m0 40H40a8 8 0 0 0 0 16h72a8 8 0 0 0 0-16m32-104h72a8 8 0 0 0 0-16h-72a8 8 0 0 0 0 16m72 24h-72a8 8 0 0 0 0 16h72a8 8 0 0 0 0-16m0 40h-72a8 8 0 0 0 0 16h72a8 8 0 0 0 0-16m0 40h-72a8 8 0 0 0 0 16h72a8 8 0 0 0 0-16"/>
    </svg>
   },
  { key: "header&footers", label: "Header & Footer", icon: 
   <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 16 16"><g fill="#000">
    <path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2z"/><path d="M3 8.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5m0-5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5z"/></g>
   </svg> 
   },
  { key: "insert", label: "Insert", icon: 
    <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24">
      <path fill="#000" d="M13.5 10.5H11q-.213 0-.357-.143T10.5 10t.143-.357T11 9.5h2.5V7q0-.213.143-.357T14 6.5t.357.143T14.5 7v2.5H17q.214 0 .357.143T17.5 10t-.143.357T17 10.5h-2.5V13q0 .214-.143.357T14 13.5t-.357-.143T13.5 13zM4.616 21q-.691 0-1.153-.462T3 19.385V8.615q0-.69.463-1.152T4.615 7h2V4.616q0-.691.463-1.153T8.231 3h11.154q.69 0 1.153.463T21 4.615V15.77q0 .69-.462 1.153t-1.153.463H17v2q0 .69-.462 1.152T15.385 21zm3.615-4.615h11.154q.23 0 .423-.193T20 15.77V4.615q0-.23-.192-.423T19.385 4H8.23q-.23 0-.422.192t-.192.423V15.77q0 .231.192.423t.423.193"/>
    </svg>
   },
  { key: "pageSetup", label: "Page setup", icon: 
    <svg xmlns="http://www.w3.org/2000/svg" width="1.7em" height="1.7em" viewBox="0 0 16 16">
      <path fill="#000" fill-rule="evenodd" d="M4.89 15.5c.109-.214.109-.494.109-1.05v.6h5.17c.489 0 .734 0 .964-.055q.308-.075.578-.24c.202-.123.375-.296.721-.641l1.63-1.63c.346-.346.519-.52.643-.721q.165-.271.239-.578c.055-.23.055-.475.055-.964V5.85l-.001-.8h-.571c.542 0 .816-.002 1.03-.11a1 1 0 0 0 .437-.436c.109-.214.109-.494.109-1.05v-1.8c0-.56 0-.84-.11-1.05a1 1 0 0 0-.436-.437c-.214-.11-.494-.11-1.05-.11h-12.8c-.56 0-.84 0-1.05.11A1 1 0 0 0 .12.605c-.11.214-.11.494-.11 1.05v12.8c0 .56 0 .84.11 1.05c.096.188.249.34.437.437c.214.109.494.109 1.05.109h1.8c.56 0 .84 0 1.05-.11a1 1 0 0 0 .437-.436zM3.999 1h-2.4c-.297 0-.459 0-.575.01l-.013.001l-.001.014C1 1.142 1 1.304 1 1.6V3h.5a.5.5 0 0 1 0 1H1v2h.5a.5.5 0 0 1 0 1H1v2h.5a.5.5 0 0 1 0 1H1v2h.5a.5.5 0 0 1 0 1H1v1.4c0 .296 0 .459.01.575v.013h.014c.117.01.279.011.575.011h1.8c.297 0 .459 0 .575-.01l.013-.001l.001-.013c.01-.117.01-.28.01-.575zm10 4h-9v9h5v-3.5a.5.5 0 0 1 .5-.5h3.5V5.8q0-.446-.002-.8zm.402-1h-9.4V1h1v.5a.5.5 0 0 0 1 0V1h2v.5a.5.5 0 0 0 1 0V1h2v.5a.5.5 0 0 0 1 0V1h1.4c.296 0 .459 0 .575.01l.013.001l.001.014c.01.117.01.279.01.575v1.8c0 .297 0 .459-.01.575v.013l-.014.001c-.117.01-.279.01-.575.01zm-3.4 9.94a1 1 0 0 0 .194-.092c.077-.047.156-.117.536-.497l1.63-1.63c.38-.38.45-.459.497-.536a1 1 0 0 0 .092-.194h-2.94v2.94z" clip-rule="evenodd"/>
    </svg>
  }, 
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

  // Handle creation of new page when content overflows
  const handleCreateNewPage = useCallback((currentPageIndex, overflowContent) => {
    console.log('Creating new page after page', currentPageIndex, 'with content:', overflowContent.substring(0, 100) + '...');
    
    setPages(prevPages => {
      const newPages = [...prevPages];
      // Insert new page after the current page with the overflow content
      const contentForNewPage = overflowContent && overflowContent.trim() !== '' ? overflowContent : '<p></p>';
      newPages.splice(currentPageIndex + 1, 0, contentForNewPage);
      
      console.log('Pages after overflow creation:', newPages.length, 'New page content:', contentForNewPage.substring(0, 50) + '...');
      return newPages;
    });
  }, []);

  useLayoutEffect(() => {
    if (!pageRef.current) return;
    const pageHeightPx = pageRef.current.offsetHeight;
    const newPages = paginateContentByHeight(content, pageHeightPx);
    setPages(newPages);
  }, [content, docSize.height, margins]);

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
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
          {activeTab === "layout" && (
          <LayoutPanel />
        )} 
          {activeTab === "header&footers" && (
            <HeaderFooterPanel />
          )}
        </div>

        {/* Document Editor */}
        <div className="flex-1 flex flex-col items-center overflow-y-scroll bg-gray-50 p-8">
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
                  onCreateNewPage={handleCreateNewPage}
                  pageConfig={{
                    paperSize,
                    orientation,
                    margins
                  }}
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
