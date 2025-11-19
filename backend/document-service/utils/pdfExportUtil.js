// pdfExporter.js
import puppeteer from 'puppeteer';
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

export const escapeHtml = (unsafe) => {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// OLD JSON-BASED EXPORT SUPPORT (kept for compatibility)
export const pagesJsonToHtml = (pages = [], fieldValues = {}) => {
  const parts = [];

  for (const page of pages) {
    if (!page || !Array.isArray(page.content)) continue;

    for (const node of page.content) {
      if (!node) continue;

      if (node.type === 'paragraph') {
        if (!Array.isArray(node.content) || node.content.length === 0) {
          parts.push('<p></p>');
          continue;
        }

        const children = node.content
          .map((child) => {
            if (!child) return '';
            if (child.type === 'text') return escapeHtml(child.text || '');
            if (child.type === 'editableField') {
              const key = child.attrs?.key || child.attrs?.name || 'field';
              const val =
                fieldValues && Object.prototype.hasOwnProperty.call(fieldValues, key)
                  ? fieldValues[key]
                  : child.attrs?.placeholder || '';
              return `<span class="editable-field" data-key="${escapeHtml(
                key
              )}">${escapeHtml(val)}</span>`;
            }
            return '';
          })
          .join('');

        parts.push(`<p>${children}</p>`);
      }

      if (node.type === 'text') {
        parts.push(`<p>${escapeHtml(node.text || '')}</p>`);
      }
    }

    parts.push('<div class="page-break"></div>');
  }

  return parts.join('\n');
};

// OPTIONAL basic wrapper
export const buildDocumentHtml = (doc = {}, bodyHtml = '', logoUrl = null) => {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        html, body {
          margin: 0;
          padding: 0;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #111;
          padding: 20px;
        }
        .header { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
        .header img { height:40px; }
        .editable-field { background: #fff8e6; padding: 2px 4px; border-radius: 2px; }
        .page-break { page-break-after: always; }
        p { margin: 8px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoUrl ? `<img src="${logoUrl}" alt="logo" />` : ''}
        <div>
          <div style="font-weight:700">${escapeHtml(doc.title || '')}</div>
          <div style="font-size:12px; color:#666">
            ${escapeHtml(doc.school || '')} — ${escapeHtml(doc.department || '')}
          </div>
        </div>
      </div>
      <main>${bodyHtml}</main>
    </body>
  </html>`;
};

/* -------------------------------------------------------------------------- */
/*  PDF GENERATION                                                            */
/* -------------------------------------------------------------------------- */
export const generatePdfBuffer = async (html, pageSetup = {}) => {
  const debugPrefix = 'generatePdfBuffer:';
  console.log(debugPrefix, 'START, html length =', html ? html.length : 0);
  console.log(debugPrefix, 'pageSetup =', JSON.stringify(pageSetup));

  if (typeof html !== 'string' || !html.trim()) {
    throw new Error('generatePdfBuffer: html must be a non-empty string');
  }

  const isEditorHtml =
    html.includes('class="tiptap') ||
    html.includes("class='tiptap") ||
    html.includes('nd-editor-canvas') ||
    html.includes('tiptap-page-break') ||
    html.includes('rm-with-pagination');

  console.log(debugPrefix, 'isEditorHtml =', isEditorHtml);

  const dbMargins = pageSetup.margins || {};

  try {
    if (typeof hideWatermarksInHtml === 'function') {
      html = hideWatermarksInHtml(html);
    }
  } catch (e) {
    console.warn(debugPrefix, 'hideWatermarksInHtml failed:', e?.message || e);
  }

  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ];

  console.log(debugPrefix, 'launching puppeteer with args', launchArgs);

  const browser = await puppeteer.launch({
    args: launchArgs,
    headless: true,
  });

  try {
    const page = await browser.newPage();

    const paperName = String(pageSetup.paperSize || 'A4');
    const orient = String(pageSetup.orientation || 'Portrait').toLowerCase();
    const format = paperName;
    const landscape = orient === 'landscape';

    const cleanupCss = `
      <style>
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }

        body { display: block; }

        .rm-with-pagination,
        .rm-page,
        .rm-page-break,
        .ProseMirror,
        .tiptap,
        .tiptap-page,
        .tiptap-page-inner,
        .tiptap-page-break,
        .nd-editor-root,
        .nd-editor-canvas {
          background: #ffffff !important;
          background-image: none !important;
          box-shadow: none !important;
          border: none !important;
        }

        .page-break-background,
        .page-break-background * ,
        [class*="page-break-background"],
        [class*="page-break-bg"],
        [class*="page-footer-background"],
        .tiptap-pagination-gap,
        .rm-pagination-separator,
        .rm-page-gap {
          display: none !important;
        }

        .nd-editable-field,
        .editable-field,
        [data-node="editable-field"] {
          background: transparent !important;
          border: none !important;
          outline: none !important;
          padding: 0 !important;
          box-shadow: none !important;
          filter: none !important;
        }

        @page {
          margin: 0;
        }
      </style>
    `;

    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>\n${cleanupCss}`);
    } else if (/<html[^>]*>/i.test(html)) {
      html = html.replace(
        /<html([^>]*)>/i,
        `<html$1><head>${cleanupCss}</head>`
      );
    } else {
      html = `<!doctype html><html><head>${cleanupCss}</head><body>${html}</body></html>`;
    }
    // Ensure images referenced from the files-service (uploads/assets) are absolute URLs
    try {
      const fileService = (process.env.FILE_SERVICE_URL || process.env.FILE_SERVICE_HOST || 'http://localhost:5004').replace(/\/$/, '');

      // Attempt to inline local logos from backend/document-service/assets/images first
      try {
        const TARGET_LOGOS = ['cicm-logo.png', 'slu-logo.png'];
        for (const name of TARGET_LOGOS) {
          try {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const localPath = path.resolve(__dirname, '..', 'assets', 'images', name);
            const buf = await fs.readFile(localPath);
            const ext = String(name).split('.').pop().toLowerCase();
            const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
            const dataUrl = `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
            // replace occurrences of any assets/images path ending with the name, and bare name
            html = html.replace(new RegExp(`[^"']*assets/images/${name}`, 'g'), dataUrl);
            html = html.replace(new RegExp(`/assets/images/${name}`, 'g'), dataUrl);
            html = html.replace(new RegExp(`assets/images/${name}`, 'g'), dataUrl);
            html = html.replace(new RegExp(name, 'gi'), dataUrl);
          } catch (_) {
            // missing locally, ignore
          }
        }
      } catch (e) {
        // ignore local inline failures
      }

      // Replace src attributes that point to uploads/assets or uploads with absolute file service URL
      html = html.replace(/src=("|')([^"']+)("|')/gi, (m, q1, src, q3) => {
        const low = src.trim();
        if (/^(https?:)?\/\//i.test(low) || /^data:/i.test(low)) return `src=${q1}${src}${q3}`;
        if (/\buploads\b|\bassets\b/i.test(low)) {
          const path = low.startsWith('/') ? low : `/${low}`;
          return `src=${q1}${fileService}${path}${q3}`;
        }
        return `src=${q1}${src}${q3}`;
      });

      // Replace CSS url(...) usages
      html = html.replace(/url\(("|')?([^\)"']+)("|')?\)/gi, (m, q1, url) => {
        const low = url.trim();
        if (/^(https?:)?\/\//i.test(low) || /^data:/i.test(low)) return `url(${q1 || ''}${url}${q1 || ''})`;
        if (/\buploads\b|\bassets\b/i.test(low)) {
          const path = low.startsWith('/') ? low : `/${low}`;
          return `url(${q1 || ''}${fileService}${path}${q1 || ''})`;
        }
        return `url(${q1 || ''}${url}${q1 || ''})`;
      });

      // Fetch matching file-service images and inline them as data URLs so Puppeteer does not need external auth
      try {
        const imgUrls = new Set();

        // Prepare headers and fetch helper so we can inline specific logos early
        const headers = {};
        if (process.env.FILE_SERVICE_AUTH_HEADER && process.env.FILE_SERVICE_AUTH_TOKEN) {
          headers[process.env.FILE_SERVICE_AUTH_HEADER] = process.env.FILE_SERVICE_AUTH_TOKEN;
        }

        const fetchImage = async (url) => {
          try {
            const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000, headers });
            const ct = resp.headers && resp.headers['content-type'] ? resp.headers['content-type'] : 'application/octet-stream';
            const base64 = Buffer.from(resp.data, 'binary').toString('base64');
            return `data:${ct};base64,${base64}`;
          } catch (err) {
            console.warn(debugPrefix, 'fetchImage failed for', url, err?.message || err);
            return null;
          }
        };

        // (target logos have been inlined from local assets earlier)

        // collect img srcs (absolute or file-service-relative)
        html.replace(/<img[^>]+src=("|')([^"']+)("|')[^>]*>/gi, (_, _q, src) => {
          const raw = String(src || '').trim();
          if (!raw) return _;

          if (/^(https?:)?\/\//i.test(raw)) {
            // absolute URL
            if (raw.startsWith(fileService)) imgUrls.add(raw);
          } else if (/\buploads\b|\bassets\b/i.test(raw) || raw.startsWith('/')) {
            // relative file-service path -> make absolute
            const path = raw.startsWith('/') ? raw : `/${raw}`;
            imgUrls.add(`${fileService}${path}`);
          }

          return _;
        });

        // collect CSS url(...) occurrences (absolute or file-service-relative)
        html.replace(/url\(("|')?([^\)"']+)("|')?\)/gi, (_, _q1, url) => {
          const raw = String(url || '').trim();
          if (!raw) return _;

          if (/^(https?:)?\/\//i.test(raw)) {
            if (raw.startsWith(fileService)) imgUrls.add(raw);
          } else if (/\buploads\b|\bassets\b/i.test(raw) || raw.startsWith('/')) {
            const path = raw.startsWith('/') ? raw : `/${raw}`;
            imgUrls.add(`${fileService}${path}`);
          }

          return _;
        });

        if (imgUrls.size) {
          // perform sequential fetches (small number of images expected)
          for (const url of Array.from(imgUrls)) {
            const dataUrl = await fetchImage(url);
            if (dataUrl) {
              // replace exact occurrences of the url in HTML (both src and url(...))
              const esc = url.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
              const re1 = new RegExp(`(src=("|'))${esc}(("|'))`, 'g');
              html = html.replace(re1, `$1${dataUrl}$3`);
              const re2 = new RegExp(`(url\(("|')?)${esc}(("|')?\))`, 'g');
              html = html.replace(re2, `$1${dataUrl}$3`);
            }
          }
        }
      } catch (e) {
        console.warn(debugPrefix, 'inline-file-service-assets failed:', e?.message || e);
      }
    } catch (e) {
      console.warn(debugPrefix, 'make-image-urls-absolute failed:', e?.message || e);
    }

    await page.setViewport({ width: 1024, height: 768 });

    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch (e1) {
      console.warn(debugPrefix, 'domcontentloaded timeout, retry with load:', e1?.message || e1);
      try {
        await page.setContent(html, { waitUntil: 'load', timeout: 20000 });
      } catch (e2) {
        console.warn(debugPrefix, 'load timeout, final setContent without waitUntil:', e2?.message || e2);
        await page.setContent(html, { timeout: 0 });
      }
    }

    try { await page.emulateMediaType('screen'); } catch (_) {}

    try {
      await Promise.race([
        page.evaluate(() =>
          document && document.fonts ? document.fonts.ready : Promise.resolve()
        ),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error('fonts wait timeout')), 10000)
        ),
      ]);
    } catch (e) {
      console.warn(debugPrefix, 'fonts wait warning:', e?.message || e);
    }

    try {
      await page.evaluate(() =>
        Promise.all(
          Array.from(document.images || []).map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((res) => {
                  img.onload = res;
                  img.onerror = res;
                })
          )
        )
      );
    } catch (e) {
      console.warn(debugPrefix, 'images wait warning:', e?.message || e);
    }

    // 4) Strip placeholder chrome from editable fields (unchanged)
    // Prepare a deterministic pageSetup object for the page script so we compute
    // page boundaries the same way the editor does (inches -> px using 96dpi)
    const PAGE_DIMENSIONS = {
      A4: { width: 8.27, height: 11.69 },
      Letter: { width: 8.5, height: 11 },
      Legal: { width: 8.5, height: 14 },
    };

    const pgName = String(pageSetup.paperSize || format || 'A4');
    const pageDims = PAGE_DIMENSIONS[pgName] || PAGE_DIMENSIONS.A4;
    const evalPageSetup = {
      paperHeightIn: pageDims.height,
      paperWidthIn: pageDims.width,
      margins: {
        top: Number(dbMargins.top ?? pageSetup.margins?.top ?? defaultMargins.top) || 0,
        bottom: Number(dbMargins.bottom ?? pageSetup.margins?.bottom ?? defaultMargins.bottom) || 0,
        left: Number(dbMargins.left ?? pageSetup.margins?.left ?? defaultMargins.left) || 0,
        right: Number(dbMargins.right ?? pageSetup.margins?.right ?? defaultMargins.right) || 0,
      },
      dpi: 96,
      // fraction of page height to bias page-index computation so "early start" occurs
      earlyStartPct: pageSetup.earlyStartPct ?? 0.08,
      // how far above bottom to place page numbers (inches)
      pageNumberBottomIn: pageSetup.pageNumberBottomIn ?? 0.25,
      isEditorHtml: !!isEditorHtml,
    };

    try {
      await page.evaluate((ps) => {
        const fields = document.querySelectorAll(
          '[data-node="editable-field"], .nd-editable-field, .editable-field'
        );

        fields.forEach((el) => {
          try {
            const ph =
              el.getAttribute('data-ph') ||
              el.getAttribute('data-placeholder') ||
              (el.dataset ? el.dataset.ph || el.dataset.placeholder : null) ||
              el.getAttribute('placeholder');

            const text = (el.textContent || '')
              .replace(/\u00A0/g, ' ')
              .trim();

            const isEmpty = text.length === 0;
            const isPlaceholder =
              ph &&
              text &&
              text.toLowerCase() === String(ph).trim().toLowerCase();

            const markedEmpty =
              el.getAttribute('data-empty') === 'true' ||
              el.classList.contains('placeholder') ||
              el.classList.contains('is-placeholder');

            if (isEmpty || isPlaceholder || markedEmpty) {
              el.remove();
            } else {
              const node = document.createTextNode(text);
              el.replaceWith(node);
            }
          } catch (_) {}
        });
      });
    } catch (fieldsErr) {
      console.warn(
        debugPrefix,
        'editable-field cleanup failed:',
        fieldsErr?.message || fieldsErr
      );
    }

    // 4.5) Adjust virtual page spacers so 1 editor page ≈ 1 real PDF page
    try {
      await page.evaluate(() => {
        const SCALE = 0.75; // 96 css px → 72pt page units
        const PUSH = 0;     // extra pixels if you ever need to nudge down

        const spacers = document.querySelectorAll('.tiptap-page-break > .page');
        spacers.forEach((el) => {
          const mt = window.getComputedStyle(el).marginTop;
          const match = mt && mt.match(/(-?\d+(\.\d+)?)px/);
          if (!match) return;
          const original = parseFloat(match[1]);
          if (!Number.isFinite(original)) return;

          const adjusted = original * SCALE + PUSH;
          el.style.marginTop = `${adjusted}px`;
        });
      });
    } catch (e) {
      console.warn(
        debugPrefix,
        'page-break spacer adjustment failed:',
        e?.message || e
      );
    }

    // Adjust page-number element positions and handle trail-break header movement
    try {
      await page.evaluate(() => {
        try {
          const pageSelectors = ['.tiptap-page', '.rm-page', '.rm-page-inner', '.page'];
          const pages = Array.from(document.querySelectorAll(pageSelectors.join(',')));

          // compute useful geometry using the passed page setup
          const dpi = ps && ps.dpi ? ps.dpi : 96;
          const paperHeightPx = Math.max(1, (ps.paperHeightIn - (ps.margins?.top || 0) - (ps.margins?.bottom || 0)) * dpi);
          const marginsTopPx = (ps.margins?.top || 0) * dpi;
          const bodyRect = document.body.getBoundingClientRect();

          const pageNumRegex = /\b\d+\s+of\s+\d+\b|\{page\}/i;
          const headerSelector = '.tiptap-page-header, .rm-page-header, header, .page-header, .tiptap-page-header-left, .tiptap-page-header-center';

          // ensure each page container is positioned for absolute children
          pages.forEach((p) => {
            try {
              const computed = window.getComputedStyle(p);
              if (computed.position === 'static') p.style.position = 'relative';
            } catch (_) {}
          });

          // store page metadata on the document and each page element (like tiptap does)
          try {
            try {
              document.documentElement.dataset.pageHeightPx = String(Math.round(paperHeightPx));
              document.documentElement.dataset.pageMargins = JSON.stringify(ps.margins || {});
            } catch (_) {}

            pages.forEach((p, i) => {
              try {
                const pageTop = Math.round(marginsTopPx + i * paperHeightPx);
                p.dataset.pageIndex = String(i);
                p.dataset.pageTop = String(pageTop);
                p.dataset.pageHeight = String(Math.round(paperHeightPx));
                p.dataset.pageNumber = String(i + 1);
              } catch (_) {}
            });
          } catch (_) {}

          // Move header elements forward when a trail-break marker exists inside a page
          pages.forEach((p, idx) => {
            try {
              const trail = p.querySelector('.trail-break, [data-trail-break]');
              if (!trail) return;
              // compute the page index of the trail element using absolute position
              const trailRect = trail.getBoundingClientRect();
              const trailY = trailRect.top - bodyRect.top; // px from body top
              // allow a small early-start bias so page counting behaves like the editor
              const earlyPct = (ps && typeof ps.earlyStartPct === 'number') ? ps.earlyStartPct : 0.08;
              const earlyOffsetPx = Math.max(0, Math.round(paperHeightPx * earlyPct));
              const currentPageIndex = Math.floor((trailY - marginsTopPx + earlyOffsetPx) / paperHeightPx);
              const targetPageIndex = currentPageIndex + 1;
              const next = pages[targetPageIndex] || pages[idx + 1];
              if (!next) return;

              const header = p.querySelector(headerSelector);
              if (!header) return;

              // move header (not clone) into next page so it appears after the break
              try { next.insertBefore(header, next.firstChild || null); } catch (_) {}

              try {
                if (window.getComputedStyle(header).position === 'static') header.style.position = 'absolute';
                header.style.top = '0.25in';
                header.style.left = '0';
                header.style.right = '0';
                header.style.boxSizing = 'border-box';
                header.style.zIndex = '1000';
              } catch (_) {}

              // ensure next page has padding so content doesn't overlap moved header
              try {
                const rect = header.getBoundingClientRect();
                const height = rect && rect.height ? rect.height : 48;
                const existing = parseFloat(window.getComputedStyle(next).paddingTop) || 0;
                const needed = height + 16; // slightly larger gap to avoid overlap
                if (existing < needed) next.style.paddingTop = `${needed}px`;
              } catch (_) {}
            } catch (_) {}
          });

          // Position and normalize page numbers
          pages.forEach((p) => {
            try {
              // prefer explicit page-number elements in footers
              const footerEl = p.querySelector('.rm-page-footer, .rm-first-page-footer, .rm-page-footer-right, .rm-page-footer-left, footer');
              let nums = [];
              if (footerEl) nums = Array.from(footerEl.querySelectorAll('.rm-page-number, .page-number, .tiptap-page-number'));

              if (!nums.length) {
                // fallback: find any element inside page that matches page-num pattern
                const walker = document.createTreeWalker(p, NodeFilter.SHOW_ELEMENT, null, false);
                let node;
                while ((node = walker.nextNode())) {
                  try {
                    const txt = (node.textContent || '').trim();
                    if (!txt) continue;
                    if (pageNumRegex.test(txt)) { nums = [node]; break; }
                  } catch (_) {}
                }
              }

              nums.forEach((node) => {
                try {
                  // normalize "1 of 2" -> "Page 1 of 2"
                  try {
                    const t = (node.textContent || '').trim();
                    const m = t.match(/^(\d+\s+of\s+\d+)$/i);
                    if (m && !/^page\s+/i.test(t)) node.textContent = `Page ${m[1]}`;
                  } catch (_) {}

                  if (window.getComputedStyle(node).position === 'static') node.style.position = 'absolute';
                  // pin page numbers to configured distance above page bottom (default 0.25in)
                  try { node.style.bottom = (ps && typeof ps.pageNumberBottomIn === 'number' ? ps.pageNumberBottomIn : 0.25) + 'in'; } catch(_) { node.style.bottom = '0.25in'; }
                  node.style.margin = '0';
                  node.style.left = '';
                  node.style.right = '';
                  node.style.transform = '';
                  node.style.background = 'rgba(0,0,0,0.5)';
                  node.style.border = '1px solid rgba(255,255,255,0.8)';
                  node.style.borderRadius = '2px';
                  node.style.zIndex = '10';
                  node.style.padding = '2px 8px';
                  node.style.color = '#fff';
                  node.style.fontSize = node.style.fontSize || '11px';
                  node.style.lineHeight = '1';

                  // alignment: detect from parent or default right
                  const parent = node.parentElement || p;
                  const alignStyle = parent && parent.style && parent.style.textAlign ? parent.style.textAlign : '';
                  const align = (alignStyle || 'right').toLowerCase();
                  if (align.includes('left')) node.style.left = '16px';
                  else if (align.includes('center')) { node.style.left = '50%'; node.style.transform = 'translateX(-50%)'; }
                  else node.style.right = '16px';
                } catch (_) {}
              });
            } catch (_) {}
          });
        } catch (e) {
          // swallow page-side errors
        }
      }, evalPageSetup);
    } catch (e) {
      console.warn(debugPrefix, 'page-number/header placement failed:', e?.message || e);
    }

    /* ------------------------------------------------------------------ */
    /* 5) Margins for pdf()                                               */
    /* ------------------------------------------------------------------ */

    const defaultMargins = {
      top: dbMargins.top ?? 1,
      bottom: dbMargins.bottom ?? 1,
      left: dbMargins.left ?? 1,
      right: dbMargins.right ?? 1,
    };

    const margins = isEditorHtml
      ? { top: 0, bottom: 0, left: 0, right: 0 }
      : defaultMargins;

    console.log(
      debugPrefix,
      'isEditorHtml =',
      isEditorHtml,
      ' -> pdf margins(in) =',
      margins
    );

    const pdfOptions = {
      format,
      landscape,
      printBackground: true,
      margin: {
        top: `${margins.top}in`,
        bottom: `${margins.bottom}in`,
        left: `${margins.left}in`,
        right: `${margins.right}in`,
      },
    };

    const pdfBuffer = await page.pdf(pdfOptions);
    const normalized = Buffer.isBuffer(pdfBuffer)
      ? pdfBuffer
      : Buffer.from(pdfBuffer || []);

    console.log(
      debugPrefix,
      'page.pdf finished, buffer length =',
      normalized ? normalized.length : 0
    );

    if (!normalized || normalized.length === 0) {
      console.error(debugPrefix, 'WARNING: PDF buffer is empty');
    }

    await browser.close();
    return normalized;
  } catch (err) {
    console.error(debugPrefix, 'FATAL error during PDF generation:', err);
    try { await browser.close(); } catch (_) {}
    throw err;
  }
};

/* -------------------------------------------------------------------------- */
/*  UPLOAD HELPERS                                                            */
/* -------------------------------------------------------------------------- */

export const uploadPdfBuffer = async (
  pdfBuffer,
  {
    fileServerUrl = null,
    docId = '',
    owner = 'unknown',
    filename = 'export.pdf',
  } = {}
) => {
  const fileServer =
    fileServerUrl ||
    process.env.FILE_SERVICE_URL ||
    'http://localhost:5005';

  const form = new FormData();
  const stream = Readable.from(pdfBuffer);

  form.append('document', stream, {
    filename,
    contentType: 'application/pdf',
  });
  form.append('owner', String(owner));
  form.append('documentId', String(docId));
  form.append('folderName', 'exports');

  const headers = { ...form.getHeaders() };
  const resp = await axios.post(
    `${fileServer}/api/files/upload/document`,
    form,
    {
      headers,
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }
  );

  return resp?.data?.filePath || resp?.data?.path || null;
};

export const uploadPdfToStorage = async (
  pdfBuffer,
  {
    fileServerUrl = null,
    owner = 'unknown',
    folderId = null,
    filename = 'export.pdf',
    authHeaders = {},
  } = {}
) => {
  const fileServer =
    fileServerUrl ||
    process.env.FILE_SERVICE_URL ||
    'http://localhost:5004';

  const form = new FormData();
  const stream = Readable.from(pdfBuffer);

  form.append('files', stream, {
    filename,
    contentType: 'application/pdf',
  });
  form.append('owner', String(owner));
  form.append('user_id', String(owner));

  const headers = { ...form.getHeaders(), ...(authHeaders || {}) };

  // Upload to folder
  if (folderId) {
    const resp = await axios.post(
      `${fileServer}/api/storage/folders/${folderId}/files`,
      form,
      {
        headers,
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        withCredentials: true,
      }
    );
    const data = resp?.data || {};
    let filePath = null;

    const folder = data.folder || {};
    const candidates = Array.isArray(folder.dbfiles)
      ? folder.dbfiles
      : Array.isArray(folder.files)
      ? folder.files
      : [];

    if (candidates.length) {
      const byName = candidates.find(
        (f) => (f.originalName || f.filename) === filename
      );
      if (byName && (byName.path || byName.filePath)) {
        filePath = byName.path || byName.filePath;
      } else {
        const last = candidates[candidates.length - 1];
        if (last && (last.path || last.filePath)) {
          filePath = last.path || last.filePath;
        }
      }
    }

    return { target: 'folder', filePath: filePath || null, raw: data };
  }

  // Upload as orphan
  const resp = await axios.post(
    `${fileServer}/api/storage/files/upload-orphan`,
    form,
    {
      headers,
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      withCredentials: true,
    }
  );

  const data = resp?.data || {};
  let filePath = null;

  const files = Array.isArray(data.files) ? data.files : [];
  if (files.length) {
    const byName = files.find(
      (f) => (f.originalName || f.filename) === filename
    );
    if (byName && (byName.path || byName.filePath)) {
      filePath = byName.path || byName.filePath;
    } else {
      const last = files[files.length - 1];
      if (last && (last.path || last.filePath)) {
        filePath = last.path || last.filePath;
      }
    }
  }

  return { target: 'root', filePath: filePath || null, raw: data };
};
