import axios from "axios";
import puppeteer from "puppeteer";
import FormData from "form-data";

// --- Utility helpers (mirroring document-service patterns) ---
const escapeHtml = (unsafe) => {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Hide watermarks & neutralize backgrounds; preserve doc stamp if THUMBNAIL_SHOW_STAMP=true and element has 'doc-stamp'
const hideWatermarksInHtml = (sourceHtml) => {
  if (!sourceHtml || typeof sourceHtml !== 'string') return sourceHtml;
  const keepStamp = String(process.env.THUMBNAIL_SHOW_STAMP || '').toLowerCase() === 'true';
  let out = sourceHtml;
  try {
    out = out.replace(/<([a-zA-Z][^\s\/]*)([^>]*?)\s((?:class|id|data-[a-zA-Z0-9_-]+|data-role))=(["'])([^\4>]*?watermark[^\4>]*?)\4([^>]*)>/gi,
      (match, tag, pre, attrName, quote, attrVal, post) => {
        if (keepStamp && /doc-stamp/.test(match)) return match; // keep stamp
        if (/\sstyle\s*=/.test(match)) {
          return match.replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/i, (m2, q, s) => ` style=${q}${s};display:none !important;visibility:hidden !important;${q}`);
        }
        return `<${tag}${pre} style=\"display:none !important;visibility:hidden !important;\" ${attrName}=${quote}${attrVal}${quote}${post}>`;
      }
    );
    out = out.replace(/<([a-zA-Z][^\s\/]*)([^>]*?class=(["'])[^^>]*?(rm-with-pagination|rm-page|rm-page-break)[^^>]*?\3)([^>]*)>/gi,
      (match) => {
        if (/\sstyle\s*=/.test(match)) {
          return match.replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/i, (m2, q, s) => ` style=${q}${s};background-image:none !important;background:#ffffff !important;${q}`);
        }
        return match.replace(/>$/, ' style=\"background-image:none !important;background:#ffffff !important;\">');
      }
    );
    out = out.replace(/<body([^>]*)>/i, (m, attrs) => {
      if (/style\s*=/.test(attrs)) {
        return m.replace(/style\s*=\s*(["'])([\s\S]*?)\1/i, (mm, q, s) => `style=${q}${s};background-image:none !important;background:#ffffff !important;${q}`);
      }
      return `<body${attrs} style=\"background-image:none !important;background:#ffffff !important;\">`;
    });
  } catch { /* ignore */ }
  return out;
};

// Page sizing helpers
const DPI = 96; // CSS px per inch approximation for Puppeteer viewport
const inchesToPx = (inches) => Math.max(0, Math.round(Number(inches || 0) * DPI));
const PAPER_SIZES = {
  a4: { w: 8.27, h: 11.69 },
  letter: { w: 8.5, h: 11 },
  legal: { w: 8.5, h: 14 },
};

// Resolve asset paths to file-service when provided as /assets/... (frontend-style)
function resolveAssetUrl(p) {
  if (!p || typeof p !== 'string') return '';
  // already absolute URL
  if (/^https?:\/\//i.test(p)) return p;
  const fileService = process.env.FILE_SERVICE_URL || '';
  if (p.startsWith('/assets/')) {
    // Expect assets to be placed under file-service uploads/assets/** so they are served via /uploads/assets/**
    if (fileService) return `${fileService.replace(/\/$/, '')}/uploads${p}`;
    return `/uploads${p}`;
  }
  // already an /uploads path – leave as-is but prefix when base exists
  if (p.startsWith('/uploads/')) {
    return fileService ? `${fileService.replace(/\/$/, '')}${p}` : p;
  }
  // fallback: return as given
  return p;
}

// Format effectivity date similar to editor (Mon DD, YYYY)
function formatEffectivityDate(val) {
  try {
    const raw = (val && typeof val === 'object' && '$date' in val) ? val.$date : val;
    const d = raw ? new Date(raw) : null;
    if (d && !isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch {}
  return val ? String(val) : '';
}

// Build a full HTML envelope for the first page of a template using pageSetup and headerConfig
function buildTemplateThumbnailHtml(template = {}) {
  const pageSetup = template.pageSetup || {};
  const paper = String(pageSetup.paperSize || 'A4').toLowerCase();
  const orient = String(pageSetup.orientation || 'Portrait').toLowerCase();
  const baseSize = PAPER_SIZES[paper] || PAPER_SIZES.a4;
  const pageWIn = orient === 'landscape' ? baseSize.h : baseSize.w;
  const pageHIn = orient === 'landscape' ? baseSize.w : baseSize.h;
  const width = inchesToPx(pageWIn);
  const height = inchesToPx(pageHIn);
  const m = pageSetup.margins || { top: 1, bottom: 1, left: 1, right: 1 };
  const mt = inchesToPx(m.top); const mb = inchesToPx(m.bottom); const ml = inchesToPx(m.left); const mr = inchesToPx(m.right);

  const headerCfg = template.headerConfig || {};
  const headerEnabled = !!headerCfg.headerEnabled;
  const footerEnabled = !!headerCfg.footerEnabled;
  const docCode = template?.document_code ? String(template.document_code).trim() : '';
  const revisionRaw = (template?.revision_no ?? template?.revisionNo ?? template?.revision ?? '').toString();
  const revisionNo = revisionRaw ? (/^\d$/.test(revisionRaw) ? `0${revisionRaw}` : revisionRaw) : '';
  const effectivityStr = formatEffectivityDate(template?.effectivity || headerCfg?.documentStamp?.effectivity || '');
  const pageNumCfg = headerCfg?.footer?.pageNumber || {};
  const pageStr = (pageNumCfg.pattern || '{page} of {total}').replace('{page}', '1').replace('{total}', '1');
  // Center text lines (include optional line4)
  const centerCfg = headerCfg?.header?.centerText || {};
  const centerLines = centerCfg?.enabled ? [centerCfg.line1, centerCfg.line2, centerCfg.line3, (centerCfg.showLine4 ? centerCfg.line4 : null)].filter(Boolean) : [];
  const centerFontSize = centerCfg.fontSize || 14;
  const lineH = centerFontSize * 1.15;
  const centerBlockH = centerLines.length ? Math.ceil(centerLines.length * lineH) + 6 : 0;
  // Logo heights (match editor defaults 56 / 52)
  const sluH = (headerCfg?.header?.logos?.slu?.enabled ? Number(headerCfg.header.logos.slu.sizePx || 56) : 0) || 0;
  const cicmH = (headerCfg?.header?.logos?.cicm?.enabled ? Number(headerCfg.header.logos.cicm.sizePx || 52) : 0) || 0;
  // Metadata table (doc stamp) row height (~22px each)
  // Doc stamp only renders if docCode exists (match editor logic)
  const hasDocCode = !!docCode;
  const metaRows = hasDocCode ? [docCode, revisionNo, effectivityStr, (pageNumCfg?.enabled ? pageStr : '')].filter(Boolean).length : 0;
  const metaH = hasDocCode && metaRows ? (metaRows * 22 + 8) : 0;
  const headerHeightPx = (headerEnabled || (hasDocCode && metaRows)) ? Math.max(96, sluH, cicmH, centerBlockH, metaH) : (headerEnabled ? Math.max(96, sluH, cicmH, centerBlockH) : 0);

  // Simple content builder from pages_json
  const firstDoc = Array.isArray(template.pages_json) ? template.pages_json[0] : null;
  let bodyHtml = '';
  if (firstDoc && Array.isArray(firstDoc.content)) {
    const buildParagraph = (para) => {
      let p = '<p>';
      let hasRenderable = false;
      (para.content || []).forEach(ch => {
        if (!ch) return;
        if (ch.type === 'text') {
          let style = '';
          if (Array.isArray(ch.marks)) {
            ch.marks.forEach(mark => {
              if (mark.type === 'bold') style += 'font-weight:bold;';
              if (mark.type === 'italic') style += 'font-style:italic;';
              if (mark.type === 'underline') style += 'text-decoration:underline;';
            });
          }
          const txt = String(ch.text || '');
          if (txt.trim().length > 0) hasRenderable = true;
          p += `<span style="${style}">${escapeHtml(txt)}</span>`;
        } else if (ch.type === 'editableField') {
          const placeholder = ch?.attrs?.placeholder || '';
          // Render a light underline box to indicate a field
          p += `<span class="nd-editable-field" style="display:inline-block;min-width:120px;border-bottom:1px dotted #999;color:#999;">${escapeHtml(placeholder)}</span>`;
          hasRenderable = true;
        } else if (ch.type === 'image' || ch.type === 'richImage') {
          // Inline image inside paragraph
          const a = ch?.attrs || {};
          const src = resolveAssetUrl(a.src || a.srcOriginal || '');
          if (src) {
            let style = 'max-width:100%;height:auto;display:inline-block;vertical-align:middle;';
            let w = Number.isFinite(Number(a.width)) ? Number(a.width) : null;
            let h = Number.isFinite(Number(a.height)) ? Number(a.height) : null;
            const keepAspect = a.keepAspect !== false; // default true
            // Clamp to inner content width
            const pageInnerWidth = Math.max(0, width - ml - mr);
            if (w && pageInnerWidth && w > pageInnerWidth) {
              if (keepAspect && w && h) {
                const ratio = h / w;
                w = pageInnerWidth;
                h = Math.round(w * ratio);
              } else {
                w = pageInnerWidth;
              }
            }
            if (w && !h) style += `width:${w}px;`;
            if (h && !w && !keepAspect) style += `height:${h}px;`;
            if (w && h) style += `width:${w}px;height:${h}px;object-fit:contain;`;
            const opacity = a.opacity !== undefined ? Math.max(0, Math.min(1, Number(a.opacity) / 100)) : 1;
            style += `opacity:${opacity};`;
            const align = (a.align || '').toLowerCase();
            if (align === 'right') style += 'float:right;margin-left:8px;';
            else if (align === 'left') style += 'float:left;margin-right:8px;';
            else style += 'margin:0 4px;';
            p += `<img src="${escapeHtml(src)}" alt="" style="${style}"/>`;
            hasRenderable = true;
          }
        }
      });
      if (!hasRenderable) {
        // Ensure blank paragraphs still create a visible line break in the thumbnail
        p += '&nbsp;';
      }
      p += '</p>';
      return p;
    };
    const buildTable = (tbl) => {
      let out = '<table style="border-collapse:collapse;width:100%;margin:6px 0;">';
      (tbl.content || []).forEach(row => {
        if (row.type === 'tableRow' && Array.isArray(row.content)) {
          out += '<tr>';
          row.content.forEach(cell => {
            const tag = cell.type === 'tableHeader' ? 'th' : 'td';
            out += `<${tag} style="border:1px solid #ccc;padding:4px;">`;
            (cell.content || []).forEach(cellNode => {
              if (cellNode.type === 'paragraph') out += buildParagraph(cellNode);
            });
            out += `</${tag}>`;
          });
          out += '</tr>';
        }
      });
      out += '</table>';
      return out;
    };
    const buildList = (list) => {
      const ordered = list.type === 'orderedList';
      let out = ordered ? '<ol style="margin:6px 0 6px 24px;">' : '<ul style="margin:6px 0 6px 24px;">';
      (list.content || []).forEach(li => {
        if (li.type === 'listItem') {
          out += '<li>';
          (li.content || []).forEach(cn => { if (cn.type === 'paragraph') out += buildParagraph(cn); });
          out += '</li>';
        }
      });
      out += ordered ? '</ol>' : '</ul>';
      return out;
    };
    const buildHeading = (h) => {
      const lvl = (h.attrs && h.attrs.level) ? Math.min(6, Math.max(1, Number(h.attrs.level))) : 1;
      let inner = '';
      (h.content || []).forEach(ch => { if (ch.type === 'text') inner += escapeHtml(ch.text || ''); });
      return `<h${lvl} style="margin:10px 0;font:${lvl<=2?'600':'500'} ${lvl===1?20:lvl===2?18:lvl===3?16:14}px/1.25 Inter, system-ui, Arial, sans-serif;">${inner}</h${lvl}>`;
    };
    const buildImage = (img) => {
      const src = resolveAssetUrl(img?.attrs?.src || '');
      if (!src) return '';
      return `<div style="margin:8px 0;text-align:center;"><img src="${escapeHtml(src)}" alt="" style="max-width:100%;height:auto;"/></div>`;
    };
    const buildRichImage = (node) => {
      const a = node?.attrs || {};
      // Prefer src; fall back to srcOriginal if provided
      const src = resolveAssetUrl(a.src || a.srcOriginal || '');
      if (!src) return '';
      // Dimensions and aspect handling
      let imgW = Number.isFinite(Number(a.width)) ? Number(a.width) : null;
      let imgH = Number.isFinite(Number(a.height)) ? Number(a.height) : null;
      const keepAspect = a.keepAspect !== false; // default true
      // Opacity comes as 0-100 from editor
      const opacity = a.opacity !== undefined ? Math.max(0, Math.min(1, Number(a.opacity) / 100)) : 1;
      // Alignment: left | center | right
      const align = (a.align || 'center');
      const wrapperAlign = align === 'left' || align === 'right' ? align : 'center';
      // Clamp to available inner width (page width minus margins)
      const pageInnerWidth = Math.max(0, width - ml - mr);
      if (imgW && pageInnerWidth && imgW > pageInnerWidth) {
        if (keepAspect && imgW && imgH) {
          const ratio = imgH / imgW;
          imgW = pageInnerWidth;
          imgH = Math.round(imgW * ratio);
        } else {
          imgW = pageInnerWidth;
        }
      }
      // Compose style
      let style = 'max-width:100%;height:auto;';
      if (imgW && !imgH) style += `width:${imgW}px;`;
      if (imgH && !imgW && !keepAspect) style += `height:${imgH}px;`;
      if (imgW && imgH) style += `width:${imgW}px;height:${imgH}px;object-fit:contain;`;
      style += `opacity:${opacity};`;
      return `<div style="margin:8px 0;text-align:${wrapperAlign};"><img src="${escapeHtml(src)}" alt="" style="${style}"/></div>`;
    };
    firstDoc.content.forEach(n => {
      if (n.type === 'paragraph') bodyHtml += buildParagraph(n);
      else if (n.type === 'table') bodyHtml += buildTable(n);
      else if (n.type === 'bulletList' || n.type === 'orderedList') bodyHtml += buildList(n);
      else if (n.type === 'heading') bodyHtml += buildHeading(n);
      else if (n.type === 'horizontalRule') bodyHtml += '<hr style="border:0;border-top:1px solid #000;margin:10px 0;" />';
      else if (n.type === 'image') bodyHtml += buildImage(n);
      else if (n.type === 'richImage') bodyHtml += buildRichImage(n);
    });
  }

  const baseHref = (process.env.FILE_SERVICE_URL ? String(process.env.FILE_SERVICE_URL).replace(/"/g, '&quot;') + '/' : '');
  const center = centerCfg;
  const logos = headerCfg?.header?.logos || {};
  const pageNum = pageNumCfg;
  const assetSlu = resolveAssetUrl(headerCfg.assets?.slu || '/assets/images/slu-logo.png');
  const assetCicm = resolveAssetUrl(headerCfg.assets?.cicm || '/assets/images/cicm-logo.png');
  const showHeaderLine = !!(centerCfg?.showHeaderLine || headerCfg?.showHeaderLine);

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      ${baseHref ? `<base href="${baseHref}" />` : ''}
      <style>
        :root{ --page-w:${width}px; --page-h:${height}px; }
        body{ margin:0; background:#f5f7f9; }
        .thumb-page{ width:${width}px; height:${height}px; background:#fff; position:relative; box-sizing:border-box; overflow:hidden; }
        /* Header inside left/right margins at top margin */
  .thumb-header{ position:absolute; left:${ml}px; right:${mr}px; top:${mt}px; height:${headerHeightPx}px; box-sizing:border-box; ${showHeaderLine ? 'border-bottom:1px solid #000;' : ''} }
  .thumb-header-inner{ display:flex; flex-direction:row; align-items:stretch; justify-content:space-between; width:100%; height:100%; }
  .hdr-left, .hdr-right{ display:flex; flex-direction:row; align-items:center; gap:8px; padding:4px 0 0 0; }
  .hdr-center{ flex:1; display:flex; flex-direction:column; justify-content:center; text-align:center; }
  .hdr-center div{ font:${center?.bold?'700':'400'} ${centerFontSize}px/1.15 ${escapeHtml(center?.fontFamily||'Inter, system-ui, Arial, sans-serif')}; color:${escapeHtml(center?.color||'#000')}; }
  .hdr-center div.l3{ font-size:12px; }
  .hdr-meta{ border:1px solid #000; border-collapse:collapse; font:11px Arial, sans-serif; background:#fff; }
  .hdr-meta td{ border:1px solid #000; padding:2px 6px; white-space:nowrap; }
        .thumb-footer{ position:absolute; left:${ml}px; right:${mr}px; bottom:${mb}px; font:12px/1.2 Inter, system-ui, Arial, sans-serif; color:#000; text-align:${pageNum.align || 'center'}; }
        /* Logos render inline in their flex containers to match editor */
        .thumb-logo{ display:block; height:auto; }
        /* Main content honors all margins and starts below header */
        .thumb-main{ position:absolute; left:${ml}px; right:${mr}px; top:${mt + headerHeightPx}px; bottom:${mb}px; overflow:hidden; }
        .thumb-main p{ margin:3px 0; font:14px/1.3 Inter, system-ui, Arial, sans-serif; color:#111; }
        /* legacy .doc-stamp style intentionally unused for header metadata table */
      </style>
    </head>
    <body>
      <div class="thumb-page">
        ${(headerEnabled || metaRows) ? `
          <div class="thumb-header">
            <div class="thumb-header-inner">
              <div class="hdr-left">
                ${logos?.slu?.enabled ? `<img class="thumb-logo" style="height:${logos.slu.sizePx || 56}px" src="${escapeHtml(assetSlu)}" alt="slu"/>` : ''}
              </div>
              <div class="hdr-center">${centerLines.map((l,i)=>`<div class="${i===2?'l3':''}">${escapeHtml(l)}</div>`).join('')}</div>
              <div class="hdr-right">
                ${logos?.cicm?.enabled ? `<img class="thumb-logo" style="height:${logos.cicm.sizePx || 52}px" src="${escapeHtml(assetCicm)}" alt="cicm"/>` : ''}
                ${(hasDocCode) ? `
                  <table class="hdr-meta">
                    ${docCode ? `<tr><td>Document Code</td><td>${escapeHtml(docCode)}</td></tr>`:''}
                    ${revisionNo ? `<tr><td>Revision No.</td><td>${escapeHtml(revisionNo)}</td></tr>`:''}
                    ${effectivityStr ? `<tr><td>Effectivity</td><td>${escapeHtml(effectivityStr)}</td></tr>`:''}
                    ${pageNum?.enabled ? `<tr><td>Page</td><td>${escapeHtml(pageStr)}</td></tr>`:''}
                  </table>
                `: ''}
              </div>
            </div>
          </div>
        ` : ''}
        <div class="thumb-main">${bodyHtml || ''}</div>
        ${footerEnabled && pageNum?.enabled ? `<div class="thumb-footer">${escapeHtml((pageNum.pattern || '{page} of {total}').replace('{page}','1').replace('{total}','1'))}</div>` : ''}
      </div>
    </body>
  </html>`;
  return { html, width, height };
}

/**
 * Renders HTML for the first page of a template.
 * @param {Object} template
 * @returns {string|null}
 */
export function renderTemplatePageHtml(template) {
  // Accept first page doc; if no explicit page node, use the doc's top-level content
  const pageDoc = Array.isArray(template.pages_json) ? template.pages_json[0] : null;
  if (!pageDoc) return null;
  const pageNode = Array.isArray(pageDoc.content) ? pageDoc.content.find(n => n && n.type === 'page') : null;
  const contentNodes = pageNode && Array.isArray(pageNode.content) ? pageNode.content : (Array.isArray(pageDoc.content) ? pageDoc.content : []);
  if (!Array.isArray(contentNodes)) return null;

  const collectParagraphHtml = (node) => {
    if (!node || node.type !== 'paragraph') return '';
    let out = '<p>';
    let hasRenderable = false;
    (node.content || []).forEach(n => {
      if (n.type === 'text') {
        let style = '';
        if (Array.isArray(n.marks)) {
          n.marks.forEach(mark => {
            if (mark.type === 'bold') style += 'font-weight:bold;';
            if (mark.type === 'italic') style += 'font-style:italic;';
            if (mark.type === 'underline') style += 'text-decoration:underline;';
          });
        }
        const txt = String(n.text || '');
        if (txt.trim().length > 0) hasRenderable = true;
        out += `<span style="${style}">${escapeHtml(txt)}</span>`;
      }
    });
    if (!hasRenderable) {
      out += '&nbsp;';
    }
    out += '</p>';
    return out;
  };

  const collectTableHtml = (table) => {
    if (!table || table.type !== 'table' || !Array.isArray(table.content)) return '';
    let out = '<table style="border-collapse:collapse;width:100%;margin:8px 0;">';
    table.content.forEach(row => {
      if (row.type === 'tableRow' && Array.isArray(row.content)) {
        out += '<tr>';
        row.content.forEach(cell => {
          const tag = cell.type === 'tableHeader' ? 'th' : 'td';
          let cellStyle = 'border:1px solid #ccc;padding:4px;font-size:12px;';
            out += `<${tag} style="${cellStyle}">`;
            (cell.content||[]).forEach(cellNode => {
              if (cellNode.type === 'paragraph') out += collectParagraphHtml(cellNode);
            });
          out += `</${tag}>`;
        });
        out += '</tr>';
      }
    });
    out += '</table>';
    return out;
  };

  let bodyHtml = '';
  contentNodes.forEach(n => {
    if (n.type === 'paragraph') bodyHtml += collectParagraphHtml(n);
    if (n.type === 'table') bodyHtml += collectTableHtml(n);
  });

  // Legacy internal body-only builder (kept for fallback); the main path uses buildTemplateThumbnailHtml
  return `<!doctype html><html><head><meta charset=\"utf-8\" /></head><body><main class=\"thumbnail-root\">${bodyHtml}</main></body></html>`;
}

/**
 * Renders HTML to PNG image buffer using Puppeteer.
 * @param {string} html
 * @returns {Promise<Buffer>}
 */
export async function renderHtmlToImageBuffer(html, { width = 794, height = 1123 } = {}) {
  let browser;
  try {
    // Pre-sanitize HTML (watermarks/background) & inject cleanup CSS similar to pdfExportUtil
    let workingHtml = hideWatermarksInHtml(html || '');
    const cleanupCss = `\n<style>\n:root, .rm-with-pagination { --pageGap:0px !important; --pageGapBorderSize:0px !important; --pageBreakBackground:#ffffff !important;}\n.rm-watermark, .nd-watermark, .rm-editor-watermark, .rm-page-watermark, [data-watermark], .watermark, [class*='watermark'], [id*='watermark'], [data-role*='watermark'] {display:none !important;visibility:hidden !important;}\n.rm-with-pagination, .rm-page, .rm-page-break, .ProseMirror, body { background-image:none !important; background:#ffffff !important;}\n.nd-editable-field, .editable-field, [data-node='editable-field'] { background:transparent !important; border:none !important; outline:none !important; box-shadow:none !important; padding:0 !important; filter:none !important;}\nhr, .horizontal-rule, .tiptap hr { border:0 !important; border-top:1px solid #000 !important; height:0 !important; margin:6px 0 !important;}\nbody { margin:0; padding:32px; font: 13px/1.4 Arial, Helvetica, sans-serif; }\n.thumbnail-root { box-sizing:border-box; }\n</style>`;
    if (workingHtml.includes('<head')) {
      workingHtml = workingHtml.replace(/<head([^>]*)>/i, (m) => `${m}${cleanupCss}`);
    } else if (workingHtml.includes('<html')) {
      workingHtml = workingHtml.replace(/<html([^>]*)>/i, (m) => `${m}<head>${cleanupCss}</head>`);
    } else {
      workingHtml = `<!doctype html><html><head>${cleanupCss}</head><body>${workingHtml}</body></html>`;
    }

    browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'] });
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    try {
      await page.setContent(workingHtml, { waitUntil: 'networkidle0', timeout: 25000 });
    } catch (e) {
      console.warn('[Thumbnail] networkidle0 timeout, retrying load mode', e?.message || e);
      await page.setContent(workingHtml, { waitUntil: 'load', timeout: 25000 });
    }
    try { await page.emulateMediaType('screen'); } catch {}
    // Wait fonts
    try {
      await Promise.race([
        page.evaluate(() => (document && document.fonts) ? document.fonts.ready : Promise.resolve()),
        new Promise((_, rej) => setTimeout(() => rej(new Error('fonts timeout')), 8000))
      ]);
    } catch (e) { console.warn('[Thumbnail] fonts wait warning', e?.message || e); }
    // Wait images
    try {
      await page.evaluate(() => Promise.all(Array.from(document.images || []).map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res; }))));
    } catch (e) { console.warn('[Thumbnail] images wait warning', e?.message || e); }

    // Find primary content container; wait briefly for non-zero height
  const selectors = ['.thumb-page', '.rm-with-pagination .rm-page', '.rm-page', '.thumbnail-root', 'body'];
    let handle = null;
    for (const sel of selectors) {
      try {
        await page.waitForSelector(sel, { timeout: 1500 });
        const ok = await page.evaluate((s) => {
          const el = document.querySelector(s);
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return r && r.height > 0 && r.width > 0;
        }, sel);
        if (ok) { handle = await page.$(sel); break; }
      } catch { /* continue */ }
    }

    // If found but extremely short, ensure we still get a decent image by clipping to viewport area
    let buffer;
    if (handle) {
      try {
        const box = await handle.boundingBox();
        if (box && box.width > 0 && box.height > 0) {
          // Clip to the element bounds but not exceeding viewport
          buffer = await page.screenshot({ type: 'png', clip: {
            x: Math.max(0, box.x), y: Math.max(0, box.y),
            width: Math.min(width, Math.ceil(box.width)),
            height: Math.min(height, Math.ceil(box.height))
          }});
        } else {
          throw new Error('Node has 0 height');
        }
      } catch (e) {
        console.warn('[Thumbnail] container screenshot failed, falling back full page', e?.message || e);
        buffer = await page.screenshot({ type: 'png', fullPage: false });
      }
    } else {
      // No container found, fallback
      buffer = await page.screenshot({ type: 'png', fullPage: false });
    }
    return buffer;
  } finally {
    if (browser) try { await browser.close(); } catch {}
  }
}

/**
 * Uploads image buffer to file server and returns the URL.
 * @param {Buffer} imageBuffer
 * @param {string} documentId
 * @returns {Promise<string|null>}
 */
export async function uploadThumbnail(imageBuffer, documentId) {
  const fileServerUrl = process.env.FILE_SERVICE_URL || 'http://localhost:5005';
  const thumbnailFilename = `${documentId}.png`;
  const formData = new FormData();
  formData.append('document', imageBuffer, thumbnailFilename);
  formData.append('owner', 'template');
  formData.append('folderName', 'thumbnail');
  formData.append('documentId', documentId);
  formData.append('overwrite', 'true');
  try {
    const uploadResp = await axios.post(fileServerUrl + '/api/files/upload/document', formData, { headers: formData.getHeaders(), timeout: 20000 });
    const out = uploadResp?.data || {};
    if (!out.filePath && !out.url) {
      console.error('[Thumbnail] Upload response missing filePath/url', out);
      return null;
    }
    return out.filePath || out.url || null;
  } catch (e) {
    console.error('[Thumbnail] Upload failed', e?.message || e);
    return null;
  }
}

/**
 * Generates and uploads a template thumbnail, returns the thumbnail URL.
 * @param {Object} template - Mongoose template document or plain object.
 * @returns {Promise<string|null>} - Thumbnail URL or null on error.
 */
export async function generateTemplateThumbnail(template) {
  try {
    // Prefer full envelope with header/footer/margins using pageSetup
    const built = buildTemplateThumbnailHtml(template || {});
    const htmlRaw = built?.html || renderTemplatePageHtml(template);
    const w = built?.width || 794;
    const h = built?.height || 1123;
    if (!htmlRaw) {
      console.error('[Thumbnail] renderTemplatePageHtml returned null');
      return null;
    }
    const buffer = await renderHtmlToImageBuffer(htmlRaw, { width: w, height: h }).catch(e => { console.error('[Thumbnail] renderHtmlToImageBuffer error', e?.message || e); return null; });
    if (!buffer) return null;
    const documentId = template._id?.toString() || 'template';
    return await uploadThumbnail(buffer, documentId);
  } catch (error) {
    console.error('Error generating thumbnail (utils):', error?.message || error);
    return null;
  }
}

/**
 * Helper to generate and save thumbnail URL to template
 * @param {Object} template
 * @returns {Promise<string|null>}
 */
export const generateTemplateThumbnailInternal = async (template) => {
  try {
    // Primary attempt
    let url = await generateTemplateThumbnail(template);
    if (!url) {
      // Minimal fallback: extract plain text preview if structured HTML failed
      try {
        const first = Array.isArray(template.pages_json) ? template.pages_json[0] : null;
        let text = '';
        if (first && Array.isArray(first.content)) {
          text = first.content.flatMap(n => (n.content||[])).filter(n => n && n.type === 'text').map(n => n.text || '').join(' ').slice(0,300);
        }
        const fallbackHtml = `<!doctype html><html><head><meta charset=\"utf-8\" /></head><body><div style=\"font:14px Arial;padding:32px;\"><h3 style=\"margin-top:0\">${escapeHtml(template.title || 'Template')}</h3><p>${escapeHtml(text)}</p></div></body></html>`;
        const buf = await renderHtmlToImageBuffer(fallbackHtml).catch(()=>null);
        if (buf) url = await uploadThumbnail(buf, template._id?.toString() || 'template');
      } catch (e) {
        console.error('[Thumbnail] fallback generation failed', e?.message || e);
      }
    }
    if (url) {
      template.thumbnailUrl = url;
      try { await template.save(); } catch (e) { console.warn('[Thumbnail] save after thumbnail failed (non-fatal)', e?.message || e); }
    }
    return url;
  } catch (error) {
    console.error('Error generating thumbnail (internal):', error?.message || error);
    return null;
  }
};
