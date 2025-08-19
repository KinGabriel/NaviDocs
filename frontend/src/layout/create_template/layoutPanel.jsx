import { useState } from 'react';

export default function LayoutPanel() {
  const [columns, setColumns] = useState('one');
  const [alignment, setAlignment] = useState('left');
  const [lineSpacing, setLineSpacing] = useState('');
  const [spacingBefore, setSpacingBefore] = useState('');
  const [spacingAfter, setSpacingAfter] = useState('');
  const [numberedStyle, setNumberedStyle] = useState('');
  const [bulletedStyle, setBulletedStyle] = useState('');

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
                className={`border rounded-lg p-3 w-35 h-14 hover:border-blue-500 ${
                  alignment === align ? 'border-blue-600' : 'border-gray-300'
                }`}
              >
                {align === 'left' && (
                  <>
                    <div className="w-3/4 h-2 bg-gray-300 mb-1 rounded" />
                    <div className="w-1/2 h-2 bg-gray-300 rounded" />
                  </>
                )}
                {align === 'right' && (
                  <>
                    <div className="w-3/4 h-2 bg-gray-300 mb-1 rounded ml-auto" />
                    <div className="w-1/2 h-2 bg-gray-300 rounded ml-auto" />
                  </>
                )}
                {align === 'center' && (
                  <>
                    <div className="w-4/5 h-2 bg-gray-300 mb-1 rounded mx-auto" />
                    <div className="w-2/3 h-2 bg-gray-300 rounded mx-auto" />
                    <div className="w-4/5 h-2 bg-gray-300 mt-1 rounded mx-auto" />
                  </>
                )}
                {align === 'justified' && (
                  <>
                    <div className="w-full h-2 bg-gray-300 mb-1 rounded" />
                    <div className="w-full h-2 bg-gray-300 mb-1 rounded" />
                    <div className="w-full h-2 bg-gray-300 rounded" />
                  </>
                )}
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
    <div>
      <h3 className="font-semibold mt-10 mb-3">Bullets & Numbering</h3>
      <div className="space-y-4"> 
    
      {/* numbered list */}
    <div>
      <label className="flex items-center gap-2 text-sm font-semibold mb-1 text-gray-700">
        <svg xmlns="http://www.w3.org/2000/svg" width="1.7em" height="1.7em" viewBox="0 0 21 21">
          <g fill="none" fillRule="evenodd">
            <path
              stroke="#333333"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1"
              d="M15.5 10.5h-7m7 4h-7m7-8h-7"
            />
            <path
              fill="#333333"
              d="M5.88 8V5.828h-.037l-.68.459V5.67l.717-.488h.717V8zm-.98 2.068c0-.572.45-.963 1.109-.963c.652 0 1.04.354 1.04.836c0 .334-.148.555-.597.961l-.555.502v.037h1.186V12H4.94v-.479l1.008-.912c.348-.318.406-.44.406-.605c0-.195-.136-.358-.382-.358c-.262 0-.416.178-.416.422zm.712 4.73v-.484h.362c.238 0 .392-.138.392-.341c0-.192-.146-.332-.388-.332c-.254 0-.409.134-.42.363h-.653c.01-.541.438-.899 1.108-.899c.66 0 1.021.346 1.02.766c0 .34-.22.565-.528.637v.037c.406.057.64.309.64.68c0 .504-.48.851-1.158.851c-.67 0-1.125-.361-1.15-.916h.684c.01.217.185.352.457.352c.261 0 .439-.143.439-.356c0-.222-.168-.357-.443-.357z"
            />
          </g>
        </svg>
        Numbered List
      </label>
      <div className="relative">
        <select
          value={numberedStyle}
          onChange={(e) => setNumberedStyle(e.target.value)}
          className="border px-2 py-1 rounded w-full appearance-none pr-8"
        >
          <option value="" disabled>Choose style</option>
          <option value="1">1. 2. 3.</option>
          <option value="A">A. B. C.</option>
          <option value="a">a. b. c.</option>
          <option value="I">I. II. III.</option>
          <option value="i">i. ii. iii.</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>

    {/* bulleted list */}
    <div>
      <label className="flex items-center gap-2 text-sm font-semibold mb-1 text-gray-700">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h.01M4 12h.01M4 18h.01M8 6h12M8 12h12M8 18h12" />
        </svg>
        Bulleted List
      </label>
      <div className="relative">
        <select
          value={bulletedStyle}
          onChange={(e) => setBulletedStyle(e.target.value)}
          className="border px-2 py-1 rounded w-full appearance-none pr-8"
        >
          <option value="" disabled>Choose style</option>
          <option value="disc">● </option>
          <option value="square">■ </option>
          <option value="arrow">➤ </option>
          <option value="star">★ </option>
          <option value="asterisk">✱</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
