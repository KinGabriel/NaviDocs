// src/layout/create_template/headerFooterPanel.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * HeaderFooterPanel — drives the editor directly.
 * - No extra background/borders; the parent container styles the card.
 * - Emits changes to the editor via a single command:
 *     editor.commands.applyHeaderFooterToAllPages(config)
 *   (Guarded: if the command doesn't exist yet, it won't throw.)
 *
 * Props:
 *  - editor?: Tiptap editor instance (recommended)
 *  - initialConfig?: same shape as below (optional)
 *  - onConfigChange?: (cfg) => void  // optional hook for persistence
 *
 * Config shape:
 * {
 *   header: {
 *     fields: { fullName, studentId, university, school },
 *     align: "left" | "center" | "right" | "justify"
 *   },
 *   footer: {
 *     fields: { pageNumber, date },
 *     align: "left" | "center" | "right" | "justify"
 *   }
 * }
 */
export default function HeaderFooterPanel({
  editor,
  initialConfig,
  onConfigChange,
}) {
  // ---- state ---------------------------------------------------------------
  const initial = useMemo(
    () => ({
      header: {
        fields: {
          fullName: initialConfig?.header?.fields?.fullName ?? true,
          studentId: initialConfig?.header?.fields?.studentId ?? false,
          university: initialConfig?.header?.fields?.university ?? false,
          school: initialConfig?.header?.fields?.school ?? false,
        },
        align: initialConfig?.header?.align ?? "left",
      },
      footer: {
        fields: {
          pageNumber: initialConfig?.footer?.fields?.pageNumber ?? false,
          date: initialConfig?.footer?.fields?.date ?? false,
        },
        align: initialConfig?.footer?.align ?? "center",
      },
    }),
    [initialConfig]
  );

  const [tab, setTab] = useState("header");
  const [cfg, setCfg] = useState(initial);

  // Apply to editor once on mount (so preview matches saved templates)
  useEffect(() => {
    applyToEditor(cfg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- helpers -------------------------------------------------------------
  const applyToEditor = (next) => {
    onConfigChange?.(next);
    // Call the editor command if it exists (no crash if not wired yet)
    try {
      if (editor?.commands?.applyHeaderFooterToAllPages) {
        editor.commands.applyHeaderFooterToAllPages(next);
      } else {
        // Optional: emit a custom event for your app bus if you use one
        editor?.emit?.("nd:headerFooterChanged", next);
      }
    } catch {
      /* swallow — panel should never throw if the command isn't ready */
    }
  };

  const patch = (updater) => {
    setCfg((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      applyToEditor(next);
      return next;
    });
  };

  // ---- small UI atoms ------------------------------------------------------
  const TitleRow = () => (
    <div className="px-4 pt-3">
      <div className="flex gap-6 text-[14px]">
        <button
          onClick={() => setTab("header")}
          className={`pb-2 ${
            tab === "header"
              ? "text-gray-900 font-semibold border-b-2 border-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Header
        </button>
        <button
          onClick={() => setTab("footer")}
          className={`pb-2 ${
            tab === "footer"
              ? "text-gray-900 font-semibold border-b-2 border-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Footer
        </button>
      </div>
      <div className="h-px bg-gray-200" />
    </div>
  );

  const Checkbox = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-2 text-[14px] text-gray-900 cursor-pointer select-none">
      <input
        type="checkbox"
        className="appearance-none w-4 h-4 border border-gray-400 rounded-sm
                   checked:bg-gray-900 checked:border-gray-900 transition-colors"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
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

  // ---- tabs ---------------------------------------------------------------
  const HeaderTab = () => (
    <div className="px-4 pt-4 pb-6">
      <div className="grid grid-cols-2 gap-x-10 gap-y-4 mb-6">
        <Checkbox
          label="Full Name"
          checked={cfg.header.fields.fullName}
          onChange={(v) =>
            patch({
              ...cfg,
              header: {
                ...cfg.header,
                fields: { ...cfg.header.fields, fullName: v },
              },
            })
          }
        />
        <Checkbox
          label="School"
          checked={cfg.header.fields.school}
          onChange={(v) =>
            patch({
              ...cfg,
              header: {
                ...cfg.header,
                fields: { ...cfg.header.fields, school: v },
              },
            })
          }
        />
        <Checkbox
          label="Student ID"
          checked={cfg.header.fields.studentId}
          onChange={(v) =>
            patch({
              ...cfg,
              header: {
                ...cfg.header,
                fields: { ...cfg.header.fields, studentId: v },
              },
            })
          }
        />
        <Checkbox
          label="University"
          checked={cfg.header.fields.university}
          onChange={(v) =>
            patch({
              ...cfg,
              header: {
                ...cfg.header,
                fields: { ...cfg.header.fields, university: v },
              },
            })
          }
        />
      </div>

      <div className="text-[12px] font-semibold text-gray-600 mb-2">
        Alignment
      </div>
      <div className="grid grid-cols-2 gap-4">
        <AlignTile
          label="Left aligned"
          align="left"
          active={cfg.header.align === "left"}
          onClick={() => patch({ ...cfg, header: { ...cfg.header, align: "left" } })}
        />
        <AlignTile
          label="Right aligned"
          align="right"
          active={cfg.header.align === "right"}
          onClick={() =>
            patch({ ...cfg, header: { ...cfg.header, align: "right" } })
          }
        />
        <AlignTile
          label="Center"
          align="center"
          active={cfg.header.align === "center"}
          onClick={() =>
            patch({ ...cfg, header: { ...cfg.header, align: "center" } })
          }
        />
        <AlignTile
          label="Justified"
          align="justify"
          active={cfg.header.align === "justify"}
          onClick={() =>
            patch({ ...cfg, header: { ...cfg.header, align: "justify" } })
          }
        />
      </div>
    </div>
  );

  const FooterTab = () => (
    <div className="px-4 pt-4 pb-6">
      <div className="grid grid-cols-2 gap-x-10 gap-y-4 mb-6">
        <Checkbox
          label="Page number"
          checked={cfg.footer.fields.pageNumber}
          onChange={(v) =>
            patch({
              ...cfg,
              footer: {
                ...cfg.footer,
                fields: { ...cfg.footer.fields, pageNumber: v },
              },
            })
          }
        />
        <Checkbox
          label="Date"
          checked={cfg.footer.fields.date}
          onChange={(v) =>
            patch({
              ...cfg,
              footer: { ...cfg.footer, fields: { ...cfg.footer.fields, date: v } },
            })
          }
        />
      </div>

      <div className="text-[12px] font-semibold text-gray-600 mb-2">
        Alignment
      </div>
      <div className="grid grid-cols-2 gap-4">
        <AlignTile
          label="Left aligned"
          align="left"
          active={cfg.footer.align === "left"}
          onClick={() =>
            patch({ ...cfg, footer: { ...cfg.footer, align: "left" } })
          }
        />
        <AlignTile
          label="Right aligned"
          align="right"
          active={cfg.footer.align === "right"}
          onClick={() =>
            patch({ ...cfg, footer: { ...cfg.footer, align: "right" } })
          }
        />
        <AlignTile
          label="Center"
          align="center"
          active={cfg.footer.align === "center"}
          onClick={() =>
            patch({ ...cfg, footer: { ...cfg.footer, align: "center" } })
          }
        />
        <AlignTile
          label="Justified"
          align="justify"
          active={cfg.footer.align === "justify"}
          onClick={() =>
            patch({ ...cfg, footer: { ...cfg.footer, align: "justify" } })
          }
        />
      </div>
    </div>
  );

  // ---- render --------------------------------------------------------------
  return (
    <div className="h-full w-full bg-transparent overflow-x-hidden">
      <TitleRow />
      {tab === "header" ? <HeaderTab /> : <FooterTab />}
    </div>
  );
}
