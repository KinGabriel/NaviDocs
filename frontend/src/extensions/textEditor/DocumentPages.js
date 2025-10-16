// src/extensions/textEditor/DocumentPages.js
import Document from "@tiptap/extension-document";

/**
 * DocumentPages — top-level schema is strictly `page+`
 * Also provides a small shared storage for header/footer state
 * and helpers to trigger reflow and sync CSS variables used by layout.
 */
export const DocumentPages = Document.extend({
  // Replace StarterKit's doc so top-level is strictly page+
  content: "page+",

  addStorage() {
    return {
      // Simple shape read by AutoPaginator & panel
      // Example: { header: { margins: { top, bottom, left, right } }, footer: { margins: {...} } }
      headerFooter: {
        current: null,
      },
      // Optional richer shape if you choose to store full configs
      // Example: { headerConfig: {...}, footerConfig: {...} }
      pageHF: {
        current: null,
      },
    };
  },

  addCommands() {
    // internal helpers
    const asCssValue = (v, fallback = "0px") => {
      if (v == null) return fallback;
      if (typeof v === "number") return `${v}px`;
      const s = String(v).trim();
      // accept 'px', 'mm', etc.
      return s.length ? s : fallback;
    };

    const setCssVar = (el, name, value) => {
      if (!el || !name) return;
      try {
        el.style.setProperty(name, value);
      } catch {}
    };

    const resolveRootEl = (editor, root) => {
      if (root instanceof HTMLElement) return root;
      if (typeof root === "string") return document.querySelector(root);
      // Prefer the element passed to Tiptap or its container
      return editor?.options?.element || editor?.view?.dom?.parentElement || editor?.view?.dom;
    };

    return {
      /**
       * setActiveHeaderFooter — update shared storage with the
       * current header/footer so other extensions can read it.
       * Accepts either { header, footer } (simple) or
       * { headerConfig, footerConfig } (rich). You can pass both.
       */
      setActiveHeaderFooter:
        (payload) =>
        ({ editor }) => {
          if (!editor?.storage) return false;

          editor.storage.headerFooter = editor.storage.headerFooter || {};
          editor.storage.pageHF = editor.storage.pageHF || {};

          if (payload?.header || payload?.footer) {
            editor.storage.headerFooter.current = {
              ...(editor.storage.headerFooter.current || {}),
              ...("header" in payload ? { header: payload.header } : {}),
              ...("footer" in payload ? { footer: payload.footer } : {}),
            };
          }
          if (payload?.headerConfig || payload?.footerConfig) {
            editor.storage.pageHF.current = {
              ...(editor.storage.pageHF.current || {}),
              ...("headerConfig" in payload ? { headerConfig: payload.headerConfig } : {}),
              ...("footerConfig" in payload ? { footerConfig: payload.footerConfig } : {}),
            };
          }
          return true;
        },

      /**
       * setHeaderFooterCssVars — push header/footer/margins numbers into CSS custom properties.
       * Call this from your panel or editor init.
       *
       * Accepts either:
       *   setHeaderFooterCssVars({
       *     root?: HTMLElement|string,  // optional override of the element to style
       *     margins?: { top, bottom, left, right },       // px/mm/etc.
       *     header?: { top, height },                     // px/mm/etc.
       *     footer?: { bottom, height },                  // px/mm/etc.
       *     paper?:  { width, height },                   // px/mm/etc.
       *   })
       *
       * These map to:
       *   --page-margin-top, --page-margin-bottom, --page-margin-left, --page-margin-right
       *   --header-top, --header-height, --footer-bottom, --footer-height
       *   --paper-width, --paper-height
       */
      setHeaderFooterCssVars:
        (vars = {}) =>
        ({ editor }) => {
          const rootEl = resolveRootEl(editor, vars.root);
          if (!rootEl) return false;

          const margins = vars.margins || {};
          const header = vars.header || {};
          const footer = vars.footer || {};
          const paper  = vars.paper  || {};

          // Margins
          setCssVar(rootEl, "--page-margin-top",    asCssValue(margins.top, "25.4mm"));
          setCssVar(rootEl, "--page-margin-bottom", asCssValue(margins.bottom, "25.4mm"));
          setCssVar(rootEl, "--page-margin-left",   asCssValue(margins.left, "25.4mm"));
          setCssVar(rootEl, "--page-margin-right",  asCssValue(margins.right, "25.4mm"));

          // Header/Footer geometry
          setCssVar(rootEl, "--header-top",    asCssValue(header.top, "12.7mm"));
          setCssVar(rootEl, "--header-height", asCssValue(header.height, "20mm"));
          setCssVar(rootEl, "--footer-bottom", asCssValue(footer.bottom, "12.7mm"));
          setCssVar(rootEl, "--footer-height", asCssValue(footer.height, "15mm"));

          // Paper size (optional; defaults can live in CSS)
          if (paper.width != null)  setCssVar(rootEl, "--paper-width",  asCssValue(paper.width));
          if (paper.height != null) setCssVar(rootEl, "--paper-height", asCssValue(paper.height));

          return true;
        },

      /**
       * reflowPages — lightweight way to tell pagination to re-measure.
       * AutoPaginator listens for the 'paginatorReflow' meta in appendTransaction.
       */
      reflowPages:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta("paginatorReflow", true));
          return true;
        },
    };
  },
});

export default DocumentPages;
