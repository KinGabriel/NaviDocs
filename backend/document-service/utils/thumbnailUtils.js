import axios from 'axios';
import puppeteer from 'puppeteer';
import FormData from 'form-data';

// Escape HTML (shared pattern)
const escapeHtml = (unsafe) => {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Hide watermarks & neutralize backgrounds
const hideWatermarksInHtml = (sourceHtml) => {
  if (!sourceHtml || typeof sourceHtml !== 'string') return sourceHtml;
  let out = sourceHtml;
  try {
    out = out.replace(/<([a-zA-Z][^\s\/]*)[^>]*?(watermark)[^>]*>/gi, (m) => {
      if (/style=/i.test(m)) return m.replace(/style=(['"])(.*?)\1/i, (mm,q,s)=>`style=${q}${s};display:none !important;visibility:hidden !important;${q}`);
      return m.replace(/>$/, ' style="display:none !important;visibility:hidden !important;">');
    });
    out = out.replace(/<([a-zA-Z][^\s\/]*)[^>]*?class=(['"]).*?(rm-with-pagination|rm-page|rm-page-break).*?\2[^>]*>/gi,
      (m) => /style=/i.test(m) ? m.replace(/style=(['"])(.*?)\1/i,(mm,q,s)=>`style=${q}${s};background-image:none !important;background:#ffffff !important;${q}`)
        : m.replace(/>$/, ' style="background-image:none !important;background:#ffffff !important;">')
    );
  } catch {}
  return out;
};

// Format effectivity date (Mon DD, YYYY)
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

// Page size helpers
const DPI = 96;
const inchesToPx = (inches) => Math.max(0, Math.round(Number(inches || 0) * DPI));
const PAPER_SIZES = {
  a4: { w: 8.27, h: 11.69 },
  letter: { w: 8.5, h: 11 },
  legal: { w: 8.5, h: 14 },
};

function resolveAssetUrl(p) {
  if (!p || typeof p !== 'string') return '';
  if (/^https?:\/\//i.test(p)) return p;
  const fileService = process.env.FILE_SERVICE_URL || '';
  if (p.startsWith('/assets/')) {
    return fileService ? `${fileService.replace(/\/$/, '')}/uploads${p}` : `/uploads${p}`;
  }
  if (p.startsWith('/uploads/')) {
    return fileService ? `${fileService.replace(/\/$/, '')}${p}` : p;
  }
  return p;
}

// Build document thumbnail envelope (mirrors template-service, uses from_template.headerConfig when available)
function buildDocumentThumbnailHtml(doc = {}) {
  const headerCfg = doc.headerConfig || doc.from_template?.headerConfig || {};
  const pageSetup = doc.pageSetup || doc.from_template?.pageSetup || {};
  const paper = String(pageSetup.paperSize || 'A4').toLowerCase();
  const orient = String(pageSetup.orientation || 'Portrait').toLowerCase();
  const baseSize = PAPER_SIZES[paper] || PAPER_SIZES.a4;
  const pageWIn = orient === 'landscape' ? baseSize.h : baseSize.w;
  const pageHIn = orient === 'landscape' ? baseSize.w : baseSize.h;
  const width = inchesToPx(pageWIn);
  const height = inchesToPx(pageHIn);
  const m = pageSetup.margins || { top: 1, bottom: 1, left: 1, right: 1 };
  const mt = inchesToPx(m.top); const mb = inchesToPx(m.bottom); const ml = inchesToPx(m.left); const mr = inchesToPx(m.right);

  const headerEnabled = !!headerCfg.headerEnabled;
  const footerEnabled = !!headerCfg.footerEnabled;
  const docCode = (doc.document_code || doc.from_template?.document_code) ? String(doc.document_code || doc.from_template.document_code).trim() : '';
  const revisionRaw = (doc.revision_no ?? doc.revisionNo ?? doc.from_template?.revision_no ?? '').toString();
  const revisionNo = revisionRaw ? (/^\d$/.test(revisionRaw) ? `0${revisionRaw}` : revisionRaw) : '';
  const effectivityStr = formatEffectivityDate(doc.effectivity || doc.from_template?.effectivity || '');
  const pageNumCfg = headerCfg?.footer?.pageNumber || {};
  const pageStr = (pageNumCfg.pattern || '{page} of {total}').replace('{page}','1').replace('{total}','1');

  const centerCfg = headerCfg?.header?.centerText || {};
  const centerLines = centerCfg?.enabled ? [centerCfg.line1, centerCfg.line2, centerCfg.line3, (centerCfg.showLine4 ? centerCfg.line4 : null)].filter(Boolean) : [];
  const centerFontSize = centerCfg.fontSize || 14;
  const lineH = centerFontSize * 1.15;
  const centerBlockH = centerLines.length ? Math.ceil(centerLines.length * lineH) + 6 : 0;
  const sluH = (headerCfg?.header?.logos?.slu?.enabled ? Number(headerCfg.header.logos.slu.sizePx || 56) : 0) || 0;
  const cicmH = (headerCfg?.header?.logos?.cicm?.enabled ? Number(headerCfg.header.logos.cicm.sizePx || 52) : 0) || 0;
  const hasDocCode = !!docCode;
  const metaRows = hasDocCode ? [docCode, revisionNo, effectivityStr, (pageNumCfg?.enabled ? pageStr : '')].filter(Boolean).length : 0;
  const metaH = hasDocCode && metaRows ? (metaRows * 22 + 8) : 0;
  const headerHeightPx = (headerEnabled || (hasDocCode && metaRows)) ? Math.max(96, sluH, cicmH, centerBlockH, metaH) : (headerEnabled ? Math.max(96, sluH, cicmH, centerBlockH) : 0);

  // Build field definition map: key(id) -> { name, placeholder }
  const fieldDefMap = (() => {
    const out = new Map();
    const sections = doc.from_template?.fields || [];
    sections.forEach(section => {
      if (Array.isArray(section?.fields)) {
        section.fields.forEach(f => {
          if (!f || !f.id) return;
          out.set(String(f.id), { name: f.name || f.id, placeholder: f.placeholder || '' });
        });
      }
    });
    return out;
  })();

  const fieldValues = doc.field_values || {};

  const firstDoc = (Array.isArray(doc.pages_json) && doc.pages_json.length)
    ? doc.pages_json[0]
    : (Array.isArray(doc.from_template?.pages_json) && doc.from_template.pages_json.length ? doc.from_template.pages_json[0] : null);
  let bodyHtml = '';
  if (firstDoc && Array.isArray(firstDoc.content)) {

    const buildRichImage = (node) => {
      if (!node || !node.attrs) return '';
      const srcVal = node.attrs.srcOriginal || node.attrs.src;
      if (!srcVal) return '';
      // Compute available content width (account for page left/right margins)
      const pageInnerWidth = Math.max(0, width - ml - mr);

      // Parse requested sizes (numbers in px expected)
      const rawW = Number(node.attrs.width) || 0;
      const rawH = Number(node.attrs.height) || 0;
      const keepAspect = (node.attrs.keepAspect === undefined) ? true : !!node.attrs.keepAspect;

      // Decide final width/height (clamp width to page inner width)
      let finalW = rawW || pageInnerWidth;
      if (finalW > pageInnerWidth) finalW = pageInnerWidth;
      let styleParts = [`max-width:${pageInnerWidth}px`, 'display:block'];

      // If keepAspect and we have original width/height, set width and let height auto to preserve aspect
      if (keepAspect && rawW && rawH) {
        styleParts.push(`width:${finalW}px`);
        styleParts.push('height:auto');
      } else {
        // Non-aspect-preserving: apply provided width/height (clamped width)
        if (rawW) styleParts.push(`width:${finalW}px`);
        if (rawH) styleParts.push(`height:${rawH}px`);
      }

      if (node.attrs.objectFit) styleParts.push(`object-fit:${escapeHtml(node.attrs.objectFit)}`);

      // Opacity in editor may be 0-100 or 0-1; normalize to 0-1
      if (node.attrs.opacity !== undefined && node.attrs.opacity !== null) {
        const op = Number(node.attrs.opacity) || 0;
        const norm = op > 1 ? Math.min(1, op / 100) : op;
        styleParts.push(`opacity:${norm}`);
      }

      // Alignment: center -> auto margins; right -> margin-left:auto; left -> no extra margins
      const align = String(node.attrs.align || '').toLowerCase();
      if (align === 'center') styleParts.push('margin-left:auto', 'margin-right:auto');
      else if (align === 'right') styleParts.push('margin-left:auto');

      const style = styleParts.filter(Boolean).map(s => s.endsWith(';') ? s : `${s};`).join('');
      const src = resolveAssetUrl(srcVal);
      return `<img src="${escapeHtml(src)}" style="${style}" alt="image" />`;
    };
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
          const fid = ch?.attrs?.key ? String(ch.attrs.key) : '';
          const def = fid ? fieldDefMap.get(fid) : null;
          // Attempt resolution by field name first; falling back to ID
          const resolvedVal = def && fieldValues ? (fieldValues[def.name] ?? fieldValues[fid]) : (fieldValues ? fieldValues[fid] : null);
          const valStr = (resolvedVal !== undefined && resolvedVal !== null) ? String(resolvedVal).trim() : '';
          const display = valStr !== ''
            ? `<span style="color:#111;">${escapeHtml(valStr)}</span>`
            : `<span style="color:#999;font-style:italic;">${escapeHtml(def?.placeholder || ch?.attrs?.placeholder || '')}</span>`;
          p += display;
          hasRenderable = true;
        } else if (ch.type === 'richImage' || ch.type === 'image') {
          p += buildRichImage(ch);
          hasRenderable = true;
        }
      });
      if (!hasRenderable) p += '&nbsp;';
      p += '</p>';
      return p;
    };
    firstDoc.content.forEach(n => {
      if (n.type === 'paragraph') bodyHtml += buildParagraph(n);
      else if (n.type === 'richImage' || n.type === 'image') bodyHtml += buildRichImage(n);
    });
  }

  const assetSlu = resolveAssetUrl(headerCfg.assets?.slu || '/assets/images/slu-logo.png');
  const assetCicm = resolveAssetUrl(headerCfg.assets?.cicm || '/assets/images/cicm-logo.png');
  const showHeaderLine = !!(centerCfg?.showHeaderLine || headerCfg?.showHeaderLine);

  const html = `<!doctype html><html><head><meta charset="utf-8" />
  <style>
    body{ margin:0; background:#f5f7f9; }
    .thumb-page{ width:${width}px; height:${height}px; background:#fff; position:relative; box-sizing:border-box; }
    .thumb-header{ position:absolute; left:${ml}px; right:${mr}px; top:${mt}px; height:${headerHeightPx}px; box-sizing:border-box; ${showHeaderLine ? 'border-bottom:1px solid #000;' : ''} }
    .thumb-header-inner{ display:flex; flex-direction:row; align-items:stretch; justify-content:space-between; width:100%; height:100%; }
    .hdr-left,.hdr-right{ display:flex; flex-direction:row; align-items:center; gap:8px; padding:4px 0 0 0; }
    .hdr-center{ flex:1; display:flex; flex-direction:column; justify-content:center; text-align:center; }
    .hdr-center div{ font:${centerCfg?.bold?'700':'400'} ${centerFontSize}px/1.15 ${escapeHtml(centerCfg?.fontFamily||'Inter, system-ui, Arial, sans-serif')}; color:${escapeHtml(centerCfg?.color||'#000')}; }
    .hdr-center div.l3{ font-size:12px; }
    .hdr-meta{ border:1px solid #000; border-collapse:collapse; font:11px Arial, sans-serif; background:#fff; }
    .hdr-meta td{ border:1px solid #000; padding:2px 6px; white-space:nowrap; }
    .thumb-main{ position:absolute; left:${ml}px; right:${mr}px; top:${mt + headerHeightPx}px; bottom:${mb}px; overflow:hidden; }
    .thumb-main p{ margin:3px 0; font:14px/1.3 Inter, system-ui, Arial, sans-serif; color:#111; }
  </style></head><body>
    <div class="thumb-page">
      ${(headerEnabled || metaRows) ? `<div class="thumb-header"><div class="thumb-header-inner">
        <div class="hdr-left">${headerCfg?.header?.logos?.slu?.enabled ? `<img style="height:${headerCfg.header.logos.slu.sizePx || 56}px" src="${escapeHtml(assetSlu)}" alt="slu"/>` : ''}</div>
        <div class="hdr-center">${centerLines.map((l,i)=>`<div class="${i===2?'l3':''}">${escapeHtml(l)}</div>`).join('')}</div>
        <div class="hdr-right">${headerCfg?.header?.logos?.cicm?.enabled ? `<img style="height:${headerCfg.header.logos.cicm.sizePx || 52}px" src="${escapeHtml(assetCicm)}" alt="cicm"/>` : ''}
          ${hasDocCode ? `<table class="hdr-meta">${docCode?`<tr><td>Document Code</td><td>${escapeHtml(docCode)}</td></tr>`:''}${revisionNo?`<tr><td>Revision No.</td><td>${escapeHtml(revisionNo)}</td></tr>`:''}${effectivityStr?`<tr><td>Effectivity</td><td>${escapeHtml(effectivityStr)}</td></tr>`:''}${pageNumCfg?.enabled?`<tr><td>Page</td><td>${escapeHtml(pageStr)}</td></tr>`:''}</table>`:''}
        </div></div></div>` : ''}
      <div class="thumb-main">${bodyHtml}</div>
    </div>
  </body></html>`;
  return { html, width, height };
}

export async function renderHtmlToImageBuffer(html, { width = 794, height = 1123 } = {}) {
  let browser;
  try {
    let workingHtml = hideWatermarksInHtml(html || '');
    browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'] });
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    try { await page.setContent(workingHtml, { waitUntil: 'networkidle0', timeout: 20000 }); }
    catch { await page.setContent(workingHtml, { waitUntil: 'load', timeout: 20000 }); }
    try { await page.emulateMediaType('screen'); } catch {}
    try { await Promise.race([
      page.evaluate(() => (document && document.fonts) ? document.fonts.ready : Promise.resolve()),
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('fonts timeout')),8000))
    ]); } catch {}
    try { await page.evaluate(() => Promise.all(Array.from(document.images||[]).map(img => img.complete?Promise.resolve():new Promise(res=>{img.onload=res;img.onerror=res;})))); } catch {}
    let buffer = await page.screenshot({ type:'png', fullPage:false });
    return buffer;
  } finally { if (browser) try { await browser.close(); } catch {} }
}

export async function uploadDocumentThumbnail(imageBuffer, documentId) {
  const fileServerUrl = process.env.FILE_SERVICE_URL || 'http://localhost:5005';
  const thumbnailFilename = `${documentId}.png`;
  const formData = new FormData();
  formData.append('document', imageBuffer, thumbnailFilename);
  formData.append('owner', 'document');
  formData.append('folderName', 'thumbnail');
  formData.append('documentId', documentId);
  formData.append('overwrite', 'true');
  try {
    const resp = await axios.post(fileServerUrl + '/api/files/upload/document', formData, { headers: formData.getHeaders(), timeout: 20000 });
    const out = resp?.data || {};
    return out.filePath || out.url || null;
  } catch (e) {
    console.error('[Document Thumbnail] Upload failed', e?.message || e);
    return null;
  }
}

export async function generateDocumentThumbnail(doc) {
  try {
    const built = buildDocumentThumbnailHtml(doc || {});
    const htmlRaw = built?.html;
    if (!htmlRaw) return null;
    const buffer = await renderHtmlToImageBuffer(htmlRaw, { width: built.width, height: built.height }).catch(e=>{ console.error('[Document Thumbnail] render error', e?.message||e); return null; });
    if (!buffer) return null;
    const documentId = doc._id?.toString() || 'document';
    return await uploadDocumentThumbnail(buffer, documentId);
  } catch (e) {
    console.error('generateDocumentThumbnail error', e?.message || e);
    return null;
  }
}

export const generateDocumentThumbnailInternal = async (doc) => {
  try {
    let url = await generateDocumentThumbnail(doc);
    if (!url) {
      // fallback plain text
      try {
        const first = Array.isArray(doc.pages_json) && doc.pages_json.length
          ? doc.pages_json[0]
          : (Array.isArray(doc.from_template?.pages_json) && doc.from_template.pages_json.length ? doc.from_template.pages_json[0] : null);
        let text = '';
        if (first && Array.isArray(first.content)) {
          text = first.content.flatMap(n => (n.content||[])).filter(n => n && n.type === 'text').map(n => n.text || '').join(' ').slice(0,300);
        }
        const fallbackHtml = `<!doctype html><html><head><meta charset=\"utf-8\" /></head><body><div style=\"font:14px Arial;padding:32px;\"><h3 style=\"margin-top:0\">${escapeHtml(doc.title || 'Document')}</h3><p>${escapeHtml(text)}</p></div></body></html>`;
        const buf = await renderHtmlToImageBuffer(fallbackHtml).catch(()=>null);
        if (buf) url = await uploadDocumentThumbnail(buf, doc._id?.toString() || 'document');
      } catch (e) { console.error('[Document Thumbnail] fallback failed', e?.message || e); }
    }
    if (url) {
      doc.thumbnailUrl = url;
      try { await doc.save(); } catch (e) { console.warn('[Document Thumbnail] save failed (non-fatal)', e?.message || e); }
    }
    return url;
  } catch (e) {
    console.error('generateDocumentThumbnailInternal error', e?.message || e);
    return null;
  }
};
