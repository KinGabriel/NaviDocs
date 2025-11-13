// src/layout/templateSidebar.jsx
import React from "react";

export default function TemplateSidebar({
  selectedPanel,
  onSelectPanel,
  panels = [
    { id: "font",         label: "Text",               glyph: "T"  },
    { id: "headerfooter", label: "Header & Footers",   glyph: "▭"  },
    { id: "insert",       label: "Insert",             glyph: "+"  },
    { id: "pagesetup",    label: "Page setup",         glyph: "▦"  },
    { id: "fields",       label: "Set Editable Fields", glyph: "✎" },
  ],
  topOffsetPx = 70,
  bottomOffsetPx = 16,
  children,
}) {
  const railStyle = {
    top: `${topOffsetPx}px`,
    height: `calc(100vh - ${topOffsetPx + bottomOffsetPx}px)`,
  };
  const panelStyle = railStyle;

  return (
    <div className="relative w-[380px] shrink-0">
      <nav
        className="
          fixed left-0 z-30 hidden md:block
          w-24 rounded-r-2xl border border-slate-200 bg-white py-2 shadow-sm
        "
        style={railStyle}
        aria-label="Editor tools"
      >
        <ul className="flex h-full flex-col items-stretch gap-2 px-1">
          {panels.map((item) => {
            const active = selectedPanel === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onSelectPanel(item.id)}
                  className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl py-3 transition
                    ${
                      active
                        ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="text-2xl leading-none text-center">{item.glyph}</span>
                  <span className="text-[11px] leading-tight text-center">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <aside
        className="
          sticky w-[380px] overflow-auto rounded-xl
          border border-slate-200 bg-white p-3 shadow-sm
        "
        style={panelStyle}
      >
        {children}
      </aside>
    </div>
  );
}