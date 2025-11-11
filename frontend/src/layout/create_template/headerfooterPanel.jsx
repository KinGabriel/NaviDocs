// src/layout/create_template/headerfooterPanel.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";

/**
 * Header & Footer Panel (Tabbed)
 * - Two tabs: Header / Footer
 * - Enable toggles for each band
 * - Header: Logos + center text + document stamp
 * - Footer: Page number + freeform text, both with alignment & font styling
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

  // Header
  header: {
    logos: {
      slu: { enabled: true, sizePx: 72, xPercent: 6 },
      cicm: { enabled: false, sizePx: 72, xPercent: 94 },
    },
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

  // Document stamp
  documentStamp: { docCode: "", revisionNo: "", effectivity: "" },

  // Footer
  footer: {
    pageNumber: {
      enabled: true,
      pattern: "{page} of {total}",
      align: "center", // left | center | right
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: 12,
      bold: false,
      italic: false,
      color: "#000000",
    },
    body: {
      enabled: false,
      text: "",
      align: "left", // left | center | right
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: 12,
      bold: false,
      italic: false,
      color: "#000000",
    },
  },
};

// normalize to strict yyyy-mm-dd (local)
const normalizeEffectivityLocal = (val) => {
  if (val === undefined || val === null || val === "") return "";
  if (typeof val === "object" && val.$date) val = val.$date;
  const d = new Date(val);
  if (isNaN(d)) {
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
    footer: {
      ...DEFAULTS.footer,
      ...(v.footer || {}),
      pageNumber: { ...DEFAULTS.footer.pageNumber, ...(v.footer?.pageNumber || {}) },
      body: { ...DEFAULTS.footer.body, ...(v.footer?.body || {}) },
    },
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

  // Margins & toggles
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

  // Assets
  const [assets, setAssets] = useState(initial.assets);

  // Toggles & margins (margins kept in state but NOT rendered in UI)
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

  // Center text + style
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

  // Footer: page number
  const [footerPNEnabled, setFooterPNEnabled] = useState(initial.footer.pageNumber.enabled);
  const [footerPNPattern, setFooterPNPattern] = useState(initial.footer.pageNumber.pattern);
  const [footerPNAlign, setFooterPNAlign] = useState(initial.footer.pageNumber.align);
  const [footerPNFontFamily, setFooterPNFontFamily] = useState(initial.footer.pageNumber.fontFamily);
  const [footerPNFontSize, setFooterPNFontSize] = useState(initial.footer.pageNumber.fontSize);
  const [footerPNBold, setFooterPNBold] = useState(initial.footer.pageNumber.bold);
  const [footerPNItalic, setFooterPNItalic] = useState(initial.footer.pageNumber.italic);
  const [footerPNColor, setFooterPNColor] = useState(initial.footer.pageNumber.color);

  // Footer: body text
  const [footerBodyEnabled, setFooterBodyEnabled] = useState(initial.footer.body.enabled);
  const [footerBodyText, setFooterBodyText] = useState(initial.footer.body.text);
  const [footerBodyAlign, setFooterBodyAlign] = useState(initial.footer.body.align);
  const [footerBodyFontFamily, setFooterBodyFontFamily] = useState(initial.footer.body.fontFamily);
  const [footerBodyFontSize, setFooterBodyFontSize] = useState(initial.footer.body.fontSize);
  const [footerBodyBold, setFooterBodyBold] = useState(initial.footer.body.bold);
  const [footerBodyItalic, setFooterBodyItalic] = useState(initial.footer.body.italic);
  const [footerBodyColor, setFooterBodyColor] = useState(initial.footer.body.color);

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

    // Footer
    setFooterPNEnabled(next.footer.pageNumber.enabled);
    setFooterPNPattern(next.footer.pageNumber.pattern);
    setFooterPNAlign(next.footer.pageNumber.align);
    setFooterPNFontFamily(next.footer.pageNumber.fontFamily);
    setFooterPNFontSize(next.footer.pageNumber.fontSize);
    setFooterPNBold(next.footer.pageNumber.bold);
    setFooterPNItalic(next.footer.pageNumber.italic);
    setFooterPNColor(next.footer.pageNumber.color);

    setFooterBodyEnabled(next.footer.body.enabled);
    setFooterBodyText(next.footer.body.text);
    setFooterBodyAlign(next.footer.body.align);
    setFooterBodyFontFamily(next.footer.body.fontFamily);
    setFooterBodyFontSize(next.footer.body.fontSize);
    setFooterBodyBold(next.footer.body.bold);
    setFooterBodyItalic(next.footer.body.italic);
    setFooterBodyColor(next.footer.body.color);

    const t = setTimeout(() => {
      isSyncingRef.current = false;
    }, 0);
    return () => clearTimeout(t);
  }, [value]);

  // Debounced emit up to parent
  const emitRef = useRef();
  const coerceNum = (n, fb) => (n === "" || Number.isNaN(Number(n)) ? fb : Number(n));

  useEffect(() => {
    if (isSyncingRef.current) return;

    const payload = {
      headerEnabled: !!headerEnabled,
      footerEnabled: !!footerEnabled,
      headerMarginIn: coerceNum(headerMarginIn, DEFAULTS.headerMarginIn),
      footerMarginIn: coerceNum(footerMarginIn, DEFAULTS.footerMarginIn),

      assets,

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

      footer: {
        pageNumber: {
          enabled: !!footerPNEnabled,
          pattern: footerPNPattern,
          align: footerPNAlign,
          fontFamily: footerPNFontFamily,
          fontSize: coerceNum(footerPNFontSize, DEFAULTS.footer.pageNumber.fontSize),
          bold: !!footerPNBold,
          italic: !!footerPNItalic,
          color: footerPNColor,
        },
        body: {
          enabled: !!footerBodyEnabled,
          text: footerBodyText,
          align: footerBodyAlign,
          fontFamily: footerBodyFontFamily,
          fontSize: coerceNum(footerBodyFontSize, DEFAULTS.footer.body.fontSize),
          bold: !!footerBodyBold,
          italic: !!footerBodyItalic,
          color: footerBodyColor,
        },
      },

      documentStamp: {
        docCode,
        revisionNo,
        effectivity: normalizeEffectivityLocal(effectivity),
      },

      // Legacy mirrors
      showSLULogo: !!sluEnabled,
      showCICMLogo: !!cicmEnabled,
      showHeaderLine: !!showHeaderLine,
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
    // header
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
    // stamp
    docCode,
    revisionNo,
    effectivity,
    // footer
    footerPNEnabled,
    footerPNPattern,
    footerPNAlign,
    footerPNFontFamily,
    footerPNFontSize,
    footerPNBold,
    footerPNItalic,
    footerPNColor,
    footerBodyEnabled,
    footerBodyText,
    footerBodyAlign,
    footerBodyFontFamily,
    footerBodyFontSize,
    footerBodyBold,
    footerBodyItalic,
    footerBodyColor,
    onChange,
  ]);

  return (
    <div className="p-5 bg-white rounded-2xl shadow-md w-full overflow-auto rm-panel">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Header &amp; Footer</h2>
      <p className="text-sm text-gray-500 mb-4">
        Configure header/footer visibility, logos, and text styling.
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
        <Toggle label="Enable Header" checked={!!headerEnabled} onChange={setHeaderEnabled} />
        <Toggle label="Enable Footer" checked={!!footerEnabled} onChange={setFooterEnabled} />
      </div>

      {/* Margins UI removed intentionally */}

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
        <FooterTab
          disabled={!footerEnabled}
          pageNumber={{
            enabled: footerPNEnabled,
            pattern: footerPNPattern,
            align: footerPNAlign,
            fontFamily: footerPNFontFamily,
            fontSize: footerPNFontSize,
            bold: footerPNBold,
            italic: footerPNItalic,
            color: footerPNColor,
          }}
          setPageNumber={{
            setEnabled: setFooterPNEnabled,
            setPattern: setFooterPNPattern,
            setAlign: setFooterPNAlign,
            setFontFamily: setFooterPNFontFamily,
            setFontSize: setFooterPNFontSize,
            setBold: setFooterPNBold,
            setItalic: setFooterPNItalic,
            setColor: setFooterPNColor,
          }}
          body={{
            enabled: footerBodyEnabled,
            text: footerBodyText,
            align: footerBodyAlign,
            fontFamily: footerBodyFontFamily,
            fontSize: footerBodyFontSize,
            bold: footerBodyBold,
            italic: footerBodyItalic,
            color: footerBodyColor,
          }}
          setBody={{
            setEnabled: setFooterBodyEnabled,
            setText: setFooterBodyText,
            setAlign: setFooterBodyAlign,
            setFontFamily: setFooterBodyFontFamily,
            setFontSize: setFooterBodyFontSize,
            setBold: setFooterBodyBold,
            setItalic: setFooterBodyItalic,
            setColor: setFooterBodyColor,
          }}
        />
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

        <div className="flex flex-col gap-6">
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
              <div className="flex-1 min-w-0">
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
            <CheckboxField label="Bold" checked={!!center.bold} onChange={setCenter.setBold} />
            <CheckboxField label="Italic" checked={!!center.italic} onChange={setCenter.setItalic} />
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

function FooterTab({ disabled, pageNumber, setPageNumber, body, setBody }) {
  return (
    <div className={`space-y-6 ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      {/* ---------------- PAGE NUMBER ---------------- */}
      <div className="rounded-xl border p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">Page Number</div>
          <Toggle
            label="Enabled"
            checked={!!pageNumber.enabled}
            onChange={setPageNumber.setEnabled}
            compact
            disabled={disabled}
          />
        </div>

        <div
          className={`flex flex-col gap-3 ${
            !pageNumber.enabled ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          <TextField
            label="Pattern"
            value={pageNumber.pattern}
            onChange={setPageNumber.setPattern}
            placeholder="Use {page} and {total}, e.g., {page} of {total}"
          />

          <SelectField
            label="Alignment"
            value={pageNumber.align}
            onChange={setPageNumber.setAlign}
            options={[
              { label: "Left", value: "left" },
              { label: "Center", value: "center" },
              { label: "Right", value: "right" },
            ]}
          />

          <SelectField
            label="Font Family"
            value={pageNumber.fontFamily}
            onChange={setPageNumber.setFontFamily}
            options={[
              { label: "Inter (default)", value: "Inter, system-ui, sans-serif" },
              { label: "Times New Roman", value: "\"Times New Roman\", Times, serif" },
              { label: "Georgia", value: "Georgia, serif" },
              { label: "Arial", value: "Arial, Helvetica, sans-serif" },
              { label: "Courier New", value: "\"Courier New\", Courier, monospace" },
            ]}
          />

          <NumberField
            label="Font Size (px)"
            value={pageNumber.fontSize}
            min={8}
            max={48}
            step={1}
            onChange={setPageNumber.setFontSize}
          />

          <CheckboxField
            label="Bold"
            checked={!!pageNumber.bold}
            onChange={setPageNumber.setBold}
          />

          <CheckboxField
            label="Italic"
            checked={!!pageNumber.italic}
            onChange={setPageNumber.setItalic}
          />

          <ColorField
            label="Text Color"
            value={pageNumber.color}
            onChange={setPageNumber.setColor}
          />

          <Hint>
            The renderer replaces tokens: {"{page}"} → current page, {"{total}"} → total pages.
          </Hint>
        </div>
      </div>

      {/* ---------------- FOOTER TEXT ---------------- */}
      <div className="rounded-xl border p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">Footer Text</div>
          <Toggle
            label="Enabled"
            checked={!!body.enabled}
            onChange={setBody.setEnabled}
            compact
            disabled={disabled}
          />
        </div>

        <div
          className={`flex flex-col gap-3 ${
            !body.enabled ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          <Label>Text</Label>
          <textarea
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            rows={3}
            value={body.text ?? ""}
            onChange={(e) => setBody.setText(e.target.value)}
            placeholder="Any footer text (address, phone, confidentiality note, etc.)"
          />

          <SelectField
            label="Alignment"
            value={body.align}
            onChange={setBody.setAlign}
            options={[
              { label: "Left", value: "left" },
              { label: "Center", value: "center" },
              { label: "Right", value: "right" },
            ]}
          />

          <SelectField
            label="Font Family"
            value={body.fontFamily}
            onChange={setBody.setFontFamily}
            options={[
              { label: "Inter (default)", value: "Inter, system-ui, sans-serif" },
              { label: "Times New Roman", value: "\"Times New Roman\", Times, serif" },
              { label: "Georgia", value: "Georgia, serif" },
              { label: "Arial", value: "Arial, Helvetica, sans-serif" },
              { label: "Courier New", value: "\"Courier New\", Courier, monospace" },
            ]}
          />

          <NumberField
            label="Font Size (px)"
            value={body.fontSize}
            min={8}
            max={48}
            step={1}
            onChange={setBody.setFontSize}
          />

          <CheckboxField label="Bold" checked={!!body.bold} onChange={setBody.setBold} />
          <CheckboxField label="Italic" checked={!!body.italic} onChange={setBody.setItalic} />

          <ColorField label="Text Color" value={body.color} onChange={setBody.setColor} />

          <Hint>
            The footer text appears stacked under the page number when both are enabled.
          </Hint>
        </div>
      </div>
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
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

/* —————— Small form controls —————— */
function Label({ children }) {
  return <div className="text-xs font-medium text-slate-600 mb-1">{children}</div>;
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <div className="min-w-0">
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
    <div className="min-w-0">
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
    <div className="min-w-0">
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
  const val =
    typeof value === "string" && /^#([0-9a-fA-F]{6})$/.test(value) ? value : value || "#000000";
  return (
    <div className="min-w-0">
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
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100 w-full"
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
    <div className="min-w-0">
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
