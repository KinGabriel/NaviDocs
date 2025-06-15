import { Listbox } from '@headlessui/react';

export default function Dropdown({ value, onChange, options, width = "w-36" }) {
  return (
    <div className={`relative ${width}`}>
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className="bg-blue-700 text-white px-5 py-2 rounded font-semibold text-sm w-full text-left flex items-center justify-between focus:outline-none focus:ring-0">
            <span>{value}</span>
            {/* Chevron Down SVG */}
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </Listbox.Button>
          <Listbox.Options className="absolute mt-1 w-full bg-white text-black rounded shadow-lg z-10">
            {options.map(option => (
              <Listbox.Option
                key={option}
                value={option}
                className={({ active }) =>
                  `cursor-pointer select-none px-4 py-2 ${active ? 'bg-gray-100' : ''}`
                }
              >
                {option}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
}