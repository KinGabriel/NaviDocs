import { useState } from 'react'

export default function InsertPanel({ editor }) {

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
        <h2 className="text-lg font-semibold mb-2">Image</h2>
        <label className="w-full bg-gray-200 border rounded-lg flex flex-col items-center justify-center h-40 cursor-pointer">
          <svg className="w-8 h-8 mb-2 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0l-4 4m4-4l4 4" />
          </svg>
          <span className="text-gray-600">Upload Image here</span>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
      </div>

      {/* insert table */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Table</h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700" >
          Insert Table
        </button>
      </div>
    </div>
  )
}
