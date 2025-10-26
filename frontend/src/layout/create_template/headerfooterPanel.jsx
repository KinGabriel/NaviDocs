// src/layout/create_template/headerfooterPanel.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";

/**
 * Header & Footer Panel (Tabbed)
 * - Two tabs: Header / Footer
 * - Enable toggles for each band
 * - Margin controls (inches) shown when enabled
 * - SLU/CICM logo toggles + size (px) + horizontal position (% from left)
 * - Center header text (multi-line) with font, size, weight, color
 * - Footer tab currently scaffolded (no content controls yet)
 *
 * Backward compatibility:
 *  - Preserves/reads legacy fields: showSLULogo, showCICMLogo, document_code, revision_no, effectivity
 *  - Emits both new structured fields and legacy mirrors
 */

const SLU_LOGO_SRC = "/assets/images/slu-logo.png";
const CICM_LOGO_SRC = "/assets/images/cicm-logo.png";

const DEFAULTS = {
  // Global toggles
  headerEnabled: true,
  footerEnabled: false,

  // Margins (inches)
  headerMarginIn: 0.5,
  footerMarginIn: 0.5,

  // Assets
  assets: { slu: SLU_LOGO_SRC, cicm: CICM_LOGO_SRC },

  // Header logos
  header: {
    logos: {
      slu: { enabled: true, sizePx: 72, xPercent: 6 },
      cicm: { enabled: false, sizePx: 72, xPercent: 94 },
    },
    // Center text block (multi-line) + styling
    centerText: {
      enabled: true,
      line1: "Saint Louis University",
      line2: "",
      line3: "",
      line4: "",
      showLine4: false,
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: 14,
      bold: false,
      italic: false,
      color: "#000000",
      showHeaderLine: false,
    },
  },

  // Document stamp (right-side table in header)
  documentStamp: { docCode: "", revisionNo: "", effectivity: "" },

  // Footer (future)
  footer: {},
};

// normalize to strict yyyy-mm-dd (local), accept Date | ISO | yyyy-mm-dd | {$date}
const normalizeEffectivityLocal = (val) => {
  if (val === undefined || val === null || val === "") return "";
  if (typeof val === "object" && val.$date) val = val.$date;
  const d = new Date(val);
  if (isNaN(d)) {
    // If it's already a date-only string, pass through
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    return String(val);
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

function mergeDefaults(value) {
  const v = value ?? {};
  const out = {
    ...DEFAULTS,
    ...v,
    assets: { ...DEFAULTS.assets, ...(v.assets || {}) },
    header: { ...DEFAULTS.header, ...(v.header || {}) },
    footer: { ...DEFAULTS.footer, ...(v.footer || {}) },
    documentStamp: { ...DEFAULTS.documentStamp, ...(v.documentStamp || {}) },
  };

  // Legacy -> New mapping (read)
  const legacyShowSLU = v.showSLULogo ?? v.header?.logos?.slu?.enabled;
  const legacyShowCICM = v.showCICMLogo ?? v.header?.logos?.cicm?.enabled;

  out.header.logos = {
    slu: {
      ...DEFAULTS.header.logos.slu,
      ...(v.header?.logos?.slu || {}),
      enabled: !!legacyShowSLU,
    },
    cicm: {
      ...DEFAULTS.header.logos.cicm,
      ...(v.header?.logos?.cicm || {}),
      enabled: !!legacyShowCICM,
    },
  };

  // Center text + style (legacy multi-lines)
  out.header.centerText = {
    ...DEFAULTS.header.centerText,
    ...(v.header?.centerText || {}),
    line1: v.line1 ?? v.header?.centerText?.line1 ?? DEFAULTS.header.centerText.line1,
    line2: v.line2 ?? v.header?.centerText?.line2 ?? "",
    line3: v.line3 ?? v.header?.centerText?.line3 ?? "",
    line4: v.line4 ?? v.header?.centerText?.line4 ?? "",
    showLine4: v.showLine4 ?? v.header?.centerText?.showLine4 ?? false,
    showHeaderLine: v.showHeaderLine ?? v.header?.centerText?.showHeaderLine ?? false,
  };

  // Document stamp (legacy mirrors)
  out.documentStamp.docCode = v.docCode ?? v.document_code ?? out.documentStamp.docCode ?? "";
  out.documentStamp.revisionNo = v.revisionNo ?? v.revision_no ?? out.documentStamp.revisionNo ?? "";
  out.documentStamp.effectivity = normalizeEffectivityLocal(
    v.effectivity ?? out.documentStamp.effectivity ?? ""
  );

  // Margins & toggles (if present at top-level)
  if (typeof v.headerMarginIn === "number") out.headerMarginIn = v.headerMarginIn;
  if (typeof v.footerMarginIn === "number") out.footerMarginIn = v.footerMarginIn;
  if (typeof v.headerEnabled === "boolean") out.headerEnabled = v.headerEnabled;
  if (typeof v.footerEnabled === "boolean") out.footerEnabled = v.footerEnabled;

  return out;
}

export default function HeaderFooterPanel({ value, onChange }) {
  const initial = useMemo(() => mergeDefaults(value), [value]);

  // Tabs
  const [tab, setTab] = useState("header");

  // Assets (preserve caller overrides; no UI yet, but keep in state so we don't clobber)
  const [assets, setAssets] = useState(initial.assets);

  // Toggles & margins
  const [headerEnabled, setHeaderEnabled] = useState(initial.headerEnabled);
  const [footerEnabled, setFooterEnabled] = useState(initial.footerEnabled);
  const [headerMarginIn, setHeaderMarginIn] = useState(initial.headerMarginIn);
  const [footerMarginIn, setFooterMarginIn] = useState(initial.footerMarginIn);

  // Logos
  const [sluEnabled, setSluEnabled] = useState(initial.header.logos.slu.enabled);
  const [sluSizePx, setSluSizePx] = useState(initial.header.logos.slu.sizePx);
  const [sluXPercent, setSluXPercent] = useState(initial.header.logos.slu.xPercent);

  const [cicmEnabled, setCicmEnabled] = useState(initial.header.logos.cicm.enabled);
  const [cicmSizePx, setCicmSizePx] = useState(initial.header.logos.cicm.sizePx);
  const [cicmXPercent, setCicmXPercent] = useState(initial.header.logos.cicm.xPercent);

  // Center text (multi-line) + style
  const [line1, setLine1] = useState(initial.header.centerText.line1);
  const [line2, setLine2] = useState(initial.header.centerText.line2);
  const [line3, setLine3] = useState(initial.header.centerText.line3);
  const [line4, setLine4] = useState(initial.header.centerText.line4);
  const [showLine4, setShowLine4] = useState(initial.header.centerText.showLine4);

  const [centerEnabled, setCenterEnabled] = useState(initial.header.centerText.enabled);
  const [fontFamily, setFontFamily] = useState(initial.header.centerText.fontFamily);
  const [fontSize, setFontSize] = useState(initial.header.centerText.fontSize);
  const [bold, setBold] = useState(initial.header.centerText.bold);
  const [italic, setItalic] = useState(initial.header.centerText.italic);
  const [color, setColor] = useState(initial.header.centerText.color);
  const [showHeaderLine, setShowHeaderLine] = useState(initial.header.centerText.showHeaderLine);

  // Document stamp
  const [docCode, setDocCode] = useState(initial.documentStamp.docCode);
  const [revisionNo, setRevisionNo] = useState(initial.documentStamp.revisionNo);
  const [effectivity, setEffectivity] = useState(
    normalizeEffectivityLocal(initial.documentStamp.effectivity)
  );

  // Sync in from parent
  const isSyncingRef = useRef(false);
  useEffect(() => {
    isSyncingRef.current = true;
    const next = mergeDefaults(value);

    setAssets(next.assets);

    setHeaderEnabled(next.headerEnabled);
    setFooterEnabled(next.footerEnabled);
    setHeaderMarginIn(next.headerMarginIn);
    setFooterMarginIn(next.footerMarginIn);

    setSluEnabled(next.header.logos.slu.enabled);
    setSluSizePx(next.header.logos.slu.sizePx);
    setSluXPercent(next.header.logos.slu.xPercent);

    setCicmEnabled(next.header.logos.cicm.enabled);
    setCicmSizePx(next.header.logos.cicm.sizePx);
    setCicmXPercent(next.header.logos.cicm.xPercent);

    setLine1(next.header.centerText.line1);
    setLine2(next.header.centerText.line2);
    setLine3(next.header.centerText.line3);
    setLine4(next.header.centerText.line4);
    setShowLine4(next.header.centerText.showLine4);

    setCenterEnabled(next.header.centerText.enabled);
    setFontFamily(next.header.centerText.fontFamily);
    setFontSize(next.header.centerText.fontSize);
    setBold(next.header.centerText.bold);
    setItalic(next.header.centerText.italic);
    setColor(next.header.centerText.color);
    setShowHeaderLine(next.header.centerText.showHeaderLine);

    setDocCode(next.documentStamp.docCode);
    setRevisionNo(next.documentStamp.revisionNo);
    setEffectivity(normalizeEffectivityLocal(next.documentStamp.effectivity));

    const t = setTimeout(() => {
      isSyncingRef.current = false;
    }, 0);
    return () => clearTimeout(t);
  }, [value]);

  // Debounced emit up to parent
  const emitRef = useRef();
  const coerceNum = (n, fallback) =>
    n === "" || Number.isNaN(Number(n)) ? fallback : Number(n);

  useEffect(() => {
    if (isSyncingRef.current) return;

    const payload = {
      headerEnabled: !!headerEnabled,
      footerEnabled: !!footerEnabled,
      headerMarginIn: coerceNum(headerMarginIn, DEFAULTS.headerMarginIn),
      footerMarginIn: coerceNum(footerMarginIn, DEFAULTS.footerMarginIn),

      assets, // preserve caller-provided URLs

      header: {
        logos: {
          slu: {
            enabled: !!sluEnabled,
            sizePx: coerceNum(sluSizePx, DEFAULTS.header.logos.slu.sizePx),
            xPercent: coerceNum(sluXPercent, DEFAULTS.header.logos.slu.xPercent),
          },
          cicm: {
            enabled: !!cicmEnabled,
            sizePx: coerceNum(cicmSizePx, DEFAULTS.header.logos.cicm.sizePx),
            xPercent: coerceNum(cicmXPercent, DEFAULTS.header.logos.cicm.xPercent),
          },
        },
        centerText: {
          enabled: !!centerEnabled,
          line1,
          line2,
          line3,
          line4,
          showLine4: !!showLine4,
          fontFamily,
          fontSize: coerceNum(fontSize, DEFAULTS.header.centerText.fontSize),
          bold: !!bold,
          italic: !!italic,
          color,
          showHeaderLine: !!showHeaderLine,
        },
      },

      footer: {},

      documentStamp: {
        docCode,
        revisionNo,
        effectivity: normalizeEffectivityLocal(effectivity),
      },

      // Legacy mirrors for existing consumers
      showSLULogo: !!sluEnabled,
      showCICMLogo: !!cicmEnabled,
      showHeaderLine: !!showHeaderLine, // mirror of centerText.showHeaderLine
      center: { line1, line2, line3, line4, showLine4: !!showLine4 },
      document_code: docCode,
      revision_no: revisionNo,
      effectivity: normalizeEffectivityLocal(effectivity),
    };

    clearTimeout(emitRef.current);
    emitRef.current = setTimeout(() => onChange?.(payload), 120);
    return () => clearTimeout(emitRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assets,
    headerEnabled,
    footerEnabled,
    headerMarginIn,
    footerMarginIn,
    sluEnabled,
    sluSizePx,
    sluXPercent,
    cicmEnabled,
    cicmSizePx,
    cicmXPercent,
    centerEnabled,
    line1,
    line2,
    line3,
    line4,
    showLine4,
    fontFamily,
    fontSize,
    bold,
    italic,
    color,
    showHeaderLine,
    docCode,
    revisionNo,
    effectivity,
    onChange,
  ]);

  return (
    <div className="p-5 bg-white rounded-2xl shadow-md w-full overflow-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Header &amp; Footer</h2>
      <p className="text-sm text-gray-500 mb-4">
        Configure header/footer visibility, margins, logos, and center text styling.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 mb-4">
        {[
          { id: "header", label: "Header" },
          { id: "footer", label: "Footer" },
        ].map((t) => (
          <button
            key={t.id}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${
              tab === t.id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-600 hover:text-slate-800"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Global toggles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
        <Toggle
          label="Enable Header"
          checked={!!headerEnabled}
          onChange={setHeaderEnabled}
        />
        <Toggle
          label="Enable Footer"
          checked={!!footerEnabled}
          onChange={setFooterEnabled}
        />
      </div>

      {/* Margins */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-6">
        <NumberField
          label="Header margin (inches from top)"
          value={headerMarginIn}
          min={0}
          step={0.1}
          disabled={!headerEnabled}
          onChange={setHeaderMarginIn}
        />
        <NumberField
          label="Footer margin (inches from bottom)"
          value={footerMarginIn}
          min={0}
          step={0.1}
          disabled={!footerEnabled}
          onChange={setFooterMarginIn}
        />
      </div>

      {tab === "header" ? (
        <HeaderTab
          disabled={!headerEnabled}
          assets={assets}
          logos={{
            slu: { enabled: sluEnabled, sizePx: sluSizePx, xPercent: sluXPercent },
            cicm: { enabled: cicmEnabled, sizePx: cicmSizePx, xPercent: cicmXPercent },
          }}
          setLogos={{
            setSluEnabled,
            setSluSizePx,
            setSluXPercent,
            setCicmEnabled,
            setCicmSizePx,
            setCicmXPercent,
          }}
          center={{
            enabled: centerEnabled,
            line1,
            line2,
            line3,
            line4,
            showLine4,
            fontFamily,
            fontSize,
            bold,
            italic,
            color,
            showHeaderLine,
          }}
          setCenter={{
            setCenterEnabled,
            setLine1,
            setLine2,
            setLine3,
            setLine4,
            setShowLine4,
            setFontFamily,
            setFontSize,
            setBold,
            setItalic,
            setColor,
            setShowHeaderLine,
          }}
          documentStamp={{
            docCode,
            revisionNo,
            effectivity,
          }}
          setDocumentStamp={{
            setDocCode,
            setRevisionNo,
            setEffectivity,
          }}
        />
      ) : (
        <FooterTab disabled={!footerEnabled} />
      )}
    </div>
  );
}

/* ------------------------ Tabs ------------------------ */

function HeaderTab({
  disabled,
  assets,
  logos,
  setLogos,
  center,
  setCenter,
  documentStamp,
  setDocumentStamp,
}) {
  return (
    <div className={`space-y-6 ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      {/* Logos */}
      <div className="rounded-xl border p-4">
        <div className="mb-3 text-sm font-semibold text-slate-700">Logos</div>
        <div className="grid gap-6 md:grid-cols-2">
          <LogoBlock
            title="SLU Logo"
            previewSrc={assets.slu || SLU_LOGO_SRC}
            value={logos.slu}
            onToggle={setLogos.setSluEnabled}
            onSize={setLogos.setSluSizePx}
            onPos={setLogos.setSluXPercent}
            disabled={disabled}
          />
          <LogoBlock
            title="CICM Logo"
            previewSrc={assets.cicm || CICM_LOGO_SRC}
            value={logos.cicm}
            onToggle={setLogos.setCicmEnabled}
            onSize={setLogos.setCicmSizePx}
            onPos={setLogos.setCicmXPercent}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Center Text */}
      <div className="rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-700">Center Text</div>
          <Toggle
            label="Enabled"
            checked={!!center.enabled}
            onChange={setCenter.setCenterEnabled}
            compact
            disabled={disabled}
          />
        </div>

        <div className={`${!center.enabled ? "opacity-60 pointer-events-none" : ""} space-y-2`}>
          <TextField
            label="Line 1"
            value={center.line1}
            onChange={setCenter.setLine1}
            placeholder="Line 1 (e.g., Saint Louis University)"
          />
          <TextField
            label="Line 2"
            value={center.line2}
            onChange={setCenter.setLine2}
            placeholder="Line 2 (e.g., Office / School / Department)"
          />
          <TextField
            label="Line 3"
            value={center.line3}
            onChange={setCenter.setLine3}
            placeholder="Line 3 (e.g., Cluster: Academic Cluster)"
          />

          <div className="flex items-center gap-3">
            <CheckboxField
              label="Show additional line"
              checked={!!center.showLine4}
              onChange={setCenter.setShowLine4}
            />
            {center.showLine4 && (
              <div className="flex-1">
                <input
                  type="text"
                  className="border rounded-md px-3 py-2 w-full text-sm"
                  placeholder="Line 4 (e.g., Document Title)"
                  value={center.line4}
                  onChange={(e) => setCenter.setLine4(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label="Font family"
              value={center.fontFamily}
              onChange={setCenter.setFontFamily}
              options={[
                { label: "Inter (default)", value: "Inter, system-ui, sans-serif" },
                { label: "Times New Roman", value: "\"Times New Roman\", Times, serif" },
                { label: "Georgia", value: "Georgia, serif" },
                { label: "Arial", value: "Arial, Helvetica, sans-serif" },
                { label: "Courier New", value: "\"Courier New\", Courier, monospace" },
              ]}
            />
            <NumberField
              label="Font size (px)"
              value={center.fontSize}
              min={8}
              max={64}
              step={1}
              onChange={setCenter.setFontSize}
            />
            <CheckboxField
              label="Bold"
              checked={!!center.bold}
              onChange={setCenter.setBold}
            />
            <CheckboxField
              label="Italic"
              checked={!!center.italic}
              onChange={setCenter.setItalic}
            />
          </div>

          <ColorField label="Text color" value={center.color} onChange={setCenter.setColor} />

          <div className="mt-2">
            <CheckboxField
              label="Show horizontal line under header"
              checked={!!center.showHeaderLine}
              onChange={setCenter.setShowHeaderLine}
            />
          </div>

          <Hint>Center text is rendered horizontally centered within the header band.</Hint>
        </div>
      </div>

      {/* Document Stamp */}
      <div className="rounded-xl border p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">
          Document Stamp (Right Side Table)
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Fixed labels; only values are editable. Page count is automatic.
        </p>

        <div className="space-y-2">
          <LabeledRow label="Document Code">
            <input
              type="text"
              className="border rounded-md px-2 py-1 text-sm w-full"
              value={documentStamp.docCode}
              onChange={(e) => setDocumentStamp.setDocCode(e.target.value)}
            />
          </LabeledRow>

          <LabeledRow label="Revision No.">
            <input
              type="text"
              className="border rounded-md px-2 py-1 text-sm w-full"
              value={documentStamp.revisionNo}
              onChange={(e) => setDocumentStamp.setRevisionNo(e.target.value)}
            />
          </LabeledRow>

          <LabeledRow label="Effectivity">
            <input
              type="date"
              className="border rounded-md px-2 py-1 text-sm w-full"
              value={normalizeEffectivityLocal(documentStamp.effectivity)}
              onChange={(e) =>
                setDocumentStamp.setEffectivity(normalizeEffectivityLocal(e.target.value))
              }
            />
          </LabeledRow>

          <LabeledRow label="Page">
            <input
              type="text"
              className="border rounded-md px-2 py-1 text-sm w-full bg-gray-50 text-gray-500"
              value="1 of N (auto)"
              disabled
            />
          </LabeledRow>
        </div>
      </div>
    </div>
  );
}

function FooterTab({ disabled }) {
  return (
    <div className={`rounded-xl border p-4 ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      <div className="mb-2 text-sm font-semibold text-slate-700">Footer</div>
      <p className="text-sm text-slate-600">
        No footer content controls yet. Use the <span className="font-medium">Enable Footer</span> toggle and
        set the <span className="font-medium">footer margin</span> above.
      </p>
    </div>
  );
}

/* --------------------- UI Blocks & Inputs --------------------- */

function LogoBlock({ title, previewSrc, value, onToggle, onSize, onPos, disabled }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-700">{title}</div>
        <Toggle label="Enabled" checked={!!value.enabled} onChange={onToggle} compact disabled={disabled} />
      </div>
      {value.enabled && (
        <div className="mb-3">
          <img src={previewSrc} alt={title} className="h-12 object-contain" />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          label="Size (px)"
          value={value.sizePx ?? 72}
          min={16}
          max={256}
          step={1}
          onChange={onSize}
          disabled={disabled || !value.enabled}
        />
        <SliderField
          label="Horizontal position (% from left)"
          value={value.xPercent ?? 10}
          min={0}
          max={100}
          step={1}
          onChange={onPos}
          disabled={disabled || !value.enabled}
        />
      </div>
      <Hint>Adjust size and nudge logos left/right independently.</Hint>
    </div>
  );
}

function LabeledRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-gray-700 w-1/3">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* —————— Small form controls —————— */
function Label({ children }) {
  return <div className="text-xs font-medium text-slate-600 mb-1">{children}</div>;
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <div>
      {label ? <Label>{label}</Label> : null}
      <input
        type="text"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, step = 1, disabled }) {
  const handle = (e) => {
    const v = e.target.value;
    onChange(v === "" ? "" : Number(v));
  };
  return (
    <div>
      {label ? <Label>{label}</Label> : null}
      <input
        type="number"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
        value={value === 0 ? 0 : value ?? ""}
        min={min}
        max={max}
        step={step}
        onChange={handle}
        disabled={disabled}
      />
    </div>
  );
}

function SliderField({ label, value, onChange, min = 0, max = 100, step = 1, disabled }) {
  const clamp = (n) => Math.max(min, Math.min(max, Number(n)));
  return (
    <div>
      <div className="flex items-center justify-between">
        {label ? <Label>{label}</Label> : null}
        <span className="text-xs tabular-nums text-slate-500">{value}%</span>
      </div>
      <input
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value ?? 0}
        onChange={(e) => onChange(clamp(e.target.value))}
        disabled={disabled}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number(value ?? 0)}
      />
    </div>
  );
}

function ColorField({ label, value, onChange, disabled }) {
  const val = typeof value === "string" && /^#([0-9a-fA-F]{6})$/.test(value) ? value : (value || "#000000");
  return (
    <div>
      {label ? <Label>{label}</Label> : null}
      <div className="flex items-center gap-3">
        <input
          type="color"
          className="h-9 w-12 cursor-pointer rounded border border-slate-300 disabled:bg-slate-100"
          value={val}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        <input
          type="text"
          value={val}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange, compact = false, disabled = false }) {
  return (
    <label
      className={`flex items-center gap-3 ${compact ? "text-xs" : "text-sm"} ${
        disabled ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      <input
        type="checkbox"
        className="h-4 w-4 accent-blue-600"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => !disabled && onChange(e.target.checked)}
      />
      <span className="text-slate-700">{label}</span>
    </label>
  );
}

function CheckboxField({ label, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center gap-2 text-sm ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      <input
        type="checkbox"
        className="h-4 w-4 accent-blue-600"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => !disabled && onChange(e.target.checked)}
      />
      <span className="text-slate-700">{label}</span>
    </label>
  );
}

function SelectField({ label, value, onChange, options, disabled }) {
  return (
    <div>
      {label ? <Label>{label}</Label> : null}
      <select
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Hint({ children }) {
  return <p className="mt-2 text-xs text-slate-500">{children}</p>;
}
