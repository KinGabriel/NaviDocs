import React from "react";
import { Listbox, Transition } from "@headlessui/react";
import { Fragment } from "react";

/**
 * MultiSelectDropdown
 * @param {Array} options - Array of { value, label }
 * @param {Array} value - Array of selected values
 * @param {Function} onChange - Callback for selection change
 * @param {string} label - Label for the dropdown
 * @param {string} placeholder - Placeholder text
 * @param {string} className - Additional className for container
 */
export default function MultiSelectDropdown({
  options = [],
  value = [],
  onChange,
  label = "",
  placeholder = "Select...",
  className = "",
}) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <Listbox value={value} onChange={onChange} multiple>
        <div className="relative mt-1">
          <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white border py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <span className="block truncate">
              {value.length > 0
                ? options
                    .filter((opt) => value.includes(opt.value))
                    .map((opt) => opt.label)
                    .join(", ")
                : placeholder}
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {options.length === 0 ? (
                <div className="px-4 py-2 text-gray-400">No options available</div>
              ) : (
                options.map((option) => (
                  <Listbox.Option
                    key={option.value}
                    value={option.value}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                        active ? "bg-blue-100 text-blue-900" : "text-gray-900"
                      }`
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span className={`block truncate ${selected ? "font-semibold" : "font-normal"}`}>{option.label}</span>
                        {selected ? (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">✔</span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))
              )}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}
