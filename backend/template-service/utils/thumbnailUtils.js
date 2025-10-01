import axios from "axios";
import puppeteer from "puppeteer";
import FormData from "form-data";

/**
 * Renders HTML for the first page of a template.
 * @param {Object} template
 * @returns {string|null}
 */
export function renderTemplatePageHtml(template) {
  const pageDoc = Array.isArray(template.pages_json) ? template.pages_json[0] : null;
  const page = pageDoc && Array.isArray(pageDoc.content)
    ? pageDoc.content.find(n => n.type === 'page')
    : null;
  if (!page || !Array.isArray(page.content)) return null;

  let html = `<div style="width:794px;height:1123px;background:#fff;padding:32px;font-family:sans-serif;">`;
  html += `<div style="font-weight:bold;margin-bottom:16px;">${Object.keys(page.attrs?.headerFields||{}).filter(k=>page.attrs.headerFields[k]).join(', ')}</div>`;
  page.content.forEach(node => {
    if (node.type === 'paragraph') {
      html += '<p style="margin-bottom:8px;">';
      if (Array.isArray(node.content)) {
        node.content.forEach(n => {
          if (n.type === 'text') {
            let style = '';
            if (n.marks) {
              n.marks.forEach(mark => {
                if (mark.type === 'bold') style += 'font-weight:bold;';
                if (mark.type === 'italic') style += 'font-style:italic;';
                if (mark.type === 'underline') style += 'text-decoration:underline;';
              });
            }
            html += `<span style="${style}">${n.text || ''}</span>`;
          }
        });
      }
      html += '</p>';
    }
    if (node.type === 'table' && Array.isArray(node.content)) {
      html += '<table style="border-collapse:collapse;width:100%;margin-bottom:16px;">';
      node.content.forEach(row => {
        if (row.type === 'tableRow' && Array.isArray(row.content)) {
          html += '<tr>';
          row.content.forEach(cell => {
            let cellTag = cell.type === 'tableHeader' ? 'th' : 'td';
            let cellStyle = 'border:1px solid #ccc;padding:6px;';
            if (cell.attrs) {
              if (cell.attrs.colspan) cellStyle += `colspan:${cell.attrs.colspan};`;
              if (cell.attrs.rowspan) cellStyle += `rowspan:${cell.attrs.rowspan};`;
            }
            html += `<${cellTag} style="${cellStyle}">`;
            if (Array.isArray(cell.content)) {
              cell.content.forEach(cellNode => {
                if (cellNode.type === 'paragraph' && Array.isArray(cellNode.content)) {
                  cellNode.content.forEach(n => {
                    if (n.type === 'text') {
                      let style = '';
                      if (n.marks) {
                        n.marks.forEach(mark => {
                          if (mark.type === 'bold') style += 'font-weight:bold;';
                          if (mark.type === 'italic') style += 'font-style:italic;';
                          if (mark.type === 'underline') style += 'text-decoration:underline;';
                        });
                      }
                      html += `<span style="${style}">${n.text || ''}</span>`;
                    }
                  });
                }
              });
            }
            html += `</${cellTag}>`;
          });
          html += '</tr>';
        }
      });
      html += '</table>';
    }
  });
  html += `<div style="margin-top:16px;border-top:1px solid #eee;color:#888;">${Object.keys(page.attrs?.footerFields||{}).filter(k=>page.attrs.footerFields[k]).join(', ')}</div>`;
  html += `</div>`;
  return html;
}

/**
 * Renders HTML to PNG image buffer using Puppeteer.
 * @param {string} html
 * @returns {Promise<Buffer>}
 */
export async function renderHtmlToImageBuffer(html) {
  const browser = await puppeteer.launch();
  const pageObj = await browser.newPage();
  await pageObj.setContent(html);
  const imageBuffer = await pageObj.screenshot({ type: 'png', fullPage: true });
  await browser.close();
  return imageBuffer;
}

/**
 * Uploads image buffer to file server and returns the URL.
 * @param {Buffer} imageBuffer
 * @param {string} documentId
 * @returns {Promise<string|null>}
 */
export async function uploadThumbnail(imageBuffer, documentId) {
  const fileServerUrl = process.env.FILE_SERVICE_URL || "http://localhost:5005";
  const thumbnailFilename = `${documentId}.png`;
  const formData = new FormData();
  formData.append('document', imageBuffer, thumbnailFilename);
  formData.append('owner', 'template');
  formData.append('folderName', 'thumbnail');
  formData.append('documentId', documentId);
  formData.append('overwrite', 'true');
  const uploadResp = await axios.post(fileServerUrl + "/api/files/upload/document", formData, {
    headers: formData.getHeaders()
  });
  return uploadResp.data.filePath || uploadResp.data.url || null;
}

/**
 * Generates and uploads a template thumbnail, returns the thumbnail URL.
 * @param {Object} template - Mongoose template document or plain object.
 * @returns {Promise<string|null>} - Thumbnail URL or null on error.
 */
export async function generateTemplateThumbnail(template) {
  try {
    const html = renderTemplatePageHtml(template);
    if (!html) return null;
    const imageBuffer = await renderHtmlToImageBuffer(html);
    const documentId = template._id?.toString() || 'template';
    return await uploadThumbnail(imageBuffer, documentId);
  } catch (error) {
    console.error("Error generating thumbnail (utils):", error);
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
    const url = await generateTemplateThumbnail(template);
    if (url) {
      template.thumbnailUrl = url;
      await template.save();
    }
    return url;
  } catch (error) {
    console.error("Error generating thumbnail (internal):", error);
    return null;
  }
};
