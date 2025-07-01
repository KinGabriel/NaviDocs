import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'

export default function TextEditor({ content, onChange, fontSettings, pageIndex, onTextSelection, onEditorReady }) {
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
    ],
    content: content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
      
      // Additional trigger for immediate overflow detection
      setTimeout(() => {
        const editorElement = editor.view.dom;
        if (editorElement) {
          console.log('Editor content updated, height:', editorElement.scrollHeight);
        }
      }, 10);
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
      console.log('Re-registering editor for page:', pageIndex); 
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