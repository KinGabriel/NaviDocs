import { Listbox } from '@headlessui/react';

export default function Dropdown3({ label = "Visibility", value, onChange, options = [
  { value: "private", label: "Private" },
  { value: "public", label: "Public" }
], placeholder = "Select an option" }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className="w-full border rounded-lg px-3 py-2 bg-white text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500">
            <span>{options.find(opt => opt.value === value)?.label || placeholder}</span>
            <svg className="w-4 h-4 ml-2 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </Listbox.Button>
          <Listbox.Options className="absolute z-40 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto focus:outline-none">
            {options.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  `cursor-pointer px-3 py-2 ${active ? "bg-gray-100 text-blue-700" : "text-gray-900"}`
                }
              >
                {({ selected }) => (
                  <span className={`block truncate ${selected ? "font-semibold" : "font-normal"}`}>{option.label}</span>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
}
