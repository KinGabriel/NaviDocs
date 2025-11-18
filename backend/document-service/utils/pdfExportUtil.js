// pdfExporter.js
import puppeteer from 'puppeteer';
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

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
    try {
      await page.evaluate(() => {
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
      }A
    }
  }

  return { target: 'root', filePath: filePath || null, raw: data };
};
