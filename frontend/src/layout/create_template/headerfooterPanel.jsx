// src/layout/create_template/headerfooterPanel.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { DEFAULT_FONT_CATEGORIES, SYSTEM_FALLBACKS } from "../../utils/textFonts";

/**
 * Header & Footer Panel (Tabbed)
 * - Two tabs: Header / Footer
 * - Enable toggles for each band
 * - Header: Logos + center text
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
      slu: { enabled: true, sizePx: 72 },
      cicm: { enabled: false, sizePx: 72 },
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
      headerLineOffsetPx: 4,
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

// build font options from DEFAULT_FONT_CATEGORIES + SYSTEM_FALLBACKS
const FONT_OPTIONS = (() => {
  const out = [];
  const cats = DEFAULT_FONT_CATEGORIES || {};
  Object.keys(cats).forEach((cat) => {
    const list = Array.isArray(cats[cat]) ? cats[cat] : [];
    list.forEach((name) => {
      const stack = SYSTEM_FALLBACKS[name] || name;
      out.push({ label: name, value: stack });
    });
  });
  if (!out.length) {
    out.push({ label: "Inter (default)", value: "Inter, system-ui, sans-serif" });
  }
  return out;
})();

const findFontLabel = (value) => {
  const match = FONT_OPTIONS.find((o) => o.value === value);
  return match ? match.label : value;
};

// px ⇄ pt helpers (96 dpi → 1pt ≈ 1.333px)
const pxToPt = (px) => {
  const n = Number(px);
  if (!Number.isFinite(n) || n <= 0) return 12;
  return Math.round(n * 0.75);
};

const ptToPx = (pt) => {
  const n = Number(pt);
  if (!Number.isFinite(n) || n <= 0) return DEFAULTS.header.centerText.fontSize;
  return Math.round(n * (4 / 3));
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
    headerLineOffsetPx:
      v.header?.centerText?.headerLineOffsetPx ?? DEFAULTS.header.centerText.headerLineOffsetPx,
  };

  // Document stamp (legacy mirrors)
  out.documentStamp.docCode = v.docCode ?? v.document_code ?? out.documentStamp.docCode ?? "";
  out.documentStamp.revisionNo =
    v.revisionNo ?? v.revision_no ?? out.documentStamp.revisionNo ?? "";
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

  // Logos (NO horizontal positioning anymore)
  const [sluEnabled, setSluEnabled] = useState(initial.header.logos.slu.enabled);
  const [sluSizePx, setSluSizePx] = useState(initial.header.logos.slu.sizePx);
  const [cicmEnabled, setCicmEnabled] = useState(initial.header.logos.cicm.enabled);
  const [cicmSizePx, setCicmSizePx] = useState(initial.header.logos.cicm.sizePx);

  // Center text lines
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

  // Per-line styles (font family, size in pt, bold, italic, color)
  const baseCt = initial.header.centerText;

  const [line1FontFamily, setLine1FontFamily] = useState(
    baseCt.line1Style?.fontFamily || baseCt.fontFamily
  );
  const [line1FontSizePt, setLine1FontSizePt] = useState(
    baseCt.line1Style?.fontSizePt ?? pxToPt(baseCt.fontSize)
  );
  const [line1Bold, setLine1Bold] = useState(baseCt.line1Style?.bold ?? baseCt.bold);
  const [line1Italic, setLine1Italic] = useState(baseCt.line1Style?.italic ?? baseCt.italic);
  const [line1Color, setLine1Color] = useState(baseCt.line1Style?.color || baseCt.color);

  const [line2FontFamily, setLine2FontFamily] = useState(
    baseCt.line2Style?.fontFamily || baseCt.fontFamily
  );
  const [line2FontSizePt, setLine2FontSizePt] = useState(
    baseCt.line2Style?.fontSizePt ?? pxToPt(baseCt.fontSize)
  );
  const [line2Bold, setLine2Bold] = useState(baseCt.line2Style?.bold ?? baseCt.bold);
  const [line2Italic, setLine2Italic] = useState(baseCt.line2Style?.italic ?? baseCt.italic);
  const [line2Color, setLine2Color] = useState(baseCt.line2Style?.color || baseCt.color);

  const [line3FontFamily, setLine3FontFamily] = useState(
    baseCt.line3Style?.fontFamily || baseCt.fontFamily
  );
  const [line3FontSizePt, setLine3FontSizePt] = useState(
    baseCt.line3Style?.fontSizePt ?? pxToPt(baseCt.fontSize)
  );
  const [line3Bold, setLine3Bold] = useState(baseCt.line3Style?.bold ?? baseCt.bold);
  const [line3Italic, setLine3Italic] = useState(baseCt.line3Style?.italic ?? baseCt.italic);
  const [line3Color, setLine3Color] = useState(baseCt.line3Style?.color || baseCt.color);

  const [line4FontFamily, setLine4FontFamily] = useState(
    baseCt.line4Style?.fontFamily || baseCt.fontFamily
  );
  const [line4FontSizePt, setLine4FontSizePt] = useState(
    baseCt.line4Style?.fontSizePt ?? pxToPt(baseCt.fontSize)
  );
  const [line4Bold, setLine4Bold] = useState(baseCt.line4Style?.bold ?? baseCt.bold);
  const [line4Italic, setLine4Italic] = useState(baseCt.line4Style?.italic ?? baseCt.italic);
  const [line4Color, setLine4Color] = useState(baseCt.line4Style?.color || baseCt.color);

  const [activeHeaderLine, setActiveHeaderLine] = useState("line1");

  // Document stamp (kept for data, UI hidden)
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

    setCicmEnabled(next.header.logos.cicm.enabled);
    setCicmSizePx(next.header.logos.cicm.sizePx);

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

    const ct = next.header.centerText;

    setLine1FontFamily(ct.line1Style?.fontFamily || ct.fontFamily);
    setLine1FontSizePt(ct.line1Style?.fontSizePt ?? pxToPt(ct.fontSize));
    setLine1Bold(ct.line1Style?.bold ?? ct.bold);
    setLine1Italic(ct.line1Style?.italic ?? ct.italic);
    setLine1Color(ct.line1Style?.color || ct.color);

    setLine2FontFamily(ct.line2Style?.fontFamily || ct.fontFamily);
    setLine2FontSizePt(ct.line2Style?.fontSizePt ?? pxToPt(ct.fontSize));
    setLine2Bold(ct.line2Style?.bold ?? ct.bold);
    setLine2Italic(ct.line2Style?.italic ?? ct.italic);
    setLine2Color(ct.line2Style?.color || ct.color);

    setLine3FontFamily(ct.line3Style?.fontFamily || ct.fontFamily);
    setLine3FontSizePt(ct.line3Style?.fontSizePt ?? pxToPt(ct.fontSize));
    setLine3Bold(ct.line3Style?.bold ?? ct.bold);
    setLine3Italic(ct.line3Style?.italic ?? ct.italic);
    setLine3Color(ct.line3Style?.color || ct.color);

    setLine4FontFamily(ct.line4Style?.fontFamily || ct.fontFamily);
    setLine4FontSizePt(ct.line4Style?.fontSizePt ?? pxToPt(ct.fontSize));
    setLine4Bold(ct.line4Style?.bold ?? ct.bold);
    setLine4Italic(ct.line4Style?.italic ?? ct.italic);
    setLine4Color(ct.line4Style?.color || ct.color);

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

    const line1Style = {
      fontFamily: line1FontFamily,
      fontSizePt: coerceNum(line1FontSizePt, pxToPt(DEFAULTS.header.centerText.fontSize)),
      bold: !!line1Bold,
      italic: !!line1Italic,
      color: line1Color,
    };

    const line2Style = {
      fontFamily: line2FontFamily,
      fontSizePt: coerceNum(line2FontSizePt, pxToPt(DEFAULTS.header.centerText.fontSize)),
      bold: !!line2Bold,
      italic: !!line2Italic,
      color: line2Color,
    };

    const line3Style = {
      fontFamily: line3FontFamily,
      fontSizePt: coerceNum(line3FontSizePt, pxToPt(DEFAULTS.header.centerText.fontSize)),
      bold: !!line3Bold,
      italic: !!line3Italic,
      color: line3Color,
    };

    const line4Style = {
      fontFamily: line4FontFamily,
      fontSizePt: coerceNum(line4FontSizePt, pxToPt(DEFAULTS.header.centerText.fontSize)),
      bold: !!line4Bold,
      italic: !!line4Italic,
      color: line4Color,
    };

    const primary = line1Style;

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
          },
          cicm: {
            enabled: !!cicmEnabled,
            sizePx: coerceNum(cicmSizePx, DEFAULTS.header.logos.cicm.sizePx),
          },
        },
        centerText: {
          enabled: !!centerEnabled,
          line1,
          line2,
          line3,
          line4,
          showLine4: !!showLine4,
          // Backward-compatible "global" style driven from Header 1
          fontFamily: primary.fontFamily || fontFamily,
          fontSize: coerceNum(
            ptToPx(primary.fontSizePt),
            DEFAULTS.header.centerText.fontSize
          ),
          bold: !!primary.bold,
          italic: !!primary.italic,
          color: primary.color || color,
          showHeaderLine: !!showHeaderLine,
          // Per-line style payload (new)
          line1Style,
          line2Style,
          line3Style,
          line4Style,
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
    cicmEnabled,
    cicmSizePx,
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
    line1FontFamily,
    line1FontSizePt,
    line1Bold,
    line1Italic,
    line1Color,
    line2FontFamily,
    line2FontSizePt,
    line2Bold,
    line2Italic,
    line2Color,
    line3FontFamily,
    line3FontSizePt,
    line3Bold,
    line3Italic,
    line3Color,
    line4FontFamily,
    line4FontSizePt,
    line4Bold,
    line4Italic,
    line4Color,
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
            slu: { enabled: sluEnabled, sizePx: sluSizePx },
            cicm: { enabled: cicmEnabled, sizePx: cicmSizePx },
          }}
          setLogos={{
            setSluEnabled,
            setSluSizePx,
            setCicmEnabled,
            setCicmSizePx,
          }}
          center={{
            enabled: centerEnabled,
            line1,
            line2,
            line3,
            line4,
            showLine4,
            showHeaderLine,
            line1FontFamily,
            line1FontSizePt,
            line1Bold,
            line1Italic,
            line1Color,
            line2FontFamily,
            line2FontSizePt,
            line2Bold,
            line2Italic,
            line2Color,
            line3FontFamily,
            line3FontSizePt,
            line3Bold,
            line3Italic,
            line3Color,
            line4FontFamily,
            line4FontSizePt,
            line4Bold,
            line4Italic,
            line4Color,
            activeHeaderLine,
          }}
          setCenter={{
            setCenterEnabled,
            setLine1,
            setLine2,
            setLine3,
            setLine4,
            setShowLine4,
            setShowHeaderLine,
            setLine1FontFamily,
            setLine1FontSizePt,
            setLine1Bold,
            setLine1Italic,
            setLine1Color,
            setLine2FontFamily,
            setLine2FontSizePt,
            setLine2Bold,
            setLine2Italic,
            setLine2Color,
            setLine3FontFamily,
            setLine3FontSizePt,
            setLine3Bold,
            setLine3Italic,
            setLine3Color,
            setLine4FontFamily,
            setLine4FontSizePt,
            setLine4Bold,
            setLine4Italic,
            setLine4Color,
            setActiveHeaderLine,
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
            disabled={disabled}
          />
          <LogoBlock
            title="CICM Logo"
            previewSrc={assets.cicm || CICM_LOGO_SRC}
            value={logos.cicm}
            onToggle={setLogos.setCicmEnabled}
            onSize={setLogos.setCicmSizePx}
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
          {/* Header 1 */}
          <TextField
            label="Header 1"
            value={center.line1}
            onChange={setCenter.setLine1}
            placeholder="Header 1 (e.g., Saint Louis University)"
            onFocus={() => setCenter.setActiveHeaderLine("line1")}
          />
          {center.activeHeaderLine === "line1" && (
            <HeaderLineStyleEditor
              fontFamily={center.line1FontFamily}
              setFontFamily={setCenter.setLine1FontFamily}
              fontSizePt={center.line1FontSizePt}
              setFontSizePt={setCenter.setLine1FontSizePt}
              bold={center.line1Bold}
              setBold={setCenter.setLine1Bold}
              italic={center.line1Italic}
              setItalic={setCenter.setLine1Italic}
              color={center.line1Color}
              setColor={setCenter.setLine1Color}
            />
          )}

          {/* Header 2 */}
          <TextField
            label="Header 2"
            value={center.line2}
            onChange={setCenter.setLine2}
            placeholder="Header 2 (e.g., Office / School / Department)"
            onFocus={() => setCenter.setActiveHeaderLine("line2")}
          />
          {center.activeHeaderLine === "line2" && (
            <HeaderLineStyleEditor
              fontFamily={center.line2FontFamily}
              setFontFamily={setCenter.setLine2FontFamily}
              fontSizePt={center.line2FontSizePt}
              setFontSizePt={setCenter.setLine2FontSizePt}
              bold={center.line2Bold}
              setBold={setCenter.setLine2Bold}
              italic={center.line2Italic}
              setItalic={setCenter.setLine2Italic}
              color={center.line2Color}
              setColor={setCenter.setLine2Color}
            />
          )}

          {/* Header 3 */}
          <TextField
            label="Header 3"
            value={center.line3}
            onChange={setCenter.setLine3}
            placeholder="Header 3 (e.g., Cluster or secondary detail)"
            onFocus={() => setCenter.setActiveHeaderLine("line3")}
          />
          {center.activeHeaderLine === "line3" && (
            <HeaderLineStyleEditor
              fontFamily={center.line3FontFamily}
              setFontFamily={setCenter.setLine3FontFamily}
              fontSizePt={center.line3FontSizePt}
              setFontSizePt={setCenter.setLine3FontSizePt}
              bold={center.line3Bold}
              setBold={setCenter.setLine3Bold}
              italic={center.line3Italic}
              setItalic={setCenter.setLine3Italic}
              color={center.line3Color}
              setColor={setCenter.setLine3Color}
            />
          )}

          {/* Header 4 toggle + field + style editor */}
          <div className="space-y-2 mt-2">
            <CheckboxField
              label="Add Header 4"
              checked={!!center.showLine4}
              onChange={setCenter.setShowLine4}
            />
            {center.showLine4 && (
              <>
                <TextField
                  label="Header 4"
                  value={center.line4}
                  onChange={setCenter.setLine4}
                  placeholder="Header 4 (optional additional line)"
                  onFocus={() => setCenter.setActiveHeaderLine("line4")}
                />
                {center.activeHeaderLine === "line4" && (
                  <HeaderLineStyleEditor
                    fontFamily={center.line4FontFamily}
                    setFontFamily={setCenter.setLine4FontFamily}
                    fontSizePt={center.line4FontSizePt}
                    setFontSizePt={setCenter.setLine4FontSizePt}
                    bold={center.line4Bold}
                    setBold={setCenter.setLine4Bold}
                    italic={center.line4Italic}
                    setItalic={setCenter.setLine4Italic}
                    color={center.line4Color}
                    setColor={setCenter.setLine4Color}
                  />
                )}
              </>
            )}
          </div>

          <div className="mt-2">
            <CheckboxField
              label="Show horizontal line under header"
              checked={!!center.showHeaderLine}
              onChange={setCenter.setShowHeaderLine}
            />
          </div>
        </div>
      </div>

      {/* Document Stamp UI intentionally hidden */}
      {/* Values still exist in state & payload for compatibility */}
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
          {/* Pattern dropdown: Page of Page / Page only */}
          <SelectField
            label="Pattern"
            value={pageNumber.pattern}
            onChange={setPageNumber.setPattern}
            options={[
              { label: "Page of Page", value: "{page} of {total}" },
              { label: "Page only", value: "{page}" },
            ]}
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

          {/* Font family from utils textFonts */}
          <SelectField
            label="Font Family"
            value={pageNumber.fontFamily}
            onChange={setPageNumber.setFontFamily}
            options={FONT_OPTIONS.map(f => ({
              ...f,
              style: { fontFamily: f.value },
            }))}
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

          {/* Font family from utils textFonts */}
          <SelectField
            label="Font Family"
            value={body.fontFamily}
            onChange={setBody.setFontFamily}
            options={FONT_OPTIONS.map(f => ({
              ...f,
              style: { fontFamily: f.value },
            }))}
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
        </div>
      </div>
    </div>
  );
}

/* --------------------- UI Blocks & Inputs --------------------- */

function HeaderLineStyleEditor({
  fontFamily,
  setFontFamily,
  fontSizePt,
  setFontSizePt,
  bold,
  setBold,
  italic,
  setItalic,
  color,
  setColor,
}) {
  const [search, setSearch] = useState("");
  const [recentFonts, setRecentFonts] = useState([]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FONT_OPTIONS;
    return FONT_OPTIONS.filter((o) => o.label.toLowerCase().includes(q));
  }, [search]);

  useEffect(() => {
    if (!fontFamily) return;
    setRecentFonts((prev) => {
      if (prev.includes(fontFamily)) return prev;
      const without = prev.filter((v) => v !== fontFamily);
      const next = [fontFamily, ...without];
      return next.slice(0, 4);
    });
  }, [fontFamily]);

  const handleSelectFont = (value) => {
    setFontFamily(value);
    setRecentFonts((prev) => {
      const without = prev.filter((v) => v !== value);
      const next = [value, ...without];
      return next.slice(0, 4);
    });
  };

  const handleSizeChange = (val) => {
    const n = Number(val);
    if (Number.isNaN(n)) {
      setFontSizePt("");
    } else {
      setFontSizePt(n);
    }
  };

  return (
    <div className="mt-2 mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3">
      {/* Font size */}
      <NumberField
        label="Font size"
        value={fontSizePt}
        min={6}
        max={48}
        step={1}
        onChange={handleSizeChange}
      />

      {/* Bold / Italic buttons */}
      <div className="flex items-center gap-2">
        <Label>Style</Label>
        <div className="flex gap-2">
          <button
            type="button"
            className={`w-9 h-9 rounded-md border flex items-center justify-center text-sm ${
              bold
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-800 border-slate-300"
            }`}
            onClick={() => setBold(!bold)}
          >
            <span className="font-bold">B</span>
          </button>
          <button
            type="button"
            className={`w-9 h-9 rounded-md border flex items-center justify-center text-sm ${
              italic
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-800 border-slate-300"
            }`}
            onClick={() => setItalic(!italic)}
          >
            <span className="italic">I</span>
          </button>
        </div>
      </div>

      {/* Font family with search + recents */}
      <div className="space-y-2">
        <Label>Font family</Label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search fonts (e.g., "Inter", "Lora")'
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
        />

        {recentFonts.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {recentFonts.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleSelectFont(val)}
                className={`px-2.5 py-1 rounded-full border text-xs ${
                  fontFamily === val
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
                style={{ fontFamily: val }}
              >
                {findFontLabel(val)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-1">
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            value={fontFamily}
            onChange={(e) => handleSelectFont(e.target.value)}
          >
            {filteredOptions.map((o) => (
              <option key={o.value} value={o.value} style={{ fontFamily: o.value }}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Color picker (no hex field) */}
      <SimpleColorField label="Text color" value={color} onChange={setColor} />
    </div>
  );
}

function LogoBlock({ title, previewSrc, value, onToggle, onSize, disabled }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-700">{title}</div>
        <Toggle
          label="Enabled"
          checked={!!value.enabled}
          onChange={onToggle}
          compact
          disabled={disabled}
        />
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
      </div>
      <Hint>Adjust logo visibility and size.</Hint>
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

function TextField({ label, value, onChange, placeholder, onFocus }) {
  return (
    <div className="min-w-0">
      {label ? <Label>{label}</Label> : null}
      <input
        type="text"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={onFocus}
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

// simple color picker (no hex text field) for header line style editor
function SimpleColorField({ label, value, onChange, disabled }) {
  const val =
    typeof value === "string" && /^#([0-9a-fA-F]{6})$/.test(value) ? value : value || "#000000";
  return (
    <div className="min-w-0">
      {label ? <Label>{label}</Label> : null}
      <input
        type="color"
        className="h-9 w-10 cursor-pointer rounded border border-slate-300 disabled:bg-slate-100"
        value={val}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
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
    <label
      className={`flex items-center gap-2 text-sm ${
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
          <option
            key={o.value}
            value={o.value}
            style={o.style}
          >
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
