// SingleSelectDropdown.jsx
import React, { useState } from "react";

export default function SingleSelectDropdown({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  icon: Icon,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        {Icon && <Icon size={16} />}
        {label}
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((s) => !s)}
          className="w-full h-[44px] px-4 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        >
          {selectedOption ? (
            <div>
              <div className="font-medium text-gray-900">{selectedOption.label}</div>
              {selectedOption.email && (
                <div className="text-xs text-gray-500 mt-0.5">{selectedOption.email}</div>
              )}
            </div>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <div className="font-medium text-gray-900">{option.label}</div>
                {option.email && (
                  <div className="text-sm text-gray-500">{option.email}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
