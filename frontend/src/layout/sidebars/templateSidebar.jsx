import React from "react";

export default function TemplateSidebar({
  selectedPanel,
  onSelectPanel,
  panels = [
    { id: "font",         label: "Text",                glyph: "T"  },
    { id: "headerfooter", label: "Header & Footers",    glyph: "▭"  },
    { id: "insert",       label: "Insert",              glyph: "+"  },
    { id: "pagesetup",    label: "Page setup",          glyph: "▦"  },
    { id: "fields",       label: "Set Editable Fields", glyph: "✎"  },
  ],
  topOffsetPx = 70,
  bottomOffsetPx = 16,
  children,
}) {
  const maxHeight = `calc(100vh - ${topOffsetPx + bottomOffsetPx}px)`;

  return (
    <div className="relative z-20 flex flex-col md:flex-row shrink-0 w-full md:w-auto">
            {/* TOOL RAIL */}
      <nav
        className="
          flex flex-row md:flex-col
          w-full md:w-24
          rounded-2xl md:rounded-r-2xl
          border border-slate-200 bg-white py-2 shadow-sm
          mb-3 md:mb-0
        "
        style={{
          position: "sticky",
          top: topOffsetPx,
          maxHeight,
        }}
        aria-label="Editor tools"
      >

        <ul className="flex h-full w-full flex-row md:flex-col items-stretch gap-2 px-1">
          {panels.map((item) => {
            const active = selectedPanel === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectPanel(item.id)}
                  className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl py-3 transition
                    ${
                      active
                        ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="text-2xl leading-none text-center">
                    {item.glyph}
                  </span>
                  <span className="text-[11px] leading-tight text-center">
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* RIGHT CONTENT SIDEBAR */}
      <aside
        className="
          ml-0 md:ml-3
          w-full
          max-w-full
          rounded-3xl border border-slate-200 bg-white shadow-sm
          overflow-hidden
          md:flex-[0_0_360px] md:max-w-[380px]
        "
        style={{
          position: "sticky",
          top: topOffsetPx,
          maxHeight,
        }}
      >
        <div className="h-full overflow-auto p-4 bg-white">
          {children}
        </div>
      </aside>
    </div>
  );
}
