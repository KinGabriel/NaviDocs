import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Placeholder from '@tiptap/extension-placeholder'

// Imports for table extensions
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { Image } from '@tiptap/extension-image'
import { useEffect, useRef } from 'react'

export default function TextEditor({ 
  content, 
  onChange, 
  fontSettings, 
  pageIndex, 
  onTextSelection, 
  onEditorReady, 
  onCreateNewPage,
  pageConfig // { paperSize, orientation, margins }
}) {
  const overflowCheckRef = useRef(false);

  // Calculate available content height based on page config
  const getAvailableContentHeight = () => {
    if (!pageConfig) return null;

    const paperDimensions = {
      Letter: { width: 816, height: 1056 },
      A4: { width: 794, height: 1123 },
      Legal: { width: 816, height: 1344 },
    };

    const baseSize = paperDimensions[pageConfig.paperSize] || paperDimensions["Letter"];
    const docSize = pageConfig.orientation === "Landscape"
      ? { width: baseSize.height, height: baseSize.width }
      : baseSize;

    // Calculate available height minus margins (margins are in inches, convert to pixels)
    const marginTopPx = (pageConfig.margins?.top || 1) * 96;
    const marginBottomPx = (pageConfig.margins?.bottom || 1) * 96;
    
    return docSize.height - marginTopPx - marginBottomPx;
  };

  // Check if content overflows the page
  const checkForOverflow = (editor, html) => {
    if (overflowCheckRef.current || !editor || !pageConfig) return;

    const editorElement = editor.view.dom;
    if (!editorElement) return;

    const availableHeight = getAvailableContentHeight();
    if (!availableHeight) return;

    const contentHeight = editorElement.scrollHeight;
    
    console.log('Checking overflow - Content height:', contentHeight, 'Available height:', availableHeight);
    
    if (contentHeight > availableHeight) {
      overflowCheckRef.current = true;
      console.log('Content overflow detected, creating new page...');
      
      // Split content that overflows to next page
      splitContentToNextPage(editor, html, availableHeight);
    }
  };

  // Split overflowing content to next page
  const splitContentToNextPage = (editor, html, availableHeight) => {
    try {
      // Create a temporary div to measure content
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.width = editor.view.dom.offsetWidth + 'px';
      tempDiv.style.fontSize = editor.view.dom.style.fontSize || '16px';
      tempDiv.style.fontFamily = editor.view.dom.style.fontFamily || 'Times New Roman, serif';
      tempDiv.style.lineHeight = '1.6';
      tempDiv.className = editor.view.dom.className;
      document.body.appendChild(tempDiv);

      // Parse HTML content into individual elements
      tempDiv.innerHTML = html;
      const elements = Array.from(tempDiv.children);
      
      let currentPageContent = '';
      let nextPageContent = '';
      let overflowStarted = false;
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const testContent = currentPageContent + element.outerHTML;
        
        // Test if adding this element would exceed page height
        tempDiv.innerHTML = testContent;
        
        if (tempDiv.offsetHeight > availableHeight && !overflowStarted) {
          overflowStarted = true;
          // This element and all following elements go to next page
          nextPageContent = elements.slice(i).map(el => el.outerHTML).join('');
          break;
        } else if (!overflowStarted) {
          currentPageContent = testContent;
        }
      }
      
      document.body.removeChild(tempDiv);
      
      // Update current page with content that fits
      const currentContent = currentPageContent || '<p></p>';
      const nextContent = nextPageContent || '<p></p>';
      
      console.log('Split content - Current:', currentContent.substring(0, 100) + '...');
      console.log('Split content - Next:', nextContent.substring(0, 100) + '...');
      
      // Update current editor content
      onChange(currentContent);
      
      // Create new page with overflow content
      setTimeout(() => {
        onCreateNewPage(pageIndex, nextContent);
        overflowCheckRef.current = false;
      }, 100);
      
    } catch (error) {
      console.error('Error splitting content:', error);
      overflowCheckRef.current = false;
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle.configure({
        HTMLAttributes: {
          class: 'text-style-mark',
        },
      }),
      Color.configure({
        types: ['textStyle'],
      }),
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Placeholder.configure({
        placeholder: 'Start typing your document...',
      }),
      // Table extensions
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      // Imaage extension
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
      
      // Check for overflow and create new page if needed
      if (onCreateNewPage && pageConfig && !overflowCheckRef.current) {
        setTimeout(() => {
          checkForOverflow(editor, html);
        }, 50);
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      const selectedText = editor.state.doc.textBetween(from, to, '')
      
      if (onTextSelection) {
        onTextSelection(pageIndex || 0, from, to, selectedText)
      }
    },
    onTransaction: ({ editor }) => {
      const { from, to } = editor.state.selection
      const selectedText = editor.state.doc.textBetween(from, to, '')
      
      if (onTextSelection) {
        onTextSelection(pageIndex || 0, from, to, selectedText)
      }
    },
    onCreate: ({ editor }) => {
      console.log('Editor created for page:', pageIndex, editor); 
      if (onEditorReady) {
        onEditorReady(pageIndex || 0, editor)
      }
    },
    editorProps: {
      attributes: {
        class: 'w-full h-full outline-none resize-none bg-transparent overflow-hidden leading-relaxed font-normal prose prose-sm max-w-none focus:outline-none',
        spellcheck: 'true',
      },
    },
  })

  // Update content when it changes externally
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

  // Register editor when it's created and re-register on changes
  useEffect(() => {
    if (editor && onEditorReady) {
     // console.log('Re-registering editor for page:', pageIndex); 
      onEditorReady(pageIndex || 0, editor)
    }
  }, [editor, pageIndex, onEditorReady])

  // Apply font settings to the editor
  useEffect(() => {
    if (editor && fontSettings) {
      // Apply global styles to the editor element
      const editorElement = editor.view.dom
      if (editorElement) {
        editorElement.style.fontSize = `${fontSettings.fontSize}px`
        editorElement.style.fontFamily = fontSettings.fontFamily
        editorElement.style.color = fontSettings.fontColor
        editorElement.style.lineHeight = '1.6'
      }
    }
  }, [editor, fontSettings])

  if (!editor) {
    return <div className="w-full h-full flex items-center justify-center text-gray-400">Loading editor...</div>
  }

  return (
    <div className="w-full h-full">
      <EditorContent 
        editor={editor}
        className="w-full h-full"
      />
    </div>
  )
}