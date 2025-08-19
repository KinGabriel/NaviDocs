// src/layout/templateSidebar.jsx
import React from "react";

export default function Sidebar({ selectedPanel, onSelectPanel, children }) {
  const panels = [
    { id: "font", label: "Text" },
    { id: "layout", label: "Layout" },
    { id: "dateformat", label: "Date Format" },
    { id: "headerfooter", label: "Header & Footers" },
    { id: "insert", label: "Insert" },
    { id: "pagesetup", label: "Page Setup" },
  ];

  return (
    <div className="w-[320px] bg-[#f6f7fb] border-r flex flex-col">
      {/* Tabs */}
      <div className="flex flex-col">
        {panels.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectPanel(p.id)}
            className={`w-full text-left px-5 py-3 transition ${
              selectedPanel === p.id
                ? "bg-[#e7efff] text-[#063c8d] font-semibold"
                : "hover:bg-gray-200 text-gray-800"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto border-t p-4 bg-white">
        {children}
      </div>
    </div>
  );
}
