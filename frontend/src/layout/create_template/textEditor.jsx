import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Placeholder from '@tiptap/extension-placeholder'

// Table extensions
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
// Image extension
import { Image } from '@tiptap/extension-image'
import { useEffect, useRef, useMemo, useCallback } from 'react'

// Paper size dimensions in pixels (96 DPI)
const PAPER_DIMENSIONS = {
  Letter: { width: 816, height: 1056 },
  A4: { width: 794, height: 1123 },
  Legal: { width: 816, height: 1344 },
}

// Default font settings for the editor
const DEFAULT_FONT_SETTINGS = {
  fontSize: '16px',
  fontFamily: 'Times New Roman, serif',
  lineHeight: '1.6',
}

// Constants for page calculations
const PIXELS_PER_INCH = 96
const DEFAULT_MARGIN = 1
const PAGE_CREATION_DELAY = 10 // Milliseconds to wait before creating new page

/**
 * TextEditor Component - A rich text editor with page overflow handling, tables, and images
 * 
 * @param {string} content - HTML content for the editor
 * @param {function} onChange - Callback when content changes
 * @param {object} fontSettings - Font configuration (size, family, color)
 * @param {number} pageIndex - Index of this page in the document
 * @param {function} onTextSelection - Callback when text is selected
 * @param {function} onEditorReady - Callback when editor is initialized
 * @param {function} onCreateNewPage - Callback to create a new page on overflow
 * @param {object} pageConfig - Page configuration (size, orientation, margins)
 */
export default function TextEditor({ 
  content, 
  onChange, 
  fontSettings, 
  pageIndex = 0, 
  onTextSelection, 
  onEditorReady, 
  onCreateNewPage,
  pageConfig
}) {
  // Ref to prevent multiple overflow checks running simultaneously
  const overflowCheckRef = useRef(false)
  
  // Ref to track the last content to prevent unnecessary updates
  const lastContentRef = useRef('')

  /**
   * Calculate paper dimensions based on size and orientation
   * Memoized to prevent unnecessary recalculations
   */
  const paperDimensions = useMemo(() => {
    if (!pageConfig) return null
    
    // Get base paper size dimensions
    const baseSize = PAPER_DIMENSIONS[pageConfig.paperSize] || PAPER_DIMENSIONS.Letter
    
    // Swap width/height for landscape orientation
    return pageConfig.orientation === "Landscape"
      ? { width: baseSize.height, height: baseSize.width }
      : baseSize
  }, [pageConfig?.paperSize, pageConfig?.orientation])

  /**
   * Calculate available content height after accounting for margins
   * @returns {number|null} Available height in pixels
   */
  const getAvailableContentHeight = useCallback(() => {
    if (!pageConfig || !paperDimensions) return null
    
    // Convert margins from inches to pixels
    const marginTopPx = (pageConfig.margins?.top || DEFAULT_MARGIN) * PIXELS_PER_INCH
    const marginBottomPx = (pageConfig.margins?.bottom || DEFAULT_MARGIN) * PIXELS_PER_INCH
    
    // Return height minus top and bottom margins
    return paperDimensions.height - marginTopPx - marginBottomPx
  }, [pageConfig, paperDimensions])

  /**
   * Create a temporary div for measuring content height
   * @param {object} editor - TipTap editor instance
   * @returns {HTMLElement} Temporary measurement div
   */
  const createMeasurementDiv = useCallback((editor) => {
    const tempDiv = document.createElement('div')
    
    // Apply same styling as editor for accurate measurement
    tempDiv.style.cssText = `
      position: absolute;
      visibility: hidden;
      width: ${editor.view.dom.offsetWidth}px;
      font-size: ${editor.view.dom.style.fontSize || DEFAULT_FONT_SETTINGS.fontSize};
      font-family: ${editor.view.dom.style.fontFamily || DEFAULT_FONT_SETTINGS.fontFamily};
      line-height: ${DEFAULT_FONT_SETTINGS.lineHeight};
    `
    tempDiv.className = editor.view.dom.className
    document.body.appendChild(tempDiv)
    return tempDiv
  }, [])

  /**
   * Split content when it overflows to the next page
   * Handles both element-level and word-level splitting
   * @param {object} editor - TipTap editor instance
   * @param {string} html - HTML content to split
   * @param {number} availableHeight - Available height in pixels
   */
  const splitContentToNextPage = useCallback((editor, html, availableHeight) => {
    try {
      // Create measurement div and parse HTML elements
      const tempDiv = createMeasurementDiv(editor)
      tempDiv.innerHTML = html
      const elements = Array.from(tempDiv.children)
      
      let lastFittingIndex = -1
      let currentPageContent = ''
      const effectiveLimit = availableHeight

      // Try to fit elements one by one
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i]
        const testContent = currentPageContent + element.outerHTML
        tempDiv.innerHTML = testContent

        if (tempDiv.offsetHeight <= effectiveLimit) {
          // Element fits, add it to current page
          currentPageContent = testContent
          lastFittingIndex = i
        } else {
          // Element doesn't fit, handle word-level splitting if needed
          if (lastFittingIndex < 0 && i === 0) {
            const elementText = element.textContent || ''
            
            // Only attempt word splitting for longer text
            if (elementText.length > 50) {
              const words = elementText.split(' ')
              let partialText = ''
              let currentContent = ''

              // Try to fit words one by one
              for (let j = 0; j < words.length; j++) {
                const testText = partialText + (partialText ? ' ' : '') + words[j]
                const testElement = element.cloneNode(true)
                testElement.textContent = testText
                tempDiv.innerHTML = ''
                tempDiv.appendChild(testElement)

                if (tempDiv.offsetHeight <= effectiveLimit) {
                  partialText = testText
                  currentContent = tempDiv.innerHTML
                } else break
              }

              // If we successfully split the text
              if (currentContent && partialText !== elementText) {
                const remainingText = elementText.substring(partialText.length).trim()
                
                if (remainingText) {
                  // Create element for remaining text
                  const nextElement = element.cloneNode(true)
                  nextElement.textContent = remainingText

                  // Update current page with partial content
                  editor.commands.setContent(currentContent, false)
                  lastContentRef.current = currentContent
                  onChange(currentContent)

                  // Prepare content for next page
                  const remainingElements = [nextElement, ...elements.slice(1)]
                  const nextPageContent = remainingElements.map(el => el.outerHTML).join('')

                  // Create new page after delay
                  setTimeout(() => {
                    if (onCreateNewPage) onCreateNewPage(pageIndex, nextPageContent)
                    overflowCheckRef.current = false
                  }, PAGE_CREATION_DELAY)

                  document.body.removeChild(tempDiv)
                  return
                }
              }

              // Cleanup and exit if splitting failed
              document.body.removeChild(tempDiv)
              overflowCheckRef.current = false
              return
            } else {
              // Text too short to split, keep as is
              document.body.removeChild(tempDiv)
              overflowCheckRef.current = false
              return
            }
          }
          break
        }
      }

      document.body.removeChild(tempDiv)

      // If no elements fit, don't create new page
      if (lastFittingIndex < 0) {
        overflowCheckRef.current = false
        return
      }

      // Split content between current and next page
      const currentContent = elements.slice(0, lastFittingIndex + 1).map(el => el.outerHTML).join('')
      const nextPageContent = lastFittingIndex < elements.length - 1
        ? elements.slice(lastFittingIndex + 1).map(el => el.outerHTML).join('')
        : ''

      // Only create new page if there's content for it
      if (!nextPageContent || nextPageContent.trim() === '') {
        overflowCheckRef.current = false
        return
      }

      // Update current page content
      editor.commands.setContent(currentContent, false)
      lastContentRef.current = currentContent
      onChange(currentContent)

      // Create new page with remaining content
      setTimeout(() => {
        if (onCreateNewPage) onCreateNewPage(pageIndex, nextPageContent)
        overflowCheckRef.current = false
      }, PAGE_CREATION_DELAY)

    } catch (error) {
      console.error('Error splitting content:', error)
      overflowCheckRef.current = false
    }
  }, [createMeasurementDiv, onChange, onCreateNewPage, pageIndex])

  /**
   * Check if content would overflow the page
   * @param {object} editor - TipTap editor instance
   * @param {string} html - HTML content to check
   * @returns {boolean} True if content would overflow
   */
  const checkForOverflow = useCallback((editor, html) => {
    // Skip if already checking overflow or missing required data
    if (overflowCheckRef.current || !editor || !pageConfig) return false
    
    const editorElement = editor.view.dom
    if (!editorElement) return false

    const availableHeight = getAvailableContentHeight()
    if (!availableHeight) return false

    // scroll height for more accurate measurement
    const contentHeight = editorElement.scrollHeight

    console.log('Checking overflow - Content height:', contentHeight, 'Available height:', availableHeight)

    // Return true if content exceeds available height
    return contentHeight > availableHeight
  }, [pageConfig, getAvailableContentHeight])

  /**
   * Configure TipTap editor extensions
   * Memoized to prevent recreation on every render
   */
  const editorExtensions = useMemo(() => [
    StarterKit,                                                    // Basic editing features (bold, italic, etc.)
    Underline,                                                     // Underline formatting
    TextStyle.configure({ HTMLAttributes: { class: 'text-style-mark' } }), // Custom text styling
    Color.configure({ types: ['textStyle'] }),                    // Text color support
    FontFamily.configure({ types: ['textStyle'] }),               // Font family support
    Placeholder.configure({ placeholder: 'Start typing your document...' }), // Placeholder text
    // Table extensions
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    // Image extension
    Image.configure({
      inline: true,
      allowBase64: true,
    }),
  ], [])

  /**
   * Handle text selection changes in the editor
   * @param {object} editor - TipTap editor instance
   */
  const handleTextSelection = useCallback((editor) => {
    if (!onTextSelection) return
    
    // Get selection range and extract selected text
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, '')
    
    // Notify parent component of selection
    onTextSelection(pageIndex, from, to, selectedText)
  }, [onTextSelection, pageIndex])

  /**
   * Handle editor content updates
   * Includes overflow checking and page creation
   * @param {object} param - Editor update event
   */
  const handleUpdate = useCallback(({ editor }) => {
    const html = editor.getHTML()
    
    // Skip if content hasn't actually changed
    if (html === lastContentRef.current) return
    
    lastContentRef.current = html
    onChange(html)

    // Check for overflow and create new page if needed
    if (onCreateNewPage && pageConfig && !overflowCheckRef.current) {
      setTimeout(() => {
        const wouldOverflow = checkForOverflow(editor, html)
        
        if (wouldOverflow) {
          overflowCheckRef.current = true
          console.log('Content overflow detected, creating new page...')
          
          const availableHeight = getAvailableContentHeight()
          splitContentToNextPage(editor, html, availableHeight)
        }
      }, 50)
    }
  }, [onChange, onCreateNewPage, pageConfig, checkForOverflow, getAvailableContentHeight, splitContentToNextPage])

  /**
   * Handle editor creation/initialization
   * @param {object} param - Editor create event
   */
  const handleEditorCreate = useCallback(({ editor }) => {
    console.log('Editor created for page:', pageIndex, editor)
    if (onEditorReady) onEditorReady(pageIndex, editor)
  }, [onEditorReady, pageIndex])

  /**
   * Initialize TipTap editor with configuration
   */
  const editor = useEditor({
    extensions: editorExtensions,
    content,
    onUpdate: handleUpdate,
    onSelectionUpdate: ({ editor }) => handleTextSelection(editor),
    onTransaction: ({ editor }) => handleTextSelection(editor),
    onCreate: handleEditorCreate,
    editorProps: {
      attributes: {
        class: 'w-full h-full outline-none resize-none bg-transparent overflow-hidden leading-relaxed font-normal prose prose-sm max-w-none focus:outline-none',
        spellcheck: 'true',
      },
    },
  })

  /**
   * Update editor content when prop changes
   * Prevents overflow checking during external content updates
   */
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      // Temporarily disable overflow checking
      const wasOverflowChecking = overflowCheckRef.current
      overflowCheckRef.current = true
      
      // Update editor content without triggering onUpdate
      editor.commands.setContent(content, false)
      lastContentRef.current = content
      
      // Re-enable overflow checking after delay
      setTimeout(() => {
        overflowCheckRef.current = wasOverflowChecking
      }, 100)
    }
  }, [content, editor])

  /**
   * Notify parent when editor is ready
   * Separate effect to handle editor registration
   */
  useEffect(() => {
    if (editor && onEditorReady) {
       console.log('Re-registering editor for page:', pageIndex)
      onEditorReady(pageIndex, editor)
    }
  }, [editor, pageIndex, onEditorReady])

  /**
   * Apply font settings to editor DOM element
   * Updates visual styling when font settings change
   */
  useEffect(() => {
    if (!editor || !fontSettings) return
    
    const editorElement = editor.view.dom
    if (!editorElement) return
    
    // Apply font settings as inline styles
    editorElement.style.fontSize = `${fontSettings.fontSize}px`
    editorElement.style.fontFamily = fontSettings.fontFamily
    editorElement.style.color = fontSettings.fontColor
    editorElement.style.lineHeight = DEFAULT_FONT_SETTINGS.lineHeight
  }, [editor, fontSettings])

  if (!editor) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        Loading editor...
      </div>
    )
  }

  // Render the editor
  return (
    <div className="w-full h-full">
      <EditorContent editor={editor} className="w-full h-full" />
    </div>
  )
}