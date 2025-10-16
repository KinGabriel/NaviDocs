// src/layout/create_template/headerfooterPanel.jsx
import React, { useMemo, useState, useEffect } from "react";

/**
 * HeaderFooterPanel — Modular header/footer builder (inch-based margins)
 * - Margins are edited/stored in inches (marginsInch) at 0.25in increments.
 * - Pixel margins (margins) are auto-derived for Page.js (96px = 1in).
 * - Panel pushes changes into:
 *     a) editor.storage.headerFooter.current  (read by paginator & Page)
 *     b) CSS variables via commands.setHeaderFooterCssVars()
 *     c) applyHeaderFooterToAllPages() + reflowPages() to re-measure
 */

const INCH_TO_PX = 96;
const inchToPx = (v) => Math.round(Number(v || 0) * INCH_TO_PX);
const pxToIn = (v) => +(Number(v || 0) / INCH_TO_PX).toFixed(2);

// Standard increments (0 to 3 inches, step 0.25)
const INCH_STEPS = Array.from({ length: 13 }, (_, i) => +(i * 0.25).toFixed(2));

// ---------- defaults & normalization ----------
const DEFAULTS = {
  header: {
    fields: { sluLogo: true, university: true, schoolName: true, title: true, documentStamp: true },
    config: {
      university: { fontSize: 18, fontWeight: "bold", align: "center", color: "#000" },
      schoolName: { fontSize: 14, italic: true, align: "center", color: "#000" },
      title: { text: "Document Title", uppercase: false, fontSize: 16, fontWeight: "bold", align: "center", color: "#000" },
      documentStamp: {
        firstColumnFixed: ["Document Code", "Revision No.", "Effectivity", "Page"],
        secondColumnEditable: ["", "", "", ""],
        align: "right",
      },
    },
    // store inches for UI + derived px for Page rendering
    marginsInch: { top: 0.5, bottom: 0.5 },
    margins: { top: inchToPx(0.5), bottom: inchToPx(0.5) },
  },
  footer: {
    fields: { pageNumber: true, date: true },
    align: "center",
    marginsInch: { top: 0.5, bottom: 0.5 },
    margins: { top: inchToPx(0.5), bottom: inchToPx(0.5) },
  },
};

// Reasonable visual reserves for header/footer height in CSS (can be tuned)
const DEFAULT_HEADER_HEIGHT_PX = 80;
const DEFAULT_FOOTER_HEIGHT_PX = 60;

// Ensure inches + px always exist and are consistent
function normalize(value) {
  const v = value ?? {};
  const h = v.header ?? {};
  const f = v.footer ?? {};

  const ensureInchAndPx = (part, def) => {
    const out = { ...def, ...(part || {}) };

    // If only px given, derive inches
    const hasInch = out.marginsInch && (out.marginsInch.top != null || out.marginsInch.bottom != null);
    const hasPx = out.margins && (out.margins.top != null || out.margins.bottom != null);

    if (!hasInch && hasPx) {
      out.marginsInch = {
        top: pxToIn(out.margins.top ?? def.margins.top),
        bottom: pxToIn(out.margins.bottom ?? def.margins.bottom),
      };
    } else if (!hasInch && !hasPx) {
      out.marginsInch = { ...def.marginsInch };
    } else if (hasInch && !hasPx) {
      out.margins = {
        top: inchToPx(out.marginsInch.top ?? def.marginsInch.top),
        bottom: inchToPx(out.marginsInch.bottom ?? def.marginsInch.bottom),
      };
    }

    // Final sync: margins (px) from marginsInch
    out.margins = {
      top: inchToPx(out.marginsInch.top),
      bottom: inchToPx(out.marginsInch.bottom),
    };

    return out;
  };

  return {
    header: {
      ...DEFAULTS.header,
      fields: { ...DEFAULTS.header.fields, ...(h.fields ?? {}) },
      config: {
        university: { ...DEFAULTS.header.config.university, ...(h.config?.university ?? {}) },
        schoolName: { ...DEFAULTS.header.config.schoolName, ...(h.config?.schoolName ?? {}) },
        title: { ...DEFAULTS.header.config.title, ...(h.config?.title ?? {}) },
        documentStamp: { ...DEFAULTS.header.config.documentStamp, ...(h.config?.documentStamp ?? {}) },
      },
      ...ensureInchAndPx(h, DEFAULTS.header),
    },
    footer: {
      ...DEFAULTS.footer,
      fields: { ...DEFAULTS.footer.fields, ...(f.fields ?? {}) },
      align: f.align ?? DEFAULTS.footer.align,
      ...ensureInchAndPx(f, DEFAULTS.footer),
    },
  };
}

export default function HeaderFooterPanel({ editor, value, onChange }) {
  const initial = useMemo(() => normalize(value), [value]);
  const [cfg, setCfg] = useState(initial);
  const [tab, setTab] = useState("header");
  const [selectedConfig, setSelectedConfig] = useState(null);

  // Keep local in sync if parent value changes
  useEffect(() => setCfg(normalize(value)), [value]);

  // Push CSS vars once on mount (defaults) to avoid FOUC
  useEffect(() => {
    if (!editor?.commands?.setHeaderFooterCssVars) return;
    editor.commands.setHeaderFooterCssVars({
      // These are "reserves" used by CSS layout to clamp the .nd-page__body
      header: { height: DEFAULT_HEADER_HEIGHT_PX },
      footer: { height: DEFAULT_FOOTER_HEIGHT_PX },
      // Page margins are left as CSS defaults unless you have a separate panel
    });
    editor.commands.reflowPages?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Send to parent + apply to editor (editor needs px margins)
  const applyToEditor = (next) => {
    // Derive px from inches (authoritative)
    const toPx = (p, def) => {
      const topIn = p.marginsInch?.top ?? def.marginsInch.top;
      const bottomIn = p.marginsInch?.bottom ?? def.marginsInch.bottom;
      return {
        ...p,
        marginsInch: { top: topIn, bottom: bottomIn },
        margins: { top: inchToPx(topIn), bottom: inchToPx(bottomIn) },
      };
    };

    const finalHeader = toPx(next.header, DEFAULTS.header);
    const finalFooter = toPx(next.footer, DEFAULTS.footer);

    // 1) Update storage (read by paginator, Page)
    try {
      editor?.commands?.setActiveHeaderFooter?.({
        header: finalHeader,
        footer: finalFooter,
      });
    } catch {}

    // 2) Sync CSS variables (header/footer "heights" + any future margins)
    // NOTE: header/footer margins here are *inside* the header/footer block.
    // Page margins (left/right/top/bottom) should be handled by a PageSetup panel.
    try {
      editor?.commands?.setHeaderFooterCssVars?.({
        header: { height: DEFAULT_HEADER_HEIGHT_PX }, // tune or wire to a height slider later
        footer: { height: DEFAULT_FOOTER_HEIGHT_PX },
      });
    } catch {}

    // 3) Notify parent
    onChange?.({ header: finalHeader, footer: finalFooter });

    // 4) Apply to all pages + reflow pagination
    try {
      editor?.commands?.applyHeaderFooterToAllPages?.({
        header: finalHeader,
        footer: finalFooter,
      });
      editor?.commands?.reflowPages?.();
    } catch {}
  };

  // Safe deep-merge patcher that keeps inch/px in sync
  const patch = (updater) => {
    setCfg((prev) => {
      const draft = typeof updater === "function" ? updater(prev) : updater;
      const merged = normalize({
        header: { ...prev.header, ...(draft.header || {}) },
        footer: { ...prev.footer, ...(draft.footer || {}) },
      });
      applyToEditor(merged);
      return merged;
    });
  };

  // ---------------- Small UI Components ----------------
  const Checkbox = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-2 text-[14px] text-gray-900 cursor-pointer select-none">
      <input
        type="checkbox"
        className="appearance-none w-4 h-4 border border-gray-400 rounded-sm checked:bg-gray-900 checked:border-gray-900 transition-colors"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );

  const GearButton = ({ onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="text-gray-500 hover:text-gray-800 transition-colors"
      title="Configure"
    >
      ⚙️
    </button>
  );

  const AlignTile = ({ active, onClick, label, align }) => {
    const alignMap = {
      left: "items-start",
      center: "items-center",
      right: "items-end",
      justify: "items-stretch",
    };
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          "w-full h-[64px] rounded-lg border bg-white transition",
          active
            ? "border-gray-800 shadow-[0_0_0_2px_rgba(17,24,39,0.06)]"
            : "border-gray-300 hover:border-gray-400",
          "flex flex-col justify-center",
        ].join(" ")}
      >
        <div className={`px-3 flex flex-col ${alignMap[align]} gap-1.5`}>
          <div className="h-[8px] rounded bg-gray-200 w-4/5" />
          <div className="h-[6px] rounded bg-gray-200 w-3/5" />
          <div className="h-[6px] rounded bg-gray-200 w-2/3" />
        </div>
        <div className="text-[12px] text-gray-700 mt-1">{label}</div>
      </button>
    );
  };

  // ---------------- Header Component List ----------------
  const HeaderList = () => {
    const h = cfg.header;
    return (
      <div className="px-4 pt-4 pb-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Header Components</h3>
        {[
          { key: "sluLogo", label: "SLU Logo" },
          { key: "university", label: "Saint Louis University" },
          { key: "schoolName", label: "School Name" },
          { key: "title", label: "Title" },
          { key: "documentStamp", label: "Document Stamp" },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between border-b border-gray-100 pb-2">
            <Checkbox
              label={item.label}
              checked={!!h.fields[item.key]}
              onChange={(v) =>
                patch({
                  header: {
                    ...h,
                    fields: { ...h.fields, [item.key]: v },
                  },
                })
              }
            />
            <GearButton onClick={() => setSelectedConfig(item.key)} />
          </div>
        ))}

        {/* Header margins (inches) */}
        <div className="mt-4 border-t pt-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Header Margins (inches)</h4>
          <div className="grid grid-cols-2 gap-3">
            {["top", "bottom"].map((side) => (
              <div key={side}>
                <label className="block text-xs text-gray-500 capitalize">{side}</label>
                <select
                  value={h.marginsInch?.[side] ?? 0.5}
                  onChange={(e) => {
                    const valIn = parseFloat(e.target.value);
                    patch({
                      header: {
                        ...h,
                        marginsInch: { ...h.marginsInch, [side]: valIn },
                        margins: {
                          top: inchToPx(side === "top" ? valIn : h.marginsInch.top),
                          bottom: inchToPx(side === "bottom" ? valIn : h.marginsInch.bottom),
                        },
                      },
                    });
                  }}
                  className="w-full border rounded px-2 py-1 text-xs"
                >
                  {INCH_STEPS.map((iv) => (
                    <option key={iv} value={iv}>
                      {iv.toFixed(2)} in
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-gray-500 mt-1">
                  ≈ {inchToPx(h.marginsInch?.[side] ?? 0.5)} px
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ---------------- Footer Component List ----------------
  const FooterList = () => {
    const f = cfg.footer;
    const fields = f.fields;
    return (
      <div className="px-4 pt-4 pb-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Footer Components</h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <Checkbox
              label="Page Number"
              checked={!!fields.pageNumber}
              onChange={(v) =>
                patch({
                  footer: { ...f, fields: { ...fields, pageNumber: v } },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <Checkbox
              label="Date"
              checked={!!fields.date}
              onChange={(v) =>
                patch({
                  footer: { ...f, fields: { ...fields, date: v } },
                })
              }
            />
          </div>
        </div>

        {/* Alignment */}
        <div className="border-t pt-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Alignment</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["left", "center", "right", "justify"].map((a) => (
              <AlignTile
                key={a}
                label={a.charAt(0).toUpperCase() + a.slice(1)}
                align={a}
                active={(f.align || "center") === a}
                onClick={() => patch({ footer: { ...f, align: a } })}
              />
            ))}
          </div>
        </div>

        {/* Footer margins (inches) */}
        <div className="border-t pt-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Footer Margins (inches)</h4>
          <div className="grid grid-cols-2 gap-3">
            {["top", "bottom"].map((side) => (
              <div key={side}>
                <label className="block text-xs text-gray-500 capitalize">{side}</label>
                <select
                  value={f.marginsInch?.[side] ?? 0.5}
                  onChange={(e) => {
                    const valIn = parseFloat(e.target.value);
                    patch({
                      footer: {
                        ...f,
                        marginsInch: { ...f.marginsInch, [side]: valIn },
                        margins: {
                          top: inchToPx(side === "top" ? valIn : f.marginsInch.top),
                          bottom: inchToPx(side === "bottom" ? valIn : f.marginsInch.bottom),
                        },
                      },
                    });
                  }}
                  className="w-full border rounded px-2 py-1 text-xs"
                >
                  {INCH_STEPS.map((iv) => (
                    <option key={iv} value={iv}>
                      {iv.toFixed(2)} in
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-gray-500 mt-1">
                  ≈ {inchToPx(f.marginsInch?.[side] ?? 0.5)} px
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tiny live text preview */}
        <div className="border-t pt-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Preview</h4>
          <div
            className="w-full border rounded p-3 text-xs text-slate-700 bg-white"
            style={{ textAlign: f.align || "center" }}
          >
            {[
              fields.pageNumber ? "Page 1" : null,
              fields.date ? new Date().toLocaleDateString() : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </div>
        </div>
      </div>
    );
  };

  // ---------------- Inline Config Panels ----------------
  const BackButton = ({ label }) => (
    <div className="flex items-center px-4 py-3 border-b border-gray-200">
      <button onClick={() => setSelectedConfig(null)} className="text-sm text-gray-700 hover:text-gray-900">
        ← Back
      </button>
      <span className="ml-2 text-sm text-gray-500">Header Configuration → {label}</span>
    </div>
  );

  const FontConfigPanel = ({ name, configKey }) => {
    const conf = cfg.header.config[configKey];
    const update = (field, val) =>
      patch({
        header: {
          ...cfg.header,
          config: {
            ...cfg.header.config,
            [configKey]: { ...conf, [field]: val },
          },
        },
      });

    return (
      <div>
        <BackButton label={name} />
        <div className="p-4 space-y-3">
          {conf.text !== undefined && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Text</label>
              <input
                type="text"
                value={conf.text}
                onChange={(e) => update("text", e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Font Size (px)</label>
            <input
              type="number"
              value={conf.fontSize}
              onChange={(e) => update("fontSize", Number(e.target.value))}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Bold</label>
            <input
              type="checkbox"
              checked={conf.fontWeight === "bold"}
              onChange={(e) => update("fontWeight", e.target.checked ? "bold" : "normal")}
            />
            {conf.italic !== undefined && (
              <>
                <label className="text-sm text-gray-600 ml-4">Italic</label>
                <input
                  type="checkbox"
                  checked={conf.italic}
                  onChange={(e) => update("italic", e.target.checked)}
                />
              </>
            )}
          </div>
          {conf.uppercase !== undefined && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Uppercase</label>
              <input
                type="checkbox"
                checked={conf.uppercase}
                onChange={(e) => update("uppercase", e.target.checked)}
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Alignment</label>
            <div className="grid grid-cols-2 gap-3">
              {["left", "center", "right", "justify"].map((a) => (
                <AlignTile
                  key={a}
                  label={a.charAt(0).toUpperCase() + a.slice(1)}
                  align={a}
                  active={conf.align === a}
                  onClick={() => update("align", a)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DocumentStampPanel = () => {
    const stamp = cfg.header.config.documentStamp;
    const updateSecondCol = (i, val) => {
      const updated = [...stamp.secondColumnEditable];
      updated[i] = val;
      patch({
        header: {
          ...cfg.header,
          config: {
            ...cfg.header.config,
            documentStamp: { ...stamp, secondColumnEditable: updated },
          },
        },
      });
    };
    return (
      <div>
        <BackButton label="Document Stamp" />
        <div className="p-4 space-y-3">
          <div className="text-sm font-medium text-gray-700 mb-2">Second Column Values</div>
          {stamp.firstColumnFixed.map((label, i) => (
            <div key={i} className="flex items-center gap-2 mb-1">
              <div className="w-1/2 text-sm text-gray-600">{label}</div>
              <input
                type="text"
                value={stamp.secondColumnEditable[i]}
                onChange={(e) => updateSecondCol(i, e.target.value)}
                className="flex-1 border rounded px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ConfigView = () => {
    if (selectedConfig === "documentStamp") return <DocumentStampPanel />;
    if (["university", "schoolName", "title"].includes(selectedConfig))
      return <FontConfigPanel name={selectedConfig} configKey={selectedConfig} />;
    if (selectedConfig === "sluLogo") {
      return (
        <div>
          <BackButton label="SLU Logo" />
          <div className="p-4 text-sm text-gray-600">
            <p>The SLU Logo position is fixed on the left side.</p>
            <p>Resizable and replacement options can be added later.</p>
          </div>
        </div>
      );
    }
    return null;
  };

  // ---------------- Render ----------------
  return (
    <div className="h-full w-full bg-transparent overflow-x-hidden">
      <div className="px-4 pt-3">
        <div className="flex gap-6 text-[14px]">
          {["header", "footer"].map((key) => (
            <button
              key={key}
              onClick={() => {
                setSelectedConfig(null);
                setTab(key);
              }}
              className={`pb-2 ${
                tab === key
                  ? "text-gray-900 font-semibold border-b-2 border-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
        <div className="h-px bg-gray-200" />
      </div>

      {tab === "header"
        ? selectedConfig
          ? <ConfigView />
          : <HeaderList />
        : <FooterList />}
    </div>
  );
}
