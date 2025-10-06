// src/layout/create_template/headerfooterPanel.jsx
import React, { useMemo, useState } from "react";

/**
 * HeaderFooterPanel — Modular header/footer builder
 * Components:
 *   1. SLU Logo
 *   2. Saint Louis University
 *   3. School Name
 *   4. Title
 *   5. Document Stamp (4x2)
 * Includes:
 *   - Inline configuration via "← Back"
 *   - Global header/footer margin settings
 *   - Auto sync to TipTap editor
 */
export default function HeaderFooterPanel({ editor, value, onChange }) {
  const initial = useMemo(
    () => ({
      header: {
        fields: {
          sluLogo: value?.header?.fields?.sluLogo ?? true,
          university: value?.header?.fields?.university ?? true,
          schoolName: value?.header?.fields?.schoolName ?? true,
          title: value?.header?.fields?.title ?? true,
          documentStamp: value?.header?.fields?.documentStamp ?? true,
        },
        config: value?.header?.config ?? {
          university: { fontSize: 18, fontWeight: "bold", align: "center", color: "#000" },
          schoolName: { fontSize: 14, italic: true, align: "center", color: "#000" },
          title: {
            text: "Document Title",
            uppercase: false,
            fontSize: 16,
            fontWeight: "bold",
            align: "center",
            color: "#000",
          },
          documentStamp: {
            firstColumnFixed: ["Document Code", "Revision No.", "Effectivity", "Page"],
            secondColumnEditable: ["", "", "", ""],
            align: "right",
          },
        },
        margins: value?.header?.margins ?? { top: 12, bottom: 12 },
      },
      footer: value?.footer ?? {
        fields: { pageNumber: true, date: true },
        align: "center",
        margins: value?.footer?.margins ?? { top: 12, bottom: 12 },
      },
    }),
    [value]
  );

  const [cfg, setCfg] = useState(initial);
  const [tab, setTab] = useState("header");
  const [selectedConfig, setSelectedConfig] = useState(null);

  const applyToEditor = (next) => {
    onChange?.(next);
    try {
      if (editor?.commands?.applyHeaderFooterToAllPages) {
        editor.commands.applyHeaderFooterToAllPages(next);
      }
    } catch {}
  };

  const patch = (updater) => {
    setCfg((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      applyToEditor(next);
      return next;
    });
  };

  // ---------------- Small UI Components ----------------
  const Checkbox = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-2 text-[14px] text-gray-900 cursor-pointer select-none">
      <input
        type="checkbox"
        className="appearance-none w-4 h-4 border border-gray-400 rounded-sm checked:bg-gray-900 checked:border-gray-900 transition-colors"
        checked={checked}
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
  const HeaderList = () => (
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
            checked={cfg.header.fields[item.key]}
            onChange={(v) =>
              patch({
                ...cfg,
                header: {
                  ...cfg.header,
                  fields: { ...cfg.header.fields, [item.key]: v },
                },
              })
            }
          />
          <GearButton onClick={() => setSelectedConfig(item.key)} />
        </div>
      ))}

      {/* Global header/footer margins */}
      <div className="mt-4 border-t pt-3">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Header Margins (px)</h4>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {["top", "bottom"].map((side) => (
            <div key={side}>
              <label className="block text-xs text-gray-500 capitalize">{side}</label>
              <input
                type="number"
                value={cfg.header.margins?.[side] ?? 12}
                onChange={(e) =>
                  patch({
                    ...cfg,
                    header: {
                      ...cfg.header,
                      margins: { ...cfg.header.margins, [side]: Number(e.target.value) },
                    },
                  })
                }
                className="w-full border rounded px-2 py-1 text-xs"
              />
            </div>
          ))}
        </div>

        <h4 className="text-xs font-semibold text-gray-700 mb-2">Footer Margins (px)</h4>
        <div className="grid grid-cols-2 gap-3">
          {["top", "bottom"].map((side) => (
            <div key={side}>
              <label className="block text-xs text-gray-500 capitalize">{side}</label>
              <input
                type="number"
                value={cfg.footer.margins?.[side] ?? 12}
                onChange={(e) =>
                  patch({
                    ...cfg,
                    footer: {
                      ...cfg.footer,
                      margins: { ...cfg.footer.margins, [side]: Number(e.target.value) },
                    },
                  })
                }
                className="w-full border rounded px-2 py-1 text-xs"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

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
        ...cfg,
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
        ...cfg,
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
              onClick={() => setTab(key)}
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
        : <div className="p-4 text-sm text-gray-600">
            <p>Footer configuration options (page number, date, etc.) will appear here soon.</p>
          </div>}
    </div>
  );
}
