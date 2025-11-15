import puppeteer from 'puppeteer';
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

// Inline remote images referenced in <img src="..."> as data URIs to avoid
// relying on external network from headless containers. Limits applied to
// avoid unbounded memory usage (maxImages, maxBytesPerImage).
const inlineRemoteImages = async (html, { timeout = 10000, maxImages = 10, maxBytesPerImage = 5 * 1024 * 1024 } = {}) => {
  if (!html || typeof html !== 'string') return html;
  // quick check for obvious cases
  if (!/\<img\s+[^>]*src=(["'])(https?:)?\/\//i.test(html)) return html;

  // collect unique URLs in order
  const urls = [];
  const urlSet = new Set();
  const imgRegex = /<img\s+[^>]*src=(["'])(.*?)\1[^>]*>/gi;
  let m;
  while ((m = imgRegex.exec(html)) && urls.length < maxImages) {
    const src = (m[2] || '').trim();
    if (!src) continue;
    if (src.startsWith('data:')) continue;
    // Only inline remote http(s) urls
    if (/^https?:\/\//i.test(src) && !urlSet.has(src)) {
      urlSet.add(src);
      urls.push(src);
    }
  }
  if (!urls.length) return html;

  for (const src of urls) {
    try {
      const resp = await axios.get(src, { responseType: 'arraybuffer', timeout });
      const bytes = resp.data;
      const len = bytes ? bytes.length || (bytes.byteLength || 0) : 0;
      if (len === 0 || len > maxBytesPerImage) {
        // skip very large or empty images
        continue;
      }
      const contentType = (resp.headers && resp.headers['content-type']) || 'application/octet-stream';
      const b64 = Buffer.from(bytes).toString('base64');
      const dataUri = `data:${contentType};base64,${b64}`;
      // Replace all occurrences of the src value conservatively (escape for regex)
      const esc = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(<img\\s+[^>]*src=(["']))${esc}((["'][^>]*>)?)`, 'gi');
      html = html.replace(re, (all, p1, p2, p3) => `${p1}${dataUri}${p3 || ''}`);
    } catch (e) {
      // ignore network errors and continue — we already have fallbacks in setContent
      console.warn && console.warn('inlineRemoteImages: failed to inline', src, e?.message || e);
    }
  }
  return html;
};

// simple helper to escape HTML
export const escapeHtml = (unsafe) => {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Preprocess incoming HTML to hide/remove typical watermark markup before rendering
const hideWatermarksInHtml = (sourceHtml) => {
  if (!sourceHtml || typeof sourceHtml !== 'string') return sourceHtml;
  let out = sourceHtml;
  try {
    //  Hide elements whose class/id/data attributes indicate watermark
    out = out.replace(/<([a-zA-Z][^\s/>]*)([^>]*?)\s((?:class|id|data-[a-zA-Z0-9_-]+|data-role))=(["'])([^\4>]*?watermark[^\4>]*?)\4([^>]*)>/gi,
      (match, tag, pre, attrName, quote, attrVal, post) => {
        // If there's already a style attribute, append our hide rules; else inject a new style
        if (/\sstyle\s*=/.test(match)) {
          return match.replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/i, (m2, q, s) => ` style=${q}${s};display:none !important;visibility:hidden !important;${q}`);
        }
        return `<${tag}${pre} style="display:none !important;visibility:hidden !important;" ${attrName}=${quote}${attrVal}${quote}${post}>`;
      }
    );

    // Neutralize background images on common page containers in their opening tag (rm-with-pagination, rm-page, rm-page-break)
    out = out.replace(/<([a-zA-Z][^\s/>]*)([^>]*?class=(["'])[^\3>]*?(rm-with-pagination|rm-page|rm-page-break)[^\3>]*?\3)([^>]*)>/gi,
      (match) => {
        if (/\sstyle\s*=/.test(match)) {
          return match.replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/i, (m2, q, s) => ` style=${q}${s};background-image:none !important;background:#ffffff !important;${q}`);
        }
        return match.replace(/>$/, ' style="background-image:none !important;background:#ffffff !important;">');
      }
    );

    //  As a last resort, strip any inline background-image on BODY
    out = out.replace(/<body([^>]*)>/i, (m, attrs) => {
      if (/style\s*=/.test(attrs)) {
        return m.replace(/style\s*=\s*(["'])([\s\S]*?)\1/i, (mm, q, s) => `style=${q}${s};background-image:none !important;background:#ffffff !important;${q}`);
      }
      return `<body${attrs} style="background-image:none !important;background:#ffffff !important;">`;
    });
  } catch (_) {
    // ignore parsing failures; proceed with original HTML
  }
  return out;
};

// Convert pages_json to simple HTML. This is minimal and can be extended to support more node types.
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
        const children = node.content.map(child => {
          if (!child) return '';
          if (child.type === 'text') return escapeHtml(child.text || '');
          if (child.type === 'editableField') {
            const key = child.attrs?.key || child.attrs?.name || 'field';
            const val = fieldValues && Object.prototype.hasOwnProperty.call(fieldValues, key) ? fieldValues[key] : child.attrs?.placeholder || '';
            return `<span class="editable-field" data-key="${escapeHtml(key)}">${escapeHtml(val)}</span>`;
          }
          return '';
        }).join('');
        parts.push(`<p>${children}</p>`);
      }
      if (node.type === 'text') parts.push(`<p>${escapeHtml(node.text || '')}</p>`);
    }
    parts.push('<div class="page-break"></div>');
  }
  return parts.join('\n');
};

export const buildDocumentHtml = (doc = {}, bodyHtml = '', logoUrl = null) => {
  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 20px; }
          .header { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
          .header img { height:40px; }
          .editable-field { background: #fff8e6; padding: 2px 4px; border-radius: 2px; }
          .page-break { page-break-after: always; }
          p { margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" alt="logo"/>` : ''}
          <div>
            <div style="font-weight:700">${escapeHtml(doc.title || '')}</div>
            <div style="font-size:12px; color:#666">${escapeHtml(doc.school || '')} — ${escapeHtml(doc.department || '')}</div>
          </div>
        </div>
        <main>
          ${bodyHtml}
        </main>
      </body>
    </html>`;
};

export const generatePdfBuffer = async (html, pageSetup = {}) => {
  const debugPrefix = 'generatePdfBuffer:';
  console.debug && console.debug(debugPrefix, 'starting puppeteer launch');

  const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];
  if (!launchArgs.includes('--disable-gpu')) launchArgs.push('--disable-gpu');

  const launchOptions = {
    args: launchArgs,
    headless: true,
  };

  // Prefer explicit executable path when provided via env (set in Dockerfiles)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();

    try {
      // 1) Pre-sanitize HTML (watermarks, backgrounds)
      try {
        if (typeof html === 'string' && html.length > 0) {
          html = hideWatermarksInHtml(html);
        }
      } catch (preErr) {
        console.warn(debugPrefix, 'pre-sanitize html failed:', preErr?.message || preErr);
      }

     // 2) Inject cleanup CSS (same as your version)
try {
  const paper = String(pageSetup.paperSize || 'A4');
  const orient = String(pageSetup.orientation || 'Portrait').toLowerCase();

  let cleanupCss = `\n<style>
:root, .rm-with-pagination {
  --pageGap: 0px !important;
  --pageGapBorderSize: 0px !important;
  --pageBreakBackground: #ffffff !important;
}
.rm-watermark, .nd-watermark, .rm-editor-watermark, .rm-page-watermark,
[data-watermark], .watermark, [class*="watermark"], [id*="watermark"], [data-role*="watermark"] {
  display: none !important;
  visibility: hidden !important;
}
.rm-watermark::before, .rm-watermark::after,
.nd-watermark::before, .nd-watermark::after,
.rm-editor-watermark::before, .rm-editor-watermark::after,
.rm-page-watermark::before, .rm-page-watermark::after,
[data-watermark]::before, [data-watermark]::after,
.watermark::before, .watermark::after,
[class*="watermark"]::before, [class*="watermark"]::after,
[id*="watermark"]::before, [id*="watermark"]::after,
[data-role*="watermark"]::before, [data-role*="watermark"]::after {
  content: none !important;
  background: none !important;
}
.rm-with-pagination, .rm-page, .rm-page-break, .ProseMirror, body {
  background-image: none !important;
  background: #ffffff !important;
}
.rm-first-page-header, .rm-page-header {
  position: relative !important;
}
hr, .horizontal-rule, .tiptap hr {
  border: 0 !important;
  border-top: 1px solid #000 !important;
  height: 0 !important;
  margin: 6px 0 !important;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.nv-header-line {
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: 1px !important;
  background: #000 !important;
}
.nd-editable-field, .editable-field, [data-node="editable-field"] {
  background: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  filter: none !important;
}
@page { size: ${paper} ${orient}; margin: 0; }
@media print {
  html, body {
    margin:0; padding:0; width:100%; height:100%; box-sizing:border-box;
  }
  .rm-with-pagination, .rm-page, .rm-page-break, .ProseMirror, .nd-editor-canvas {
    transform: none !important;
    zoom: 1 !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;
    outline: none !important;
  }
  img { max-width: 100% !important; height: auto !important; }
  .rm-page-separator, .rm-preview-separator, .preview-only,
  [data-preview], [data-rm-preview] {
    display: none !important;
  }
}
</style>`;

  // Append optional export CSS from assets/export.css when present
  try {
    const fs = await import('fs');
    const pathMod = await import('path');

    let exportCssPath;
    try {
      const filePath = pathMod.fileURLToPath(import.meta.url);
      const dir = pathMod.dirname(filePath);
      exportCssPath = pathMod.join(dir, '..', 'assets', 'export.css');
    } catch (_) {
      exportCssPath = pathMod.join(process.cwd(), 'backend', 'document-service', 'assets', 'export.css');
    }

    if (fs.existsSync && fs.existsSync(exportCssPath)) {
      try {
        const extra = fs.readFileSync(exportCssPath, 'utf8');
        if (extra && extra.length && /<\/style>\s*$/i.test(cleanupCss)) {
          cleanupCss = cleanupCss.replace(/<\/style>\s*$/i, `\n${extra}\n</style>`);
        }
      } catch (rerr) {
        console.warn(debugPrefix, 'failed to read export.css', rerr?.message || rerr);
      }
    }
  } catch (e) {
    // ignore if fs/path not available
  }

  if (typeof html === 'string' && html.length > 0) {
    if (html.includes('<head')) {
      html = html.replace(/<head([^>]*)>/i, (m) => `${m}${cleanupCss}`);
    } else if (html.includes('<html')) {
      html = html.replace(/<html([^>]*)>/i, (m) => `${m}<head>${cleanupCss}</head>`);
    } else {
      html = `<!doctype html><html><head>${cleanupCss}</head><body>${html}</body></html>`;
    }
  }
} catch (injectErr) {
  console.warn(debugPrefix, 'failed to inject cleanup CSS', injectErr?.message || injectErr);
}

      // 3) Viewport + disable nav timeouts
      await page.setViewport({ width: 1024, height: 768 });
      try { page.setDefaultNavigationTimeout(0); } catch (_) {}
      try { page.setDefaultTimeout(0); } catch (_) {}

      // Inline remote <img> assets to avoid missing logos when container cannot reach external URLs
      try {
        html = await inlineRemoteImages(html, { timeout: 10000, maxImages: 10 });
      } catch (inlineErr) {
        console.warn && console.warn(debugPrefix, 'inlineRemoteImages failed', inlineErr?.message || inlineErr);
      }

      console.debug && console.debug(
        debugPrefix,
        'setting page content (length)',
        html ? html.length : 0
      );

      // 4) NEW: no networkidle0 — relaxed chain, and never rethrow
      try {
        // First: DOMContentLoaded
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (e1) {
        console.warn(
          debugPrefix,
          'setContent domcontentloaded timeout, retrying with load',
          e1?.message || e1
        );
        try {
          // Second: load
          await page.setContent(html, { waitUntil: 'load', timeout: 20000 });
        } catch (e2) {
          console.warn(
            debugPrefix,
            'setContent load timeout, final setContent without waitUntil',
            e2?.message || e2
          );
          try {
            // Last resort: no waitUntil, no timeout
            await page.setContent(html, { timeout: 0 });
          } catch (e3) {
            console.error(
              debugPrefix,
              'final setContent failed; proceeding anyway to PDF',
              e3?.message || e3
            );
          }
        }
      }

      // 5) Assets: fonts + images (best effort)
      try { await page.emulateMediaType('screen'); } catch (_) {}

      try {
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
      } catch (assetErr) {
        console.warn(debugPrefix, 'asset wait failed:', assetErr?.message || assetErr);
      }

      // 6) Extra CSS for editable-field pseudo-elements
      try {
        await page.addStyleTag({
          content: `
            .nd-editable-field::before, .nd-editable-field::after,
            .editable-field::before, .editable-field::after,
            [data-node="editable-field"]::before, [data-node="editable-field"]::after {
              content: none !important;
              background: transparent !important;
              border: none !important;
              outline: none !important;
              box-shadow: none !important;
            }
          `,
        });
      } catch (_) {}

      // 7) Header rule opt-in (same as your logic)
      try {
        const wantHeaderRule = await page.evaluate(() => {
          try {
            if (document.querySelector('.nv-header-line')) return true;
            const bodyFlag =
              (document.body && document.body.getAttribute('data-header-line')) === 'true';
            const rootFlag =
              (document.documentElement &&
                document.documentElement.getAttribute('data-header-line')) === 'true';
            return bodyFlag || rootFlag;
          } catch (_) {
            return false;
          }
        });

        if (wantHeaderRule) {
          await page.addStyleTag({
            content: `
              .rm-first-page-header, .rm-page-header {
                position: relative !important;
                overflow: visible !important;
              }
              .rm-first-page-header::after, .rm-page-header::after {
                content: "";
                position: absolute !important;
                left: 0;
                right: 0;
                bottom: 0;
                border-bottom: 1px solid #000;
                height: 0;
              }
            `,
          });
        }
      } catch (_) {}

      // 8) Runtime overrides (same as your existing evaluate block)
      try {
        await page.evaluate(() => {
          try {
            const root = document.documentElement;
            if (root && root.style && root.style.setProperty) {
              root.style.setProperty('--pageGap', '0px', 'important');
              root.style.setProperty('--pageGapBorderSize', '0px', 'important');
              root.style.setProperty('--pageBreakBackground', '#ffffff', 'important');
            }
          } catch (_) {}
          try {
            const sel =
              '.rm-watermark, .nd-watermark, .rm-editor-watermark, .rm-page-watermark, ' +
              '[data-watermark], .watermark, [class*="watermark"], [id*="watermark"], ' +
              '[data-role*="watermark"]';
            document.querySelectorAll(sel).forEach((el) => {
              if (el && el.style && el.style.setProperty) {
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('visibility', 'hidden', 'important');
              }
            });
          } catch (_) {}
          try {
            const clearBg = (el) => {
              if (!el || !el.style || !el.style.setProperty) return;
              el.style.setProperty('background-image', 'none', 'important');
              el.style.setProperty('background', '#ffffff', 'important');
            };
            document
              .querySelectorAll('.rm-with-pagination, .rm-page, .rm-page-break, .ProseMirror, body')
              .forEach(clearBg);
          } catch (_) {}
          try {
            const stripEditable = (el) => {
              if (!el || !el.style || !el.style.setProperty) return;
              el.style.setProperty('background', 'transparent', 'important');
              el.style.setProperty('border', 'none', 'important');
              el.style.setProperty('outline', 'none', 'important');
              el.style.setProperty('box-shadow', 'none', 'important');
              el.style.setProperty('padding', '0', 'important');
              el.style.setProperty('filter', 'none', 'important');
            };
            document
              .querySelectorAll('.nd-editable-field, .editable-field, [data-node="editable-field"]')
              .forEach(stripEditable);
          } catch (_) {}
          try {
            const nodes = document.querySelectorAll(
              '[data-node="editable-field"], .nd-editable-field, .editable-field'
            );
            nodes.forEach((el) => {
              try {
                const ph =
                  el.getAttribute('data-ph') ||
                  el.getAttribute('data-placeholder') ||
                  (el.dataset ? el.dataset.ph || el.dataset.placeholder : null) ||
                  el.getAttribute('placeholder');
                const text = (el.textContent || '').replace(/\u00A0/g, ' ').trim();
                const isEmpty = text.length === 0;
                const isPlaceholder =
                  ph && text && text.toLowerCase() === String(ph).trim().toLowerCase();
                const markedEmpty =
                  el.getAttribute('data-empty') === 'true' ||
                  el.classList.contains('placeholder') ||
                  el.classList.contains('is-placeholder');
                if (isEmpty || isPlaceholder || markedEmpty) {
                  el.textContent = '';
                }
              } catch (_) {}
            });
          } catch (_) {}
          try {
            const fields = Array.from(
              document.querySelectorAll(
                '[data-node="editable-field"], .nd-editable-field, .editable-field'
              )
            );
            fields.forEach((el) => {
              try {
                const ph =
                  el.getAttribute('data-ph') ||
                  el.getAttribute('data-placeholder') ||
                  (el.dataset ? el.dataset.ph || el.dataset.placeholder : null) ||
                  el.getAttribute('placeholder');
                const text = (el.textContent || '').replace(/\u00A0/g, ' ').trim();
                const isEmpty = text.length === 0;
                const isPlaceholder =
                  ph && text && text.toLowerCase() === String(ph).trim().toLowerCase();
                const markedEmpty =
                  el.getAttribute('data-empty') === 'true' ||
                  el.classList.contains('placeholder') ||
                  el.classList.contains('is-placeholder');
                if (isEmpty || isPlaceholder || markedEmpty) {
                  el.remove();
                } else {
                  const txt = document.createTextNode(text);
                  el.replaceWith(txt);
                }
              } catch (_) {}
            });
          } catch (_) {}
          try {
            const wantsRule =
              !!document.querySelector('.nv-header-line') ||
              (document.body && document.body.getAttribute('data-header-line') === 'true') ||
              (document.documentElement &&
                document.documentElement.getAttribute('data-header-line') === 'true');
            if (wantsRule) {
              const ensureHeaderRule = (hdr) => {
                if (!hdr) return;
                if (!hdr.querySelector(':scope > .nv-header-line')) {
                  const line = document.createElement('div');
                  line.className = 'nv-header-line';
                  line.style.position = 'absolute';
                  line.style.left = '0';
                  line.style.right = '0';
                  line.style.bottom = '0';
                  line.style.height = '1px';
                  line.style.background = '#000';
                  hdr.appendChild(line);
                }
              };
              document
                .querySelectorAll('.rm-first-page-header, .rm-page-header')
                .forEach(ensureHeaderRule);
            }
          } catch (_) {}
        });
      } catch (e) {
        console.warn(debugPrefix, 'runtime export overrides failed:', e?.message || e);
      }

      // 9) Generate PDF
      const format = pageSetup.paperSize || 'A4';
      const landscape =
        String(pageSetup.orientation || 'Portrait').toLowerCase() === 'landscape';
      const margins = pageSetup.margins || { top: 1, bottom: 1, left: 1, right: 1 };

      console.debug &&
        console.debug(debugPrefix, 'calling page.pdf with format', format, 'landscape', landscape);

      const pdfBuffer = await page.pdf({
        format,
        landscape,
        printBackground: true,
        margin: {
          top: `${margins.top}in`,
          bottom: `${margins.bottom}in`,
          left: `${margins.left}in`,
          right: `${margins.right}in`,
        },
        preferCSSPageSize: true,
      });

      const normalized = Buffer.isBuffer(pdfBuffer)
        ? pdfBuffer
        : Buffer.from(pdfBuffer || []);

      console.debug &&
        console.debug(
          debugPrefix,
          'page.pdf finished, normalized buffer length =',
          normalized.length
        );

      if (!normalized || normalized.length === 0) {
        try {
          const os = await import('os');
          const fs = await import('fs');
          const pathMod = await import('path');
          const tmpdir = os.tmpdir();
          const fname = `navidocs_export_debug_${Date.now()}.html`;
          const full = pathMod.join(tmpdir, fname);
          fs.writeFileSync(full, html, 'utf8');
          console.error(debugPrefix, 'PDF buffer empty — saved HTML to', full);
        } catch (saveErr) {
          console.warn(
            debugPrefix,
            'failed to write debug HTML',
            saveErr?.message || saveErr
          );
        }
      }

      await browser.close();
      return normalized;
    } catch (innerErr) {
      await browser.close();
      throw innerErr;
    }
  } catch (e) {
    try {
      await browser.close();
    } catch (_) {}
    throw e;
  }
};


export const uploadPdfBuffer = async (pdfBuffer, { fileServerUrl = null, docId = '', owner = 'unknown', filename = 'export.pdf' } = {}) => {
  const fileServer = fileServerUrl || process.env.FILE_SERVICE_URL || 'http://localhost:5005';
  const form = new FormData();
  // convert buffer to a readable stream to ensure compatibility with axios/form-data
  const stream = Readable.from(pdfBuffer);
  form.append('document', stream, { filename, contentType: 'application/pdf' });
  form.append('owner', String(owner));
  form.append('documentId', String(docId));
  form.append('folderName', 'exports');

  const headers = { ...form.getHeaders() };
  const resp = await axios.post(`${fileServer}/api/files/upload/document`, form, { headers, timeout: 60000, maxContentLength: Infinity, maxBodyLength: Infinity });
  return resp?.data?.filePath || resp?.data?.path || null;
};

// Upload a single PDF to the File Service storage system, either to a folder (folderId) or as an orphan (root)
// Returns a normalized payload: { target: 'folder'|'root', filePath: string|null, raw: any }
export const uploadPdfToStorage = async (pdfBuffer, {
  fileServerUrl = null,
  owner = 'unknown',
  folderId = null,
  filename = 'export.pdf',
  authHeaders = {},
} = {}) => {
  const fileServer = fileServerUrl || process.env.FILE_SERVICE_URL || 'http://localhost:5004';
  const form = new FormData();
  const stream = Readable.from(pdfBuffer);
  // The storage service expects field name 'files'
  form.append('files', stream, { filename, contentType: 'application/pdf' });
  form.append('owner', String(owner));
  form.append('user_id', String(owner));

  const headers = { ...form.getHeaders(), ...(authHeaders || {}) };
  if (folderId) {
    // Upload to a specific folder
    const resp = await axios.post(`${fileServer}/api/storage/folders/${folderId}/files`, form, {
      headers,
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      withCredentials: true,
    });
    const data = resp?.data || {};
    // Try to locate the uploaded file path from response.folder (dbfiles or files)
    let filePath = null;
    const folder = data.folder || {};
    const candidates = Array.isArray(folder.dbfiles) ? folder.dbfiles : (Array.isArray(folder.files) ? folder.files : []);
    if (Array.isArray(candidates) && candidates.length) {
      // Prefer the entry with matching originalName when available
      const byName = candidates.find(f => (f.originalName || f.filename) === filename);
      if (byName && (byName.path || byName.filePath)) filePath = byName.path || byName.filePath;
      if (!filePath) {
        const last = candidates[candidates.length - 1];
        if (last && (last.path || last.filePath)) filePath = last.path || last.filePath;
      }
    }
    return { target: 'folder', filePath: filePath || null, raw: data };
  }
  // Upload as orphan (root)
  const resp = await axios.post(`${fileServer}/api/storage/files/upload-orphan`, form, {
    headers,
    timeout: 60000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    withCredentials: true,
  });
  const data = resp?.data || {};
  let filePath = null;
  const files = Array.isArray(data.files) ? data.files : [];
  if (files.length) {
    const byName = files.find(f => (f.originalName || f.filename) === filename);
    if (byName && (byName.path || byName.filePath)) filePath = byName.path || byName.filePath;
    if (!filePath) {
      const last = files[files.length - 1];
      if (last && (last.path || last.filePath)) filePath = last.path || last.filePath;
    }
  }
  return { target: 'root', filePath: filePath || null, raw: data };
};
