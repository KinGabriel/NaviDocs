import { useState } from 'react'

export default function InsertPanel({ editor }) {
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)

  const handleInsertTable = () => {
    if (editor) {
      editor
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run()
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file && editor) {
      const reader = new FileReader()
      reader.onload = () => {
        editor
          .chain()
          .focus()
          .setImage({ src: reader.result })
          .run()
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="w-full p-4 space-y-6">
      {/* image upload */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Insert Image</h2>
        <label className="w-full bg-gray-100 border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-40 cursor-pointer hover:bg-gray-200">
          <svg className="w-8 h-8 mb-2 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0l-4 4m4-4l4 4" />
          </svg>
          <span className="text-gray-600">Upload Image</span>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
      </div>

      {/* table insertion */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Insert Table</h2>
        <div className="flex gap-4 mb-3">
          <div className="flex flex-col">
            <label className="text-sm font-medium">Rows</label>
            <input
              type="number"
              min={1}
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value))}
              className="border px-2 py-1 rounded-md w-20"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium">Columns</label>
            <input
              type="number"
              min={1}
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value))}
              className="border px-2 py-1 rounded-md w-20"
            />
          </div>
          <button
            onClick={handleInsertTable}
            className="self-end bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Insert
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
            Add Column Before
          </button>
          <button onClick={() => editor.chain().focus().addColumnAfter().run()} className=" text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
            Add Column After
          </button>
          <button onClick={() => editor.chain().focus().addRowBefore().run()} className="bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
            Add Row Before
          </button>
          <button onClick={() => editor.chain().focus().addRowAfter().run()} className="bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
            Add Row After
          </button>
          <button onClick={() => editor.chain().focus().mergeCells().run()} className="bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
            Merge Cell
          </button>
          <button onClick={() => editor.chain().focus().splitCell().run()} className="bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
            Split Cell
          </button>
           <button onClick={() => editor.chain().focus().deleteColumn().run()} className="bg-gray-100 text-black-700 px-3 py-1 rounded hover:bg-gray-200">
            Delete Column
          </button>
          <button onClick={() => editor.chain().focus().deleteRow().run()} className="bg-gray-100 text-black-700 px-3 py-1 rounded hover:bg-gray-200">
            Delete Row
          </button>
          <button onClick={() => editor.chain().focus().deleteTable().run()} className="col-span-2 bg-red-200 text-black px-3 py-1 rounded hover:bg-red-400">
            Delete Table
          </button>
        </div>
        
      </div>
    </div>
    
  )
}
