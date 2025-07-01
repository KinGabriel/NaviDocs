import { useState } from 'react';

export default function LayoutPanel() {
  const [columns, setColumns] = useState('one');
  const [alignment, setAlignment] = useState('left');
  const [lineSpacing, setLineSpacing] = useState('');
  const [spacingBefore, setSpacingBefore] = useState('');
  const [spacingAfter, setSpacingAfter] = useState('');
  const [bullets, setBullets] = useState('numbered');

  return (
    <div className="p-4 text-sm text-gray-800 space-y-6">
      {/* columns */}
      <div>
        <h3 className="font-semibold mb-2">Columns</h3>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <button
              onClick={() => setColumns('one')}
              className={`border rounded-md p-3 w-25 h-20 hover:border-blue-500 ${
                columns === 'one' ? 'border-blue-600' : 'border-gray-300'
              }`}
            >
              <div className="w-16 h-2 bg-gray-200 rounded-sm mb-1 mx-auto" />
              <div className="w-16 h-2 bg-gray-200 rounded-sm mb-1 mx-auto" />
              <div className="w-16 h-2 bg-gray-200 rounded-sm mx-auto" />
            </button>
            <span className="mt-1 text-xs">One</span>
          </div>
          <div className="flex flex-col items-center">
            <button
              onClick={() => setColumns('two')}
              className={`border rounded-md p-3 w-25 h-20 hover:border-blue-500 ${
                columns === 'two' ? 'border-blue-600' : 'border-gray-300'
              }`}
            >
            <div className="grid grid-cols-2 gap-1 w-fit mx-auto">
                <div className="w-9 h-3 bg-gray-200 rounded-sm" />
                <div className="w-9 h-3 bg-gray-200 rounded-sm" />
                <div className="w-9 h-3 bg-gray-200 rounded-sm" />
                <div className="w-9 h-3 bg-gray-200 rounded-sm" />
            </div>

            </button>
            <span className="mt-1 text-xs">Two</span>
          </div>
        </div>
      </div>

      {/* alignment */}
      <div>
        <h3 className="font-semibold mb-2">Alignment</h3>
        <div className="grid grid-cols-2 gap-4">
          {['left', 'right', 'center', 'justified'].map((align) => (
            <div key={align} className="flex flex-col items-center">
              <button
                onClick={() => setAlignment(align)}
                className={`border rounded-md p-3 w-full hover:border-blue-500 ${
                  alignment === align ? 'border-blue-600' : 'border-gray-300'
                }`}
              >
                <div className="w-full h-2 bg-gray-300 mb-1 rounded" />
                <div className="w-3/4 h-2 bg-gray-300 mx-auto rounded" />
              </button>
              <span className="mt-1 text-xs capitalize">{align}</span>
            </div>
          ))}
        </div>
      </div>

      {/* line & paragraph spacing */}
      <div>
        <h3 className="font-semibold mt-10 mb-2">Line & paragraph spacing</h3>
        <label className="block text-xs mt-2">Line spacing</label>
        <input
          type="text"
          value={lineSpacing}
          onChange={(e) => setLineSpacing(e.target.value)}
          className="w-full border px-2 py-1 rounded text-sm"
        />
        <div className="flex gap-4 mt-5">
          <div>
            <label className="block text-xs mb-1">Before</label>
            <input
              type="text"
              value={spacingBefore}
              onChange={(e) => setSpacingBefore(e.target.value)}
              className="w-full border px-2 py-1 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">After</label>
            <input
              type="text"
              value={spacingAfter}
              onChange={(e) => setSpacingAfter(e.target.value)}
              className="w-full border px-2 py-1 rounded text-sm"
            />
          </div>
        </div>
      </div>

    {/* bullets & numbering */}
        {/* Bullets & Numbering */}
<div>
  <h3 className="font-semibold mt-10 mb-3">Bullets & Numbering</h3>
  <div className="space-y-4">
    {/* Numbered List */}
    <div>
      <div className="relative">
        <select
          value={bullets === 'numbered' ? bullets : ''}
          onChange={() => setBullets('numbered')}
          className="border px-2 py-1 rounded w-full appearance-none pr-8"
        >
          <option value="numbered">Numbered list menu</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>

    {/* Bulleted List */}
        <div>
        <div className="relative">
            <select
            value={bullets === 'bulleted' ? bullets : ''}
            onChange={() => setBullets('bulleted')}
            className="border px-2 py-1 rounded w-full appearance-none pr-8"
            >
            <option value="bulleted">Bulleted list menu</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            </div>
         </div>
        </div>
     </div>
    </div>
 </div>
  );
}
