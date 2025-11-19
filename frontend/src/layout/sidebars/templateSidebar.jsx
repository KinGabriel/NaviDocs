import React from "react";

export default function TemplateSidebar({
  selectedPanel,
  onSelectPanel,
  panels = [
    { id: "font", label: "Text", glyph: "T" },
    { id: "headerfooter", label: "Header & Footers", glyph: "▭" },
    { id: "insert", label: "Insert", glyph: "+" },
    { id: "pagesetup", label: "Page setup", glyph: "▦" },
    { id: "fields", label: "Set Editable Fields", glyph: "✎" },
  ],
  topOffsetPx = 70,
  bottomOffsetPx = 16,
  children,
  inDrawer = false,
}) {
  const maxHeight = `calc(100vh - ${topOffsetPx + bottomOffsetPx}px)`;

  // Desktop (not in drawer): fix the overall block height to match editor
  const containerStyle = inDrawer ? {} : { height: maxHeight, maxHeight };

  // Only the rail is sticky on desktop; the panel just fills the block
  const navStyle = inDrawer ? {} : { position: "sticky", top: topOffsetPx };
  const asideStyle = inDrawer ? {} : { height: "100%", maxHeight };

  const panelBodyClass = inDrawer
    ? "p-4 bg-white"                  // drawer: outer container scrolls
    : "h-full overflow-auto p-4 bg-white"; // desktop: inner scroll

  const rootClass = inDrawer
    ? "relative z-20 flex flex-col shrink-0 w-full min-h-full"
    : "relative z-20 flex flex-col md:flex-row shrink-0 w-full md:w-auto";

  return (
    <div className={rootClass} style={containerStyle}>
      {/* TOOL RAIL */}
      <nav
        className="
          flex flex-row md:flex-col
          w-full md:w-24
          rounded-2xl md:rounded-r-2xl
          border border-slate-200 bg-white py-2 shadow-sm
          mb-3 md:mb-0
        "
        style={navStyle}
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
          ml-0 md:ml-4
          w-full
          max-w-full
          rounded-3xl border border-slate-200 bg-white shadow-sm
          overflow-hidden
          md:flex-[0_0_440px] md:max-w-[460px]
        "
        style={asideStyle}
      >
        <div className={panelBodyClass}>{children}</div>
      </aside>
    </div>
  );
}
