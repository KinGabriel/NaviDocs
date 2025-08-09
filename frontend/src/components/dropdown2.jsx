import { Listbox } from '@headlessui/react';

export default function Dropdown2({ label, value, onChange, options, placeholder = "Select an option" }) {
  return (
    <div className="relative w-full max-w-sm">
      <label className="block font-medium text-sm mb-1">{label}</label>
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className="bg-white border border-gray-300 rounded px-4 py-2 text-left w-full flex justify-between items-center">
            <span>{value || placeholder}</span>
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </Listbox.Button>
          <Listbox.Options className="absolute z-40 mt-1 w-64 bg-white border border-gray-300 rounded shadow-lg max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
            {options.map((option) => (
              <Listbox.Option
                key={typeof option === "string" ? option : option.value}
                value={typeof option === "string" ? option : option.value}
                className={({ active }) =>
                  `cursor-pointer px-4 py-2 ${active ? "bg-gray-100" : ""}`
                }
              >
                {typeof option === "string" ? option : option.label}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
}
